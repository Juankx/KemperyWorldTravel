const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config.env' });

console.log('🔍 Diagnóstico del problema de token malformado...\n');

// Simular diferentes tipos de tokens que podrían estar llegando
const testTokens = [
  // Token válido normal
  jwt.sign({ userId: 'test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' }),
  
  // Token con caracteres extra
  'Bearer ' + jwt.sign({ userId: 'test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' }),
  
  // Token con espacios
  ' ' + jwt.sign({ userId: 'test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h'}) + ' ',
  
  // Token con saltos de línea
  jwt.sign({ userId: 'test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' }) + '\n',
  
  // Token truncado
  jwt.sign({ userId: 'test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' }).substring(0, 50),
  
  // Token con caracteres especiales
  jwt.sign({ userId: 'test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' }) + '&extra=value'
];

testTokens.forEach((token, index) => {
  console.log(`\n📋 Token ${index + 1}:`);
  console.log(`Longitud: ${token.length}`);
  console.log(`Primeros 50 caracteres: ${token.substring(0, 50)}...`);
  
  try {
    // Simular el proceso del middleware
    const authHeader = `Bearer ${token}`;
    const extractedToken = authHeader.split(' ')[1];
    
    console.log(`Token extraído: ${extractedToken ? extractedToken.substring(0, 50) + '...' : 'null'}`);
    
    if (extractedToken) {
      // Limpiar el token de caracteres extra
      const cleanToken = extractedToken.trim().replace(/[^\w\-\.]/g, '');
      console.log(`Token limpio: ${cleanToken.substring(0, 50)}...`);
      
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      console.log('✅ Token válido:', decoded);
    } else {
      console.log('❌ No se pudo extraer token');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
});

console.log('\n💡 Recomendación: Implementar limpieza de token en el middleware');
