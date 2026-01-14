/**
 * Script para sincronizar usuarios de desarrollo a producción
 * 
 * Uso:
 *   - Desde desarrollo: node scripts/sincronizar-usuarios.js --export
 *   - En producción (EC2): node scripts/sincronizar-usuarios.js --import
 * 
 * Este script excluye al usuario "Paola" ya que tiene credenciales diferentes
 * en producción.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const EXPORT_FILE = path.join(__dirname, 'usuarios-export.json');

async function exportarUsuarios() {
  try {
    console.log('📤 Exportando usuarios desde desarrollo...\n');

    // Obtener todos los usuarios excepto Paola
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at
       FROM users 
       WHERE email NOT ILIKE '%paola%' AND first_name NOT ILIKE '%paola%'
       ORDER BY created_at`
    );

    if (result.rows.length === 0) {
      console.log('⚠️  No hay usuarios para exportar (excluyendo Paola)');
      return;
    }

    // Preparar datos para exportación
    const usuarios = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }));

    // Guardar en archivo JSON
    fs.writeFileSync(EXPORT_FILE, JSON.stringify(usuarios, null, 2), 'utf8');

    console.log(`✅ Exportados ${usuarios.length} usuario(s):`);
    usuarios.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.first_name} ${user.last_name}) - ${user.role}`);
    });
    console.log(`\n📁 Archivo guardado en: ${EXPORT_FILE}`);
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Sube este archivo a EC2:');
    console.log(`      scp -i kemperyworldtravel.pem ${EXPORT_FILE} ec2-user@3.141.103.248:~/kempery-backend/scripts/`);
    console.log('   2. En EC2, ejecuta:');
    console.log('      node scripts/sincronizar-usuarios.js --import');

  } catch (error) {
    console.error('❌ Error exportando usuarios:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function importarUsuarios() {
  try {
    console.log('📥 Importando usuarios a producción...\n');

    // Verificar que existe el archivo
    if (!fs.existsSync(EXPORT_FILE)) {
      console.error(`❌ No se encontró el archivo: ${EXPORT_FILE}`);
      console.log('\n💡 Primero exporta los usuarios desde desarrollo:');
      console.log('   node scripts/sincronizar-usuarios.js --export');
      process.exit(1);
    }

    // Leer archivo
    const usuariosData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

    if (!Array.isArray(usuariosData) || usuariosData.length === 0) {
      console.log('⚠️  El archivo no contiene usuarios válidos');
      return;
    }

    console.log(`📋 Importando ${usuariosData.length} usuario(s)...\n`);

    let creados = 0;
    let actualizados = 0;
    let errores = 0;

    for (const usuario of usuariosData) {
      try {
        // Verificar si el usuario ya existe
        const existing = await pool.query(
          'SELECT id, email FROM users WHERE id = $1 OR email = $2',
          [usuario.id, usuario.email]
        );

        if (existing.rows.length > 0) {
          // Actualizar usuario existente
          await pool.query(
            `UPDATE users 
             SET email = $1, password_hash = $2, first_name = $3, last_name = $4, 
                 role = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7`,
            [
              usuario.email,
              usuario.password_hash,
              usuario.first_name,
              usuario.last_name,
              usuario.role,
              usuario.is_active,
              usuario.id
            ]
          );
          console.log(`   ✅ Actualizado: ${usuario.email}`);
          actualizados++;
        } else {
          // Crear nuevo usuario
          await pool.query(
            `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              usuario.id,
              usuario.email,
              usuario.password_hash,
              usuario.first_name,
              usuario.last_name,
              usuario.role,
              usuario.is_active,
              usuario.created_at || new Date(),
              usuario.updated_at || new Date()
            ]
          );
          console.log(`   ✅ Creado: ${usuario.email}`);
          creados++;
        }
      } catch (error) {
        console.error(`   ❌ Error con ${usuario.email}: ${error.message}`);
        errores++;
      }
    }

    console.log('\n========================================');
    console.log('📊 Resumen de importación:');
    console.log(`   ✅ Creados: ${creados}`);
    console.log(`   🔄 Actualizados: ${actualizados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log('========================================\n');

    // Listar todos los usuarios después de la importación
    const allUsers = await pool.query(
      'SELECT email, first_name, last_name, role, is_active FROM users ORDER BY created_at'
    );
    console.log(`📋 Total de usuarios en producción: ${allUsers.rows.length}`);
    allUsers.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.first_name} ${user.last_name}) - ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Error importando usuarios:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Procesar argumentos
const args = process.argv.slice(2);

if (args.includes('--export')) {
  exportarUsuarios();
} else if (args.includes('--import')) {
  importarUsuarios();
} else {
  console.log('📖 Uso del script:');
  console.log('');
  console.log('  Exportar usuarios desde desarrollo:');
  console.log('    node scripts/sincronizar-usuarios.js --export');
  console.log('');
  console.log('  Importar usuarios a producción (en EC2):');
  console.log('    node scripts/sincronizar-usuarios.js --import');
  console.log('');
  console.log('⚠️  Nota: Este script excluye al usuario "Paola"');
  console.log('   ya que tiene credenciales diferentes en producción.');
  process.exit(1);
}

