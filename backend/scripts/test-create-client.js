const axios = require('axios');
require('dotenv').config({ path: './config.env' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

console.log('🔍 Probando creación de cliente...\n');

const testClientData = {
  first_name: 'Juan',
  last_name: 'Pérez',
  email: 'juan.perez@test.com',
  phone: '0987654321',
  document_number: '1234567890',
  contract_number: 'TEST001',
  city: 'Quito',
  country: 'Ecuador',
  notes: 'Cliente de prueba'
};

async function testCreateClient() {
  try {
    console.log('🔄 Haciendo login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'Admin',
      password: 'Kempery2025+'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso');
    
    console.log('\n🔄 Creando cliente de prueba...');
    const createResponse = await axios.post(`${API_BASE_URL}/clients`, testClientData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Cliente creado exitosamente');
    console.log('📋 Respuesta:', createResponse.data);
    
  } catch (error) {
    console.error('❌ Error durante la creación del cliente:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else {
      console.error('  Mensaje:', error.message);
    }
  }
}

testCreateClient();
