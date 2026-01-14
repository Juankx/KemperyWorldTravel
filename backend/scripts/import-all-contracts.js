const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Función para limpiar y formatear datos
const cleanData = (data) => {
  if (!data) return null;
  return data.toString().trim().replace(/"/g, '').replace(/\$/g, '').replace(/,/g, '');
};

// Función para limpiar número de teléfono
const cleanPhone = (phone) => {
  if (!phone) return null;
  return phone.toString().replace(/\D/g, '').substring(0, 15);
};

// Función para limpiar cédula
const cleanCedula = (cedula) => {
  if (!cedula) return null;
  return cedula.toString().replace(/\D/g, '').substring(0, 20);
};

// Función para limpiar email
const cleanEmail = (email) => {
  if (!email) return null;
  return email.toString().trim().toLowerCase();
};

// Función para limpiar valores monetarios
const cleanMoney = (moneyStr) => {
  if (!moneyStr) return 0;
  const cleaned = cleanData(moneyStr);
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Función para determinar el tipo de documento
const getDocumentType = (cedula) => {
  if (!cedula) return 'cedula';
  const cleanCed = cleanCedula(cedula);
  if (cleanCed.length === 10) return 'cedula';
  if (cleanCed.length === 13) return 'ruc';
  return 'cedula';
};

// Función para convertir fecha de registro
const parseRegistrationDate = (dateStr) => {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
};

// Función para determinar si tiene bono internacional
const hasInternationalBonus = (internacional) => {
  if (!internacional) return false;
  const dest = internacional.toString().toLowerCase();
  return dest !== 'no' && dest !== '' && dest !== 'kempery';
};

// Función para determinar el estado de pago
const getPaymentStatus = (neto, iva, total) => {
  const netoValue = cleanMoney(neto);
  const ivaValue = cleanMoney(iva);
  const totalValue = cleanMoney(total);
  
  if (totalValue === 0) return 'sin_pago';
  if (netoValue === 0 && ivaValue === 0) return 'sin_pago';
  if (netoValue > 0 && ivaValue === 0) return 'pago_parcial';
  if (netoValue > 0 && ivaValue > 0) return 'pago_completo';
  
  return 'sin_pago';
};

async function importAllContracts() {
  try {
    console.log('🚀 Iniciando importación de TODOS los contratos desde CSV...');
    console.log('📝 NOTA: Se importarán TODOS los registros, incluyendo contratos vacíos y clientes sin pago');

    const csvPath = path.join(__dirname, '../../Base Kempery.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Archivo CSV no encontrado:', csvPath);
      return;
    }

    const contracts = [];

    // Leer archivo CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv({
          separator: ',',
          skipEmptyLines: true,
          headers: [
            'fecha', 'contrato', 'nombres', 'apellidos', 'cedula', 'telefono',
            'noches', 'anos', 'internacional', 'data', 'tipo', 'neto', 'iva',
            'total', 'correo', 'liner', 'closed', 'observaciones'
          ]
        }))
        .on('data', (row) => {
          // Importar TODOS los registros, incluso si están vacíos
          const registrationDate = parseRegistrationDate(row.fecha);
            const hasBonus = hasInternationalBonus(row.internacional);
            const paymentStatus = getPaymentStatus(row.neto, row.iva, row.total);
            
            const contractData = {
              // Datos del contrato
              contract_number: cleanData(row.contrato) || `CONTRATO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              registration_date: registrationDate,
              liner: cleanData(row.liner) || 'No asignado',
              closed_by: cleanData(row.closed) || 'No asignado',
              contract_type: cleanData(row.tipo) || 'No especificado',
              
              // Datos del cliente (pueden estar vacíos)
              first_name: cleanData(row.nombres) || 'Cliente',
              last_name: cleanData(row.apellidos) || 'Sin Apellido',
              email: cleanEmail(row.correo) || `cliente_${Date.now()}@kempery.com`,
              phone: cleanPhone(row.telefono) || null,
              document_type: getDocumentType(row.cedula),
              document_number: cleanCedula(row.cedula) || `TEMP_${Date.now()}`,
              
              // Información financiera
              neto: cleanMoney(row.neto),
              iva: cleanMoney(row.iva),
              total: cleanMoney(row.total),
              payment_status: paymentStatus,
              
              // Información adicional
              nights: parseInt(cleanData(row.noches)) || 0,
              years: parseInt(cleanData(row.anos)) || 0,
              has_international_bonus: hasBonus,
              international_destination: hasBonus ? cleanData(row.internacional) : null,
              data_source: cleanData(row.data) || 'No especificado',
              observations: cleanData(row.observaciones) || 'Sin observaciones'
            };

            contracts.push(contractData);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Procesando ${contracts.length} contratos...`);

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let noPaymentCount = 0;
    let partialPaymentCount = 0;
    let fullPaymentCount = 0;

    // Insertar contratos
    console.log('📋 Insertando contratos...');
    for (const contract of contracts) {
      try {
        // Verificar si el contrato ya existe
        const existingContract = await pool.query(
          'SELECT id FROM clients WHERE document_number = $1 OR email = $2',
          [contract.document_number, contract.email]
        );

        if (existingContract.rows.length > 0) {
          duplicateCount++;
          continue;
        }

        // Contar tipos de pago
        if (contract.payment_status === 'sin_pago') noPaymentCount++;
        else if (contract.payment_status === 'pago_parcial') partialPaymentCount++;
        else if (contract.payment_status === 'pago_completo') fullPaymentCount++;

        // Insertar cliente/contrato
        const result = await pool.query(
          `INSERT INTO clients (
            first_name, last_name, email, phone, document_type, document_number,
            birth_date, address, city, country, emergency_contact_name,
            emergency_contact_phone, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`,
          [
            contract.first_name,
            contract.last_name,
            contract.email,
            contract.phone,
            contract.document_type,
            contract.document_number,
            null, // birth_date
            null, // address
            'Quito', // city
            'Ecuador', // country
            null, // emergency_contact_name
            null, // emergency_contact_phone
            `CONTRATO: ${contract.contract_number} | FECHA: ${contract.registration_date} | LÍNEA: ${contract.liner} | CERRADO: ${contract.closed_by} | TIPO: ${contract.contract_type} | NETO: $${contract.neto} | IVA: $${contract.iva} | TOTAL: $${contract.total} | ESTADO PAGO: ${contract.payment_status} | NOCHES: ${contract.nights} | AÑOS: ${contract.years} | BONO INTERNACIONAL: ${contract.has_international_bonus ? 'Sí' : 'No'} | DESTINO: ${contract.international_destination || 'N/A'} | FUENTE: ${contract.data_source} | OBSERVACIONES: ${contract.observations}`,
            new Date()
          ]
        );

        successCount++;

        if (successCount % 50 === 0) {
          console.log(`✅ Procesados ${successCount} contratos...`);
        }

      } catch (error) {
        console.error(`❌ Error insertando contrato ${contract.contract_number}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 Importación de contratos completada!');
    console.log(`✅ Contratos importados: ${successCount}`);
    console.log(`🔄 Contratos duplicados (omitidos): ${duplicateCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    
    console.log('\n💰 Análisis de pagos:');
    console.log(`   Sin pago (cobranza): ${noPaymentCount}`);
    console.log(`   Pago parcial: ${partialPaymentCount}`);
    console.log(`   Pago completo: ${fullPaymentCount}`);

    // Mostrar estadísticas finales
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_clients_30_days
      FROM clients
    `);

    console.log('\n📊 Estadísticas de la base de datos:');
    console.log(`   Total contratos: ${stats.rows[0].total_clients}`);
    console.log(`   Contratos nuevos (30 días): ${stats.rows[0].new_clients_30_days}`);

    // Mostrar algunos ejemplos de contratos importados
    console.log('\n📋 Ejemplos de contratos importados:');
    const sampleContracts = await pool.query(`
      SELECT first_name, last_name, email, notes 
      FROM clients 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    sampleContracts.rows.forEach((contract, index) => {
      console.log(`   ${index + 1}. ${contract.first_name} ${contract.last_name} - ${contract.email}`);
    });

    console.log('\n🎯 Próximos pasos:');
    console.log('   1. Revisar clientes sin pago para cobranza');
    console.log('   2. Seguimiento de pagos parciales');
    console.log('   3. Gestión de contratos vacíos');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar importación
importAllContracts();
