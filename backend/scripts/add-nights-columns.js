const pool = require('../config/database');

async function addNightsColumns() {
  try {
    console.log('🔧 Agregando columnas de noches a la tabla clients...');

    // Agregar columna total_nights
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS total_nights INTEGER DEFAULT 0;
    `);

    // Agregar columna remaining_nights
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS remaining_nights INTEGER DEFAULT 0;
    `);

    console.log('✅ Columnas de noches agregadas correctamente.');

    console.log('🔧 Creando índices para mejorar el rendimiento...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clients_total_nights ON clients(total_nights);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clients_remaining_nights ON clients(remaining_nights);`);
    console.log('✅ Índices creados correctamente.');

    // Verificar las columnas agregadas
    const result = await pool.query(
      `SELECT column_name, data_type, column_default
       FROM information_schema.columns
       WHERE table_name = 'clients' AND column_name IN ('total_nights', 'remaining_nights')
       ORDER BY column_name;`
    );
    
    console.log('📋 Columnas verificadas:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    });

  } catch (error) {
    console.error('❌ Error agregando columnas de noches:', error);
  } finally {
    await pool.end();
  }
}

addNightsColumns();
