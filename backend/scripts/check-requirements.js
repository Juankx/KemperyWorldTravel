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

async function checkRequirements() {
  try {
    console.log('🔍 Verificando requerimientos...\n');
    
    // Verificar todos los requerimientos
    const allRequirements = await pool.query(`
      SELECT id, client_contract_number, requirement_type, status, created_at 
      FROM requirements 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('📋 Últimos 10 requerimientos:');
    allRequirements.rows.forEach((req, i) => {
      console.log(`${i+1}. ID: ${req.id}`);
      console.log(`   Contrato: ${req.client_contract_number}`);
      console.log(`   Tipo: ${req.requirement_type}`);
      console.log(`   Estado: ${req.status}`);
      console.log(`   Fecha: ${req.created_at}`);
      console.log('');
    });
    
    // Verificar requerimientos de hoy
    const todayRequirements = await pool.query(`
      SELECT COUNT(*) as count 
      FROM requirements 
      WHERE created_at >= CURRENT_DATE
    `);
    
    console.log(`📅 Requerimientos creados hoy: ${todayRequirements.rows[0].count}`);
    
    // Verificar requerimientos de ayer
    const yesterdayRequirements = await pool.query(`
      SELECT COUNT(*) as count 
      FROM requirements 
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE
    `);
    
    console.log(`📅 Requerimientos creados ayer: ${yesterdayRequirements.rows[0].count}`);
    
    // Verificar requerimientos de los últimos 13 días
    const last13DaysRequirements = await pool.query(`
      SELECT COUNT(*) as count 
      FROM requirements 
      WHERE created_at >= CURRENT_DATE - INTERVAL '13 days'
    `);
    
    console.log(`📅 Requerimientos creados en los últimos 13 días: ${last13DaysRequirements.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRequirements();
