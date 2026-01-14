const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Configurando base de datos de Kempery World Travel...\n');

try {
  // 1. Inicializar esquema de base de datos
  console.log('1️⃣ Inicializando esquema de base de datos...');
  execSync('node scripts/init-db.js', { stdio: 'inherit', cwd: __dirname + '/..' });
  console.log('✅ Esquema inicializado correctamente\n');

  // 2. Importar clientes desde CSV
  console.log('2️⃣ Importando clientes desde CSV...');
  execSync('node scripts/import-clients-v2.js', { stdio: 'inherit', cwd: __dirname + '/..' });
  console.log('✅ Clientes importados correctamente\n');

  console.log('🎉 ¡Base de datos configurada exitosamente!');
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Ejecutar backend: npm run dev');
  console.log('   2. Ejecutar frontend: npm run dev (en otra terminal)');
  console.log('   3. Acceder a: http://localhost:3000');
  console.log('   4. Login: ventas.kempery@gmail.com / Kempery2025+');

} catch (error) {
  console.error('❌ Error durante la configuración:', error.message);
  process.exit(1);
}
