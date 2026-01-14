const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
  port: process.env.DB_PORT || 5432,
});

async function createPaymentsSchema() {
  try {
    console.log('🔄 Creando esquema de pagos y convenios...');

    // Verificar si las tablas ya existen
    const agreementsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_agreements'
      );
    `);

    const paymentsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payments'
      );
    `);

    if (!agreementsCheck.rows[0].exists) {
      // Crear tabla de convenios de pago
      await pool.query(`
        CREATE TABLE payment_agreements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          contract_number VARCHAR(50) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          remaining_amount DECIMAL(10,2) NOT NULL,
          installment_count INTEGER NOT NULL,
          installment_amount DECIMAL(10,2) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          due_date DATE,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id)
        );
      `);
      console.log('✅ Tabla payment_agreements creada');
    } else {
      console.log('ℹ️ Tabla payment_agreements ya existe');
    }

    if (!paymentsCheck.rows[0].exists) {
      // Crear tabla de pagos
      await pool.query(`
        CREATE TABLE payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          payment_agreement_id UUID REFERENCES payment_agreements(id) ON DELETE CASCADE,
          contract_number VARCHAR(50) NOT NULL,
          payment_amount DECIMAL(10,2) NOT NULL,
          payment_date DATE NOT NULL,
          payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro')),
          installment_number INTEGER,
          receipt_number VARCHAR(50) UNIQUE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id)
        );
      `);
      console.log('✅ Tabla payments creada');
    } else {
      console.log('ℹ️ Tabla payments ya existe');
    }

    // Crear índices para optimizar consultas
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_agreements_client_id ON payment_agreements(client_id);`);
      console.log('✅ Índice idx_payment_agreements_client_id creado');
    } catch (error) {
      console.log('ℹ️ Índice idx_payment_agreements_client_id ya existe');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_agreements_contract_number ON payment_agreements(contract_number);`);
      console.log('✅ Índice idx_payment_agreements_contract_number creado');
    } catch (error) {
      console.log('ℹ️ Índice idx_payment_agreements_contract_number ya existe');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_agreements_status ON payment_agreements(status);`);
      console.log('✅ Índice idx_payment_agreements_status creado');
    } catch (error) {
      console.log('ℹ️ Índice idx_payment_agreements_status ya existe');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);`);
      console.log('✅ Índice idx_payments_client_id creado');
    } catch (error) {
      console.log('ℹ️ Índice idx_payments_client_id ya existe');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_payment_agreement_id ON payments(payment_agreement_id);`);
      console.log('✅ Índice idx_payments_payment_agreement_id creado');
    } catch (error) {
      console.log('ℹ️ Índice idx_payments_payment_agreement_id ya existe');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_contract_number ON payments(contract_number);`);
      console.log('✅ Índice idx_payments_contract_number creado');
    } catch (error) {
      console.log('ℹ️ Índice idx_payments_contract_number ya existe');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);`);
      console.log('✅ Índice idx_payments_payment_date creado');
    } catch (error) {
      console.log('ℹ️ Índice idx_payments_payment_date ya existe');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number);`);
      console.log('✅ Índice idx_payments_receipt_number creado');
    } catch (error) {
      console.log('ℹ️ Índice idx_payments_receipt_number ya existe');
    }

    // Agregar columnas a la tabla de clientes para convenios
    try {
      await pool.query(`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS has_payment_agreement BOOLEAN DEFAULT FALSE;
      `);
      console.log('✅ Columna has_payment_agreement verificada/agregada');
    } catch (error) {
      console.log('ℹ️  Columna has_payment_agreement ya existe o error:', error.message);
    }

    try {
      await pool.query(`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS payment_agreement_id UUID REFERENCES payment_agreements(id);
      `);
      console.log('✅ Columna payment_agreement_id verificada/agregada');
    } catch (error) {
      console.log('ℹ️  Columna payment_agreement_id ya existe o error:', error.message);
    }
    
    // Agregar columna due_date a payment_agreements si no existe (para compatibilidad)
    if (agreementsCheck.rows[0].exists) {
      try {
        const dueDateCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'payment_agreements' 
          AND column_name = 'due_date'
        `);
        
        if (dueDateCheck.rows.length === 0) {
          await pool.query(`
            ALTER TABLE payment_agreements 
            ADD COLUMN due_date DATE;
          `);
          console.log('✅ Columna due_date agregada a payment_agreements');
        } else {
          console.log('ℹ️  Columna due_date ya existe en payment_agreements');
        }
      } catch (error) {
        console.log('ℹ️  Error verificando/agregando due_date:', error.message);
      }
    }

    console.log('✅ Esquema de pagos y convenios creado exitosamente');
    console.log('📊 Tablas creadas:');
    console.log('   - payment_agreements (convenios de pago)');
    console.log('   - payments (pagos realizados)');
    console.log('🔍 Índices creados para optimización');
    console.log('📝 Columnas agregadas a tabla clients');

  } catch (error) {
    console.error('❌ Error creando esquema de pagos:', error);
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
  createPaymentsSchema()
    .then(() => {
      console.log('🎉 Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { createPaymentsSchema, pool };
