const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const createReport = require('docx-templates').default;

// Cargar S3Service de forma condicional (solo si está disponible)
let S3Service;
try {
  S3Service = require('./s3Service');
} catch (error) {
  // S3Service no disponible (AWS SDK no instalado o error al cargar)
  S3Service = null;
  console.log('ℹ️ S3Service no disponible. Los documentos se guardarán solo localmente.');
}

const execAsync = promisify(exec);

class DocumentGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/Plantilla Reservas.docx');
    this.outputPath = path.join(__dirname, '../generated-documents');
    
    // Crear directorio de documentos generados si no existe
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
    
    // Inicializar S3Service si está disponible y las credenciales están configuradas
    this.s3Service = null;
    if (S3Service && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        this.s3Service = new S3Service();
        console.log('✅ S3Service inicializado');
      } catch (error) {
        console.warn('⚠️ No se pudo inicializar S3Service:', error.message);
        this.s3Service = null;
      }
    } else {
      if (!S3Service) {
        console.log('ℹ️ S3Service no disponible (AWS SDK no instalado). Los documentos se guardarán solo localmente.');
      } else {
        console.log('ℹ️ S3Service no inicializado: credenciales AWS no configuradas');
      }
    }
  }

  // Datos por defecto para cada ciudad
  getCityData(city) {
    const cityData = {
      'Baños': {
        UBICACION: 'Baños de Agua Santa',
        UBICACION_DE_MAPS: 'Baños de Agua Santa, Tungurahua, Ecuador',
        NUMEROS_DE_CONTACTO: '+593 99 922 2210',
        INFORMACION_PARA_EL_ACCESO: 'El departamento se encuentra en el centro de Baños, cerca de la Basílica de la Virgen del Agua Santa.',
        PROCEDIMIENTOS_DE_ACCESO: 'Las llaves estarán en el candado ubicado en la entrada principal. El código será enviado por WhatsApp.',
        RED_WIFI: 'KemperyBaños',
        CONTRASENA_WIFI: 'Kempery2025'
      },
      'Cuenca': {
        UBICACION: 'Cuenca',
        UBICACION_DE_MAPS: 'Cuenca, Azuay, Ecuador',
        NUMEROS_DE_CONTACTO: '+593 99 922 2210',
        INFORMACION_PARA_EL_ACCESO: 'El departamento se encuentra en el centro histórico de Cuenca, cerca del Parque Calderón.',
        PROCEDIMIENTOS_DE_ACCESO: 'Las llaves estarán en el candado ubicado en la entrada principal. El código será enviado por WhatsApp.',
        RED_WIFI: 'KemperyCuenca',
        CONTRASENA_WIFI: 'Kempery2025'
      },
      'Quito': {
        UBICACION: 'Quito',
        UBICACION_DE_MAPS: 'Quito, Pichincha, Ecuador',
        NUMEROS_DE_CONTACTO: '+593 99 922 2210',
        INFORMACION_PARA_EL_ACCESO: 'El departamento se encuentra en el centro de Quito, cerca de la Plaza Grande.',
        PROCEDIMIENTOS_DE_ACCESO: 'Las llaves estarán en el candado ubicado en la entrada principal. El código será enviado por WhatsApp.',
        RED_WIFI: 'KemperyQuito',
        CONTRASENA_WIFI: 'Kempery2025'
      },
      'Manta': {
        UBICACION: 'Manta',
        UBICACION_DE_MAPS: 'Manta, Manabí, Ecuador',
        NUMEROS_DE_CONTACTO: '+593 99 922 2210',
        INFORMACION_PARA_EL_ACCESO: 'El departamento se encuentra cerca del malecón de Manta, con vista al mar.',
        PROCEDIMIENTOS_DE_ACCESO: 'Las llaves estarán en el candado ubicado en la entrada principal. El código será enviado por WhatsApp.',
        RED_WIFI: 'KemperyManta',
        CONTRASENA_WIFI: 'Kempery2025'
      },
      'Tonsupa': {
        UBICACION: 'Tonsupa',
        UBICACION_DE_MAPS: 'Tonsupa, Esmeraldas, Ecuador',
        NUMEROS_DE_CONTACTO: '+593 99 922 2210',
        INFORMACION_PARA_EL_ACCESO: 'El departamento se encuentra en la playa de Tonsupa, cerca del mar.',
        PROCEDIMIENTOS_DE_ACCESO: 'Las llaves estarán en el candado ubicado en la entrada principal. El código será enviado por WhatsApp.',
        RED_WIFI: 'KemperyTonsupa',
        CONTRASENA_WIFI: 'Kempery2025'
      },
      'Salinas': {
        UBICACION: 'Salinas',
        UBICACION_DE_MAPS: 'Salinas, Santa Elena, Ecuador',
        NUMEROS_DE_CONTACTO: '+593 99 922 2210',
        INFORMACION_PARA_EL_ACCESO: 'El departamento se encuentra en Salinas, cerca de la playa.',
        PROCEDIMIENTOS_DE_ACCESO: 'Las llaves estarán en el candado ubicado en la entrada principal. El código será enviado por WhatsApp.',
        RED_WIFI: 'KemperySalinas',
        CONTRASENA_WIFI: 'Kempery2025'
      }
    };

    return cityData[city] || cityData['Quito']; // Default a Quito si no se encuentra la ciudad
  }

  // Convertir DOCX a PDF usando LibreOffice
  async convertDocxToPdf(docxPath) {
    try {
      // Verificar que el archivo DOCX existe
      if (!fs.existsSync(docxPath)) {
        throw new Error(`El archivo DOCX no existe: ${docxPath}`);
      }

      const pdfPath = docxPath.replace('.docx', '.pdf');
      const outputDir = path.dirname(docxPath);
      
      // Comando para convertir DOCX a PDF usando LibreOffice en modo headless
      // En Windows: usar "soffice" o la ruta completa
      // En Linux/Mac: usar "libreoffice" o "soffice"
      const isWindows = process.platform === 'win32';
      let libreOfficeCmd = isWindows ? 'soffice' : 'libreoffice';
      
      // En Windows, intentar rutas comunes de LibreOffice
      if (isWindows) {
        const possiblePaths = [
          'soffice',
          'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
          'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
          'C:\\Program Files\\LibreOffice\\program\\soffice.com'
        ];
        
        // Verificar cuál está disponible
        for (const possiblePath of possiblePaths) {
          try {
            await execAsync(`"${possiblePath}" --version`, { timeout: 5000 });
            libreOfficeCmd = possiblePath;
            console.log(`✅ LibreOffice encontrado en: ${libreOfficeCmd}`);
            break;
          } catch (e) {
            // Continuar con el siguiente
          }
        }
      }
      
      // Usar spawn en lugar de exec para mejor control del proceso
      // Flags adicionales para evitar cualquier interacción:
      // --headless: sin interfaz gráfica
      // --nodefault: no abrir documentos por defecto
      // --nolockcheck: no verificar locks de archivos
      // --invisible: modo invisible
      // --norestore: no restaurar ventanas
      // --nofirststartwizard: no ejecutar el asistente inicial
      // --nologo: no mostrar logo de inicio
      // --nocrashreport: no mostrar reporte de errores
      const args = [
        '--headless',
        '--nodefault',
        '--nolockcheck',
        '--invisible',
        '--norestore',
        '--nofirststartwizard',
        '--nologo',
        '--nocrashreport',
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        docxPath
      ];
      
      console.log(`🔄 Convirtiendo DOCX a PDF usando: ${libreOfficeCmd}`);
      console.log(`📄 Archivo DOCX: ${docxPath}`);
      console.log(`📄 Archivo PDF esperado: ${pdfPath}`);
      
      // Configurar variables de entorno para evitar interacción
      const env = {
        ...process.env,
        // Evitar que LibreOffice muestre diálogos
        SAL_USE_VCLPLUGIN: 'gen',
        // Deshabilitar actualizaciones automáticas
        SAL_DISABLE_OPENCL: '1'
      };
      
      // Ejecutar usando spawn para mejor control
      const result = await new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        console.log(`🔧 Ejecutando: ${libreOfficeCmd} ${args.join(' ')}`);
        
        // Ejecutar LibreOffice directamente con spawn
        const libreOfficeProcess = spawn(libreOfficeCmd, args, {
          env: env,
          windowsHide: true, // Ocultar ventana en Windows
          stdio: ['ignore', 'pipe', 'pipe'], // Ignorar stdin completamente
          shell: false,
          detached: false
        });
        
        // Capturar salida
        libreOfficeProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        libreOfficeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        // Timeout de seguridad
        const timeoutId = setTimeout(() => {
          if (!libreOfficeProcess.killed) {
            libreOfficeProcess.kill();
            reject(new Error('Timeout: LibreOffice tardó más de 30 segundos'));
          }
        }, 30000);
        
        // Manejar finalización
        libreOfficeProcess.on('close', (code) => {
          clearTimeout(timeoutId);
          console.log(`📊 LibreOffice terminó con código: ${code}`);
          
          // Aunque el código no sea 0, puede que el PDF se haya generado
          // (por ejemplo, si muestra "Press Enter" pero continúa)
          // Resolver con éxito y verificar el archivo después
          if (code === 0) {
            resolve({ stdout, stderr, exitCode: code });
          } else {
            // Si el código no es 0 pero el mensaje es solo "Press Enter", 
            // puede que el PDF se haya generado de todas formas
            const isPressEnterOnly = stderr && stderr.includes('Press Enter') && stderr.trim().length < 100;
            if (isPressEnterOnly) {
              console.log('ℹ️ LibreOffice mostró "Press Enter" pero puede haber generado el PDF');
              resolve({ stdout, stderr, exitCode: code });
            } else {
              const errorMsg = `LibreOffice terminó con código ${code}. stderr: ${stderr || 'Sin mensaje de error'}`;
              console.error(`❌ ${errorMsg}`);
              reject(new Error(errorMsg));
            }
          }
        });
        
        libreOfficeProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          console.error('❌ Error ejecutando LibreOffice:', error);
          reject(error);
        });
      });
      
      const { stdout, stderr } = result;
      
      if (stdout) {
        console.log(`📋 Salida de LibreOffice: ${stdout}`);
      }
      
      if (stderr) {
        // Algunos mensajes de stderr son normales en LibreOffice, solo loguear si son importantes
        if (!stderr.includes('Warning') && !stderr.includes('Info') && !stderr.includes('Press Enter')) {
          console.warn('⚠️ Advertencias de LibreOffice:', stderr);
        } else if (stderr.includes('Press Enter')) {
          console.log('ℹ️ LibreOffice mostró mensaje "Press Enter" pero el proceso continuó');
        }
      }
      
      // Esperar un momento para que el archivo se escriba completamente
      // Aumentar el tiempo de espera para asegurar que el PDF se haya generado
      console.log('⏳ Esperando que el PDF se escriba completamente...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar que el archivo PDF se creó
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        if (stats.size > 0) {
          console.log(`✅ PDF generado exitosamente: ${pdfPath} (${stats.size} bytes)`);
          return {
            success: true,
            pdfPath: pdfPath,
            pdfFileName: path.basename(pdfPath)
          };
        } else {
          console.warn(`⚠️ El PDF se creó pero está vacío: ${pdfPath}`);
        }
      }
      
      // Intentar con el nombre que LibreOffice podría haber usado
      const baseName = path.basename(docxPath, '.docx');
      const possiblePdfPath = path.join(outputDir, `${baseName}.pdf`);
      
      if (fs.existsSync(possiblePdfPath)) {
        const stats = fs.statSync(possiblePdfPath);
        if (stats.size > 0) {
          console.log(`✅ PDF generado exitosamente (nombre alternativo): ${possiblePdfPath} (${stats.size} bytes)`);
          return {
            success: true,
            pdfPath: possiblePdfPath,
            pdfFileName: path.basename(possiblePdfPath)
          };
        }
      }
      
      // Listar archivos en el directorio para depuración
      const filesInDir = fs.readdirSync(outputDir);
      console.log(`📁 Archivos en el directorio: ${filesInDir.join(', ')}`);
      
      throw new Error('El archivo PDF no se generó correctamente. LibreOffice puede no estar instalado o no estar en el PATH.');
    } catch (error) {
      console.error('❌ Error convirtiendo DOCX a PDF:', error);
      console.error('Stack trace:', error.stack);
      
      // Si LibreOffice no está disponible, retornar error descriptivo
      if (error.code === 'ENOENT' || error.message.includes('spawn') || error.message.includes('not found') || error.message.includes('PATH')) {
        return {
          success: false,
          error: 'LibreOffice no está instalado o no está en el PATH. Por favor, instale LibreOffice para generar PDFs. En Windows, asegúrese de que LibreOffice esté instalado y disponible en el PATH del sistema.'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Error desconocido al convertir DOCX a PDF'
      };
    }
  }

  async generateReservationDocument(bookingData, clientData) {
    try {
      const cityData = this.getCityData(bookingData.city);
      
      // Parsear special_requests si es un string JSON
      let specialRequests = {};
      if (bookingData.special_requests) {
        try {
          specialRequests = typeof bookingData.special_requests === 'string' 
            ? JSON.parse(bookingData.special_requests) 
            : bookingData.special_requests;
        } catch (e) {
          console.warn('Error parseando special_requests:', e);
        }
      }
      
      // Formatear fechas
      const formatDate = (dateString) => {
        if (!dateString) return 'No especificada';
        try {
          return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          return dateString;
        }
      };
      
      // Formatear participantes
      const formatParticipants = (participants) => {
        if (!participants || !Array.isArray(participants) || participants.length === 0) {
          return 'No especificados';
        }
        return participants.map((p, index) => 
          `${index + 1}. ${p.first_name || ''} ${p.last_name || ''} - Cédula: ${p.identification || 'N/A'}`
        ).join('\n');
      };
      
      // Preparar datos para la plantilla
      const templateData = {
        CLIENTE: `${clientData.first_name} ${clientData.last_name}`,
        UBICACION: cityData.UBICACION,
        UBICACION_DE_MAPS: bookingData.google_maps_link || specialRequests.google_maps_link || cityData.UBICACION_DE_MAPS,
        NUMEROS_DE_CONTACTO: cityData.NUMEROS_DE_CONTACTO,
        INFORMACION_PARA_EL_ACCESO: cityData.INFORMACION_PARA_EL_ACCESO,
        PROCEDIMIENTOS_DE_ACCESO: cityData.PROCEDIMIENTOS_DE_ACCESO,
        RED_WIFI: bookingData.wifi_name || specialRequests.wifi_name || cityData.RED_WIFI,
        CONTRASENA_WIFI: bookingData.wifi_password || specialRequests.wifi_password || cityData.CONTRASENA_WIFI,
        FECHA_RESERVA: new Date(bookingData.created_at).toLocaleDateString('es-ES'),
        NUMERO_PERSONAS: bookingData.people_count,
        NOCHES: bookingData.nights_requested,
        CONTACTO_SOURCE: bookingData.contact_source || 'Kempery World Travel',
        // Información adicional
        FECHA_CHECK_IN: formatDate(bookingData.check_in_date || specialRequests.check_in_date),
        FECHA_CHECK_OUT: formatDate(bookingData.check_out_date || specialRequests.check_out_date),
        CONTACTO_EMERGENCIA: bookingData.emergency_contact || specialRequests.emergency_contact || 'No especificado',
        RESTRICCIONES_DIETETICAS: bookingData.dietary_restrictions || specialRequests.dietary_restrictions || 'Ninguna',
        SOLICITUDES_ESPECIALES: bookingData.special_requests || specialRequests.special_requests || 'Ninguna',
        PARTICIPANTES: formatParticipants(bookingData.participants_data || specialRequests.participants_data),
        NUMERO_CONTRATO: bookingData.contract_number || 'N/A',
        OBSERVACIONES: bookingData.observations || specialRequests.observations || 'Ninguna'
      };

      // Generar nombre único para el archivo
      const fileName = `Manual_${clientData.first_name}_${clientData.last_name}_${Date.now()}.docx`;
      const outputFile = path.join(this.outputPath, fileName);

      // Verificar que la plantilla existe
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`La plantilla no se encuentra en: ${this.templatePath}`);
      }

      // Leer la plantilla
      const template = fs.readFileSync(this.templatePath);
      
      console.log('📄 Plantilla leída correctamente. Tamaño:', template.length, 'bytes');
      console.log('📋 Datos para la plantilla:', JSON.stringify(templateData, null, 2));

      // Generar el documento
      const buffer = await createReport({
        template,
        data: templateData,
        cmdDelimiter: ['{{', '}}']
      });

      console.log('✅ Documento DOCX generado. Tamaño:', buffer.length, 'bytes');

      // Guardar el documento DOCX
      fs.writeFileSync(outputFile, buffer);

      console.log('💾 Documento DOCX guardado en:', outputFile);
      
      // Verificar que el archivo DOCX se creó correctamente y tiene contenido
      const stats = fs.statSync(outputFile);
      if (stats.size === 0) {
        throw new Error('El documento DOCX generado está vacío');
      }
      console.log('✅ Documento DOCX verificado. Tamaño del archivo:', stats.size, 'bytes');

      // Convertir DOCX a PDF
      console.log('🔄 Iniciando conversión de DOCX a PDF...');
      const pdfResult = await this.convertDocxToPdf(outputFile);
      
      if (pdfResult.success) {
        // Verificar que el PDF tiene contenido
        const pdfStats = fs.statSync(pdfResult.pdfPath);
        console.log('✅ PDF generado exitosamente. Tamaño:', pdfStats.size, 'bytes');
        if (pdfStats.size === 0) {
          console.warn('⚠️ ADVERTENCIA: El PDF generado está vacío');
        }
      }
      
      const result = {
        success: true,
        fileName,
        filePath: outputFile,
        message: 'Documento generado exitosamente'
      };
      
      // Agregar información del PDF si se generó correctamente
      if (pdfResult.success) {
        result.pdfFileName = pdfResult.pdfFileName;
        result.pdfPath = pdfResult.pdfPath;
        result.message = 'Documento DOCX y PDF generados exitosamente';
      } else {
        // Si no se pudo generar el PDF, agregar advertencia pero no fallar
        result.pdfError = pdfResult.error;
        result.message = 'Documento DOCX generado exitosamente, pero no se pudo generar el PDF';
        console.warn('Advertencia: No se pudo generar PDF:', pdfResult.error);
      }

      // Subir documentos a S3 si está configurado
      if (this.s3Service) {
        try {
          const clientName = `${clientData.first_name}_${clientData.last_name}`.replace(/[^a-zA-Z0-9_]/g, '_');
          const bookingId = bookingData.id || bookingData.booking_id;
          
          // Subir DOCX
          console.log('📤 Subiendo DOCX a S3...');
          const docxUpload = await this.s3Service.uploadReservationDocument(
            outputFile,
            bookingId,
            clientName,
            'docx'
          );
          
          if (docxUpload.success) {
            result.s3DocxKey = docxUpload.key;
            result.s3DocxUrl = docxUpload.url;
            console.log('✅ DOCX subido a S3:', docxUpload.key);
          } else {
            console.warn('⚠️ No se pudo subir DOCX a S3:', docxUpload.error);
            result.s3DocxError = docxUpload.error;
          }
          
          // Subir PDF si se generó
          if (pdfResult.success && pdfResult.pdfPath) {
            console.log('📤 Subiendo PDF a S3...');
            const pdfUpload = await this.s3Service.uploadReservationDocument(
              pdfResult.pdfPath,
              bookingId,
              clientName,
              'pdf'
            );
            
            if (pdfUpload.success) {
              result.s3PdfKey = pdfUpload.key;
              result.s3PdfUrl = pdfUpload.url;
              console.log('✅ PDF subido a S3:', pdfUpload.key);
            } else {
              console.warn('⚠️ No se pudo subir PDF a S3:', pdfUpload.error);
              result.s3PdfError = pdfUpload.error;
            }
          }
        } catch (s3Error) {
          console.error('❌ Error subiendo documentos a S3:', s3Error);
          result.s3Error = s3Error.message;
          // No fallar la generación si S3 falla, solo registrar el error
        }
      }

      return result;

    } catch (error) {
      console.error('Error generando documento:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generar mensaje de WhatsApp
  generateWhatsAppMessage(bookingData, clientData, documentFileName) {
    const cityData = this.getCityData(bookingData.city);
    
    const message = `🏡 *¡Bienvenido/a a ${cityData.UBICACION}!*

Estimado/a ${clientData.first_name} ${clientData.last_name},

Su reserva ha sido confirmada exitosamente. A continuación encontrará los detalles de su estadía:

📋 *Detalles de la Reserva:*
• Ubicación: ${cityData.UBICACION}
• Noches: ${bookingData.nights_requested}
• Personas: ${bookingData.people_count}
• Fecha de reserva: ${new Date(bookingData.created_at).toLocaleDateString('es-ES')}

📖 *Manual de Uso:*
Adjunto encontrará el manual completo con toda la información necesaria para su estadía, incluyendo:
• Información de acceso y check-in
• Detalles del Wi-Fi: ${bookingData.wifi_name || cityData.RED_WIFI}
• Contraseña Wi-Fi: ${bookingData.wifi_password || cityData.CONTRASENA_WIFI}
${bookingData.google_maps_link ? `• Ubicación: ${bookingData.google_maps_link}` : ''}
• Normas de la casa
• Procedimientos de check-out

📞 *Contacto de Emergencia:*
${cityData.NUMEROS_DE_CONTACTO}

¡Esperamos que tenga una excelente estadía!

*Kempery World Travel* 🌟`;

    return message;
  }

  // Limpiar archivos antiguos (opcional)
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.outputPath);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días

      files.forEach(file => {
        const filePath = path.join(this.outputPath, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Archivo eliminado: ${file}`);
        }
      });
    } catch (error) {
      console.error('Error limpiando archivos:', error);
    }
  }
}

module.exports = DocumentGenerator;
