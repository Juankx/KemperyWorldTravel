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

async function checkRequirementsStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla requirements...\n');
    
    // Verificar estructura de la tabla
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'requirements' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de la tabla requirements:');
    console.log('=====================================');
    structure.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable}`);
    });
    
    console.log('\n📋 Datos de la tabla requirements:');
    console.log('=====================================');
    
    // Verificar datos con la estructura correcta
    const allRequirements = await pool.query(`
      SELECT * FROM requirements ORDER BY created_at DESC LIMIT 5
    `);
    
    allRequirements.rows.forEach((req, i) => {
      console.log(`\n${i+1}. Requerimiento:`);
      Object.keys(req).forEach(key => {
        console.log(`   ${key}: ${req[key]}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRequirementsStructure();
