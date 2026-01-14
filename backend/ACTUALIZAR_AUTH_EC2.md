# Actualizar Autenticación en EC2

## Problema

El código de autenticación estaba comparando contraseñas en texto plano con hashes, lo que causaba que el login fallara.

## Solución

1. **Subir el código corregido a EC2:**
   ```powershell
   # Desde tu máquina local
   scp -i kemperyworldtravel.pem backend/routes/auth.js ec2-user@3.141.103.248:~/kempery-backend/routes/
   scp -i kemperyworldtravel.pem backend/scripts/verificar-usuarios-ec2.js ec2-user@3.141.103.248:~/kempery-backend/scripts/
   ```

2. **Conectar a EC2 y verificar usuarios:**
   ```bash
   ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248
   cd ~/kempery-backend
   node scripts/verificar-usuarios-ec2.js
   ```

3. **Crear el usuario Paola si no existe:**
   ```bash
   node scripts/verificar-usuarios-ec2.js --crear-paola
   ```

4. **Reiniciar el backend:**
   ```bash
   pm2 restart kempery-backend
   pm2 logs kempery-backend --lines 20
   ```

## Verificación

Después de actualizar, prueba el login:
- Email: `Paola`
- Contraseña: `Kempery2025+`

Si el usuario no existe, el script lo creará automáticamente.



