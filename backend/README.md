# Kempery World Travel - Backend API

Backend API profesional para el sistema de gestión de Kempery World Travel, desarrollado con Node.js, Express y PostgreSQL.

## 🚀 Características

- **Base de datos PostgreSQL** profesional y escalable
- **Autenticación JWT** segura
- **API RESTful** completa
- **Validación de datos** robusta
- **Paginación** y filtros avanzados
- **Middleware de seguridad** (Helmet, CORS)
- **Logging** con Morgan
- **Gestión de usuarios** administrativos
- **CRUD completo** para clientes y reservas
- **Estadísticas** y reportes

## 📋 Requisitos

- Node.js 16+ 
- PostgreSQL 12+
- npm o yarn

## 🛠️ Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp env.example .env
   ```
   
   Editar `.env` con tus credenciales:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=kempery_travel
   DB_USER=postgres
   DB_PASSWORD=tu_password
   JWT_SECRET=tu_jwt_secret_muy_seguro
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```

3. **Crear base de datos PostgreSQL:**
   ```sql
   CREATE DATABASE kempery_travel;
   ```

4. **Inicializar esquema y datos:**
   ```bash
   node scripts/init-db.js
   ```

5. **Ejecutar servidor:**
   ```bash
   # Desarrollo
   npm run dev
   
   # Producción
   npm start
   ```

## 📊 Estructura de la Base de Datos

### Tablas Principales:
- **users** - Usuarios administrativos
- **clients** - Clientes de la agencia
- **packages** - Paquetes turísticos
- **bookings** - Reservas de viajes
- **payments** - Pagos de reservas

### Características:
- **UUIDs** como claves primarias
- **Timestamps** automáticos
- **Soft deletes** para clientes
- **Índices** optimizados
- **Triggers** para updated_at

## 🔐 Autenticación

### Credenciales por defecto:
- **Email:** ventas.kempery@gmail.com
- **Password:** Kempery2025+

### Endpoints de autenticación:
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar token

## 📡 Endpoints de la API

### Clientes
- `GET /api/clients` - Listar clientes (con paginación y búsqueda)
- `GET /api/clients/:id` - Obtener cliente por ID
- `POST /api/clients` - Crear nuevo cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente (soft delete)
- `GET /api/clients/stats/overview` - Estadísticas de clientes

### Reservas
- `GET /api/bookings` - Listar reservas (con filtros)
- `GET /api/bookings/:id` - Obtener reserva por ID
- `POST /api/bookings` - Crear nueva reserva
- `PATCH /api/bookings/:id/status` - Actualizar estado de reserva
- `DELETE /api/bookings/:id` - Eliminar reserva
- `GET /api/bookings/stats/overview` - Estadísticas de reservas
- `GET /api/bookings/client/:clientId` - Reservas por cliente

### Usuarios (Admin)
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `POST /api/users` - Crear nuevo usuario
- `PUT /api/users/:id` - Actualizar usuario
- `PATCH /api/users/:id/password` - Cambiar contraseña
- `PATCH /api/users/:id/deactivate` - Desactivar usuario
- `GET /api/users/stats/overview` - Estadísticas de usuarios

## 🔒 Seguridad

- **JWT** para autenticación
- **bcrypt** para hash de contraseñas
- **Helmet** para headers de seguridad
- **CORS** configurado
- **Validación** de entrada de datos
- **Rate limiting** (recomendado para producción)

## 📈 Monitoreo

- **Health check:** `GET /api/health`
- **Logging** con Morgan
- **Manejo de errores** centralizado

## 🚀 Despliegue

### Variables de entorno para producción:
```env
NODE_ENV=production
DB_HOST=tu_host_produccion
DB_PASSWORD=password_seguro
JWT_SECRET=secret_muy_largo_y_seguro
FRONTEND_URL=https://tu-dominio.com
```

### Recomendaciones:
- Usar **PM2** para gestión de procesos
- Configurar **Nginx** como proxy reverso
- Implementar **SSL/TLS**
- Configurar **backups** de PostgreSQL
- Monitorear con **logs** y **métricas**

## 📝 Scripts Disponibles

- `npm start` - Ejecutar en producción
- `npm run dev` - Ejecutar en desarrollo con nodemon
- `node scripts/init-db.js` - Inicializar base de datos

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC - ver el archivo [LICENSE](LICENSE) para detalles.

---

**Desarrollado con ❤️ para Kempery World Travel**
