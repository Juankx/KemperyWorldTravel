// Intentar cargar AWS SDK, pero no fallar si no está instalado
let S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, getSignedUrl;
let awsSdkAvailable = false;

try {
  const s3ClientModule = require('@aws-sdk/client-s3');
  const s3PresignerModule = require('@aws-sdk/s3-request-presigner');
  
  S3Client = s3ClientModule.S3Client;
  PutObjectCommand = s3ClientModule.PutObjectCommand;
  GetObjectCommand = s3ClientModule.GetObjectCommand;
  DeleteObjectCommand = s3ClientModule.DeleteObjectCommand;
  HeadObjectCommand = s3ClientModule.HeadObjectCommand;
  getSignedUrl = s3PresignerModule.getSignedUrl;
  
  awsSdkAvailable = true;
} catch (error) {
  console.log('ℹ️ AWS SDK no disponible. S3Service funcionará en modo local solamente.');
  awsSdkAvailable = false;
}

const fs = require('fs');
const path = require('path');

class S3Service {
  constructor() {
    if (!awsSdkAvailable) {
      throw new Error('AWS SDK no está instalado. Ejecuta: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
    }
    
    // Verificar que las credenciales estén configuradas
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('Credenciales AWS no configuradas. S3Service no se puede inicializar.');
    }
    
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    this.bucketName = process.env.AWS_S3_BUCKET || 'kemperyworldtravel.com';
    this.documentsPrefix = 'documents/'; // Prefijo para documentos en S3
  }

  /**
   * Subir archivo a S3
   * @param {string} filePath - Ruta local del archivo
   * @param {string} s3Key - Clave (ruta) en S3
   * @param {string} contentType - Tipo MIME del archivo
   * @returns {Promise<Object>} - Información del archivo subido
   */
  async uploadFile(filePath, s3Key, contentType = null) {
    try {
      // Determinar content type si no se proporciona
      if (!contentType) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.pdf': 'application/pdf',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.doc': 'application/msword',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png'
        };
        contentType = mimeTypes[ext] || 'application/octet-stream';
      }

      // Leer archivo
      const fileContent = fs.readFileSync(filePath);
      
      // Subir a S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        // Hacer el archivo público para lectura (opcional, puedes usar signed URLs en su lugar)
        // ACL: 'public-read'
      });

      await this.s3Client.send(command);

      console.log(`✅ Archivo subido a S3: ${s3Key}`);

      return {
        success: true,
        bucket: this.bucketName,
        key: s3Key,
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`
      };
    } catch (error) {
      console.error('❌ Error subiendo archivo a S3:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener URL firmada para descargar archivo desde S3
   * @param {string} s3Key - Clave del archivo en S3
   * @param {number} expiresIn - Tiempo de expiración en segundos (default: 1 hora)
   * @returns {Promise<string>} - URL firmada
   */
  async getSignedUrl(s3Key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('❌ Error generando URL firmada:', error);
      throw error;
    }
  }

  /**
   * Verificar si un archivo existe en S3
   * @param {string} s3Key - Clave del archivo en S3
   * @returns {Promise<boolean>}
   */
  async fileExists(s3Key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Eliminar archivo de S3
   * @param {string} s3Key - Clave del archivo en S3
   * @returns {Promise<boolean>}
   */
  async deleteFile(s3Key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      await this.s3Client.send(command);
      console.log(`✅ Archivo eliminado de S3: ${s3Key}`);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando archivo de S3:', error);
      return false;
    }
  }

  /**
   * Subir documento de reserva a S3
   * @param {string} localFilePath - Ruta local del archivo
   * @param {string} bookingId - ID de la reserva
   * @param {string} clientName - Nombre del cliente (para organizar)
   * @param {string} fileType - Tipo de archivo: 'docx' o 'pdf'
   * @returns {Promise<Object>}
   */
  async uploadReservationDocument(localFilePath, bookingId, clientName, fileType = 'pdf') {
    const fileName = path.basename(localFilePath);
    const s3Key = `${this.documentsPrefix}${bookingId}/${fileName}`;
    
    const contentType = fileType === 'pdf' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return await this.uploadFile(localFilePath, s3Key, contentType);
  }

  /**
   * Obtener URL para descargar documento de reserva
   * @param {string} bookingId - ID de la reserva
   * @param {string} fileName - Nombre del archivo
   * @param {number} expiresIn - Tiempo de expiración en segundos
   * @returns {Promise<string>}
   */
  async getDocumentUrl(bookingId, fileName, expiresIn = 3600) {
    const s3Key = `${this.documentsPrefix}${bookingId}/${fileName}`;
    return await this.getSignedUrl(s3Key, expiresIn);
  }
}

module.exports = S3Service;

