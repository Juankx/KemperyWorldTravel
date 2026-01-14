const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });
const { addPendingDebtColumn } = require('./add-pending-debt-column');

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
  if (!amount || amount === '0' || amount === 0 || amount === '$-' || amount === '-') return 0;
  
  // Convertir a string si no lo es
  let cleanAmount = String(amount);
  
  // Quitar $, comas, espacios y comillas
  cleanAmount = cleanAmount.replace(/[$,\s"]/g, '');
  
  // Convertir a número
  const numAmount = parseFloat(cleanAmount);
  return isNaN(numAmount) ? 0 : numAmount;
}

// Función para normalizar número de contrato
function normalizeContractNumber(contract) {
  if (!contract) return null;
  
  // Limpiar espacios múltiples y normalizar
  let normalized = String(contract).trim();
  
  // Normalizar espacios (múltiples espacios a uno solo)
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Normalizar variaciones comunes
  normalized = normalized.replace(/KMPERY/gi, 'KMPRY');
  normalized = normalized.replace(/KEMPRY/gi, 'KMPRY');
  normalized = normalized.replace(/KEMPERY/gi, 'KMPRY');
  
  return normalized;
}

// Función para limpiar texto
function cleanText(text) {
  if (!text || text === '0' || text === 0) return null;
  return String(text).trim() || null;
}

// Función para buscar cliente por contrato o cédula
async function findClient(contractNumber, cedula) {
  try {
    // Primero intentar por número de contrato normalizado
    if (contractNumber) {
      const normalizedContract = normalizeContractNumber(contractNumber);
      
      // Buscar coincidencia exacta primero
      let result = await pool.query(
        `SELECT id, first_name, last_name, contract_number, document_number, total_amount 
         FROM clients 
         WHERE contract_number = $1`,
        [normalizedContract]
      );
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // Si no hay coincidencia exacta, buscar con ILIKE
      result = await pool.query(
        `SELECT id, first_name, last_name, contract_number, document_number, total_amount 
         FROM clients 
         WHERE contract_number ILIKE $1`,
        [`%${normalizedContract}%`]
      );
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // Buscar sin normalizar (por si hay diferencias menores)
      const searchPattern = contractNumber.replace(/\s+/g, ' ').trim();
      result = await pool.query(
        `SELECT id, first_name, last_name, contract_number, document_number, total_amount 
         FROM clients 
         WHERE contract_number ILIKE $1`,
        [`%${searchPattern}%`]
      );
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }
    
    // Si no se encontró por contrato, buscar por cédula
    if (cedula) {
      const cleanCedula = cleanText(cedula);
      const result = await pool.query(
        `SELECT id, first_name, last_name, contract_number, document_number, total_amount 
         FROM clients 
         WHERE document_number = $1 OR identification = $1`,
        [cleanCedula]
      );
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error buscando cliente:', error);
    return null;
  }
}

// Función para actualizar solo el pending_debt del cliente (sin crear convenios)
async function updateClientPendingDebt(clientId, contractNumber, debtAmount) {
  try {
    const pendingDebt = parseFloat(debtAmount) || 0;
    
    // Verificar que la columna pending_debt existe
    const columnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'clients' AND column_name = 'pending_debt';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('⚠️  La columna pending_debt no existe. Intentando crearla...');
      try {
        await pool.query(`
          ALTER TABLE clients
          ADD COLUMN pending_debt DECIMAL(10,2) DEFAULT 0;
        `);
        console.log('✅ Columna pending_debt creada exitosamente');
      } catch (error) {
        console.error('❌ Error creando columna pending_debt:', error.message);
        throw error;
      }
    }
    
    // Actualizar el pending_debt del cliente
    await pool.query(
      `UPDATE clients 
       SET pending_debt = $1::DECIMAL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [pendingDebt, clientId]
    );
    
    return { action: 'updated', pendingDebt };
  } catch (error) {
    console.error('Error actualizando pending_debt:', error);
    throw error;
  }
}

// Función para actualizar campo in_collections en clients
async function updateClientCollectionsStatus(clientId, debtAmount) {
  try {
    const inCollections = debtAmount > 0 ? 'Si' : 'No';
    
    await pool.query(
      `UPDATE clients 
       SET in_collections = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [inCollections, clientId]
    );
    
    return true;
  } catch (error) {
    console.error('Error actualizando in_collections:', error);
    return false;
  }
}

// Función principal para procesar el CSV
async function updateCollectionsFromCSV() {
  try {
    console.log('🚀 Iniciando actualización de cobranzas desde CSV...\n');
    
    // Leer el archivo CSV
    // Buscar el CSV en múltiples ubicaciones posibles
    const possiblePaths = [
      path.join(__dirname, '../../frontend/ActualizadoCobranza.csv'),
      path.join(__dirname, '../ActualizadoCobranza.csv'),
      path.join(__dirname, 'ActualizadoCobranza.csv'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'kempery-backend/ActualizadoCobranza.csv'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', 'frontend/ActualizadoCobranza.csv'),
      '/home/ec2-user/kempery-backend/ActualizadoCobranza.csv',
      '/home/ec2-user/frontend/ActualizadoCobranza.csv'
    ];
    
    let csvPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        csvPath = possiblePath;
        console.log(`✅ Archivo CSV encontrado en: ${csvPath}`);
        break;
      }
    }
    
    if (!csvPath) {
      console.error(`❌ Error: No se encontró el archivo ActualizadoCobranza.csv`);
      console.error(`   Ubicaciones buscadas:`);
      possiblePaths.forEach(p => console.error(`   - ${p}`));
      console.error(`\n   Por favor, sube el archivo ActualizadoCobranza.csv a una de estas ubicaciones.`);
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📄 Total de líneas en CSV: ${lines.length}`);
    
    // Saltar la primera línea (encabezados)
    const dataLines = lines.slice(1);
    console.log(`📊 Registros a procesar: ${dataLines.length}\n`);
    
    // Estadísticas
    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    
    const notFound = [];
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
        
        // El CSV tiene: CONTRATO, NOMBRES, APELLIDOS, CEDULA, ..., VALOR DEUDA (última columna)
        const contractNumber = cleanText(fields[0]);
        const nombres = cleanText(fields[1]);
        const apellidos = cleanText(fields[2]);
        const cedula = cleanText(fields[3]);
        const valorDeuda = cleanAmount(fields[fields.length - 1]); // Última columna
        
        // Validar datos mínimos
        if (!contractNumber && !cedula) {
          console.log(`⚠️  Línea ${i + 2}: Sin contrato ni cédula, saltando...`);
          continue;
        }
        
        // Buscar cliente
        const client = await findClient(contractNumber, cedula);
        
        if (!client) {
          const notFoundInfo = {
            line: i + 2,
            contract: contractNumber,
            cedula: cedula,
            nombres: nombres,
            apellidos: apellidos
          };
          notFound.push(notFoundInfo);
          notFoundCount++;
          console.log(`⚠️  Línea ${i + 2}: Cliente no encontrado - Contrato: ${contractNumber || 'N/A'}, Cédula: ${cedula || 'N/A'}`);
          continue;
        }
        
        // Actualizar solo el pending_debt del cliente (sin crear convenios)
        await updateClientPendingDebt(
          client.id,
          client.contract_number || contractNumber,
          valorDeuda
        );
        
        updatedCount++;
        console.log(`✅ Línea ${i + 2}: ${client.first_name} ${client.last_name} - Valor pendiente actualizado: $${valorDeuda.toFixed(2)}`);
        
        // Actualizar in_collections
        await updateClientCollectionsStatus(client.id, valorDeuda);
        
        // Mostrar progreso cada 20 registros
        if ((updatedCount + notFoundCount + errorCount) % 20 === 0) {
          console.log(`\n📊 Progreso: ${updatedCount} procesados, ${notFoundCount} no encontrados...\n`);
        }
        
      } catch (error) {
        console.error(`❌ Error en línea ${i + 2}:`, error.message);
        errors.push({ line: i + 2, error: error.message, data: line });
        errorCount++;
      }
    }
    
    // Reporte final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE ACTUALIZACIÓN DE COBRANZAS');
    console.log('='.repeat(60));
    console.log(`✅ Valores pendientes actualizados: ${updatedCount}`);
    console.log(`⚠️  Clientes no encontrados: ${notFoundCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📄 Total procesados: ${dataLines.length}`);
    console.log('='.repeat(60));
    
    // Mostrar primeros clientes no encontrados
    if (notFound.length > 0) {
      console.log('\n⚠️  PRIMEROS 10 CLIENTES NO ENCONTRADOS:');
      notFound.slice(0, 10).forEach((item, idx) => {
        console.log(`${idx + 1}. Línea ${item.line}: ${item.nombres} ${item.apellidos} - Contrato: ${item.contract || 'N/A'}, Cédula: ${item.cedula || 'N/A'}`);
      });
      if (notFound.length > 10) {
        console.log(`... y ${notFound.length - 10} más`);
      }
    }
    
    // Mostrar primeros errores
    if (errors.length > 0) {
      console.log('\n❌ PRIMEROS 10 ERRORES:');
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`${idx + 1}. Línea ${err.line}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`... y ${errors.length - 10} errores más`);
      }
    }
    
    // Verificar algunos resultados
    const sampleResult = await pool.query(
      `SELECT c.first_name, c.last_name, c.contract_number, c.in_collections,
              pa.remaining_amount, pa.status
       FROM clients c
       LEFT JOIN payment_agreements pa ON c.id = pa.client_id
       WHERE c.in_collections = 'Si'
       ORDER BY pa.remaining_amount DESC NULLS LAST
       LIMIT 10`
    );
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📋 PRIMEROS 10 CLIENTES EN COBRANZAS (por deuda):');
      sampleResult.rows.forEach((row, idx) => {
        const debt = row.remaining_amount ? `$${parseFloat(row.remaining_amount).toFixed(2)}` : 'N/A';
        console.log(`${idx + 1}. ${row.first_name} ${row.last_name} - ${row.contract_number} - Deuda: ${debt}`);
      });
    }
    
    // Contar total de clientes en cobranzas
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM clients WHERE in_collections = 'Si'`
    );
    console.log(`\n📊 Total de clientes en cobranzas: ${countResult.rows[0].total}`);
    
    console.log('\n🎉 Proceso completado!\n');
    
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar actualización
if (require.main === module) {
  updateCollectionsFromCSV()
    .then(() => {
      console.log('✅ Actualización de cobranzas completada exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { updateCollectionsFromCSV };

