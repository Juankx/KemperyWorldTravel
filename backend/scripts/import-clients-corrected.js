const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kempery_travel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Función para limpiar y formatear datos
const cleanData = (data) => {
  if (!data) return null;
  return data.toString().trim().replace(/"/g, '').replace(/\$/g, '').replace(/,/g, '');
};

// Función para limpiar número de teléfono
const cleanPhone = (phone) => {
  if (!phone) return null;
  return phone.toString().replace(/\D/g, '').substring(0, 15);
};

// Función para limpiar cédula
const cleanCedula = (cedula) => {
  if (!cedula) return null;
  return cedula.toString().replace(/\D/g, '').substring(0, 20);
};

// Función para limpiar email
const cleanEmail = (email) => {
  if (!email) return null;
  return email.toString().trim().toLowerCase();
};

// Función para limpiar valores monetarios
const cleanMoney = (moneyStr) => {
  if (!moneyStr) return 0;
  const cleaned = cleanData(moneyStr);
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Función para determinar el tipo de documento
const getDocumentType = (cedula) => {
  if (!cedula) return 'cedula';
  const cleanCed = cleanCedula(cedula);
  if (cleanCed.length === 10) return 'cedula';
  if (cleanCed.length === 13) return 'ruc';
  return 'cedula';
};

// Función para convertir fecha de registro
const parseRegistrationDate = (dateStr) => {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
};

// Función para determinar si tiene bono internacional
const hasInternationalBonus = (internacional) => {
  if (!internacional) return false;
  const dest = internacional.toString().toLowerCase();
  return dest !== 'no' && dest !== '' && dest !== 'kempery';
};

async function importClients() {
  try {
    console.log('🚀 Iniciando importación de CLIENTES desde CSV...');
    console.log('📝 NOTA: Solo se importarán clientes, NO reservas de viaje');

    const csvPath = path.join(__dirname, '../../Base Kempery.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Archivo CSV no encontrado:', csvPath);
      return;
    }

    const clients = [];

    // Leer archivo CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv({
          separator: ',',
          skipEmptyLines: true,
          headers: [
            'fecha', 'contrato', 'nombres', 'apellidos', 'cedula', 'telefono',
            'noches', 'anos', 'internacional', 'data', 'tipo', 'neto', 'iva',
            'total', 'correo', 'liner', 'closed', 'observaciones'
          ]
        }))
        .on('data', (row) => {
          // Validar datos requeridos
          if (row.nombres && row.apellidos && row.cedula && row.correo) {
            const registrationDate = parseRegistrationDate(row.fecha);
            const hasBonus = hasInternationalBonus(row.internacional);
            
            const clientData = {
              first_name: cleanData(row.nombres),
              last_name: cleanData(row.apellidos),
              email: cleanEmail(row.correo),
              phone: cleanPhone(row.telefono),
              document_type: getDocumentType(row.cedula),
              document_number: cleanCedula(row.cedula),
              birth_date: null, // No disponible en el CSV
              address: null, // No disponible en el CSV
              city: 'Quito', // Asumir Quito como ciudad principal
              country: 'Ecuador',
              emergency_contact_name: null,
              emergency_contact_phone: null,
              notes: `Registro: ${registrationDate || 'N/A'} | Contrato: ${cleanData(row.contrato)} | Bono Internacional: ${hasBonus ? 'Sí' : 'No'} | Línea: ${cleanData(row.liner)} | Cerrado: ${cleanData(row.closed)} | Observaciones: ${cleanData(row.observaciones)}`
            };

            clients.push(clientData);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Procesando ${clients.length} clientes...`);

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Insertar clientes
    console.log('👥 Insertando clientes...');
    for (const client of clients) {
      try {
        // Verificar si el cliente ya existe
        const existingClient = await pool.query(
          'SELECT id FROM clients WHERE email = $1 OR document_number = $2',
          [client.email, client.document_number]
        );

        if (existingClient.rows.length > 0) {
          duplicateCount++;
          continue;
        }

        // Insertar cliente
        const result = await pool.query(
          `INSERT INTO clients (
            first_name, last_name, email, phone, document_type, document_number,
            birth_date, address, city, country, emergency_contact_name,
            emergency_contact_phone, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`,
          [
            client.first_name,
            client.last_name,
            client.email,
            client.phone,
            client.document_type,
            client.document_number,
            client.birth_date,
            client.address,
            client.city,
            client.country,
            client.emergency_contact_name,
            client.emergency_contact_phone,
            client.notes,
            new Date()
          ]
        );

        successCount++;

        if (successCount % 50 === 0) {
          console.log(`✅ Procesados ${successCount} clientes...`);
        }

      } catch (error) {
        console.error(`❌ Error insertando cliente ${client.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 Importación de clientes completada!');
    console.log(`✅ Clientes importados: ${successCount}`);
    console.log(`🔄 Clientes duplicados (omitidos): ${duplicateCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    // Mostrar estadísticas finales
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_clients_30_days
      FROM clients
    `);

    console.log('\n📊 Estadísticas de la base de datos:');
    console.log(`   Total clientes: ${stats.rows[0].total_clients}`);
    console.log(`   Clientes nuevos (30 días): ${stats.rows[0].new_clients_30_days}`);

    // Mostrar algunos ejemplos de clientes importados
    console.log('\n👥 Ejemplos de clientes importados:');
    const sampleClients = await pool.query(`
      SELECT first_name, last_name, email, phone, notes 
      FROM clients 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    sampleClients.rows.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.first_name} ${client.last_name} - ${client.email}`);
    });

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar importación
importClients();
