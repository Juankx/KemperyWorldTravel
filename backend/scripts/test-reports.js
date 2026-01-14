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

async function testReports() {
  try {
    console.log('🔍 Probando endpoints de reportes...\n');
    
    // Test reporte de ventas para hoy
    console.log('📊 Reporte de Ventas (Hoy):');
    const salesQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as new_clients,
        COALESCE(AVG(total_amount), 0) as average_ticket
      FROM clients 
      WHERE is_active = true 
      AND created_at >= CURRENT_DATE
    `;
    const salesResult = await pool.query(salesQuery);
    console.log('Resultado:', salesResult.rows[0]);
    
    // Test reporte de clientes para hoy
    console.log('\n👥 Reporte de Clientes (Hoy):');
    const clientsQuery = `
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN in_collections = 'true' THEN 1 END) as in_collections,
        COUNT(CASE WHEN in_collections = 'false' THEN 1 END) as active_clients
      FROM clients 
      WHERE is_active = true 
      AND created_at >= CURRENT_DATE
    `;
    const clientsResult = await pool.query(clientsQuery);
    console.log('Resultado:', clientsResult.rows[0]);
    
    // Test reporte de reservas para hoy
    console.log('\n📅 Reporte de Reservas (Hoy):');
    const bookingsQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings
      FROM bookings 
      WHERE created_at >= CURRENT_DATE
    `;
    const bookingsResult = await pool.query(bookingsQuery);
    console.log('Resultado:', bookingsResult.rows[0]);
    
    // Test reporte de requerimientos para hoy
    console.log('\n📋 Reporte de Requerimientos (Hoy):');
    const requirementsQuery = `
      SELECT 
        COUNT(*) as total_requirements,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requirements,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requirements
      FROM requirements 
      WHERE created_at >= CURRENT_DATE
    `;
    const requirementsResult = await pool.query(requirementsQuery);
    console.log('Resultado:', requirementsResult.rows[0]);
    
    // Test con datos de ayer
    console.log('\n📊 Reporte de Ventas (Ayer):');
    const salesYesterdayQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as new_clients,
        COALESCE(AVG(total_amount), 0) as average_ticket
      FROM clients 
      WHERE is_active = true 
      AND created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE
    `;
    const salesYesterdayResult = await pool.query(salesYesterdayQuery);
    console.log('Resultado:', salesYesterdayResult.rows[0]);
    
    // Test con datos de los últimos 13 días
    console.log('\n📊 Reporte de Ventas (Últimos 13 días):');
    const sales13DaysQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as new_clients,
        COALESCE(AVG(total_amount), 0) as average_ticket
      FROM clients 
      WHERE is_active = true 
      AND created_at >= CURRENT_DATE - INTERVAL '13 days'
    `;
    const sales13DaysResult = await pool.query(sales13DaysQuery);
    console.log('Resultado:', sales13DaysResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testReports();
