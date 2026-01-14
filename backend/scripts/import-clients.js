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
  return data.trim().replace(/"/g, '').replace(/\$/g, '').replace(/,/g, '');
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
  return phone.replace(/\D/g, '').substring(0, 15);
};

// Función para limpiar cédula
const cleanCedula = (cedula) => {
  if (!cedula) return null;
  return cedula.replace(/\D/g, '').substring(0, 20);
};

// Función para limpiar email
const cleanEmail = (email) => {
  if (!email) return null;
  return email.trim().toLowerCase();
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
  const dest = destino.toLowerCase();
  return dest !== 'no' && dest !== '' && dest !== 'kempery';
};

// Función para extraer destino
const extractDestination = (destino) => {
  if (!destino || destino.toLowerCase() === 'no') return 'Nacional';
  return destino;
};

async function importClients() {
  try {
    console.log('🚀 Iniciando importación de clientes desde CSV...');

    // Leer archivo CSV
    const csvPath = path.join(__dirname, '../../Base Kempery.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');

    // Saltar la primera línea (headers)
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');

    console.log(`📊 Procesando ${dataLines.length} registros...`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Procesar cada línea
    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i];
        const columns = line.split(',');

        // Mapear columnas según el CSV
        const [
          fecha,
          contrato,
          nombres,
          apellidos,
          cedula,
          telefono,
          noches,
          anos,
          internacional,
          data,
          tipo,
          neto,
          iva,
          total,
          correo,
          liner,
          closed,
          observaciones
        ] = columns;

        // Validar datos requeridos
        if (!nombres || !apellidos || !cedula || !correo) {
          console.warn(`⚠️  Línea ${i + 2}: Datos incompletos, saltando...`);
          errorCount++;
          continue;
        }

        // Limpiar y formatear datos
        const clientData = {
          first_name: cleanData(nombres),
          last_name: cleanData(apellidos),
          email: cleanEmail(correo),
          phone: cleanPhone(telefono),
          document_type: getDocumentType(cedula),
          document_number: cleanCedula(cedula),
          birth_date: null, // No disponible en el CSV
          address: null, // No disponible en el CSV
          city: 'Quito', // Asumir Quito como ciudad principal
          country: 'Ecuador',
          emergency_contact_name: null,
          emergency_contact_phone: null,
          notes: `Contrato: ${cleanData(contrato)} | Línea: ${cleanData(liner)} | Cerrado: ${cleanData(closed)} | Observaciones: ${cleanData(observaciones)}`
        };

        // Verificar si el cliente ya existe
        const existingClient = await pool.query(
          'SELECT id FROM clients WHERE email = $1 OR document_number = $2',
          [clientData.email, clientData.document_number]
        );

        if (existingClient.rows.length > 0) {
          console.log(`ℹ️  Cliente ya existe: ${clientData.email}`);
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
            clientData.first_name,
            clientData.last_name,
            clientData.email,
            clientData.phone,
            clientData.document_type,
            clientData.document_number,
            clientData.birth_date,
            clientData.address,
            clientData.city,
            clientData.country,
            clientData.emergency_contact_name,
            clientData.emergency_contact_phone,
            clientData.notes,
            new Date()
          ]
        );

        const clientId = result.rows[0].id;

        // Crear reserva si hay datos de viaje
        if (internacional && internacional.toLowerCase() !== 'no') {
          const travelDate = parseDate(fecha);
          const nights = parseInt(cleanData(noches)) || 1;
          const returnDate = travelDate ? 
            new Date(new Date(travelDate).getTime() + (nights * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] : 
            null;

          // Buscar paquete existente o crear uno genérico
          let packageId;
          const packageResult = await pool.query(
            'SELECT id FROM packages WHERE destination ILIKE $1 LIMIT 1',
            [`%${extractDestination(internacional)}%`]
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
                `Viaje a ${extractDestination(internacional)}`,
                `Paquete de viaje a ${extractDestination(internacional)}`,
                extractDestination(internacional),
                nights,
                cleanMoney(total) || 1000,
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
              travelDate,
              returnDate,
              1, // Asumir 1 participante
              cleanMoney(total) || 1000,
              'USD',
              'completed', // Asumir completada
              'paid', // Asumir pagada
              `Tipo: ${cleanData(tipo)} | Neto: $${cleanMoney(neto)} | IVA: $${cleanMoney(iva)}`,
              new Date()
            ]
          );
        }

        successCount++;
        
        if (successCount % 50 === 0) {
          console.log(`✅ Procesados ${successCount} clientes...`);
        }

      } catch (error) {
        console.error(`❌ Error en línea ${i + 2}:`, error.message);
        errors.push({ line: i + 2, error: error.message });
        errorCount++;
      }
    }

    console.log('\n🎉 Importación completada!');
    console.log(`✅ Clientes importados exitosamente: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n📋 Errores detallados:');
      errors.slice(0, 10).forEach(err => {
        console.log(`   Línea ${err.line}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... y ${errors.length - 10} errores más`);
      }
    }

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar importación
importClients();
