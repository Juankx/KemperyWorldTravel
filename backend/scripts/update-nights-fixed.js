const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../config/database');

async function updateNightsFixed() {
  try {
    console.log('🔧 Actualizando noches desde CSV (versión corregida)...');

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
    
    // Mostrar las primeras columnas para debug
    if (csvData.length > 0) {
      console.log('📋 Columnas encontradas:', Object.keys(csvData[0]));
    }

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Procesar cada registro del CSV
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        // Buscar la columna CONTRATO (puede tener espacios)
        let contractNumber = null;
        let nightsStr = null;
        
        for (const [key, value] of Object.entries(row)) {
          if (key.trim() === 'CONTRATO') {
            contractNumber = value?.trim();
          }
          if (key.trim() === 'NOCHES') {
            nightsStr = value?.trim();
          }
        }
        
        // Validar datos
        if (!contractNumber || !nightsStr) {
          skippedCount++;
          if (skippedCount <= 5) {
            console.log(`⚠️ Registro ${i + 1} omitido - datos faltantes: contrato="${contractNumber}", noches="${nightsStr}"`);
          }
          continue;
        }

        // Convertir noches a número
        const totalNights = parseInt(nightsStr);
        
        if (isNaN(totalNights) || totalNights < 0) {
          skippedCount++;
          if (skippedCount <= 5) {
            console.log(`⚠️ Registro ${i + 1} omitido - noches inválidas: "${nightsStr}"`);
          }
          continue;
        }

        // Actualizar las noches del cliente
        const result = await pool.query(
          `UPDATE clients SET 
             total_nights = $1,
             remaining_nights = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE contract_number = $2`,
          [totalNights, contractNumber]
        );

        if (result.rowCount > 0) {
          updatedCount++;
          if (updatedCount <= 10) {
            console.log(`✅ ${contractNumber}: ${totalNights} noches`);
          }
        } else {
          notFoundCount++;
          if (notFoundCount <= 5) {
            console.log(`⚠️ Contrato no encontrado: ${contractNumber}`);
          }
        }

        // Mostrar progreso cada 100 registros
        if ((i + 1) % 100 === 0) {
          console.log(`📈 Progreso: ${i + 1}/${csvData.length} registros procesados`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error procesando registro ${i + 1}:`, error.message);
      }
    }

    console.log('\n🎉 Actualización de noches completada!');
    console.log(`✅ Clientes actualizados: ${updatedCount}`);
    console.log(`⚠️ Contratos no encontrados: ${notFoundCount}`);
    console.log(`⚠️ Registros omitidos: ${skippedCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Mostrar estadísticas finales
    if (updatedCount > 0) {
      console.log('\n📊 Estadísticas del sistema:');
      
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

updateNightsFixed();
