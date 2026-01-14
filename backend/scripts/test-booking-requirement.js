const axios = require('axios');
require('dotenv').config({ path: './config.env' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

console.log('🔍 Probando creación de reserva con requerimiento automático...\n');

const testBookingData = {
  contract_number: 'TEST001', // Asegúrate de que este contrato exista
  city: 'Quito',
  nights_requested: 2,
  people_count: 2,
  contact_source: 'WhatsApp',
  observations: 'Reserva de prueba',
  participants_data: [
    {
      first_name: 'Juan',
      last_name: 'Pérez',
      identification: '1234567890',
      relationship: 'Adulto'
    },
    {
      first_name: 'María',
      last_name: 'González',
      identification: '0987654321',
      relationship: 'Adulto'
    }
  ],
  wifi_name: 'Hotel WiFi',
  wifi_password: 'password123',
  google_maps_link: 'https://maps.google.com/test'
};

async function testBookingWithRequirement() {
  try {
    console.log('🔄 Haciendo login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'Admin',
      password: 'Kempery2025+'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso');
    
    console.log('\n🔄 Creando reserva de prueba...');
    const bookingResponse = await axios.post(`${API_BASE_URL}/bookings`, testBookingData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Reserva creada exitosamente');
    console.log('📋 Respuesta:', bookingResponse.data);
    
    // Verificar que se creó el requerimiento
    console.log('\n🔄 Verificando requerimientos creados...');
    const requirementsResponse = await axios.get(`${API_BASE_URL}/requirements`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const recentRequirements = requirementsResponse.data.filter(req => 
      req.contract_number === 'TEST001' && 
      req.requirement_type === 'Reserva' &&
      req.status === 'completed'
    );
    
    if (recentRequirements.length > 0) {
      console.log('✅ Requerimiento completado encontrado:');
      console.log('📋 Descripción:', recentRequirements[0].description);
      console.log('📅 Completado en:', recentRequirements[0].completed_at);
    } else {
      console.log('❌ No se encontró el requerimiento completado');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else {
      console.error('  Mensaje:', error.message);
    }
  }
}

testBookingWithRequirement();
