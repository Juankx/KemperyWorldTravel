const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
  port: process.env.DB_PORT || 5432,
});

async function createClientManagementsSchema() {
  try {
    console.log('🔄 Creando esquema de gestiones de clientes...');

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
}

async function createClientManagementsSchemaAndClose() {
  try {
    await createClientManagementsSchema();
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createClientManagementsSchemaAndClose()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { createClientManagementsSchema, pool };

