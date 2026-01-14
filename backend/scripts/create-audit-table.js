const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function createAuditTable() {
  try {
    console.log('🔄 Verificando tabla audit_logs...');
    
    // Verificar si la tabla existe
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✅ La tabla audit_logs ya existe');
      return;
    }
    
    // Crear la tabla audit_logs
    await pool.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100),
        user_id VARCHAR(100),
        user_email VARCHAR(255),
        user_role VARCHAR(50),
        old_data TEXT,
        new_data TEXT,
        details TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      );
    `);
    
    // Crear índices para mejorar el rendimiento
    await pool.query(`
      CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);
    
    await pool.query(`
      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
    `);
    
    await pool.query(`
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
    `);
    
    await pool.query(`
      CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
    `);
    
    console.log('✅ Tabla audit_logs creada exitosamente');
    console.log('✅ Índices creados para optimizar consultas');
    
  } catch (error) {
    console.error('❌ Error creando tabla audit_logs:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createAuditTable()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { createAuditTable };

