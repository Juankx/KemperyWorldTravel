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

async function testRequirementsToday() {
  try {
    console.log('🔍 Probando consulta de requerimientos de hoy...\n');
    
    // Consulta simple para requerimientos de hoy
    const todayQuery = `
      SELECT COUNT(*) as total 
      FROM requirements 
      WHERE created_at >= CURRENT_DATE
    `;
    
    const todayResult = await pool.query(todayQuery);
    console.log(`📅 Requerimientos creados hoy: ${todayResult.rows[0].total}`);
    
    // Consulta con detalles
    const detailsQuery = `
      SELECT 
        contract_number,
        requirement_type,
        status,
        created_by,
        created_at
      FROM requirements 
      WHERE created_at >= CURRENT_DATE
    `;
    
    const detailsResult = await pool.query(detailsQuery);
    console.log('\n📋 Detalles de requerimientos de hoy:');
    detailsResult.rows.forEach((req, i) => {
      console.log(`${i+1}. Contrato: ${req.contract_number}`);
      console.log(`   Tipo: ${req.requirement_type}`);
      console.log(`   Estado: ${req.status}`);
      console.log(`   Creado por: ${req.created_by}`);
      console.log(`   Fecha: ${req.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testRequirementsToday();
