const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
  port: process.env.DB_PORT || 5432,
});

async function sincronizarGestionesEC2() {
  try {
    console.log('========================================');
    console.log('🔄 Sincronización de Gestiones en EC2');
    console.log('========================================\n');

    // Paso 1: Agregar columna due_date a payment_agreements
    console.log('📋 Paso 1: Agregando columna due_date a payment_agreements...');
    try {
      // Primero verificar si la tabla existe
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_agreements'
        )
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('⚠️  La tabla payment_agreements no existe. Se saltará este paso.');
        console.log('ℹ️  Si necesitas crear la tabla, ejecuta primero: node scripts/create-payments-schema.js');
      } else {
        // Verificar si la columna ya existe
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'payment_agreements' 
          AND column_name = 'due_date'
        `);

        if (columnCheck.rows.length > 0) {
          console.log('✅ La columna due_date ya existe en payment_agreements');
        } else {
          // Agregar la columna due_date
          await pool.query(`
            ALTER TABLE payment_agreements 
            ADD COLUMN due_date DATE
          `);
          console.log('✅ Columna due_date agregada exitosamente a payment_agreements');
        }
      }
    } catch (error) {
      console.error('❌ Error agregando columna due_date:', error.message);
      // No lanzar error, continuar con el siguiente paso
      console.log('⚠️  Continuando con el siguiente paso...');
    }
    console.log('');

    // Paso 2: Crear tabla client_managements
    console.log('📋 Paso 2: Creando tabla client_managements...');
    try {
      // Verificar si la tabla ya existe
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'client_managements'
        )
      `);

      if (tableCheck.rows[0].exists) {
        console.log('ℹ️  Tabla client_managements ya existe');
      } else {
        // Crear tabla de gestiones de clientes
        await pool.query(`
          CREATE TABLE client_managements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            contract_number VARCHAR(50) NOT NULL,
            management_date DATE NOT NULL DEFAULT CURRENT_DATE,
            observation TEXT NOT NULL,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Tabla client_managements creada');
      }

      // Crear índices
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_client_managements_client_id ON client_managements(client_id);`);
        console.log('✅ Índice idx_client_managements_client_id creado');
      } catch (error) {
        console.log('ℹ️  Índice idx_client_managements_client_id ya existe o error:', error.message);
      }

      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_client_managements_contract_number ON client_managements(contract_number);`);
        console.log('✅ Índice idx_client_managements_contract_number creado');
      } catch (error) {
        console.log('ℹ️  Índice idx_client_managements_contract_number ya existe o error:', error.message);
      }

      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_client_managements_management_date ON client_managements(management_date);`);
        console.log('✅ Índice idx_client_managements_management_date creado');
      } catch (error) {
        console.log('ℹ️  Índice idx_client_managements_management_date ya existe o error:', error.message);
      }

      // Crear trigger para actualizar updated_at
      try {
        await pool.query(`
          CREATE OR REPLACE FUNCTION update_client_managements_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
          END;
          $$ language 'plpgsql';
        `);
        
        await pool.query(`
          DROP TRIGGER IF EXISTS update_client_managements_updated_at_trigger ON client_managements;
          CREATE TRIGGER update_client_managements_updated_at_trigger 
          BEFORE UPDATE ON client_managements
          FOR EACH ROW EXECUTE FUNCTION update_client_managements_updated_at();
        `);
        console.log('✅ Trigger para updated_at creado');
      } catch (error) {
        console.log('ℹ️  Trigger ya existe o error:', error.message);
      }

      console.log('✅ Esquema de gestiones de clientes completado');
    } catch (error) {
      console.error('❌ Error creando esquema de gestiones:', error.message);
      throw error;
    }
    console.log('');

    console.log('========================================');
    console.log('✅ Sincronización completada exitosamente');
    console.log('========================================');

  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  sincronizarGestionesEC2()
    .then(() => {
      console.log('\n✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { sincronizarGestionesEC2 };
