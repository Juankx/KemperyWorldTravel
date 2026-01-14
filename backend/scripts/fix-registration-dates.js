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

async function fixRegistrationDates() {
  try {
    console.log('🔄 Corrigiendo fechas de registro incorrectas...');
    
    const csvPath = path.join(__dirname, '../../Base Kempery.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    
    // Obtener las columnas del header
    const headerLine = lines[0];
    const columns = headerLine.split(',').map(col => col.trim());
    
    console.log('📋 Columnas encontradas:', columns);
    
    const clientDates = [];
    
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

        if (registrationDate) {
          clientDates.push({
            email: clientData['CORREO ELEC'].trim(),
            registration_date: registrationDate
          });
        }
      }
    }

    console.log(`📊 Procesando ${clientDates.length} fechas del CSV...`);

    // Mostrar algunos ejemplos
    console.log('\n📋 Primeros 5 fechas del CSV:');
    clientDates.slice(0, 5).forEach((client, index) => {
      console.log(`${index + 1}. ${client.email} - ${client.registration_date}`);
    });

    let updated = 0;
    let errors = 0;
    let notFound = 0;

    for (const client of clientDates) {
      try {
        // Buscar por email exacto y actualizar solo si la fecha actual es incorrecta
        let result = await pool.query(
          `UPDATE clients SET 
             created_at = $1
           WHERE LOWER(email) = LOWER($2) 
           AND (created_at >= '2025-09-22' OR created_at IS NULL)`,
          [client.registration_date, client.email]
        );

        if (result.rowCount > 0) {
          updated++;
          if (updated % 100 === 0) {
            console.log(`✅ Actualizadas ${updated} fechas...`);
          }
        } else {
          notFound++;
          if (notFound <= 5) {
            console.log(`⚠️  No encontrado o fecha ya correcta: ${client.email}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error actualizando fecha para ${client.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Actualización de fechas completada!`);
    console.log(`✅ Fechas actualizadas: ${updated}`);
    console.log(`⚠️  No encontrados o ya correctos: ${notFound}`);
    console.log(`❌ Errores: ${errors}`);

    // Verificar algunos resultados
    const sampleResult = await pool.query(
      `SELECT first_name, last_name, email, created_at 
       FROM clients 
       WHERE created_at >= '2025-09-22'
       LIMIT 5`
    );

    if (sampleResult.rows.length > 0) {
      console.log('\n⚠️  Aún hay fechas incorrectas:');
      sampleResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.first_name} ${row.last_name} - ${row.email} - ${row.created_at}`);
      });
    } else {
      console.log('\n✅ Todas las fechas están correctas!');
    }

  } catch (error) {
    console.error('❌ Error en la actualización de fechas:', error);
  } finally {
    await pool.end();
  }
}

fixRegistrationDates();
