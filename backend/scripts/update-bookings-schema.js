require('dotenv').config({ path: '../config.env' });
const pool = require('../config/database');

async function updateBookingsSchema() {
  try {
    console.log('🔄 Actualizando esquema de la tabla bookings...');

    // Primero, hacer backup de los datos existentes si los hay
    const existingBookings = await pool.query('SELECT COUNT(*) FROM bookings');
    console.log(`📊 Reservas existentes: ${existingBookings.rows[0].count}`);

    // Eliminar la tabla existente y recrearla con la nueva estructura
    await pool.query('DROP TABLE IF EXISTS bookings CASCADE');
    console.log('✅ Tabla bookings eliminada');

    // Crear la nueva tabla bookings con la estructura correcta
    await pool.query(`
      CREATE TABLE bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_number VARCHAR(20) UNIQUE NOT NULL,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        contract_number VARCHAR(50),
        city VARCHAR(100),
        custom_city VARCHAR(100),
        nights_requested INTEGER NOT NULL DEFAULT 1,
        people_count INTEGER NOT NULL DEFAULT 1,
        additional_people INTEGER DEFAULT 0,
        additional_cost DECIMAL(10,2) DEFAULT 0.00,
        contact_source VARCHAR(100),
        observations TEXT,
        participants_data JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'pending',
        document_sent BOOLEAN DEFAULT FALSE,
        document_sent_at TIMESTAMP,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Nueva tabla bookings creada');

    // Crear índices
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_contract_number ON bookings(contract_number)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_city ON bookings(city)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at)');
    console.log('✅ Índices creados');

    console.log('🎉 Esquema de bookings actualizado exitosamente');

  } catch (error) {
    console.error('❌ Error actualizando esquema:', error);
  } finally {
    await pool.end();
  }
}

updateBookingsSchema();
