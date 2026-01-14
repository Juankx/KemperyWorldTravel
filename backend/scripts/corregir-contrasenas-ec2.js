/**
 * Script para corregir las contraseñas de usuarios en producción
 * Convierte contraseñas en texto plano a hashes bcrypt
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Contraseña por defecto para usuarios que tienen texto plano
const DEFAULT_PASSWORD = 'Kempery2025+';

async function corregirContrasenas() {
  try {
    console.log('🔧 Corrigiendo contraseñas de usuarios...\n');

    // Obtener todos los usuarios
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name FROM users ORDER BY email'
    );

    if (result.rows.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      return;
    }

    console.log(`📋 Encontrados ${result.rows.length} usuario(s)\n`);

    let corregidos = 0;
    let yaCorrectos = 0;
    let errores = 0;

    for (const user of result.rows) {
      try {
        // Verificar si el password_hash es un hash bcrypt válido
        // Los hashes bcrypt empiezan con $2a$, $2b$, o $2y$ y tienen 60 caracteres
        const isBcryptHash = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password_hash);

        if (isBcryptHash) {
          console.log(`✅ ${user.email}: Ya tiene hash bcrypt correcto`);
          yaCorrectos++;
        } else {
          // El password_hash no es un hash válido, necesitamos corregirlo
          console.log(`⚠️  ${user.email}: Tiene contraseña en texto plano, corrigiendo...`);

          // Generar hash bcrypt
          const saltRounds = 10;
          const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds);

          // Actualizar en la base de datos
          await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [passwordHash, user.id]
          );

          console.log(`   ✅ Contraseña corregida para ${user.email}`);
          console.log(`   📝 Contraseña: ${DEFAULT_PASSWORD}`);
          corregidos++;
        }
      } catch (error) {
        console.error(`   ❌ Error corrigiendo ${user.email}: ${error.message}`);
        errores++;
      }
    }

    console.log('\n========================================');
    console.log('📊 Resumen:');
    console.log(`   ✅ Corregidos: ${corregidos}`);
    console.log(`   ✓ Ya correctos: ${yaCorrectos}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log('========================================\n');

    // Listar usuarios finales
    const finalUsers = await pool.query(
      'SELECT email, first_name, last_name, role FROM users ORDER BY email'
    );
    console.log(`📋 Usuarios en la base de datos (${finalUsers.rows.length}):`);
    finalUsers.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.first_name} ${user.last_name}) - ${user.role}`);
    });
    console.log('\n🔑 Contraseña por defecto para usuarios corregidos: Kempery2025+');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

corregirContrasenas();

