const { Pool } = require('pg');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'kempery_travel',
  password: 'Princonserkids2025+',
  port: 5432,
});

async function updateClientData() {
  try {
    console.log('🔄 Actualizando datos de clientes desde el CSV...');
    
    const csvPath = path.join(__dirname, '../../Base Kempery.csv');
    const clients = [];
    
    // Leer el CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // Mapear los datos del CSV a las columnas de la base de datos
          const clientData = {
            email: row['CORREO ELEC']?.trim(),
            identification: row['CEDULA']?.trim(),
            contract_number: row['CONTRATO']?.trim(),
            payment_status: 'sin_pago', // Por defecto, luego lo actualizaremos
            total_amount: 0,
            international_bonus: row['INTERNACIONAL']?.trim() === 'PUNTA CANA' ? 'Si' : 'No',
            notes: `CONTRATO: ${row['CONTRATO'] || ''} | FECHA: ${row['FECHA'] || ''} | LÍNEA: ${row['LINER'] || ''} | CERRADO: ${row['CLOSED'] || ''} | TIPO: ${row['TIPO'] || ''} | NETO: ${row['NETO'] || ''} | IVA: ${row['IVA'] || ''} | TOTAL: ${row['TOTAL'] || ''} | NOCHES: ${row['NOCHES'] || ''} | AÑOS: ${row['AÑOS'] || ''} | INTERNACIONAL: ${row['INTERNACIONAL'] || ''} | OBSERVACIONES: ${row['OBSERVACIONES'] || ''}`
          };
          
          // Procesar el monto total
          if (row['TOTAL']) {
            const totalStr = row['TOTAL'].replace(/[$,]/g, '').trim();
            clientData.total_amount = parseFloat(totalStr) || 0;
          }
          
          // Determinar estado de pago basado en el monto
          if (clientData.total_amount > 0) {
            clientData.payment_status = 'pago_completo';
          } else {
            clientData.payment_status = 'sin_pago';
          }
          
          if (clientData.email && clientData.email !== 'CORREO ELEC') {
            clients.push(clientData);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Procesando ${clients.length} registros del CSV...`);

    // Mostrar algunos ejemplos
    console.log('\n📋 Primeros 3 registros del CSV:');
    clients.slice(0, 3).forEach((client, index) => {
      console.log(`${index + 1}. ${client.email} - ${client.identification} - ${client.contract_number} - $${client.total_amount}`);
    });

    let updated = 0;
    let errors = 0;
    let notFound = 0;

    for (const client of clients) {
      try {
        // Buscar por email exacto
        let result = await pool.query(
          `UPDATE clients SET 
             identification = COALESCE($1, identification),
             contract_number = COALESCE($2, contract_number),
             payment_status = COALESCE($3, payment_status),
             total_amount = COALESCE($4, total_amount),
             international_bonus = COALESCE($5, international_bonus),
             notes = COALESCE($6, notes)
           WHERE LOWER(email) = LOWER($7)`,
          [
            client.identification,
            client.contract_number,
            client.payment_status,
            client.total_amount,
            client.international_bonus,
            client.notes,
            client.email
          ]
        );

        if (result.rowCount > 0) {
          updated++;
          if (updated % 100 === 0) {
            console.log(`✅ Actualizados ${updated} clientes...`);
          }
        } else {
          notFound++;
          if (notFound <= 5) {
            console.log(`⚠️  No encontrado: ${client.email}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error actualizando cliente ${client.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Actualización completada!`);
    console.log(`✅ Clientes actualizados: ${updated}`);
    console.log(`⚠️  No encontrados: ${notFound}`);
    console.log(`❌ Errores: ${errors}`);

    // Verificar algunos resultados
    const sampleResult = await pool.query(
      `SELECT first_name, last_name, email, identification, contract_number, payment_status, total_amount 
       FROM clients 
       WHERE contract_number IS NOT NULL AND contract_number != ''
       LIMIT 5`
    );

    console.log('\n📋 Ejemplos de datos actualizados:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.first_name} ${row.last_name} - ${row.email}`);
      console.log(`   Cédula: ${row.identification || 'No especificada'}`);
      console.log(`   Contrato: ${row.contract_number || 'No especificado'}`);
      console.log(`   Estado: ${row.payment_status} - Monto: $${row.total_amount}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error en la actualización:', error);
  } finally {
    await pool.end();
  }
}

updateClientData();
