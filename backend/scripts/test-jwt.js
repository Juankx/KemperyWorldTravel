const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config.env' });

console.log('🔍 Probando generación y validación de JWT...\n');

// Datos de prueba
const testUser = {
  userId: 'test-user-id',
  email: 'admin@test.com',
  role: 'admin'
};

console.log('📋 Datos de usuario de prueba:', testUser);
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? 'Definido' : 'NO DEFINIDO');
console.log('⏰ JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || 'No definido');

try {
  // Generar token
  console.log('\n🔄 Generando token...');
  const token = jwt.sign(
    testUser,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  console.log('✅ Token generado exitosamente');
  console.log('📄 Token:', token.substring(0, 50) + '...');
  
  // Validar token
  console.log('\n🔄 Validando token...');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  console.log('✅ Token validado exitosamente');
  console.log('📋 Datos decodificados:', decoded);
  
  // Probar con token malformado
  console.log('\n🔄 Probando con token malformado...');
  try {
    jwt.verify('token_malformado', process.env.JWT_SECRET);
  } catch (error) {
    console.log('✅ Error esperado con token malformado:', error.message);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('📋 Detalles:', error);
}
