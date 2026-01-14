const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

// Configuración de la base de datos
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kempery_travel',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Función para limpiar montos (quitar $, comas y espacios)
function cleanAmount(amount) {
  if (!amount || amount === '0' || amount === 0) return 0;
  
  // Convertir a string si no lo es
  let cleanAmount = String(amount);
  
  // Quitar $, comas, espacios y comillas
  cleanAmount = cleanAmount.replace(/[$,\s"]/g, '');
  
  // Convertir a número
  const numAmount = parseFloat(cleanAmount);
  return isNaN(numAmount) ? 0 : numAmount;
}

// Función para convertir fecha de formato MM/DD/YYYY a YYYY-MM-DD
function convertDate(dateStr) {
  if (!dateStr || dateStr === '0' || dateStr === 0) return null;
  
  try {
    // Si ya es un formato válido, devolverlo
    if (dateStr.includes('-')) return dateStr;
    
    // Convertir MM/DD/YYYY a YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let month = parts[0].padStart(2, '0');
      let day = parts[1].padStart(2, '0');
      let year = parts[2];
      
      // Validar que los valores sean razonables
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      const yearNum = parseInt(year);
      
      // Corregir fechas obviamente incorrectas
      if (monthNum > 12) {
        console.log(`⚠️  Fecha incorrecta detectada: ${dateStr}, corrigiendo mes`);
        month = '12';
      }
      if (dayNum > 31) {
        console.log(`⚠️  Fecha incorrecta detectada: ${dateStr}, corrigiendo día`);
        day = '31';
      }
      if (yearNum < 2000 || yearNum > 2030) {
        console.log(`⚠️  Fecha incorrecta detectada: ${dateStr}, usando año por defecto`);
        year = '2023';
      }
      
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Error convirtiendo fecha:', dateStr, error);
  }
  
  // Si no se puede convertir, usar fecha por defecto
  return '2023-01-01';
}

// Función para limpiar texto
function cleanText(text) {
  if (!text || text === '0' || text === 0) return null;
  return String(text).trim() || null;
}

// Función para generar email único cuando está vacío
function generateUniqueEmail(contractNumber, firstName, lastName) {
  if (!contractNumber || !firstName || !lastName) {
    return `cliente_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@kempery.com`;
  }
  
  const cleanContract = contractNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanFirst = firstName.trim().toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.trim().toLowerCase().replace(/[^a-z]/g, '');
  
  return `${cleanFirst}.${cleanLast}.${cleanContract}@kempery.com`;
}

// Función para limpiar número
function cleanNumber(num) {
  if (!num || num === '0' || num === 0) return null;
  const parsed = parseInt(num);
  return isNaN(parsed) ? null : parsed;
}

async function importClientsFromCSV() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando importación de clientes desde CSV...');
    
    // Leer el archivo CSV - buscar en varias ubicaciones posibles
    const possiblePaths = [
      path.join(__dirname, '../../frontend/Clientes23-25.csv'),
      path.join(__dirname, '../Clientes23-25.csv'),
      path.join(__dirname, '../../Clientes23-25.csv'),
      '/home/ec2-user/kempery-backend/Clientes23-25.csv',
      './Clientes23-25.csv'
    ];
    
    let csvPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        csvPath = possiblePath;
        break;
      }
    }
    
    if (!csvPath) {
      console.error('❌ Archivo CSV no encontrado. Buscado en:');
      possiblePaths.forEach(p => console.error(`   - ${p}`));
      console.error('\n💡 Por favor, coloca el archivo Clientes23-25.csv en una de estas ubicaciones:');
      console.error('   - ~/kempery-backend/Clientes23-25.csv');
      console.error('   - ../frontend/Clientes23-25.csv (desde el directorio del script)');
      client.release();
      await pool.end();
      return;
    }
    
    console.log(`📄 Usando archivo CSV: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📄 Total de líneas en CSV: ${lines.length}`);
    
    // Saltar la primera línea (encabezados)
    const dataLines = lines.slice(1);
    console.log(`📊 Registros a procesar: ${dataLines.length}`);
    
    let successCount = 0;
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Procesar cada línea
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;
      
      try {
        // Parsear CSV (manejar comillas y comas dentro de campos)
        const fields = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        fields.push(currentField.trim());
        
        // Mapear campos
        const [
          fecha,
          contrato,
          nombres,
          apellidos,
          cedula,
          telefono,
          noches,
          años,
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
        ] = fields;
        
        // Limpiar y convertir datos
        const firstName = cleanText(nombres);
        const lastName = cleanText(apellidos);
        const contractNumber = cleanText(contrato);
        let email = cleanText(correo);
        
        // Generar email único si está vacío
        if (!email) {
          email = generateUniqueEmail(contractNumber, firstName, lastName);
        }
        
        const clientData = {
          created_at: convertDate(fecha), // Fecha de firma del contrato
          contract_number: contractNumber,
          first_name: firstName,
          last_name: lastName,
          identification: cleanText(cedula), // Cambiar a texto ya que puede tener letras
          phone: cleanText(telefono), // Cambiar a texto ya que puede tener formato especial
          total_nights: cleanNumber(noches),
          remaining_nights: cleanNumber(noches), // Inicialmente igual al total
          years: cleanNumber(años), // Años de duración del contrato
          international_bonus: cleanText(internacional), // Cambiar a texto
          total_amount: cleanAmount(total),
          email: email,
          notes: cleanText(observaciones), // Usar notes en lugar de observations
          in_collections: 'false', // Cambiar a string ya que es character varying
          is_active: true
        };
        
        // Verificar que tenemos datos mínimos requeridos
        if (!clientData.contract_number || !clientData.first_name || !clientData.last_name) {
          console.log(`⚠️  Saltando registro ${i + 1}: Faltan datos requeridos`);
          errorCount++;
          continue;
        }
        
        // Verificar si el contrato ya existe
        const existingClient = await client.query(
          'SELECT id, email FROM clients WHERE contract_number = $1',
          [clientData.contract_number]
        );
        
        let finalEmail = clientData.email;
        
        if (existingClient.rows.length > 0) {
          // Cliente existe - ACTUALIZAR
          const existingId = existingClient.rows[0].id;
          const existingEmail = existingClient.rows[0].email;
          
          // Si el email del CSV está vacío, mantener el email existente
          if (!clientData.email || clientData.email.includes('@kempery.com')) {
            finalEmail = existingEmail || clientData.email;
          } else {
            // Verificar si el nuevo email ya está en uso por otro cliente
            const emailCheck = await client.query(
              'SELECT id FROM clients WHERE email = $1 AND id != $2',
              [clientData.email, existingId]
            );
            
            if (emailCheck.rows.length > 0) {
              // Email ya está en uso, mantener el existente
              finalEmail = existingEmail || clientData.email;
            } else {
              finalEmail = clientData.email;
            }
          }
          
          // Actualizar cliente existente
          const updateQuery = `
            UPDATE clients SET
              first_name = $1,
              last_name = $2,
              identification = $3,
              phone = $4,
              total_nights = $5,
              remaining_nights = $6,
              years = $7,
              international_bonus = $8,
              total_amount = $9,
              email = $10,
              notes = $11,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING id
          `;
          
          const updateValues = [
            clientData.first_name,
            clientData.last_name,
            clientData.identification,
            clientData.phone,
            clientData.total_nights,
            clientData.remaining_nights,
            clientData.years,
            clientData.international_bonus,
            clientData.total_amount,
            finalEmail,
            clientData.notes,
            existingId
          ];
          
          await client.query(updateQuery, updateValues);
          updatedCount++;
          
          if (updatedCount % 50 === 0) {
            console.log(`🔄 Actualizados ${updatedCount} registros...`);
          }
        } else {
          // Cliente no existe - CREAR NUEVO
          
          // Verificar si el email ya existe y generar uno único si es necesario
          let emailCounter = 1;
          while (true) {
            const existingEmail = await client.query(
              'SELECT id FROM clients WHERE email = $1',
              [finalEmail]
            );
            
            if (existingEmail.rows.length === 0) {
              break; // Email único encontrado
            }
            
            // Generar email único con contador
            const baseEmail = clientData.email.replace('@kempery.com', '');
            finalEmail = `${baseEmail}${emailCounter}@kempery.com`;
            emailCounter++;
            
            if (emailCounter > 100) {
              // Evitar bucle infinito
              finalEmail = `cliente_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@kempery.com`;
              break;
            }
          }
          
          clientData.email = finalEmail;
          
          // Insertar cliente nuevo
          const insertQuery = `
            INSERT INTO clients (
              created_at, contract_number, first_name, last_name,
              identification, phone, total_nights, remaining_nights,
              years, international_bonus, total_amount, email, notes, in_collections, is_active
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            ) RETURNING id
          `;
          
          const values = [
            clientData.created_at,
            clientData.contract_number,
            clientData.first_name,
            clientData.last_name,
            clientData.identification,
            clientData.phone,
            clientData.total_nights,
            clientData.remaining_nights,
            clientData.years,
            clientData.international_bonus,
            clientData.total_amount,
            clientData.email,
            clientData.notes,
            clientData.in_collections,
            clientData.is_active
          ];
          
          await client.query(insertQuery, values);
          createdCount++;
          
          if (createdCount % 50 === 0) {
            console.log(`✅ Creados ${createdCount} registros...`);
          }
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error en línea ${i + 1}:`, error.message);
        errors.push({ line: i + 1, error: error.message, data: line });
        errorCount++;
      }
    }
    
    console.log('\n📊 Resumen de importación/actualización:');
    console.log(`✅ Registros procesados exitosamente: ${successCount}`);
    console.log(`🔄 Clientes actualizados: ${updatedCount}`);
    console.log(`✨ Clientes nuevos creados: ${createdCount}`);
    console.log(`❌ Registros con errores: ${errorCount}`);
    console.log(`📄 Total procesados: ${successCount + errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errores encontrados:');
      errors.slice(0, 10).forEach(err => {
        console.log(`Línea ${err.line}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`... y ${errors.length - 10} errores más`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar importación
if (require.main === module) {
  importClientsFromCSV()
    .then(() => {
      console.log('🎉 Importación completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { importClientsFromCSV };
