# Guía de Despliegue a AWS EC2

Esta guía te ayudará a desplegar el backend de Kempery World Travel en una instancia EC2 de AWS.

## Requisitos Previos

- Archivo PEM de la instancia EC2 (`kemperyworldtravel.pem`)
- IP pública de la instancia EC2: `3.141.103.248`
- Acceso SSH a la instancia EC2
- PowerShell (Windows) o Terminal (Linux/Mac)

## Paso 1: Configurar Security Group en AWS

Antes de desplegar, asegúrate de que el Security Group de tu instancia EC2 permita tráfico en los siguientes puertos:

- **Puerto 22 (SSH)**: Para conexión remota
- **Puerto 5000 (HTTP)**: Para el backend API
- **Puerto 5432 (PostgreSQL)**: Solo desde localhost (no exponer públicamente)

### Configurar Security Group:

1. Ve a la consola de AWS EC2
2. Selecciona tu instancia
3. Ve a la pestaña "Security"
4. Haz clic en el Security Group
5. Agrega reglas de entrada:
   - Tipo: SSH, Puerto: 22, Origen: Tu IP
   - Tipo: Custom TCP, Puerto: 5000, Origen: 0.0.0.0/0 (o tu IP específica)

## Paso 2: Desplegar usando el Script Automático

### Windows (PowerShell):

```powershell
# Navegar a la carpeta backend
cd backend

# Ejecutar script de despliegue
.\deploy-ec2.ps1 -PemPath "C:\ruta\a\kemperyworldtravel.pem" -Ec2Ip "3.141.103.248"
```

### Linux/Mac:

```bash
# Navegar a la carpeta backend
cd backend

# Dar permisos de ejecución al script
chmod +x deploy-ec2.sh

# Ejecutar script de despliegue
./deploy-ec2.sh -pem-path "/ruta/a/kemperyworldtravel.pem" -ec2-ip "3.141.103.248"
```

## Paso 3: Configuración Manual (si es necesario)

Si prefieres hacer el despliegue manualmente o el script automático falla:

### 3.1. Conectar a la instancia EC2

```bash
ssh -i kemperyworldtravel.pem ubuntu@3.141.103.248
```

### 3.2. Instalar dependencias del sistema

```bash
# Actualizar sistema
sudo apt-get update -y

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Instalar LibreOffice (para generación de PDFs)
sudo apt-get install -y libreoffice

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2

# Instalar build-essential (para compilar módulos nativos)
sudo apt-get install -y build-essential
```

### 3.3. Configurar PostgreSQL

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE kempery_travel;
CREATE USER postgres WITH PASSWORD 'Princonserkids2025+';
ALTER USER postgres CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE kempery_travel TO postgres;
\q
```

### 3.4. Subir archivos del backend

Desde tu máquina local:

```bash
# Crear directorio en EC2
ssh -i kemperyworldtravel.pem ubuntu@3.141.103.248 "mkdir -p ~/kempery-backend"

# Subir archivos (excluyendo node_modules)
scp -i kemperyworldtravel.pem -r backend/* ubuntu@3.141.103.248:~/kempery-backend/
```

### 3.5. Configurar variables de entorno

En la instancia EC2:

```bash
cd ~/kempery-backend

# Crear archivo .env
nano .env
```

Contenido del archivo `.env`:

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

# CORS Configuration
FRONTEND_URL=http://tu-dominio-frontend.com
```

**⚠️ IMPORTANTE**: Cambia `JWT_SECRET` y `DB_PASSWORD` por valores seguros en producción.

### 3.6. Instalar dependencias e iniciar servidor

```bash
cd ~/kempery-backend

# Instalar dependencias
npm install --production

# Crear directorio para documentos generados
mkdir -p generated-documents

# Iniciar con PM2
pm2 start server.js --name kempery-backend
pm2 save
pm2 startup
```

## Paso 4: Verificar el Despliegue

### Verificar que el servidor está corriendo:

```bash
# En EC2
pm2 status
pm2 logs kempery-backend
```

### Probar el endpoint de health check:

```bash
curl http://3.141.103.248:5000/api/health
```

Deberías recibir una respuesta JSON con el estado del servidor.

## Paso 5: Configurar Nginx como Reverse Proxy (Opcional pero Recomendado)

Para usar un dominio y SSL, configura Nginx:

```bash
# Instalar Nginx
sudo apt-get install -y nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/kempery-backend
```

Contenido:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/kempery-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Comandos Útiles

### Ver logs del servidor:
```bash
pm2 logs kempery-backend
```

### Reiniciar servidor:
```bash
pm2 restart kempery-backend
```

### Detener servidor:
```bash
pm2 stop kempery-backend
```

### Ver estado:
```bash
pm2 status
```

### Actualizar código:
```bash
# Desde tu máquina local
scp -i kemperyworldtravel.pem -r backend/* ubuntu@3.141.103.248:~/kempery-backend/

# En EC2
cd ~/kempery-backend
npm install --production
pm2 restart kempery-backend
```

## Solución de Problemas

### El servidor no inicia:
1. Verifica los logs: `pm2 logs kempery-backend`
2. Verifica que PostgreSQL esté corriendo: `sudo systemctl status postgresql`
3. Verifica que el puerto 5000 no esté en uso: `sudo netstat -tulpn | grep 5000`

### Error de conexión a la base de datos:
1. Verifica que PostgreSQL esté corriendo: `sudo systemctl status postgresql`
2. Verifica las credenciales en `.env`
3. Prueba la conexión: `psql -U postgres -d kempery_travel`

### LibreOffice no genera PDFs:
1. Verifica que esté instalado: `libreoffice --version`
2. Verifica los logs del servidor para ver errores específicos

### No se puede conectar desde fuera:
1. Verifica el Security Group en AWS
2. Verifica que el firewall de Ubuntu permita el puerto: `sudo ufw allow 5000`

## Seguridad

- **Nunca** subas el archivo `.env` o `config.env` al repositorio
- Cambia todas las contraseñas por defecto
- Usa un `JWT_SECRET` fuerte y único
- Configura SSL/HTTPS en producción
- Limita el acceso al puerto 5000 solo a IPs necesarias
- Mantén el sistema actualizado: `sudo apt-get update && sudo apt-get upgrade`

## Soporte

Para problemas o preguntas, revisa los logs del servidor:
```bash
pm2 logs kempery-backend --lines 100
```

