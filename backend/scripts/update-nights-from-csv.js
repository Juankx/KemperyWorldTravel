const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../config/database');

async function updateNightsFromCSV() {
  try {
    console.log('🔧 Actualizando noches desde el CSV...');

    const csvPath = '../Base Kempery.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ No se encontró el archivo CSV:', csvPath);
      return;
    }

    const csvData = [];
    
    // Leer el CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Procesando ${csvData.length} registros del CSV...`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    // Procesar cada registro del CSV
    for (const row of csvData) {
      try {
        const email = row['CORREO ELEC']?.trim();
        const nightsStr = row['NOCHES']?.trim();
        
        if (!email || !nightsStr) {
          continue;
        }

        // Convertir noches a número
        const totalNights = parseInt(nightsStr);
        
        if (isNaN(totalNights) || totalNights < 0) {
          console.warn(`⚠️ Noches inválidas para ${email}: ${nightsStr}`);
          continue;
        }

        // Buscar el cliente en la base de datos por email
        const clientResult = await pool.query(
          'SELECT id, first_name, last_name FROM clients WHERE email = $1',
          [email.toLowerCase()]
        );

        if (clientResult.rows.length === 0) {
          notFoundCount++;
          console.warn(`⚠️ Cliente no encontrado: ${email}`);
          continue;
        }

        // Actualizar las noches del cliente
        await pool.query(
          `UPDATE clients SET 
             total_nights = $1,
             remaining_nights = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE email = $2`,
          [totalNights, email.toLowerCase()]
        );

        updatedCount++;
        console.log(`✅ Actualizado: ${clientResult.rows[0].first_name} ${clientResult.rows[0].last_name} - ${totalNights} noches`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error procesando registro:`, error.message);
      }
    }

    console.log('\n🎉 Actualización de noches completada!');
    console.log(`✅ Clientes actualizados: ${updatedCount}`);
    console.log(`⚠️ Clientes no encontrados: ${notFoundCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Mostrar algunos ejemplos de clientes actualizados
    if (updatedCount > 0) {
      console.log('\n📋 Primeros 10 clientes con noches actualizadas:');
      const examplesResult = await pool.query(
        `SELECT first_name, last_name, email, total_nights, remaining_nights 
         FROM clients 
         WHERE total_nights > 0 
         ORDER BY total_nights DESC 
         LIMIT 10`
      );
      
      examplesResult.rows.forEach(client => {
        console.log(`${client.first_name} ${client.last_name} - ${client.total_nights} noches totales, ${client.remaining_nights} restantes`);
      });

      // Estadísticas finales
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_clientes_con_noches,
          SUM(total_nights) as total_noches_sistema,
          AVG(total_nights) as promedio_noches,
          MAX(total_nights) as max_noches,
          MIN(total_nights) as min_noches
        FROM clients 
        WHERE total_nights > 0
      `);
      
      const stats = statsResult.rows[0];
      console.log('\n📊 Estadísticas del sistema:');
      console.log(`- Clientes con noches: ${stats.total_clientes_con_noches}`);
      console.log(`- Total de noches en el sistema: ${stats.total_noches_sistema}`);
      console.log(`- Promedio de noches por cliente: ${Math.round(stats.promedio_noches * 100) / 100}`);
      console.log(`- Máximo de noches: ${stats.max_noches}`);
      console.log(`- Mínimo de noches: ${stats.min_noches}`);
    }

  } catch (error) {
    console.error('❌ Error actualizando noches desde CSV:', error);
  } finally {
    await pool.end();
  }
}

updateNightsFromCSV();
