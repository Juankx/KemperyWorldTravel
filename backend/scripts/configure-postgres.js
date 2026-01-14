const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐘 Configurando PostgreSQL para Kempery World Travel...\n');

async function configurePostgreSQL() {
  try {
    // 1. Verificar si PostgreSQL está instalado
    console.log('1️⃣ Verificando instalación de PostgreSQL...');
    try {
      execSync('psql --version', { stdio: 'pipe' });
      console.log('✅ PostgreSQL está instalado');
    } catch (error) {
      console.error('❌ PostgreSQL no está instalado o no está en el PATH');
      console.log('\n📋 Instrucciones de instalación:');
      console.log('   1. Ve a: https://www.postgresql.org/download/windows/');
      console.log('   2. Descarga PostgreSQL 15 o 16');
      console.log('   3. Instala con las opciones por defecto');
      console.log('   4. Anota la contraseña del usuario postgres');
      console.log('   5. Ejecuta este script nuevamente');
      return;
    }

    // 2. Solicitar contraseña de PostgreSQL
    console.log('\n2️⃣ Configuración de la base de datos...');
    console.log('📝 Necesitamos la contraseña del usuario postgres');
    console.log('   (La que configuraste durante la instalación)');
    
    // Crear archivo .env con placeholder
    const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kempery_travel
DB_USER=postgres
DB_PASSWORD=REPLACE_WITH_YOUR_PASSWORD

# JWT Configuration
JWT_SECRET=kempery_world_travel_super_secret_key_2025
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000`;

    const envPath = path.join(__dirname, '../.env');
    fs.writeFileSync(envPath, envContent);

    console.log('\n📄 Archivo .env creado en backend/.env');
    console.log('⚠️  IMPORTANTE: Debes editar el archivo .env y reemplazar "REPLACE_WITH_YOUR_PASSWORD" con tu contraseña real de PostgreSQL');
    
    console.log('\n3️⃣ Creando base de datos...');
    console.log('   Ejecutando: psql -U postgres -c "CREATE DATABASE kempery_travel;"');
    console.log('   (Se te pedirá la contraseña)');
    
    try {
      execSync('psql -U postgres -c "CREATE DATABASE kempery_travel;"', { stdio: 'inherit' });
      console.log('✅ Base de datos kempery_travel creada exitosamente');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  La base de datos kempery_travel ya existe');
      } else {
        console.error('❌ Error creando la base de datos:', error.message);
        return;
      }
    }

    console.log('\n🎉 Configuración de PostgreSQL completada!');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Edita backend/.env y reemplaza "REPLACE_WITH_YOUR_PASSWORD" con tu contraseña');
    console.log('   2. Ejecuta: npm run init-db');
    console.log('   3. Ejecuta: npm run import-clients');
    console.log('   4. Ejecuta: npm run dev');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
  }
}

configurePostgreSQL();
