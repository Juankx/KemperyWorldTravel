const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'kempery_travel',
  password: 'Princonserkids2025+',
  port: 5432,
});

async function addCollectionsColumn() {
  try {
    console.log('🔧 Agregando columna in_collections a la tabla clients...');

    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS in_collections VARCHAR(10) DEFAULT 'No';
    `);

    console.log('✅ Columna in_collections agregada correctamente.');

    console.log('🔧 Creando índice para mejorar el rendimiento...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_clients_in_collections ON clients(in_collections);`);
    console.log('✅ Índice creado correctamente.');

    // Verificar que la columna se agregó correctamente
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'in_collections'
    `);

    if (result.rows.length > 0) {
      console.log('📋 Columna verificada:', result.rows[0]);
    }

  } catch (error) {
    console.error('❌ Error agregando columna:', error);
  } finally {
    await pool.end();
  }
}

addCollectionsColumn();
