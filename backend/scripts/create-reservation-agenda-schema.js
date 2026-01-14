const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
  port: process.env.DB_PORT || 5432,
});

async function createReservationAgendaSchema() {
  try {
    console.log('🔄 Creando esquema de agenda de reservas...');

    // Verificar si la tabla ya existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reservation_agenda'
      )
    `);

    if (tableCheck.rows[0].exists) {
      console.log('ℹ️  Tabla reservation_agenda ya existe');
    } else {
      // Crear tabla de agenda de reservas
      await pool.query(`
        CREATE TABLE reservation_agenda (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          fecha DATE,
          socio VARCHAR(50),
          ciudad VARCHAR(100),
          nombre VARCHAR(255),
          destino VARCHAR(255),
          llegada VARCHAR(100),
          salida VARCHAR(100),
          pax VARCHAR(50),
          airbnb_nombres TEXT,
          cedulas VARCHAR(10),
          observacion TEXT,
          link_conversacion_airbnb TEXT,
          estatus VARCHAR(50),
          tarjeta_usada VARCHAR(100),
          valor_pagado_reserva VARCHAR(50),
          pago_cliente VARCHAR(50),
          observaciones_adicionales TEXT,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabla reservation_agenda creada');
    }

    // Crear índices
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservation_agenda_fecha ON reservation_agenda(fecha);`);
      console.log('✅ Índice idx_reservation_agenda_fecha creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_reservation_agenda_fecha ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservation_agenda_socio ON reservation_agenda(socio);`);
      console.log('✅ Índice idx_reservation_agenda_socio creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_reservation_agenda_socio ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservation_agenda_estatus ON reservation_agenda(estatus);`);
      console.log('✅ Índice idx_reservation_agenda_estatus creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_reservation_agenda_estatus ya existe o error:', error.message);
    }

    // Crear trigger para actualizar updated_at
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_reservation_agenda_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      
      await pool.query(`
        DROP TRIGGER IF EXISTS update_reservation_agenda_updated_at_trigger ON reservation_agenda;
        CREATE TRIGGER update_reservation_agenda_updated_at_trigger 
        BEFORE UPDATE ON reservation_agenda
        FOR EACH ROW EXECUTE FUNCTION update_reservation_agenda_updated_at();
      `);
      console.log('✅ Trigger para updated_at creado');
    } catch (error) {
      console.log('ℹ️  Trigger ya existe o error:', error.message);
    }

    console.log('✅ Esquema de agenda de reservas completado');

  } catch (error) {
    console.error('❌ Error creando esquema de agenda de reservas:', error.message);
    throw error;
  }
}

async function createReservationAgendaSchemaAndClose() {
  try {
    await createReservationAgendaSchema();
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createReservationAgendaSchemaAndClose()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { createReservationAgendaSchema, pool };

