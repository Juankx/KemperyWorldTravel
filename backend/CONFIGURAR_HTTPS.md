# Configurar HTTPS para el Backend

## Problema

El frontend está en HTTPS (`https://kemperyworldtravel.com`) pero intenta conectarse al backend en HTTP (`http://3.141.103.248:5000`). Los navegadores bloquean este "contenido mixto" por seguridad.

## Solución: Configurar HTTPS en el Backend

### Opción 1: Nginx + Let's Encrypt (Recomendado - Gratis)

#### Requisitos
- Un dominio apuntando a la IP de EC2 (ej: `api.kemperyworldtravel.com`)
- Acceso SSH a EC2

#### Pasos

1. **Conectar a EC2:**
   ```powershell
   ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248
   ```

2. **Subir el script de configuración:**
   ```powershell
   # Desde tu máquina local
   scp -i kemperyworldtravel.pem backend/configurar-https-ec2.sh ec2-user@3.141.103.248:~/
   ```

3. **Ejecutar el script en EC2:**
   ```bash
   # En EC2
   sudo bash configurar-https-ec2.sh
   ```

4. **Obtener certificado SSL:**
   
   **Si tienes un dominio (ej: api.kemperyworldtravel.com):**
   ```bash
   sudo certbot --nginx -d api.kemperyworldtravel.com
   ```
   
   **Si NO tienes un dominio (solo IP):**
   Let's Encrypt no puede emitir certificados para IPs. Ve a la Opción 2.

5. **Configurar renovación automática:**
   ```bash
   sudo certbot renew --dry-run
   ```

6. **Actualizar el frontend:**
   
   Edita `frontend/.env.production`:
   ```env
   VITE_API_URL=https://api.kemperyworldtravel.com/api
   ```
   
   O si no tienes dominio:
   ```env
   VITE_API_URL=https://3.141.103.248/api
   ```
   
   Luego redesplega:
   ```powershell
   cd frontend
   npm run build
   .\deploy-s3.ps1 -AwsProfile kempery
   ```

### Opción 2: Application Load Balancer + ACM (AWS)

Si no tienes un dominio o prefieres usar servicios de AWS:

1. **Crear un Application Load Balancer en EC2:**
   - Ve a: https://console.aws.amazon.com/ec2/
   - Load Balancers → Create Load Balancer
   - Selecciona "Application Load Balancer"
   - Configura HTTPS con certificado de ACM (Amazon Certificate Manager)

2. **Obtener certificado SSL gratuito en ACM:**
   - Ve a: https://console.aws.amazon.com/acm/
   - Request a certificate
   - Usa el dominio o subdominio (ej: `api.kemperyworldtravel.com`)

3. **Configurar el Load Balancer:**
   - Listener: HTTPS (443) → Target Group → EC2 instance (puerto 5000)
   - Health check: `/api/health`

4. **Actualizar Security Group:**
   - Permitir tráfico HTTPS (443) desde Internet

5. **Actualizar el frontend:**
   ```env
   VITE_API_URL=https://tu-load-balancer-dns-name.elb.amazonaws.com/api
   ```

### Opción 3: CloudFront + Origin (Alternativa)

1. **Crear una distribución CloudFront:**
   - Origin: `http://3.141.103.248:5000`
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - SSL Certificate: Default CloudFront Certificate

2. **Actualizar el frontend:**
   ```env
   VITE_API_URL=https://tu-cloudfront-id.cloudfront.net/api
   ```

## Verificación

Después de configurar HTTPS:

1. **Verificar que el backend responde en HTTPS:**
   ```bash
   curl https://api.kemperyworldtravel.com/api/health
   # O
   curl https://3.141.103.248/api/health
   ```

2. **Verificar desde el navegador:**
   - Abre `https://kemperyworldtravel.com`
   - Intenta hacer login
   - No deberías ver errores de "contenido mixto"

## Notas Importantes

- **Let's Encrypt requiere un dominio:** No puede emitir certificados para IPs directamente
- **Renovación automática:** Los certificados de Let's Encrypt expiran cada 90 días, pero Certbot los renueva automáticamente
- **Security Groups:** Asegúrate de abrir los puertos 80 y 443 en el Security Group de EC2
- **DNS:** Si usas un subdominio, configura un registro A o CNAME en Route 53 apuntando a la IP de EC2

## Troubleshooting

### Error: "Failed to obtain certificate"
- Verifica que el dominio apunta a la IP de EC2
- Verifica que el puerto 80 está abierto (necesario para la validación de Let's Encrypt)

### Error: "Connection refused"
- Verifica que Nginx está corriendo: `sudo systemctl status nginx`
- Verifica que el backend está corriendo en el puerto 5000
- Verifica los Security Groups de EC2

### El certificado expira
- Verifica la renovación automática: `sudo certbot renew --dry-run`
- Agrega un cron job si es necesario

