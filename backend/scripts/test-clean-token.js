const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config.env' });

console.log('🔍 Probando limpieza de token...\n');

// Función de limpieza igual a la del middleware
function cleanToken(token) {
  return token.trim().replace(/[^\w\-\.]/g, '');
}

// Crear un token válido
const validToken = jwt.sign({ userId: 'test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });

// Simular tokens corruptos que podrían llegar del frontend
const corruptedTokens = [
  validToken + ' ', // Espacio al final
  ' ' + validToken, // Espacio al inicio
  validToken + '\n', // Salto de línea
  validToken + '&extra=value', // Caracteres extra
  'Bearer ' + validToken, // Bearer incluido
  validToken.substring(0, 50), // Token truncado
];

console.log('✅ Token válido original:', validToken.substring(0, 50) + '...');

corruptedTokens.forEach((token, index) => {
  console.log(`\n📋 Token corrupto ${index + 1}:`);
  console.log(`Original: ${token.substring(0, 50)}...`);
  
  try {
    const cleanToken = token.trim().replace(/[^\w\-\.]/g, '');
    console.log(`Limpio: ${cleanToken.substring(0, 50)}...`);
    
    // Verificar formato
    const tokenParts = cleanToken.split('.');
    if (tokenParts.length !== 3) {
      console.log(`❌ Token malformado - no tiene 3 partes: ${tokenParts.length}`);
      return;
    }
    
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    console.log('✅ Token válido después de limpieza:', decoded);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
});

console.log('\n🎉 La limpieza de token debería resolver los problemas de autenticación');
