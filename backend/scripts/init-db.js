const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Princonserkids2025+',
});

async function initDatabase() {
  try {
    console.log('🚀 Initializing Kempery World Travel Database...');

    // Read schema file
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);
    console.log('✅ Database schema created successfully');

    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);

    console.log('🎉 Database initialization completed!');
    console.log('\n📋 Default admin credentials:');
    console.log('   Email: ventas.kempery@gmail.com');
    console.log('   Password: Kempery2025+');
    console.log('\n🌐 API will be available at: http://localhost:5000');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
