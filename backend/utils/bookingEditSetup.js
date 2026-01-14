const pool = require('../config/database');

async function setupBookingEditColumns() {
  try {
    console.log('🔄 Configurando columnas de control de edición para bookings...');

    // Verificar si las funciones ya existen
    const functionCheck = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('calculate_edit_penalty', 'can_edit_booking', 'update_booking_edit_info')
      AND routine_type = 'FUNCTION'
    `);

    const existingFunctions = functionCheck.rows.map(row => row.routine_name);
    
    if (!existingFunctions.includes('calculate_edit_penalty')) {
      console.log('🔧 Creando función calculate_edit_penalty...');
      await pool.query(`
        CREATE OR REPLACE FUNCTION calculate_edit_penalty(edit_count INTEGER, base_penalty DECIMAL DEFAULT 0)
        RETURNS DECIMAL AS $$
        BEGIN
            CASE edit_count
                WHEN 1 THEN RETURN 20 + COALESCE(base_penalty, 0);
                WHEN 2 THEN RETURN 30 + COALESCE(base_penalty, 0);
                WHEN 3 THEN RETURN 0;
                ELSE RETURN 0;
            END CASE;
        END;
        $$ LANGUAGE plpgsql;
      `);
    }

    if (!existingFunctions.includes('can_edit_booking')) {
      console.log('🔧 Creando función can_edit_booking...');
      await pool.query(`
        CREATE OR REPLACE FUNCTION can_edit_booking(booking_id UUID)
        RETURNS BOOLEAN AS $$
        DECLARE
            current_edit_count INTEGER;
            is_lost_value BOOLEAN;
        BEGIN
            SELECT edit_count, COALESCE(is_lost, FALSE) 
            INTO current_edit_count, is_lost_value
            FROM bookings 
            WHERE id = booking_id;
            
            RETURN current_edit_count < 3 AND NOT is_lost_value;
        END;
        $$ LANGUAGE plpgsql;
      `);
    }

    if (!existingFunctions.includes('update_booking_edit_info')) {
      console.log('🔧 Creando función update_booking_edit_info...');
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_booking_edit_info()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
                NEW.edit_count = OLD.edit_count + 1;
                NEW.last_edit_date = CURRENT_TIMESTAMP;
                NEW.total_penalty = OLD.total_penalty + calculate_edit_penalty(NEW.edit_count);
                
                IF NEW.edit_count >= 3 THEN
                    NEW.is_lost = TRUE;
                END IF;
                
                NEW.edit_history = OLD.edit_history || jsonb_build_object(
                    'edit_number', NEW.edit_count,
                    'edit_date', CURRENT_TIMESTAMP,
                    'penalty_applied', calculate_edit_penalty(NEW.edit_count),
                    'total_penalty', NEW.total_penalty,
                    'is_lost', NEW.is_lost
                );
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
    }

    // Crear trigger si no existe
    const triggerCheck = await pool.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'update_booking_edit_info_trigger'
    `);

    if (triggerCheck.rows.length === 0) {
      console.log('🔧 Creando trigger...');
      await pool.query(`
        CREATE TRIGGER update_booking_edit_info_trigger
            BEFORE UPDATE ON bookings
            FOR EACH ROW
            EXECUTE FUNCTION update_booking_edit_info();
      `);
    }

    console.log('✅ Configuración de control de edición completada');

  } catch (error) {
    console.error('❌ Error configurando control de edición:', error);
    // No lanzar el error para que el servidor pueda iniciar
  }
}

module.exports = { setupBookingEditColumns };
