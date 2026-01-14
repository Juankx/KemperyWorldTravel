const { createPaymentsSchema, pool: paymentsPool } = require('./create-payments-schema');
const { createClientCollectionsCommentsSchema, pool: commentsPool } = require('./create-client-collections-comments-schema');

async function sincronizarPagosEC2() {
  try {
    console.log('🔄 Iniciando sincronización de esquema de pagos en EC2...');
    await createPaymentsSchema();
    console.log('✅ Sincronización de pagos completada exitosamente');
    
    console.log('🔄 Iniciando sincronización de comentarios de cobranzas...');
    await createClientCollectionsCommentsSchema();
    console.log('✅ Sincronización de comentarios completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante la sincronización en EC2:', error);
    throw error;
  } finally {
    // Cerrar ambos pools si se está ejecutando directamente
    if (require.main === module) {
      await paymentsPool.end();
      await commentsPool.end();
    }
  }
}

if (require.main === module) {
  sincronizarPagosEC2()
    .then(() => {
      console.log('✅ Sincronización de pagos en EC2 finalizada.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el script de sincronización de pagos en EC2:', error);
      process.exit(1);
    });
}

module.exports = { sincronizarPagosEC2 };

