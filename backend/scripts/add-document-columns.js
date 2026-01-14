const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+'
});

async function addDocumentColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Agregando columnas de documento a la tabla bookings...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'add-document-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await client.query(sql);
    
    console.log('✅ Columnas agregadas exitosamente:');
    console.log('   - document_sent (BOOLEAN)');
    console.log('   - document_sent_at (TIMESTAMP)');
    console.log('   - Índices creados para mejor performance');
    
    // Verificar que las columnas se agregaron correctamente
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN ('document_sent', 'document_sent_at')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Verificación de columnas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error agregando columnas:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addDocumentColumns()
    .then(() => {
      console.log('\n🎉 Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { addDocumentColumns };