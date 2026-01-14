/**
 * Script para actualizar todos los datos desde CSV
 * Ejecuta tanto la importación de clientes como la actualización de cobranzas
 */

const { importClientsFromCSV } = require('./import-new-clients-csv');
const { updateCollectionsFromCSV } = require('./update-collections-from-csv');

async function actualizarTodosLosDatos() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 ACTUALIZACIÓN COMPLETA DE DATOS DESDE CSV');
    console.log('='.repeat(60));
    console.log('');

    // Paso 1: Importar/Actualizar clientes
    console.log('📋 PASO 1: Importando/Actualizando clientes desde Clientes23-25.csv');
    console.log('-'.repeat(60));
    try {
      await importClientsFromCSV();
      console.log('✅ Importación de clientes completada\n');
    } catch (error) {
      console.error('❌ Error importando clientes:', error.message);
      throw error;
    }

    // Paso 2: Actualizar cobranzas
    console.log('💰 PASO 2: Actualizando cobranzas desde ActualizadoCobranza.csv');
    console.log('-'.repeat(60));
    try {
      await updateCollectionsFromCSV();
      console.log('✅ Actualización de cobranzas completada\n');
    } catch (error) {
      console.error('❌ Error actualizando cobranzas:', error.message);
      throw error;
    }

    console.log('='.repeat(60));
    console.log('🎉 ACTUALIZACIÓN COMPLETA FINALIZADA');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 Resumen:');
    console.log('   1. ✅ Clientes importados/actualizados desde Clientes23-25.csv');
    console.log('   2. ✅ Cobranzas actualizadas desde ActualizadoCobranza.csv');
    console.log('');

  } catch (error) {
    console.error('💥 Error fatal durante la actualización:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  actualizarTodosLosDatos()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { actualizarTodosLosDatos };

