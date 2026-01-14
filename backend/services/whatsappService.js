const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class WhatsAppService {
  constructor() {
    // Configuración de WhatsApp Business API
    this.apiUrl = 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'YOUR_VERIFY_TOKEN';
  }

  // Enviar mensaje de texto
  async sendTextMessage(to, message) {
    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        message: 'Mensaje enviado exitosamente'
      };

    } catch (error) {
      console.error('Error enviando mensaje de WhatsApp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Enviar documento
  async sendDocument(to, filePath, fileName, caption = '') {
    try {
      // Primero subir el archivo a WhatsApp
      const mediaId = await this.uploadMedia(filePath);
      
      if (!mediaId) {
        throw new Error('No se pudo subir el archivo');
      }

      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'document',
        document: {
          id: mediaId,
          filename: fileName,
          caption: caption
        }
      };

      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        message: 'Documento enviado exitosamente'
      };

    } catch (error) {
      console.error('Error enviando documento por WhatsApp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Subir archivo a WhatsApp
  async uploadMedia(filePath) {
    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/media`;
      
      // Determinar el tipo MIME basado en la extensión del archivo
      const path = require('path');
      const ext = path.extname(filePath).toLowerCase();
      let mimeType;
      
      if (ext === '.pdf') {
        mimeType = 'application/pdf';
      } else if (ext === '.docx' || ext === '.doc') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
        // Default a DOCX si no se puede determinar
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('type', mimeType);
      formData.append('messaging_product', 'whatsapp');

      const response = await axios.post(url, formData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          ...formData.getHeaders()
        }
      });

      return response.data.id;

    } catch (error) {
      console.error('Error subiendo archivo:', error.response?.data || error.message);
      return null;
    }
  }

  // Enviar mensaje completo (texto + documento)
  async sendCompleteMessage(to, message, filePath, fileName) {
    try {
      // Enviar mensaje de texto primero
      const textResult = await this.sendTextMessage(to, message);
      
      if (!textResult.success) {
        return textResult;
      }

      // Esperar un poco antes de enviar el documento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Enviar documento
      const documentResult = await this.sendDocument(to, filePath, fileName, 'Manual de uso para su estadía');

      return {
        success: documentResult.success,
        textMessageId: textResult.messageId,
        documentMessageId: documentResult.messageId,
        message: documentResult.success ? 'Mensaje completo enviado exitosamente' : documentResult.error
      };

    } catch (error) {
      console.error('Error enviando mensaje completo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Método alternativo usando WhatsApp Web API (para desarrollo/testing)
  async sendMessageViaWebAPI(to, message, filePath = null) {
    try {
      // Para desarrollo, podemos usar una API alternativa o simular el envío
      console.log(`📱 Simulando envío de WhatsApp a ${to}`);
      console.log(`📝 Mensaje: ${message}`);
      
      if (filePath) {
        const path = require('path');
        const ext = path.extname(filePath).toLowerCase();
        const fileType = ext === '.pdf' ? 'PDF' : ext === '.docx' ? 'DOCX' : 'Documento';
        console.log(`📄 Archivo adjunto (${fileType}): ${filePath}`);
      }

      // En un entorno de producción, aquí iría la implementación real
      // Por ahora simulamos el éxito
      return {
        success: true,
        messageId: `sim_${Date.now()}`,
        message: 'Mensaje simulado enviado exitosamente'
      };

    } catch (error) {
      console.error('Error en envío simulado:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verificar webhook de WhatsApp
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  // Procesar mensajes entrantes
  processIncomingMessage(body) {
    try {
      const entry = body.entry[0];
      const changes = entry.changes[0];
      const value = changes.value;

      if (value.messages) {
        const message = value.messages[0];
        return {
          from: message.from,
          messageId: message.id,
          timestamp: message.timestamp,
          type: message.type,
          text: message.text?.body || '',
          document: message.document || null
        };
      }

      return null;
    } catch (error) {
      console.error('Error procesando mensaje entrante:', error);
      return null;
    }
  }
}

module.exports = WhatsAppService;
