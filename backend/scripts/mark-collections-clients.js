const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'kempery_travel',
  password: 'Princonserkids2025+',
  port: 5432,
});

async function markCollectionsClients() {
  try {
    console.log('🔧 Marcando clientes en cobranzas...');
    
    // Lista de números de contrato que están en cobranzas
    const contractNumbers = [
      'KMPERY LTG 1499',
      'KMPERY RBM 1501',
      'KMPERY RBM 1502',
      'KMPERY CUE 1537',
      'KMPERY CUE 1541',
      'KMPERY CUE 1547',
      'KMPERY CUE 1551',
      'KMPERY CUE 1570',
      'KMPERY GYE 1575',
      'KMPERY GYE 1578',
      'KMPERY OTV 1591',
      'KMPERY LTG 1603',
      'KMPERY LTG 1604',
      'KMPERY STD 1609',
      'KMPERY STD 1610',
      'KMPERY STD 1617',
      'KMPERY OCC 1625',
      'KMPERY SSF 1635',
      'KMPERY SSF 1636',
      'KMPERY IBR 1639',
      'KMPERY IBR 1641',
      'KMPERY LOH 1643',
      'KMPERY LOH 1644',
      'KMPERY LOH 1648',
      'KMPERY LOH 1655',
      'KMPERY LOH 1658',
      'KMPERY ESM 1665',
      'KMPERY ESM 1672',
      'KMPERY ESM 1674',
      'KMPERY AMB 1680',
      'KMPERY AMB 1690',
      'KMPERY RBM 1697',
      'KMPERY RBM 1704',
      'KMPERY RBM 1708',
      'KMPERY RBM 1713',
      'KMPERY RBM 1714',
      'KMPERY PTV 1720',
      'KMPERY PTV 1724',
      'KMPERY PTV 1739',
      'KMPERY CUE 1746',
      'KMPERY CUE 1749',
      'KMPERY CUE 1752',
      'KMPERY CUE 1758',
      'KMPERY MEC 1764',
      'KMPERY MEC 1768',
      'KMPERY MEC 1773',
      'KMPRY GYE 1803',
      'KMPRY GYE 1812',
      'KMPRY GYE 1822',
      'KMPRY QVD 1841',
      'KMPRY MCH 1861',
      'KMPRY RBM 1891',
      'KMPERY ESM 1955',
      'KMPERY GYE 1991',
      'KMPERY TUL 1994',
      'KMPERY RBM 1996',
      'KMPERY RBM 1998',
      'KMPERY GYE 2015',
      'KMPERY GYE 2020',
      'KMPERY GYE 2022',
      'KMPERY MEC 2025',
      'KMPERY MEC 2028',
      'KMPERY MEC 2029',
      'KMPERY MEC 2030',
      'KMPERY MEC 2040',
      'KMPERY MEC 2041',
      'KMPERY STD 2053',
      'KMPERY STD 2055',
      'KMPERY RBM 2066',
      'KMPERY LOH 2080',
      'KMPERY PTV 2092',
      'KMPERY PTV 2118',
      'KMPERY CUE 2131',
      'KMPERY ZMR 2136',
      'KMPERY AMB 2149',
      'KMPERY AMB 2153',
      'KMPERY AMB 2155',
      'KMPERY ESM 2162',
      'KMPERY ESM 2169',
      'KMPERY STD 2175',
      'KMPERY STD 2180',
      'KMPERY RBM 2185',
      'KMPERY RBM 2187',
      'KMPERY RBM 2191'
    ];

    console.log(`📋 Procesando ${contractNumbers.length} números de contrato...`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const contractNumber of contractNumbers) {
      try {
        const result = await pool.query(
          `UPDATE clients SET 
             in_collections = 'Si',
             updated_at = CURRENT_TIMESTAMP
           WHERE contract_number = $1`,
          [contractNumber]
        );

        if (result.rowCount > 0) {
          updated++;
          console.log(`✅ Marcado en cobranzas: ${contractNumber}`);
        } else {
          notFound++;
          console.log(`⚠️  No encontrado: ${contractNumber}`);
        }
      } catch (error) {
        console.error(`❌ Error actualizando ${contractNumber}:`, error.message);
        errors++;
      }
    }

    console.log(`\n🎉 Proceso completado!`);
    console.log(`✅ Clientes marcados en cobranzas: ${updated}`);
    console.log(`⚠️  Contratos no encontrados: ${notFound}`);
    console.log(`❌ Errores: ${errors}`);

    // Verificar algunos resultados
    const sampleResult = await pool.query(
      `SELECT first_name, last_name, contract_number, in_collections 
       FROM clients 
       WHERE in_collections = 'Si'
       LIMIT 10`
    );

    if (sampleResult.rows.length > 0) {
      console.log('\n📋 Primeros 10 clientes en cobranzas:');
      sampleResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.first_name} ${row.last_name} - ${row.contract_number}`);
      });
    }

    // Contar total de clientes en cobranzas
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM clients WHERE in_collections = 'Si'`
    );
    console.log(`\n📊 Total de clientes en cobranzas: ${countResult.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    await pool.end();
  }
}

markCollectionsClients();
