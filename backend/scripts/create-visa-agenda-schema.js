const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
  port: process.env.DB_PORT || 5432,
});

async function createVisaAgendaSchema() {
  try {
    console.log('🔄 Creando esquema de agenda de visados...');

    // Verificar si la tabla ya existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'visa_agenda'
      )
    `);

    if (tableCheck.rows[0].exists) {
      console.log('ℹ️  Tabla visa_agenda ya existe');
    } else {
      // Crear tabla de agenda de visados
      await pool.query(`
        CREATE TABLE visa_agenda (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          fecha DATE,
          socio VARCHAR(50),
          ciudad VARCHAR(100),
          nombre VARCHAR(255),
          embajada VARCHAR(255),
          ads VARCHAR(100),
          correo VARCHAR(255),
          contrasena VARCHAR(255),
          estatus VARCHAR(50),
          fecha_entrevista_embajada DATE,
          hora_entrevista_embajada TIME,
          fecha_asesoramiento DATE,
          observaciones TEXT,
          link_reunion TEXT,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabla visa_agenda creada');
    }

    // Crear índices
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_visa_agenda_fecha ON visa_agenda(fecha);`);
      console.log('✅ Índice idx_visa_agenda_fecha creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_visa_agenda_fecha ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_visa_agenda_socio ON visa_agenda(socio);`);
      console.log('✅ Índice idx_visa_agenda_socio creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_visa_agenda_socio ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_visa_agenda_estatus ON visa_agenda(estatus);`);
      console.log('✅ Índice idx_visa_agenda_estatus creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_visa_agenda_estatus ya existe o error:', error.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_visa_agenda_nombre ON visa_agenda(nombre);`);
      console.log('✅ Índice idx_visa_agenda_nombre creado');
    } catch (error) {
      console.log('ℹ️  Índice idx_visa_agenda_nombre ya existe o error:', error.message);
    }

    // Crear trigger para actualizar updated_at
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_visa_agenda_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      
      await pool.query(`
        DROP TRIGGER IF EXISTS update_visa_agenda_updated_at_trigger ON visa_agenda;
        CREATE TRIGGER update_visa_agenda_updated_at_trigger 
        BEFORE UPDATE ON visa_agenda
        FOR EACH ROW EXECUTE FUNCTION update_visa_agenda_updated_at();
      `);
      console.log('✅ Trigger para updated_at creado');
    } catch (error) {
      console.log('ℹ️  Trigger ya existe o error:', error.message);
    }

    console.log('✅ Esquema de agenda de visados completado');

  } catch (error) {
    console.error('❌ Error creando esquema de agenda de visados:', error.message);
    throw error;
  }
}

async function createVisaAgendaSchemaAndClose() {
  try {
    await createVisaAgendaSchema();
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createVisaAgendaSchemaAndClose()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { createVisaAgendaSchema, pool };

