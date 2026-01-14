const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function createClientCollectionsCommentsSchema() {
  try {
    console.log('🔄 Verificando existencia de tabla client_collections_comments...');

    // Verificar si la tabla ya existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_collections_comments'
      )
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ La tabla client_collections_comments ya existe');
      return;
    }

    console.log('📝 Creando tabla client_collections_comments...');

    // Crear tabla client_collections_comments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_collections_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear índices para optimizar consultas
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_client_collections_comments_client_id 
      ON client_collections_comments(client_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_client_collections_comments_created_at 
      ON client_collections_comments(created_at DESC)
    `);

    // Crear trigger para actualizar updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_client_collections_comments_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_client_collections_comments_updated_at 
      ON client_collections_comments
    `);

    await pool.query(`
      CREATE TRIGGER trigger_update_client_collections_comments_updated_at
      BEFORE UPDATE ON client_collections_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_client_collections_comments_updated_at()
    `);

    console.log('✅ Tabla client_collections_comments creada exitosamente');
    console.log('✅ Índices creados exitosamente');
    console.log('✅ Trigger de updated_at creado exitosamente');

  } catch (error) {
    console.error('❌ Error creando tabla client_collections_comments:', error);
    throw error;
  } finally {
    // No cerrar el pool si se está usando desde otro módulo
    if (require.main === module) {
      await pool.end();
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createClientCollectionsCommentsSchema()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el script:', error);
      process.exit(1);
    });
}

module.exports = { createClientCollectionsCommentsSchema, pool };

