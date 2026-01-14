/**
 * Script para exportar toda la base de datos desde desarrollo
 * Exporta esquema y datos de todas las tablas principales
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const EXPORT_DIR = path.join(__dirname, 'database-export');
const TABLES = [
  'clients',
  'bookings',
  'payments',
  'payment_agreements',
  'requirements',
  'users', // Excluir Paola al exportar
];

async function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

async function exportTable(tableName) {
  try {
    console.log(`📤 Exportando tabla: ${tableName}...`);
    
    // Obtener datos
    let query = `SELECT * FROM ${tableName}`;
    
    // Excluir Paola de usuarios
    if (tableName === 'users') {
      query += ` WHERE email NOT ILIKE '%paola%' AND first_name NOT ILIKE '%paola%'`;
    }
    
    const result = await pool.query(query);
    
    // Guardar en archivo JSON
    const filePath = path.join(EXPORT_DIR, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(result.rows, null, 2), 'utf8');
    
    console.log(`   ✅ Exportados ${result.rows.length} registros`);
    return { table: tableName, count: result.rows.length, file: filePath };
  } catch (error) {
    console.error(`   ❌ Error exportando ${tableName}:`, error.message);
    return { table: tableName, count: 0, error: error.message };
  }
}

async function exportSchema() {
  try {
    console.log('📤 Exportando esquema de base de datos...');
    
    // Obtener estructura de tablas
    const schemaResult = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN (${TABLES.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY table_name, ordinal_position
    `, TABLES);
    
    const schemaPath = path.join(EXPORT_DIR, 'schema.json');
    fs.writeFileSync(schemaPath, JSON.stringify(schemaResult.rows, null, 2), 'utf8');
    
    console.log(`   ✅ Esquema exportado: ${schemaResult.rows.length} columnas`);
    return schemaPath;
  } catch (error) {
    console.error('   ❌ Error exportando esquema:', error.message);
    throw error;
  }
}

async function exportDatabase() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 EXPORTACIÓN DE BASE DE DATOS');
    console.log('='.repeat(60));
    console.log('');

    await ensureExportDir();

    // Exportar esquema
    await exportSchema();
    console.log('');

    // Exportar cada tabla
    const results = [];
    for (const table of TABLES) {
      const result = await exportTable(table);
      results.push(result);
    }

    // Crear archivo de resumen
    const summary = {
      exportDate: new Date().toISOString(),
      tables: results,
      totalRecords: results.reduce((sum, r) => sum + (r.count || 0), 0)
    };

    const summaryPath = path.join(EXPORT_DIR, 'export-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    console.log('');
    console.log('='.repeat(60));
    console.log('📊 RESUMEN DE EXPORTACIÓN');
    console.log('='.repeat(60));
    results.forEach(r => {
      if (r.error) {
        console.log(`❌ ${r.table}: Error - ${r.error}`);
      } else {
        console.log(`✅ ${r.table}: ${r.count} registros`);
      }
    });
    console.log(`📊 Total de registros: ${summary.totalRecords}`);
    console.log(`📁 Directorio de exportación: ${EXPORT_DIR}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Exportación completada exitosamente');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Sube la carpeta database-export a EC2');
    console.log('   2. Ejecuta: node scripts/importar-base-datos.js');
    console.log('');

  } catch (error) {
    console.error('❌ Error exportando base de datos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  exportDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { exportDatabase };

