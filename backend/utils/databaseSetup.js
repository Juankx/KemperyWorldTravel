const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+'
});

async function setupDocumentColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Verificando columnas de documento en la tabla bookings...');
    
    // Verificar si las columnas ya existen
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN ('document_sent', 'document_sent_at')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    if (existingColumns.includes('document_sent') && existingColumns.includes('document_sent_at')) {
      console.log('✅ Las columnas document_sent y document_sent_at ya existen');
      return;
    }
    
    // Agregar columnas faltantes
    if (!existingColumns.includes('document_sent')) {
      await client.query('ALTER TABLE bookings ADD COLUMN document_sent BOOLEAN DEFAULT FALSE');
      console.log('✅ Columna document_sent agregada');
    }
    
    if (!existingColumns.includes('document_sent_at')) {
      await client.query('ALTER TABLE bookings ADD COLUMN document_sent_at TIMESTAMP DEFAULT NULL');
      console.log('✅ Columna document_sent_at agregada');
    }
    
    // Crear índices para mejor performance
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_document_sent ON bookings(document_sent)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_document_sent_at ON bookings(document_sent_at)');
      console.log('✅ Índices creados para mejor performance');
    } catch (error) {
      console.log('⚠️ Los índices ya existen o no se pudieron crear');
    }
    
    console.log('🎉 Configuración de base de datos completada');
    
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { setupDocumentColumns };
