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

// Función para convertir fecha
const parseDate = (dateStr) => {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
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

// Función para determinar si es viaje internacional
const isInternational = (destino) => {
  if (!destino) return false;
  const dest = destino.toString().toLowerCase();
  return dest !== 'no' && dest !== '' && dest !== 'kempery';
};

// Función para extraer destino
const extractDestination = (destino) => {
  if (!destino || destino.toString().toLowerCase() === 'no') return 'Nacional';
  return destino.toString();
};

async function importClients() {
  try {
    console.log('🚀 Iniciando importación de clientes desde CSV...');

    const csvPath = path.join(__dirname, '../../Base Kempery.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Archivo CSV no encontrado:', csvPath);
      return;
    }

    const clients = [];
    const bookings = [];

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
            const clientData = {
              first_name: cleanData(row.nombres),
              last_name: cleanData(row.apellidos),
              email: cleanEmail(row.correo),
              phone: cleanPhone(row.telefono),
              document_type: getDocumentType(row.cedula),
              document_number: cleanCedula(row.cedula),
              birth_date: null,
              address: null,
              city: 'Quito',
              country: 'Ecuador',
              emergency_contact_name: null,
              emergency_contact_phone: null,
              notes: `Contrato: ${cleanData(row.contrato)} | Línea: ${cleanData(row.liner)} | Cerrado: ${cleanData(row.closed)} | Observaciones: ${cleanData(row.observaciones)}`
            };

            clients.push(clientData);

            // Preparar datos de reserva si es viaje internacional
            if (isInternational(row.internacional)) {
              const travelDate = parseDate(row.fecha);
              const nights = parseInt(cleanData(row.noches)) || 1;
              const returnDate = travelDate ? 
                new Date(new Date(travelDate).getTime() + (nights * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] : 
                null;

              bookings.push({
                contrato: cleanData(row.contrato),
                destino: extractDestination(row.internacional),
                travel_date: travelDate,
                return_date: returnDate,
                nights: nights,
                total: cleanMoney(row.total),
                tipo: cleanData(row.tipo),
                neto: cleanMoney(row.neto),
                iva: cleanMoney(row.iva),
                email: cleanEmail(row.correo)
              });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Procesando ${clients.length} clientes y ${bookings.length} reservas...`);

    let successCount = 0;
    let errorCount = 0;
    const clientMap = new Map(); // Para mapear emails a IDs

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
          clientMap.set(client.email, existingClient.rows[0].id);
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

        const clientId = result.rows[0].id;
        clientMap.set(client.email, clientId);
        successCount++;

        if (successCount % 50 === 0) {
          console.log(`✅ Procesados ${successCount} clientes...`);
        }

      } catch (error) {
        console.error(`❌ Error insertando cliente ${client.email}:`, error.message);
        errorCount++;
      }
    }

    // Insertar reservas
    console.log('✈️ Insertando reservas...');
    let bookingSuccessCount = 0;
    let bookingErrorCount = 0;

    for (const booking of bookings) {
      try {
        const clientId = clientMap.get(booking.email);
        if (!clientId) {
          console.warn(`⚠️ Cliente no encontrado para reserva: ${booking.email}`);
          bookingErrorCount++;
          continue;
        }

        // Buscar o crear paquete
        let packageId;
        const packageResult = await pool.query(
          'SELECT id FROM packages WHERE destination ILIKE $1 LIMIT 1',
          [`%${booking.destino}%`]
        );

        if (packageResult.rows.length > 0) {
          packageId = packageResult.rows[0].id;
        } else {
          // Crear paquete genérico
          const newPackage = await pool.query(
            `INSERT INTO packages (name, description, destination, duration_days, price, currency, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              `Viaje a ${booking.destino}`,
              `Paquete de viaje a ${booking.destino}`,
              booking.destino,
              booking.nights,
              booking.total || 1000,
              'USD',
              true
            ]
          );
          packageId = newPackage.rows[0].id;
        }

        // Crear reserva
        const bookingNumber = `KWT${Date.now()}${Math.floor(Math.random() * 1000)}`;
        await pool.query(
          `INSERT INTO bookings (
            booking_number, client_id, package_id, travel_date, return_date,
            participants, total_price, currency, status, payment_status,
            special_requests, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            bookingNumber,
            clientId,
            packageId,
            booking.travel_date,
            booking.return_date,
            1,
            booking.total || 1000,
            'USD',
            'completed',
            'paid',
            `Tipo: ${booking.tipo} | Neto: $${booking.neto} | IVA: $${booking.iva} | Contrato: ${booking.contrato}`,
            new Date()
          ]
        );

        bookingSuccessCount++;

      } catch (error) {
        console.error(`❌ Error insertando reserva para ${booking.email}:`, error.message);
        bookingErrorCount++;
      }
    }

    console.log('\n🎉 Importación completada!');
    console.log(`✅ Clientes importados: ${successCount}`);
    console.log(`✅ Reservas importadas: ${bookingSuccessCount}`);
    console.log(`❌ Errores clientes: ${errorCount}`);
    console.log(`❌ Errores reservas: ${bookingErrorCount}`);

    // Mostrar estadísticas finales
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_clients_30_days
      FROM clients
    `);

    const bookingStats = await pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(total_price) as total_revenue
      FROM bookings
    `);

    console.log('\n📊 Estadísticas de la base de datos:');
    console.log(`   Total clientes: ${stats.rows[0].total_clients}`);
    console.log(`   Total reservas: ${bookingStats.rows[0].total_bookings}`);
    console.log(`   Ingresos totales: $${parseFloat(bookingStats.rows[0].total_revenue || 0).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar importación
importClients();
