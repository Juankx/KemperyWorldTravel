const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../config/database');

async function updateNights() {
  try {
    console.log('🔧 Actualizando noches desde CSV...');
    
    const csvPath = '../Base Kempery.csv';
    const csvData = [];
    
    // Leer CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => csvData.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Procesando ${csvData.length} registros...`);
    
    let updated = 0;
    let notFound = 0;
    
    for (const row of csvData) {
      const contractNumber = row['CONTRATO']?.trim();
      const nights = parseInt(row['NOCHES']?.trim());
      
      if (!contractNumber || isNaN(nights) || nights < 0) continue;
      
      try {
        const result = await pool.query(
          'UPDATE clients SET total_nights = $1, remaining_nights = $1 WHERE contract_number = $2',
          [nights, contractNumber]
        );
        
        if (result.rowCount > 0) {
          updated++;
          if (updated <= 5) {
            console.log(`✅ ${contractNumber}: ${nights} noches`);
          }
        } else {
          notFound++;
          if (notFound <= 3) {
            console.log(`⚠️ Contrato no encontrado: ${contractNumber}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error con ${contractNumber}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Completado!`);
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`⚠️ No encontrados: ${notFound}`);
    
    // Verificar algunos resultados
    const check = await pool.query(
      'SELECT COUNT(*) as total, SUM(total_nights) as sum_nights FROM clients WHERE total_nights > 0'
    );
    
    console.log(`📊 Clientes con noches: ${check.rows[0].total}`);
    console.log(`📊 Total noches en sistema: ${check.rows[0].sum_nights}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

updateNights();
