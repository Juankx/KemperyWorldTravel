# Configuración de Producción - Kempery World Travel

## Arquitectura de Producción

- **Frontend**: S3 + CloudFront → `https://kemperyworldtravel.com`
- **Backend**: EC2 → `http://3.141.103.248:5000`
- **Base de Datos**: PostgreSQL en EC2
- **Documentos**: S3 (opcional)

## Configuración del Frontend

### 1. Archivo `.env.production`

Crea o actualiza `frontend/.env.production`:

```env
# API Configuration - Production
VITE_API_URL=http://3.141.103.248:5000/api

# Environment
NODE_ENV=production
```

### 2. Build y Deploy

```powershell
# Desde la carpeta frontend
cd frontend

# Hacer build con variables de producción
npm run build

# Deploy a S3
.\deploy-s3.ps1
```

## Configuración del Backend en EC2

### 1. Conectar a EC2

```powershell
ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248
```

### 2. Editar archivo `.env`

```bash
cd ~/kempery-backend
nano .env
```

### 3. Configuración completa del `.env` en EC2

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kempery_travel
DB_USER=postgres
DB_PASSWORD=Princonserkids2025+

# JWT Configuration
JWT_SECRET=kempery_world_travel_super_secret_key_2025
JWT_EXPIRES_IN=1h

# Server Configuration
PORT=5000
NODE_ENV=production
HOST=0.0.0.0

# CORS Configuration
# Permitir conexiones desde el frontend en S3
FRONTEND_URL=https://kemperyworldtravel.com

# AWS S3 Configuration (opcional - para almacenar documentos)
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=kemperyworldtravel.com
```

### 4. Reiniciar el servidor

```bash
pm2 restart kempery-backend
pm2 logs kempery-backend
```

## Configuración de CORS

El backend está configurado para aceptar conexiones desde:
- `https://kemperyworldtravel.com` (producción)
- `http://localhost:3000` (desarrollo local)

Si necesitas agregar más dominios, edita `backend/server.js`:

```javascript
app.use(cors({
  origin: [
    'https://kemperyworldtravel.com',
    'http://localhost:3000',
    // Agregar más dominios si es necesario
  ],
  credentials: true
}));
```

## Verificación

### 1. Verificar Backend

```bash
# Desde tu máquina local
curl http://3.141.103.248:5000/api/health
```

Deberías recibir:
```json
{
  "status": "OK",
  "message": "Kempery World Travel API is running",
  "timestamp": "..."
}
```

### 2. Verificar Frontend

1. Abre `https://kemperyworldtravel.com`
2. Abre la consola del navegador (F12)
3. Verifica que no haya errores de CORS
4. Intenta hacer login

### 3. Verificar Conexión Frontend-Backend

En la consola del navegador, deberías ver:
- ✅ Peticiones a `http://3.141.103.248:5000/api/...` exitosas
- ❌ Sin errores de CORS
- ❌ Sin errores 401/403 (a menos que no estés autenticado)

## Solución de Problemas

### Error: CORS bloqueado

**Síntoma**: Error en consola: `Access to XMLHttpRequest at 'http://3.141.103.248:5000/api/...' from origin 'https://kemperyworldtravel.com' has been blocked by CORS policy`

**Solución**:
1. Verifica que `FRONTEND_URL` en EC2 sea `https://kemperyworldtravel.com`
2. Reinicia el servidor: `pm2 restart kempery-backend`
3. Verifica que el Security Group de EC2 permita conexiones entrantes en el puerto 5000

### Error: No se puede conectar al backend

**Síntoma**: `Network Error` o `ERR_CONNECTION_REFUSED`

**Solución**:
1. Verifica que el servidor esté corriendo: `pm2 status`
2. Verifica que el Security Group permita conexiones desde internet (0.0.0.0/0) en el puerto 5000
3. Verifica que el servidor escuche en `0.0.0.0`: `sudo netstat -tulpn | grep 5000`

### Error: Mixed Content (HTTP/HTTPS)

**Síntoma**: El frontend está en HTTPS pero intenta conectarse a HTTP

**Solución**:
- Opción 1: Configurar un dominio para el backend (recomendado)
  - Crear un registro A en Route 53 apuntando a la IP de EC2
  - Configurar SSL con Let's Encrypt o AWS Certificate Manager
  - Actualizar `VITE_API_URL` a `https://api.kemperyworldtravel.com/api`

- Opción 2: Usar la IP directamente (funciona pero menos seguro)
  - Asegúrate de que el navegador permita contenido mixto (no recomendado)

## Configuración Recomendada: Dominio para Backend

### 1. Crear subdominio en Route 53

1. Ve a Route 53 → Hosted Zones → `kemperyworldtravel.com`
2. Crea un nuevo registro:
   - **Tipo**: A
   - **Nombre**: `api`
   - **Valor**: `3.141.103.248`
   - **TTL**: 300

### 2. Configurar SSL (Let's Encrypt)

En EC2:

```bash
# Instalar Certbot
sudo dnf install certbot python3-certbot-nginx -y

# Obtener certificado (si usas Nginx como proxy)
sudo certbot --nginx -d api.kemperyworldtravel.com
```

### 3. Actualizar `.env.production` del frontend

```env
VITE_API_URL=https://api.kemperyworldtravel.com/api
```

## Checklist de Despliegue

- [ ] Backend corriendo en EC2
- [ ] Base de datos inicializada
- [ ] Variables de entorno configuradas en EC2
- [ ] CORS configurado para el dominio del frontend
- [ ] Security Group permite conexiones en puerto 5000
- [ ] Frontend build con `.env.production`
- [ ] Frontend desplegado a S3
- [ ] Route 53 configurado para el dominio
- [ ] Pruebas de conexión frontend-backend exitosas

