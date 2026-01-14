const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function addYearsColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Verificando/agregando columna years a la tabla clients...');
    
    // Verificar si la columna ya existe
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND table_schema = 'public'
      AND column_name = 'years'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ La columna years ya existe en la tabla clients');
      return;
    }
    
    // Agregar la columna
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN years INTEGER;
    `);
    
    console.log('✅ Columna years agregada exitosamente a la tabla clients');
    
  } catch (error) {
    console.error('❌ Error agregando columna years:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addYearsColumn()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { addYearsColumn };

