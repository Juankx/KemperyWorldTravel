const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
  port: process.env.DB_PORT || 5432,
});

async function createFlightAgendaSchema() {
  try {
    console.log('🔄 Creando esquema de agenda de vuelos...');

    // Verificar si la tabla ya existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'flight_agenda'
      )
    `);

    if (tableCheck.rows[0].exists) {
      console.log('ℹ️  Tabla flight_agenda ya existe');
    } else {
      // Crear tabla de agenda de vuelos
      await pool.query(`
        CREATE TABLE flight_agenda (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          fecha DATE,
          socio VARCHAR(50),
          ciudad VARCHAR(100),
          nombre VARCHAR(255),
          destino VARCHAR(255),
          llegada DATE,
          salida DATE,
          pax INTEGER,
          ruta VARCHAR(255),
          numero_reserva VARCHAR(100),
          estatus VARCHAR(50),
          tarjeta_usada VARCHAR(100),
          valor_pagado_reserva DECIMAL(10,2),
          pago_cliente DECIMAL(10,2),
          observacion TEXT,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabla flight_agenda creada');
    }

    // Crear índices
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_flight_agenda_fecha ON flight_agenda(fecha);`);
      console.log('✅ Índice idx_flight_agenda_fecha creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_flight_agenda_fecha ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_flight_agenda_socio ON flight_agenda(socio);`);
      console.log('✅ Índice idx_flight_agenda_socio creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_flight_agenda_socio ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_flight_agenda_estatus ON flight_agenda(estatus);`);
      console.log('✅ Índice idx_flight_agenda_estatus creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_flight_agenda_estatus ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_flight_agenda_nombre ON flight_agenda(nombre);`);
      console.log('✅ Índice idx_flight_agenda_nombre creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_flight_agenda_nombre ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_flight_agenda_numero_reserva ON flight_agenda(numero_reserva);`);
      console.log('✅ Índice idx_flight_agenda_numero_reserva creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_flight_agenda_numero_reserva ya existe o error:', error.message);
    }

    // Crear trigger para actualizar updated_at
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_flight_agenda_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      
      await pool.query(`
        DROP TRIGGER IF EXISTS update_flight_agenda_updated_at_trigger ON flight_agenda;
        CREATE TRIGGER update_flight_agenda_updated_at_trigger 
        BEFORE UPDATE ON flight_agenda
        FOR EACH ROW EXECUTE FUNCTION update_flight_agenda_updated_at();
      `);
      console.log('✅ Trigger para updated_at creado');
    } catch (error) {
      console.log('ℹ️  Trigger ya existe o error:', error.message);
    }

    console.log('✅ Esquema de agenda de vuelos completado');

  } catch (error) {
    console.error('❌ Error creando esquema de agenda de vuelos:', error.message);
    throw error;
  }
}

async function createFlightAgendaSchemaAndClose() {
  try {
    await createFlightAgendaSchema();
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createFlightAgendaSchemaAndClose()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { createFlightAgendaSchema, pool };

