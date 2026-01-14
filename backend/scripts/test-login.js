const axios = require('axios');
require('dotenv').config({ path: './config.env' });

console.log('🔍 Probando login real...\n');

async function testLogin() {
  try {
    // Hacer login
    console.log('🔄 Haciendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'Admin',
      password: 'Kempery2025+'
    });
    
    console.log('✅ Login exitoso');
    console.log('📄 Token recibido:', loginResponse.data.token.substring(0, 50) + '...');
    console.log('👤 Usuario:', loginResponse.data.user);
    
    // Probar el token con una petición autenticada
    console.log('\n🔄 Probando token con petición autenticada...');
    const authResponse = await axios.get('http://localhost:5000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('✅ Token válido para peticiones autenticadas');
    console.log('👤 Usuario verificado:', authResponse.data.user);
    
    // Probar con el endpoint de reportes
    console.log('\n🔄 Probando endpoint de reportes...');
    const reportsResponse = await axios.get('http://localhost:5000/api/reports/dashboard?period=month', {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('✅ Endpoint de reportes funcionando');
    console.log('📊 Datos de reportes:', reportsResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.log('🔍 Token malformado detectado');
    }
  }
}

testLogin();
