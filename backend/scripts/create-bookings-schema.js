const pool = require('../config/database');

async function createBookingsSchema() {
  try {
    console.log('🔧 Creando esquema de reservas...');

    // Crear tabla de reservas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        contract_number VARCHAR(50) NOT NULL,
        city VARCHAR(100) NOT NULL,
        custom_city VARCHAR(100),
        nights_requested INTEGER NOT NULL CHECK (nights_requested > 0),
        people_count INTEGER NOT NULL CHECK (people_count >= 1 AND people_count <= 20),
        additional_people INTEGER DEFAULT 0 CHECK (additional_people >= 0),
        additional_cost DECIMAL(10,2) DEFAULT 0,
        contact_source VARCHAR(50) NOT NULL,
        observations TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        confirmed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT
      )
    `);

    // Crear índices para mejorar el rendimiento
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_contract_number ON bookings(contract_number);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);`);

    // Crear trigger para actualizar updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_bookings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
      CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION update_bookings_updated_at();
    `);

    console.log('✅ Esquema de reservas creado correctamente.');
    console.log('📊 Tabla bookings creada con todas las columnas necesarias.');
    console.log('🔍 Índices creados para optimizar consultas.');
    console.log('⚡ Trigger de updated_at configurado.');

  } catch (error) {
    console.error('❌ Error creando esquema de reservas:', error);
  } finally {
    await pool.end();
  }
}

createBookingsSchema();
