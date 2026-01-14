const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function addPendingDebtColumn() {
  try {
    console.log('🔧 Verificando/agregando columna pending_debt a la tabla clients...');

    const columnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'clients' AND column_name = 'pending_debt';
    `);

    if (columnCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE clients
        ADD COLUMN pending_debt DECIMAL(10,2) DEFAULT 0;
      `);
      console.log('✅ Columna pending_debt agregada exitosamente a la tabla clients');
    } else {
      console.log('✅ La columna pending_debt ya existe en la tabla clients');
    }

    // Crear índice para mejorar el rendimiento de consultas
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_clients_pending_debt ON clients(pending_debt);
      `);
      console.log('✅ Índice creado para pending_debt');
    } catch (error) {
      console.log('⚠️  El índice ya existe o no se pudo crear:', error.message);
    }

  } catch (error) {
    console.error('❌ Error al agregar la columna pending_debt:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  addPendingDebtColumn()
    .then(() => {
      console.log('✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { addPendingDebtColumn };
