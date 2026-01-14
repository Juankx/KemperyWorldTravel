const { Pool } = require('pg');
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

async function fixCsvData() {
  try {
    console.log('🔄 Procesando CSV y actualizando datos de clientes...');
    
    const csvPath = path.join(__dirname, '../../Base Kempery.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    
    // Obtener las columnas del header
    const headerLine = lines[0];
    const columns = headerLine.split(',').map(col => col.trim());
    
    console.log('📋 Columnas encontradas:', columns);
    
    const clients = [];
    
    // Procesar cada línea de datos (saltando el header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Dividir la línea por comas, pero respetando las comillas
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      // Crear objeto con los datos
      const clientData = {};
      columns.forEach((col, index) => {
        clientData[col] = values[index] || '';
      });
      
        // Procesar los datos específicos
        if (clientData['CORREO ELEC'] && clientData['CORREO ELEC'].includes('@')) {
          // Procesar la fecha del CSV
          let registrationDate = null
          if (clientData['FECHA']) {
            const dateStr = clientData['FECHA'].trim()
            // Convertir formato MM/DD/YYYY a YYYY-MM-DD
            const dateParts = dateStr.split('/')
            if (dateParts.length === 3) {
              const month = dateParts[0].padStart(2, '0')
              const day = dateParts[1].padStart(2, '0')
              const year = dateParts[2]
              registrationDate = `${year}-${month}-${day}`
            }
          }

          const processedClient = {
            email: clientData['CORREO ELEC'].trim(),
            identification: clientData['CEDULA']?.trim() || '',
            contract_number: clientData['CONTRATO']?.trim() || '',
            payment_status: 'sin_pago',
            total_amount: 0,
            international_bonus: clientData['INTERNACIONAL']?.trim() === 'PUNTA CANA' ? 'Si' : 'No',
            registration_date: registrationDate,
            notes: `CONTRATO: ${clientData['CONTRATO'] || ''} | FECHA: ${clientData['FECHA'] || ''} | LÍNEA: ${clientData['LINER'] || ''} | CERRADO: ${clientData['CLOSED'] || ''} | TIPO: ${clientData['TIPO'] || ''} | NETO: ${clientData['NETO'] || ''} | IVA: ${clientData['IVA'] || ''} | TOTAL: ${clientData['TOTAL'] || ''} | NOCHES: ${clientData['NOCHES'] || ''} | AÑOS: ${clientData['AÑOS'] || ''} | INTERNACIONAL: ${clientData['INTERNACIONAL'] || ''} | OBSERVACIONES: ${clientData['OBSERVACIONES'] || ''}`
          };
        
        // Procesar el monto total
        if (clientData['TOTAL']) {
          const totalStr = clientData['TOTAL'].replace(/[$,]/g, '').trim();
          processedClient.total_amount = parseFloat(totalStr) || 0;
        }
        
        // Determinar estado de pago basado en el monto
        if (processedClient.total_amount > 0) {
          processedClient.payment_status = 'pago_completo';
        } else {
          processedClient.payment_status = 'sin_pago';
        }
        
        clients.push(processedClient);
      }
    }

    console.log(`📊 Procesando ${clients.length} registros del CSV...`);

    // Mostrar algunos ejemplos
    console.log('\n📋 Primeros 3 registros procesados:');
    clients.slice(0, 3).forEach((client, index) => {
      console.log(`${index + 1}. ${client.email}`);
      console.log(`   Cédula: ${client.identification}`);
      console.log(`   Contrato: ${client.contract_number}`);
      console.log(`   Total: $${client.total_amount} - Estado: ${client.payment_status}`);
      console.log('');
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
             notes = COALESCE($6, notes),
             created_at = COALESCE($7, created_at)
           WHERE LOWER(email) = LOWER($8)`,
          [
            client.identification,
            client.contract_number,
            client.payment_status,
            client.total_amount,
            client.international_bonus,
            client.notes,
            client.registration_date,
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

fixCsvData();
