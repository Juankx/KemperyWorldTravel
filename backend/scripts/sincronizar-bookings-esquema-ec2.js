/**
 * Script para sincronizar el esquema de la tabla bookings
 * Agrega columnas faltantes que se usan en las queries
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

// Verificar y convertir special_requests a JSONB si es necesario
async function ensureSpecialRequestsIsJSONB() {
  try {
    // Verificar el tipo actual de special_requests
    const typeResult = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'special_requests'
    `);
    
    if (typeResult.rows.length > 0) {
      const currentType = typeResult.rows[0].data_type;
      
      if (currentType === 'text' || currentType === 'character varying') {
        console.log('⚠️  special_requests es TEXT, convirtiendo a JSONB...');
        
        // Convertir TEXT a JSONB
        await pool.query(`
          ALTER TABLE bookings 
          ALTER COLUMN special_requests TYPE JSONB 
          USING special_requests::JSONB
        `);
        
        console.log('✅ special_requests convertido a JSONB');
      } else if (currentType === 'jsonb') {
        console.log('✓ special_requests ya es JSONB');
      } else {
        console.log(`⚠️  special_requests tiene tipo inesperado: ${currentType}`);
      }
    } else {
      console.log('⚠️  Columna special_requests no encontrada');
    }
  } catch (error) {
    console.error('⚠️  Error verificando special_requests:', error.message);
    // Continuar aunque falle
  }
}

// Columnas que deben existir en la tabla bookings (ya no necesarias si usamos JSONB)
// Pero las dejamos por si acaso se necesitan en el futuro
const BOOKING_COLUMNS = [
  // Estas columnas ya no son necesarias si usamos JSONB en special_requests
  // Pero las mantenemos por compatibilidad
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
    console.log('🔧 Sincronizando esquema de tabla bookings...\n');

    // Primero verificar y convertir special_requests a JSONB
    await ensureSpecialRequestsIsJSONB();
    console.log('');

    // Verificar columnas existentes en bookings
    const existingColumns = await getExistingColumns('bookings');
    console.log(`📋 Columnas existentes en bookings: ${existingColumns.length}`);
    
    // Agregar columnas faltantes
    let addedCount = 0;
    for (const column of BOOKING_COLUMNS) {
      if (!existingColumns.includes(column.name)) {
        let alterQuery = `ALTER TABLE bookings ADD COLUMN ${column.name} ${column.type}`;
        
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
      { name: 'idx_bookings_contract_number', query: 'CREATE INDEX IF NOT EXISTS idx_bookings_contract_number ON bookings(contract_number)' },
      { name: 'idx_bookings_city', query: 'CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city)' },
      { name: 'idx_bookings_status', query: 'CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)' },
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
    console.log(`✓ Columnas ya existentes: ${BOOKING_COLUMNS.length - addedCount}`);
    console.log('='.repeat(60) + '\n');

    // Verificar estructura final
    const finalColumns = await getExistingColumns('bookings');
    console.log(`📋 Total de columnas en bookings: ${finalColumns.length}`);
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

