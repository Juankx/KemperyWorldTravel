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

async function verifyImport() {
  try {
    console.log('🔍 Verificando importación de datos...\n');
    
    // Total de clientes activos
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM clients WHERE is_active = true');
    console.log(`📊 Total de clientes activos: ${totalResult.rows[0].total}`);
    
    // Clientes importados recientemente (últimos 5 minutos)
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent 
      FROM clients 
      WHERE is_active = true 
      AND created_at > NOW() - INTERVAL '5 minutes'
    `);
    console.log(`🆕 Clientes importados recientemente: ${recentResult.rows[0].recent}`);
    
    // Muestra de clientes importados
    const sampleResult = await pool.query(`
      SELECT contract_number, first_name, last_name, created_at, total_amount
      FROM clients 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Muestra de clientes importados:');
    console.log('=====================================');
    sampleResult.rows.forEach((client, i) => {
      console.log(`${i + 1}. ${client.contract_number} - ${client.first_name} ${client.last_name}`);
      console.log(`   Fecha: ${client.created_at?.toLocaleDateString('es-ES') || 'N/A'}`);
      console.log(`   Monto: $${client.total_amount || 0}`);
      console.log('');
    });
    
    // Estadísticas por año
    const yearStatsResult = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM created_at) as year,
        COUNT(*) as count
      FROM clients 
      WHERE is_active = true 
      GROUP BY EXTRACT(YEAR FROM created_at)
      ORDER BY year
    `);
    
    console.log('📅 Estadísticas por año:');
    console.log('========================');
    yearStatsResult.rows.forEach(row => {
      console.log(`${row.year}: ${row.count} clientes`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyImport();
