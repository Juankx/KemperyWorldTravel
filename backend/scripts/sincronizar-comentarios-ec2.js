const { createClientCollectionsCommentsSchema } = require('./create-client-collections-comments-schema');

async function sincronizarComentarios() {
  try {
    console.log('🔄 Iniciando sincronización de comentarios de cobranzas...');
    
    await createClientCollectionsCommentsSchema();
    
    console.log('✅ Sincronización de comentarios completada exitosamente');
  } catch (error) {
    console.error('❌ Error en sincronización de comentarios:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  sincronizarComentarios()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el script:', error);
      process.exit(1);
    });
}

module.exports = { sincronizarComentarios };

