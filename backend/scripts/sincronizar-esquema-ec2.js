/**
 * Script para sincronizar el esquema de la base de datos desde desarrollo a producción
 * Agrega columnas faltantes sin perder datos existentes
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Columnas que deben existir en la tabla clients
const CLIENT_COLUMNS = [
  { name: 'identification', type: 'VARCHAR(20)', nullable: true },
  { name: 'contract_number', type: 'VARCHAR(50)', nullable: true },
  { name: 'payment_status', type: 'VARCHAR(20)', default: "'sin_pago'", nullable: true },
  { name: 'total_amount', type: 'DECIMAL(10,2)', default: '0', nullable: true },
  { name: 'international_bonus', type: 'VARCHAR(100)', nullable: true },
  { name: 'payment_date', type: 'DATE', nullable: true },
  { name: 'payment_method', type: 'VARCHAR(50)', nullable: true },
  { name: 'in_collections', type: 'VARCHAR(10)', nullable: true },
  { name: 'nights', type: 'INTEGER', nullable: true },
  { name: 'years', type: 'INTEGER', nullable: true },
  { name: 'total_nights', type: 'INTEGER', default: '0', nullable: true },
  { name: 'remaining_nights', type: 'INTEGER', default: '0', nullable: true },
];

async function getExistingColumns(tableName) {
  const result = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows.map(row => row.column_name);
}

async function addMissingColumns() {
  try {
    console.log('🔧 Sincronizando esquema de base de datos...\n');

    // Verificar columnas existentes en clients
    const existingColumns = await getExistingColumns('clients');
    console.log(`📋 Columnas existentes en clients: ${existingColumns.length}`);
    
    // Agregar columnas faltantes
    let addedCount = 0;
    for (const column of CLIENT_COLUMNS) {
      if (!existingColumns.includes(column.name)) {
        let alterQuery = `ALTER TABLE clients ADD COLUMN ${column.name} ${column.type}`;
        
        if (column.default) {
          alterQuery += ` DEFAULT ${column.default}`;
        }
        
        if (column.nullable !== false) {
          alterQuery += ' NULL';
        }
        
        try {
          await pool.query(alterQuery);
          console.log(`✅ Columna agregada: ${column.name}`);
          addedCount++;
        } catch (error) {
          console.error(`❌ Error agregando ${column.name}:`, error.message);
        }
      } else {
        console.log(`✓ Columna ya existe: ${column.name}`);
      }
    }

    // Crear índices si no existen
    const indexes = [
      { name: 'idx_clients_payment_status', query: 'CREATE INDEX IF NOT EXISTS idx_clients_payment_status ON clients(payment_status)' },
      { name: 'idx_clients_contract_number', query: 'CREATE INDEX IF NOT EXISTS idx_clients_contract_number ON clients(contract_number)' },
      { name: 'idx_clients_identification', query: 'CREATE INDEX IF NOT EXISTS idx_clients_identification ON clients(identification)' },
      { name: 'idx_clients_in_collections', query: 'CREATE INDEX IF NOT EXISTS idx_clients_in_collections ON clients(in_collections)' },
    ];

    console.log('\n📊 Creando índices...');
    for (const index of indexes) {
      try {
        await pool.query(index.query);
        console.log(`✅ Índice creado/verificado: ${index.name}`);
      } catch (error) {
        console.log(`⚠️  Índice ${index.name}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE SINCRONIZACIÓN DE ESQUEMA');
    console.log('='.repeat(60));
    console.log(`✅ Columnas agregadas: ${addedCount}`);
    console.log(`✓ Columnas ya existentes: ${CLIENT_COLUMNS.length - addedCount}`);
    console.log('='.repeat(60) + '\n');

    // Verificar estructura final
    const finalColumns = await getExistingColumns('clients');
    console.log(`📋 Total de columnas en clients: ${finalColumns.length}`);
    console.log('\n✅ Sincronización de esquema completada!\n');

  } catch (error) {
    console.error('❌ Error sincronizando esquema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addMissingColumns()
    .then(() => {
      console.log('🎉 Proceso completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { addMissingColumns };

