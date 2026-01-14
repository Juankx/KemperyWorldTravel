/**
 * Script para importar base de datos completa en producción (EC2)
 * Importa datos desde archivos JSON exportados
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

const IMPORT_DIR = path.join(__dirname, 'database-export');
const TABLES = [
  'clients',
  'bookings',
  'payments',
  'payment_agreements',
  'requirements',
  'users',
];

async function tableExists(tableName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function getTableColumns(tableName) {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows.map(row => row.column_name);
  } catch (error) {
    return [];
  }
}

async function importTable(tableName) {
  try {
    // Verificar que la tabla existe
    const exists = await tableExists(tableName);
    if (!exists) {
      console.log(`⚠️  Tabla ${tableName} no existe, saltando...`);
      return { table: tableName, imported: 0, updated: 0, errors: 0, skipped: true };
    }

    const filePath = path.join(IMPORT_DIR, `${tableName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Archivo no encontrado: ${filePath}`);
      return { table: tableName, imported: 0, updated: 0, errors: 0 };
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`⚠️  ${tableName}: Sin datos para importar`);
      return { table: tableName, imported: 0, updated: 0, errors: 0 };
    }

    console.log(`📥 Importando ${tableName}... (${data.length} registros)`);

    // Obtener columnas existentes en la tabla
    const existingColumns = await getTableColumns(tableName);
    if (existingColumns.length === 0) {
      console.log(`⚠️  No se pudieron obtener las columnas de ${tableName}`);
      return { table: tableName, imported: 0, updated: 0, errors: data.length };
    }

    let imported = 0;
    let updated = 0;
    let errors = 0;

    // Procesar cada registro individualmente (sin transacción global)
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Filtrar columnas que existen en la tabla
        const rowColumns = Object.keys(row).filter(col => existingColumns.includes(col));
        const filteredRow = {};
        rowColumns.forEach(col => {
          filteredRow[col] = row[col];
        });

        // Verificar si existe (por ID)
        let exists = false;
        if (filteredRow.id) {
          const checkResult = await client.query(`SELECT id FROM ${tableName} WHERE id = $1`, [filteredRow.id]);
          exists = checkResult.rows.length > 0;
        }

        if (exists) {
          // Actualizar registro existente
          const updateColumns = rowColumns.filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at');
          const updateValues = updateColumns.map(col => filteredRow[col]);
          const setClause = updateColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');

          if (updateColumns.length > 0) {
            await client.query(
              `UPDATE ${tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${updateValues.length + 1}`,
              [...updateValues, filteredRow.id]
            );
            updated++;
          }
        } else {
          // Insertar nuevo registro
          const insertColumns = rowColumns.filter(col => col !== 'updated_at' || !existingColumns.includes('updated_at'));
          const insertValues = insertColumns.map(col => filteredRow[col]);
          const insertPlaceholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
          const insertColumnsList = insertColumns.join(', ');

          if (insertColumns.length > 0) {
            // Si tiene id, usar ON CONFLICT
            if (filteredRow.id) {
              await client.query(
                `INSERT INTO ${tableName} (${insertColumnsList}) VALUES (${insertPlaceholders}) ON CONFLICT (id) DO NOTHING`,
                insertValues
              );
            } else {
              await client.query(
                `INSERT INTO ${tableName} (${insertColumnsList}) VALUES (${insertPlaceholders})`,
                insertValues
              );
            }
            imported++;
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        if (i < 5 || errors < 10) { // Mostrar solo primeros errores
          console.error(`   ❌ Error en registro ${i + 1} de ${tableName}:`, error.message);
        }
        errors++;
      } finally {
        client.release();
      }

      // Mostrar progreso cada 100 registros
      if ((i + 1) % 100 === 0) {
        console.log(`   📊 Progreso: ${i + 1}/${data.length} procesados...`);
      }
    }
    
    console.log(`   ✅ ${tableName}: ${imported} importados, ${updated} actualizados, ${errors} errores`);
    
    return { table: tableName, imported, updated, errors };
  } catch (error) {
    console.error(`❌ Error importando ${tableName}:`, error.message);
    return { table: tableName, imported: 0, updated: 0, errors: 1 };
  }
}

async function importDatabase() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 IMPORTACIÓN DE BASE DE DATOS');
    console.log('='.repeat(60));
    console.log('');

    if (!fs.existsSync(IMPORT_DIR)) {
      console.error(`❌ Directorio de importación no encontrado: ${IMPORT_DIR}`);
      console.log('   Asegúrate de haber exportado la base de datos primero');
      process.exit(1);
    }

    // Verificar que las tablas existan antes de importar
    console.log('🔍 Verificando tablas en la base de datos...\n');
    const missingTables = [];
    for (const table of TABLES) {
      const exists = await tableExists(table);
      if (!exists) {
        missingTables.push(table);
        console.log(`⚠️  Tabla ${table} no existe`);
      } else {
        console.log(`✅ Tabla ${table} existe`);
      }
    }
    console.log('');

    if (missingTables.length > 0) {
      console.log('⚠️  Algunas tablas no existen. Se saltarán durante la importación.\n');
    }

    // Importar cada tabla
    const results = [];
    for (const table of TABLES) {
      const result = await importTable(table);
      results.push(result);
      console.log('');
    }

    // Resumen
    console.log('='.repeat(60));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(60));
    
    let totalImported = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    results.forEach(r => {
      console.log(`${r.table}: ${r.imported} importados, ${r.updated} actualizados, ${r.errors} errores`);
      totalImported += r.imported;
      totalUpdated += r.updated;
      totalErrors += r.errors;
    });

    console.log('='.repeat(60));
    console.log(`📊 Totales: ${totalImported} importados, ${totalUpdated} actualizados, ${totalErrors} errores`);
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Importación completada');
    console.log('');

  } catch (error) {
    console.error('❌ Error importando base de datos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  importDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { importDatabase };

