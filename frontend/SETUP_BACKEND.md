# 🚀 Configuración del Backend - Kempery World Travel

## 📋 Pasos para configurar el backend con PostgreSQL

### 1. Instalar PostgreSQL

**Windows:**
1. Descargar PostgreSQL desde: https://www.postgresql.org/download/windows/
2. Instalar con las opciones por defecto
3. Recordar la contraseña del usuario `postgres`

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Crear la base de datos

```sql
-- Conectar a PostgreSQL como superusuario
psql -U postgres

-- Crear la base de datos
CREATE DATABASE kempery_travel;

-- Crear un usuario específico (opcional)
CREATE USER kempery_user WITH PASSWORD 'kempery_password';
GRANT ALL PRIVILEGES ON DATABASE kempery_travel TO kempery_user;

-- Salir
\q
```

### 3. Configurar variables de entorno

Crear archivo `.env` en la carpeta `backend/`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kempery_travel
DB_USER=postgres
DB_PASSWORD=tu_password_de_postgres

# JWT Configuration
JWT_SECRET=kempery_world_travel_super_secret_key_2025
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 4. Inicializar la base de datos

```bash
# Navegar a la carpeta backend
cd backend

# Instalar dependencias
npm install

# Ejecutar script de inicialización
node scripts/init-db.js
```

### 5. Ejecutar el servidor

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

### 6. Verificar que funciona

- **API Health Check:** http://localhost:5000/api/health
- **Frontend:** http://localhost:3000
- **Login:** ventas.kempery@gmail.com / Kempery2025+

## 🔧 Solución de problemas

### Error de conexión a PostgreSQL
- Verificar que PostgreSQL esté ejecutándose
- Verificar credenciales en `.env`
- Verificar que la base de datos `kempery_travel` exista

### Error de permisos
- Verificar que el usuario tenga permisos en la base de datos
- Ejecutar como administrador si es necesario

### Puerto ocupado
- Cambiar el puerto en `.env` (PORT=5001)
- Actualizar `FRONTEND_URL` en `.env` del backend
- Actualizar `REACT_APP_API_URL` en el frontend

## 📊 Estructura de la base de datos

La base de datos incluye:
- **users** - Usuarios administrativos
- **clients** - Clientes de la agencia
- **packages** - Paquetes turísticos
- **bookings** - Reservas de viajes
- **payments** - Pagos de reservas

## 🎯 Credenciales por defecto

- **Email:** ventas.kempery@gmail.com
- **Password:** Kempery2025+

## 📝 Notas importantes

- El backend debe ejecutarse en el puerto 5000
- El frontend debe ejecutarse en el puerto 3000
- Asegúrate de que ambos servicios estén ejecutándose simultáneamente
- Los datos de prueba se insertan automáticamente al inicializar la base de datos
