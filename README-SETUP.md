# KEMPERY SYSTEM - SETUP COMPLETE ✓

## Estado Actual del Sistema

El sistema Kempery está completamente configurado y funcionando:

### Servidores en Ejecución
- **Frontend**: http://localhost:3000 (Vite)
- **Backend**: http://localhost:5000 (Mock Server)

### Credenciales de Acceso
```
Email: admin@kempery.com
Contraseña (Demo): admin123
```

También puedes usar:
```
- admin@kempery.com
- paola@kempery.com  
- cobranzas@kempery.com
Contraseña: admin123 (modo demo)
```

---

## Problema Actual: PostgreSQL

El sistema está usando un **Backend Mock** porque PostgreSQL requiere configuración adicional.

### ¿Por qué el Mock Server?

PostgreSQL necesita que:
1. El servicio esté completamente instalado y corriendo
2. La contraseña del usuario `postgres` sea configurada correctamente
3. Los permisos de autenticación sean los correctos en `pg_hba.conf`

### Migrar a PostgreSQL Real

Para usar PostgreSQL en lugar del Mock Server:

#### Opción 1: Instalación Manual
1. Descargar PostgreSQL desde: https://www.postgresql.org/download/windows/
2. Instalar con la contraseña `Kempery2025+` para el usuario `postgres`
3. Crear la base de datos:
```sql
CREATE DATABASE kempery_travel;
CREATE USER kempery_user WITH PASSWORD 'Kempery2025+';
GRANT ALL PRIVILEGES ON DATABASE kempery_travel TO kempery_user;
```

4. Actualizar el archivo `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kempery_travel
DB_USER=postgres
DB_PASSWORD=Kempery2025+
NODE_ENV=development
```

5. Ejecutar migraciones:
```bash
cd backend
npm run init-db
npm run setup
```

6. Iniciar backend con PostgreSQL:
```bash
npm run dev
```

#### Opción 2: Docker (Recomendado)
1. Instalar Docker desde: https://www.docker.com/products/docker-desktop
2. Ejecutar:
```bash
docker run -d --name kempery-db \
  -e POSTGRES_PASSWORD=Kempery2025+ \
  -e POSTGRES_DB=kempery_travel \
  -p 5432:5432 \
  postgres:16-alpine
```

3. Seguir los pasos 4-6 de la opción anterior

---

## Estructura del Proyecto

```
C:\Users\Miguel\Desktop\kempery\KemperyWorldTravel\
├── frontend/                    # React + Vite
│   ├── src/
│   ├── package.json
│   └── npm run dev             # Puerto 3000
│
├── backend/                     # Node.js + Express
│   ├── server.js               # Servidor real (con PostgreSQL)
│   ├── server-mock.js          # Servidor mock (sin BD)
│   ├── .env                    # Configuración
│   ├── package.json
│   └── npm run dev             # Puerto 5000
│
└── Documentación de deploy
```

---

## Usuarios del Sistema (Cuando PostgreSQL esté configurado)

| Email | Rol | Contraseña |
|-------|-----|-----------|
| admin@kempery.com | Admin | Kempery2024+ |
| paola@kempery.com | Agent | Kempery2024+ |
| cobranzas@kempery.com | Cobranza | Kempery2024+ |

---

## Scripts Disponibles

### Backend
```bash
npm run dev        # Iniciar con nodemon (modo desarrollo)
npm run start      # Iniciar en producción
npm run init-db    # Inicializar base de datos
npm run setup      # Setup de base de datos
npm run import-clients  # Importar clientes
```

### Frontend
```bash
npm run dev        # Iniciar con Vite (puerto 3000)
npm run build      # Compilar para producción
npm run preview    # Preview de compilación
```

---

## Solución de Problemas

### El backend no conecta a PostgreSQL
- Verificar que el servicio `postgresql-x64-16` esté corriendo
- Revisar que `.env` tenga las credenciales correctas
- Ejecutar: `psql -U postgres` para probar la conexión

### El puerto 3000 o 5000 está en uso
```bash
# Buscar qué proceso usa el puerto (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Matar el proceso
taskkill /PID <PID> /F
```

### Limpiar node_modules
```bash
cd backend
rm -r node_modules
npm install

cd ../frontend
rm -r node_modules
npm install
```

---

## URLs Importantes

- **Aplicación**: http://localhost:3000
- **API**: http://localhost:5000
- **Base de Datos**: localhost:5432 (cuando PostgreSQL esté configurado)

---

## Próximos Pasos

1. ✅ Frontend funcionando
2. ✅ Backend (Mock) funcionando
3. ⏳ Configurar PostgreSQL
4. ⏳ Integración completa con BD
5. ⏳ Deploy a producción (AWS)

---

## Notas Importantes

- El Mock Server es funcional para pruebas
- AWS S3 está deshabilitado en modo local (se puede configurar después)
- CORS está configurado para `http://localhost:3000`
- JWT_EXPIRES_IN = 1 hora (cambiar en .env si es necesario)

---

**Última actualización**: 14 de Enero de 2026
**Versión**: 1.0.0 (Mock)
**Estado**: ✅ SISTEMA FUNCIONANDO
