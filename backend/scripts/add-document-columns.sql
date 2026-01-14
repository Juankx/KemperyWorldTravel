-- Agregar columnas para tracking de documentos enviados
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS document_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS document_sent_at TIMESTAMP DEFAULT NULL;

-- Crear índice para mejorar performance en consultas de documentos enviados
CREATE INDEX IF NOT EXISTS idx_bookings_document_sent ON bookings(document_sent);
CREATE INDEX IF NOT EXISTS idx_bookings_document_sent_at ON bookings(document_sent_at);

-- Comentarios para documentar las nuevas columnas
COMMENT ON COLUMN bookings.document_sent IS 'Indica si el documento de reserva ha sido enviado al cliente';
COMMENT ON COLUMN bookings.document_sent_at IS 'Timestamp de cuando se envió el documento al cliente';
