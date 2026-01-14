require('dotenv').config({ path: '../config.env' });
const pool = require('../config/database');

async function createPlaceholderPackage() {
  try {
    console.log('🔄 Creando paquete placeholder...');

    // Verificar si ya existe el paquete placeholder
    const existingPackage = await pool.query(`
      SELECT id FROM packages WHERE id = '00000000-0000-0000-0000-000000000000'
    `);

    if (existingPackage.rows.length > 0) {
      console.log('✅ Paquete placeholder ya existe');
      return;
    }

    // Crear el paquete placeholder
    await pool.query(`
      INSERT INTO packages (
        id, name, description, destination, duration_days, 
        price, currency, max_participants, min_participants,
        includes, excludes, highlights, difficulty_level, is_active
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        'Paquete Placeholder',
        'Paquete temporal para reservas de departamentos',
        'Ecuador',
        1,
        0.00,
        'USD',
        20,
        1,
        ARRAY['Alojamiento'],
        ARRAY[],
        ARRAY['Reserva de departamento'],
        'easy',
        true
      )
    `);

    console.log('✅ Paquete placeholder creado exitosamente');

  } catch (error) {
    console.error('❌ Error creando paquete placeholder:', error);
  } finally {
    await pool.end();
  }
}

createPlaceholderPackage();
