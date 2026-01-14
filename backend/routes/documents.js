const express = require('express');
const path = require('path');
const fs = require('fs');
const DocumentGenerator = require('../services/documentGenerator');
const WhatsAppService = require('../services/whatsappService');

// Cargar S3Service de forma condicional (solo si está disponible)
let S3Service;
try {
  S3Service = require('../services/s3Service');
} catch (error) {
  // S3Service no disponible (AWS SDK no instalado o error al cargar)
  S3Service = null;
  console.log('ℹ️ S3Service no disponible en routes/documents.js. Funcionará en modo local solamente.');
}

const pool = require('../config/database');
const { authenticateToken, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();
const documentGenerator = new DocumentGenerator();
const whatsappService = new WhatsAppService();

// Inicializar S3Service solo si está disponible y hay credenciales
let s3Service = null;
if (S3Service && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  try {
    s3Service = new S3Service();
    console.log('✅ S3Service inicializado en routes/documents.js');
  } catch (error) {
    console.warn('⚠️ No se pudo inicializar S3Service en routes/documents.js:', error.message);
    s3Service = null;
  }
} else {
  if (!S3Service) {
    console.log('ℹ️ S3Service no disponible en routes/documents.js (AWS SDK no instalado)');
  } else {
    console.log('ℹ️ S3Service no inicializado en routes/documents.js: credenciales AWS no configuradas');
  }
}

// Generar documento de reserva
router.post('/generate-reservation/:bookingId', authenticateToken, requireModuleAccess(['bookings']), async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Obtener datos de la reserva y cliente
    const bookingResult = await pool.query(`
      SELECT 
        b.*,
        c.first_name, c.last_name, c.email, c.phone
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = bookingResult.rows[0];
    const client = {
      first_name: booking.first_name,
      last_name: booking.last_name,
      email: booking.email,
      phone: booking.phone
    };

    // Generar documento
    const documentResult = await documentGenerator.generateReservationDocument(booking, client);

    if (!documentResult.success) {
      return res.status(500).json({ error: documentResult.error });
    }

    // Generar mensaje de WhatsApp
    const whatsappMessage = documentGenerator.generateWhatsAppMessage(booking, client, documentResult.fileName);

    const responseData = {
      success: true,
      document: {
        fileName: documentResult.fileName,
        filePath: documentResult.filePath
      },
      whatsappMessage,
      message: documentResult.message || 'Documento generado exitosamente'
    };

    // Agregar información del PDF si está disponible
    if (documentResult.pdfFileName && documentResult.pdfPath) {
      responseData.pdf = {
        fileName: documentResult.pdfFileName,
        filePath: documentResult.pdfPath
      };
    } else if (documentResult.pdfError) {
      responseData.pdfError = documentResult.pdfError;
    }

    // Agregar información de S3 si los documentos se subieron
    if (documentResult.s3DocxKey) {
      responseData.s3 = {
        docx: {
          key: documentResult.s3DocxKey,
          url: documentResult.s3DocxUrl
        }
      };
      if (documentResult.s3PdfKey) {
        responseData.s3.pdf = {
          key: documentResult.s3PdfKey,
          url: documentResult.s3PdfUrl
        };
      }
    }

    res.json(responseData);

  } catch (error) {
    console.error('Error generando documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Enviar documento por WhatsApp
router.post('/send-whatsapp/:bookingId', authenticateToken, requireModuleAccess(['bookings']), async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Obtener datos de la reserva y cliente
    const bookingResult = await pool.query(`
      SELECT 
        b.*,
        c.first_name, c.last_name, c.email, c.phone
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = bookingResult.rows[0];
    const client = {
      first_name: booking.first_name,
      last_name: booking.last_name,
      email: booking.email,
      phone: booking.phone
    };

    // Generar documento
    const documentResult = await documentGenerator.generateReservationDocument(booking, client);

    if (!documentResult.success) {
      return res.status(500).json({ error: documentResult.error });
    }

    // Generar mensaje de WhatsApp
    const whatsappMessage = documentGenerator.generateWhatsAppMessage(booking, client, documentResult.fileName);

    // Usar PDF si está disponible, de lo contrario usar DOCX
    const fileToSend = documentResult.pdfPath || documentResult.filePath;
    const fileNameToSend = documentResult.pdfFileName || documentResult.fileName;

    // Enviar por WhatsApp
    const whatsappResult = await whatsappService.sendMessageViaWebAPI(
      client.phone,
      whatsappMessage,
      fileToSend
    );

    if (!whatsappResult.success) {
      return res.status(500).json({ error: whatsappResult.error });
    }

    // Actualizar la reserva con el estado de documento enviado
    await pool.query(
      'UPDATE bookings SET document_sent = true, document_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
      [bookingId]
    );

    const responseData = {
      success: true,
      document: {
        fileName: documentResult.fileName,
        filePath: documentResult.filePath
      },
      whatsapp: {
        messageId: whatsappResult.messageId,
        sent: true
      },
      message: 'Documento enviado por WhatsApp exitosamente'
    };

    // Agregar información del PDF si está disponible
    if (documentResult.pdfFileName && documentResult.pdfPath) {
      responseData.pdf = {
        fileName: documentResult.pdfFileName,
        filePath: documentResult.pdfPath
      };
      responseData.message = 'PDF enviado por WhatsApp exitosamente';
    }

    res.json(responseData);

  } catch (error) {
    console.error('Error enviando documento por WhatsApp:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Generar y enviar documento completo (una sola operación)
router.post('/generate-and-send/:bookingId', authenticateToken, requireModuleAccess(['bookings']), async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Obtener datos de la reserva y cliente
    const bookingResult = await pool.query(`
      SELECT 
        b.*,
        c.first_name, c.last_name, c.email, c.phone
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = bookingResult.rows[0];
    const client = {
      first_name: booking.first_name,
      last_name: booking.last_name,
      email: booking.email,
      phone: booking.phone
    };

    // Generar documento
    const documentResult = await documentGenerator.generateReservationDocument(booking, client);

    if (!documentResult.success) {
      return res.status(500).json({ error: documentResult.error });
    }

    // Generar mensaje de WhatsApp
    const whatsappMessage = documentGenerator.generateWhatsAppMessage(booking, client, documentResult.fileName);

    // Usar PDF si está disponible, de lo contrario usar DOCX
    const fileToSend = documentResult.pdfPath || documentResult.filePath;
    const fileNameToSend = documentResult.pdfFileName || documentResult.fileName;

    // Enviar por WhatsApp
    const whatsappResult = await whatsappService.sendMessageViaWebAPI(
      client.phone,
      whatsappMessage,
      fileToSend
    );

    if (!whatsappResult.success) {
      return res.status(500).json({ error: whatsappResult.error });
    }

    // Actualizar la reserva con el estado de documento enviado
    await pool.query(
      'UPDATE bookings SET document_sent = true, document_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
      [bookingId]
    );

    const responseData = {
      success: true,
      document: {
        fileName: documentResult.fileName,
        filePath: documentResult.filePath
      },
      whatsapp: {
        messageId: whatsappResult.messageId,
        sent: true,
        message: whatsappMessage
      },
      message: 'Documento generado y enviado por WhatsApp exitosamente'
    };

    // Agregar información del PDF si está disponible
    if (documentResult.pdfFileName && documentResult.pdfPath) {
      responseData.pdf = {
        fileName: documentResult.pdfFileName,
        filePath: documentResult.pdfPath
      };
      responseData.message = 'PDF generado y enviado por WhatsApp exitosamente';
    }

    res.json(responseData);

  } catch (error) {
    console.error('Error generando y enviando documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Descargar documento generado (DOCX o PDF)
router.get('/download/:fileName', authenticateToken, (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(documentGenerator.outputPath, fileName);

    // Verificar que el archivo existe
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Enviar archivo
    res.download(filePath, fileName);

  } catch (error) {
    console.error('Error descargando documento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Descargar PDF de una reserva específica
router.get('/download-pdf/:bookingId', authenticateToken, requireModuleAccess(['bookings']), async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log(`📥 Solicitud de PDF para reserva: ${bookingId}`);

    // Obtener datos de la reserva
    const bookingResult = await pool.query(`
      SELECT 
        b.*,
        c.first_name, c.last_name, c.email, c.phone
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      console.error(`❌ Reserva no encontrada: ${bookingId}`);
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = bookingResult.rows[0];
    const client = {
      first_name: booking.first_name,
      last_name: booking.last_name,
      email: booking.email,
      phone: booking.phone
    };

    console.log(`📄 Generando documento para: ${client.first_name} ${client.last_name}`);

    // Intentar obtener PDF desde S3 primero si está configurado
    if (s3Service) {
      try {
        const pdfFileName = `Reserva_${booking.contract_number || bookingId}.pdf`;
        const s3Key = `documents/${bookingId}/${pdfFileName}`;
        
        const exists = await s3Service.fileExists(s3Key);
        if (exists) {
          console.log(`✅ PDF encontrado en S3: ${s3Key}`);
          const signedUrl = await s3Service.getSignedUrl(s3Key, 3600); // URL válida por 1 hora
          
          // Redirigir a la URL firmada de S3
          return res.redirect(signedUrl);
        } else {
          console.log(`ℹ️ PDF no encontrado en S3, generando nuevo documento...`);
        }
      } catch (s3Error) {
        console.warn('⚠️ Error verificando S3, continuando con generación local:', s3Error.message);
      }
    }

    // Generar documento (esto generará tanto DOCX como PDF)
    const documentResult = await documentGenerator.generateReservationDocument(booking, client);

    if (!documentResult.success) {
      console.error(`❌ Error generando documento: ${documentResult.error}`);
      return res.status(500).json({ error: documentResult.error });
    }

    // Verificar que el PDF existe
    if (!documentResult.pdfPath) {
      console.error(`❌ PDF no disponible. Error: ${documentResult.pdfError || 'No se especificó'}`);
      
      // Intentar generar el PDF nuevamente si no está disponible
      console.log(`🔄 Intentando generar PDF nuevamente...`);
      const retryPdfResult = await documentGenerator.convertDocxToPdf(documentResult.filePath);
      
      if (retryPdfResult.success && fs.existsSync(retryPdfResult.pdfPath)) {
        const pdfStats = fs.statSync(retryPdfResult.pdfPath);
        if (pdfStats.size > 0) {
          console.log(`✅ PDF generado en reintento: ${retryPdfResult.pdfPath} (${pdfStats.size} bytes)`);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${retryPdfResult.pdfFileName}"`);
          res.setHeader('Content-Length', pdfStats.size);
          
          const pdfStream = fs.createReadStream(retryPdfResult.pdfPath);
          pdfStream.on('error', (error) => {
            console.error('❌ Error leyendo archivo PDF:', error);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error leyendo archivo PDF' });
            }
          });
          pdfStream.pipe(res);
          return;
        }
      }
      
      // Si después del reintento aún no hay PDF, retornar error explicativo
      console.error(`❌ No se pudo generar el PDF después del reintento. Error: ${retryPdfResult.error || documentResult.pdfError}`);
      return res.status(500).json({ 
        error: 'No se pudo generar el PDF. ' + (retryPdfResult.error || documentResult.pdfError || 'El PDF no se pudo generar.') + 
                (retryPdfResult.error && retryPdfResult.error.includes('LibreOffice') 
                  ? ' Por favor, instale LibreOffice para generar PDFs.' 
                  : ' Por favor, verifique que LibreOffice esté instalado y disponible en el PATH.')
      });
    }

    if (!fs.existsSync(documentResult.pdfPath)) {
      console.error(`❌ Archivo PDF no encontrado en: ${documentResult.pdfPath}`);
      return res.status(404).json({ error: 'Archivo PDF no encontrado' });
    }

    // Verificar que el PDF tiene contenido
    const stats = fs.statSync(documentResult.pdfPath);
    if (stats.size === 0) {
      console.error(`❌ El archivo PDF está vacío: ${documentResult.pdfPath}`);
      return res.status(500).json({ error: 'El PDF generado está vacío' });
    }

    console.log(`✅ Enviando PDF: ${documentResult.pdfPath} (${stats.size} bytes)`);

    // Configurar headers para mostrar PDF en iframe
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${documentResult.pdfFileName}"`);
    res.setHeader('Content-Length', stats.size);
    
    // Remover X-Frame-Options para permitir carga en iframe (ya está configurado en Helmet)
    res.removeHeader('X-Frame-Options');
    
    // Enviar archivo PDF
    const fileStream = fs.createReadStream(documentResult.pdfPath);
    
    fileStream.on('error', (error) => {
      console.error('❌ Error leyendo archivo PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error leyendo archivo PDF' });
      }
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error descargando PDF:', error);
    console.error('Stack trace:', error.stack);
    
    // Asegurarse de que no se haya enviado respuesta ya
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message 
      });
    }
  }
});

// Limpiar archivos antiguos
router.post('/cleanup', authenticateToken, requireModuleAccess(['bookings']), (req, res) => {
  try {
    documentGenerator.cleanupOldFiles();
    res.json({ success: true, message: 'Archivos antiguos eliminados' });
  } catch (error) {
    console.error('Error limpiando archivos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
