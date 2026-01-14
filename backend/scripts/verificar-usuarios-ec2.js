const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
});

async function verificarUsuarios() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...\n');

    // Listar todos los usuarios
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY created_at'
    );

    if (result.rows.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      console.log('\n📝 Para crear usuarios, ejecuta:');
      console.log('   node scripts/init-db.js');
      console.log('   O crea usuarios manualmente desde la aplicación');
    } else {
      console.log(`✅ Encontrados ${result.rows.length} usuario(s):\n`);
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Nombre: ${user.first_name} ${user.last_name}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Activo: ${user.is_active ? 'Sí' : 'No'}`);
        console.log(`   Creado: ${user.created_at}`);
        console.log('');
      });
    }

    // Verificar si existe el usuario "Paola"
    const paolaResult = await pool.query(
      "SELECT email, first_name, last_name, role, is_active FROM users WHERE email ILIKE '%paola%' OR first_name ILIKE '%paola%'"
    );

    if (paolaResult.rows.length === 0) {
      console.log('⚠️  No se encontró ningún usuario con "Paola"');
      console.log('\n💡 Para crear el usuario "Paola", puedes:');
      console.log('   1. Crearlo desde la aplicación (si tienes acceso de admin)');
      console.log('   2. O ejecutar este script con el flag --crear-paola');
    } else {
      console.log('✅ Usuario(s) encontrado(s) con "Paola":');
      paolaResult.rows.forEach(user => {
        console.log(`   - ${user.email} (${user.first_name} ${user.last_name})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Si se pasa --crear-paola, crear el usuario
if (process.argv.includes('--crear-paola')) {
  const bcrypt = require('bcryptjs');
  
  async function crearPaola() {
    try {
      console.log('👤 Creando usuario Paola...\n');

      // Verificar si ya existe
      const existing = await pool.query(
        "SELECT email FROM users WHERE email = 'Paola' OR email = 'paola'"
      );

      if (existing.rows.length > 0) {
        console.log('⚠️  El usuario "Paola" ya existe');
        await verificarUsuarios();
        return;
      }

      // Hash de la contraseña
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('Kempery2025+', saltRounds);

      // Crear usuario
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, role`,
        ['Paola', passwordHash, 'Paola', 'Usuario', 'employee', true]
      );

      console.log('✅ Usuario creado exitosamente:');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Nombre: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
      console.log(`   Rol: ${result.rows[0].role}`);
      console.log(`   Contraseña: Kempery2025+`);

    } catch (error) {
      console.error('❌ Error creando usuario:', error.message);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }

  crearPaola();
} else {
  verificarUsuarios();
}



