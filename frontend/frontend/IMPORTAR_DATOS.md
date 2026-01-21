# 📊 Importar Datos de Clientes - Kempery World Travel

## 🎯 Objetivo
Importar los 723 clientes de 2024 desde el archivo `Base Kempery.csv` a la base de datos PostgreSQL.

## 📋 Requisitos Previos

### 1. PostgreSQL Instalado y Configurado
```bash
# Crear base de datos
psql -U postgres
CREATE DATABASE kempery_travel;
\q
```

### 2. Variables de Entorno Configuradas
Crear archivo `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kempery_travel
DB_USER=postgres
DB_PASSWORD=tu_password_postgres
JWT_SECRET=kempery_world_travel_super_secret_key_2025
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 🚀 Proceso de Importación

### Opción 1: Configuración Automática (Recomendada)
```bash
cd backend
npm install
npm run setup
```

### Opción 2: Configuración Manual

#### Paso 1: Inicializar Base de Datos
```bash
cd backend
npm install
npm run init-db
```

#### Paso 2: Importar Clientes
```bash
npm run import-clients
```

## 📊 Datos que se Importarán

### Clientes (723 registros)
- **Nombres y Apellidos** - Limpiados y formateados
- **Email** - Validado y normalizado
- **Teléfono** - Limpiado y formateado
- **Cédula/RUC** - Detectado automáticamente el tipo
- **Ciudad** - Asignada como "Quito" por defecto
- **País** - "Ecuador"
- **Notas** - Información del contrato, línea, observaciones

### Reservas (Viajes Internacionales)
- **Número de Reserva** - Generado automáticamente
- **Destino** - Extraído del campo "INTERNACIONAL"
- **Fechas** - Calculadas basadas en fecha y noches
- **Precio Total** - Importado del CSV
- **Estado** - "Completada" por defecto
- **Pago** - "Pagado" por defecto

### Paquetes Turísticos
- **Paquetes Existentes** - 6 paquetes predefinidos
- **Paquetes Nuevos** - Creados automáticamente para destinos no existentes

## 🔍 Mapeo de Campos CSV → Base de Datos

| Campo CSV | Campo BD | Transformación |
|-----------|----------|----------------|
| NOMBRES | first_name | Limpiado y capitalizado |
| APELLIDOS | last_name | Limpiado y capitalizado |
| CORREO ELEC | email | Normalizado a minúsculas |
| TELEFONO | phone | Solo números, máximo 15 dígitos |
| CEDULA | document_number | Solo números, detecta tipo |
| FECHA | travel_date | Convertido a formato ISO |
| INTERNACIONAL | destination | Extraído para reservas |
| TOTAL | total_price | Limpiado de símbolos monetarios |
| CONTRATO | notes | Incluido en observaciones |

## 📈 Estadísticas Esperadas

Después de la importación deberías ver:
- **~723 clientes** importados
- **~400+ reservas** (viajes internacionales)
- **~10-15 paquetes** (existentes + nuevos)
- **Ingresos totales** calculados automáticamente

## 🔧 Solución de Problemas

### Error: "Archivo CSV no encontrado"
- Verificar que `Base Kempery.csv` esté en la raíz del proyecto
- Verificar permisos de lectura del archivo

### Error: "Cliente ya existe"
- El script detecta duplicados por email o cédula
- Los duplicados se omiten automáticamente

### Error: "Conexión a PostgreSQL"
- Verificar que PostgreSQL esté ejecutándose
- Verificar credenciales en `.env`
- Verificar que la base de datos `kempery_travel` exista

### Error: "Datos incompletos"
- El script omite registros sin datos esenciales
- Se muestran advertencias en la consola

## 📝 Logs de Importación

El script muestra progreso en tiempo real:
```
🚀 Iniciando importación de clientes desde CSV...
📊 Procesando 723 registros...
👥 Insertando clientes...
✅ Procesados 50 clientes...
✅ Procesados 100 clientes...
✈️ Insertando reservas...
🎉 Importación completada!
✅ Clientes importados: 720
✅ Reservas importadas: 450
❌ Errores clientes: 3
❌ Errores reservas: 12
```

## 🎯 Verificación Post-Importación

### 1. Verificar en la Base de Datos
```sql
-- Conectar a PostgreSQL
psql -U postgres -d kempery_travel

-- Verificar clientes
SELECT COUNT(*) FROM clients;

-- Verificar reservas
SELECT COUNT(*) FROM bookings;

-- Verificar paquetes
SELECT COUNT(*) FROM packages;

-- Ver ingresos totales
SELECT SUM(total_price) FROM bookings;
```

### 2. Verificar en el Panel Admin
1. Ejecutar backend: `npm run dev`
2. Ejecutar frontend: `npm run dev`
3. Acceder a: http://localhost:3000/login
4. Login: ventas.kempery@gmail.com / Kempery2025+
5. Verificar datos en las secciones "Clientes" y "Reservas"

## 🚀 Próximos Pasos

Después de la importación exitosa:
1. **Revisar datos** en el panel administrativo
2. **Configurar usuarios** adicionales si es necesario
3. **Personalizar paquetes** según necesidades
4. **Configurar notificaciones** para nuevas reservas
5. **Preparar para producción** con datos reales

---

**¡Importación completada exitosamente! 🎉**

Los datos de 2024 de Kempery World Travel están ahora disponibles en el sistema.
