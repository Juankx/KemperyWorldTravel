const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
  port: process.env.DB_PORT || 5432,
});

async function addPaymentAgreementDueDate() {
  try {
    console.log('🔄 Verificando columna due_date en payment_agreements...');

    // Verificar si la columna ya existe
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payment_agreements' 
      AND column_name = 'due_date'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ La columna due_date ya existe en payment_agreements');
      return;
    }

    // Agregar la columna due_date
    await pool.query(`
      ALTER TABLE payment_agreements 
      ADD COLUMN due_date DATE
    `);

    console.log('✅ Columna due_date agregada exitosamente a payment_agreements');

  } catch (error) {
    console.error('❌ Error agregando columna due_date:', error.message);
    throw error;
  }
}

async function addPaymentAgreementDueDateAndClose() {
  try {
    await addPaymentAgreementDueDate();
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addPaymentAgreementDueDateAndClose()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { addPaymentAgreementDueDate, pool };

