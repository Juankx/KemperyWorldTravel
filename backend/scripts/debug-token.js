const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config.env' });

console.log('🔍 Debug de token JWT...\n');

// Simular el token que se está enviando desde el frontend
const testTokens = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTkzNTAwOTcsImV4cCI6MTc1OTQzNjQ5N30.test',
  'token_malformado',
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTkzNTAwOTcsImV4cCI6MTc1OTQzNjQ5N30.test',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTkzNTAwOTcsImV4cCI6MTc1OTQzNjQ5N30',
];

testTokens.forEach((token, index) => {
  console.log(`\n📋 Token ${index + 1}: ${token.substring(0, 50)}...`);
  
  try {
    // Simular el proceso del middleware
    const authHeader = `Bearer ${token}`;
    const extractedToken = authHeader.split(' ')[1];
    
    console.log(`🔍 Token extraído: ${extractedToken ? extractedToken.substring(0, 50) + '...' : 'null'}`);
    
    if (extractedToken) {
      const decoded = jwt.verify(extractedToken, process.env.JWT_SECRET);
      console.log('✅ Token válido:', decoded);
    } else {
      console.log('❌ No se pudo extraer token');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
});

// Generar un token válido para comparar
console.log('\n🔄 Generando token válido para comparar...');
try {
  const validToken = jwt.sign(
    { userId: 'admin', email: 'admin@example.com', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  console.log('✅ Token válido generado:', validToken.substring(0, 50) + '...');
  
  // Verificar que funciona
  const decoded = jwt.verify(validToken, process.env.JWT_SECRET);
  console.log('✅ Token verificado:', decoded);
  
} catch (error) {
  console.log('❌ Error generando token:', error.message);
}
