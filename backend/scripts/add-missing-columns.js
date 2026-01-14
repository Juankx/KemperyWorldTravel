const { Pool } = require('pg');
require('dotenv').config({ path: '../config.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addMissingColumns() {
  try {
    console.log('🔧 Agregando columnas faltantes a la tabla clients...');
    
    // Agregar columnas que faltan
    const alterQueries = [
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS identification VARCHAR(20)',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50)',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT \'sin_pago\'',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS international_bonus VARCHAR(100)',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_date DATE',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)'
    ];

    for (const query of alterQueries) {
      await pool.query(query);
      console.log(`✅ Ejecutado: ${query}`);
    }

    // Crear índices para mejorar el rendimiento
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_clients_payment_status ON clients(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_clients_contract_number ON clients(contract_number)',
      'CREATE INDEX IF NOT EXISTS idx_clients_identification ON clients(identification)'
    ];

    for (const query of indexQueries) {
      await pool.query(query);
      console.log(`✅ Índice creado: ${query}`);
    }

    console.log('🎉 Columnas agregadas exitosamente!');
    
    // Verificar la estructura actualizada
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura actualizada de la tabla clients:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error agregando columnas:', error);
  } finally {
    await pool.end();
  }
}

addMissingColumns();
