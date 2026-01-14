# Completar Despliegue en EC2

## Estado Actual

✅ **Completado:**
- Archivos del backend subidos correctamente
- Node.js instalado (v18.20.8)
- Dependencias npm instaladas
- Archivo .env creado

❌ **Pendiente:**
- Instalar PostgreSQL
- Instalar LibreOffice
- Instalar PM2
- Configurar base de datos
- Iniciar servidor

## Pasos para Completar el Despliegue

### 1. Conectar a EC2

```powershell
ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248
```

### 2. Ejecutar Script de Corrección

Una vez conectado a EC2, ejecuta estos comandos:

```bash
cd ~/kempery-backend

# Instalar PostgreSQL (Amazon Linux 2023)
sudo dnf install -y postgresql15-server postgresql15
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Instalar LibreOffice
sudo dnf install -y libreoffice

# Instalar PM2
sudo npm install -g pm2

# Configurar PostgreSQL
sudo -u postgres psql <<EOF
CREATE DATABASE kempery_travel;
CREATE USER postgres WITH PASSWORD 'Princonserkids2025+';
ALTER USER postgres CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE kempery_travel TO postgres;
\q
EOF

# Iniciar servidor con PM2
cd ~/kempery-backend
pm2 stop kempery-backend 2>/dev/null || true
pm2 delete kempery-backend 2>/dev/null || true
pm2 start server.js --name kempery-backend
pm2 save
pm2 startup
```

### 3. Verificar que el Servidor Está Corriendo

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs kempery-backend

# Probar endpoint
curl http://localhost:5000/api/health
```

### 4. Configurar Security Group en AWS

1. Ve a la consola de AWS EC2
2. Selecciona tu instancia
3. Ve a la pestaña "Security"
4. Haz clic en el Security Group
5. Agrega regla de entrada:
   - Tipo: Custom TCP
   - Puerto: 5000
   - Origen: 0.0.0.0/0 (o tu IP específica)

### 5. Editar Variables de Entorno (si es necesario)

```bash
nano ~/kempery-backend/.env
```

Asegúrate de que las credenciales de producción estén correctas, especialmente:
- `DB_PASSWORD`
- `JWT_SECRET` (debe ser diferente en producción)

### 6. Reiniciar el Servidor (si hiciste cambios)

```bash
pm2 restart kempery-backend
```

## Verificar desde tu Máquina Local

```bash
# Probar health check
curl http://3.141.103.248:5000/api/health

# Deberías recibir una respuesta JSON con el estado del servidor
```

## Comandos Útiles

```bash
# Ver logs en tiempo real
pm2 logs kempery-backend

# Ver logs de las últimas 100 líneas
pm2 logs kempery-backend --lines 100

# Reiniciar servidor
pm2 restart kempery-backend

# Detener servidor
pm2 stop kempery-backend

# Ver estado
pm2 status

# Ver información detallada
pm2 show kempery-backend
```

## Solución de Problemas

### Si el servidor no inicia:

```bash
# Ver logs detallados
pm2 logs kempery-backend --err

# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar que el puerto 5000 no está en uso
sudo netstat -tulpn | grep 5000
```

### Si hay errores de base de datos:

```bash
# Verificar conexión a PostgreSQL
psql -U postgres -d kempery_travel -h localhost

# Si no funciona, verificar que PostgreSQL está corriendo
sudo systemctl start postgresql
```

### Si LibreOffice no genera PDFs:

```bash
# Verificar instalación
libreoffice --version

# Ver logs del servidor para errores específicos
pm2 logs kempery-backend | grep -i libreoffice
```

