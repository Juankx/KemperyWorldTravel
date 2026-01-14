# 📋 Guía para Actualizar Datos desde CSV

Esta guía explica cómo actualizar la base de datos usando los archivos CSV actualizados.

## 📁 Archivos CSV

1. **`frontend/Clientes23-25.csv`** - Lista de clientes a importar/actualizar
2. **`frontend/ActualizadoCobranza.csv`** - Información de deudas y cobranzas

## 🚀 Opción 1: Actualizar Todo (Recomendado)

Ejecuta ambos procesos en secuencia:

```bash
cd backend
node scripts/actualizar-datos-completos.js
```

Este script:
1. ✅ Importa/actualiza clientes desde `Clientes23-25.csv`
2. ✅ Actualiza cobranzas desde `ActualizadoCobranza.csv`

## 📋 Opción 2: Actualizar por Separado

### 1. Importar/Actualizar Clientes

```bash
cd backend
node scripts/import-new-clients-csv.js
```

**Qué hace:**
- Lee `frontend/Clientes23-25.csv`
- Crea nuevos clientes o actualiza existentes
- Busca por contrato o cédula
- Genera emails únicos si no existen

**Columnas esperadas en el CSV:**
- FECHA
- CONTRATO
- NOMBRES
- APELLIDOS
- CEDULA
- TELEFONO
- NOCHES
- AÑOS
- INTERNACIONAL
- DATA
- TIPO
- NETO
- IVA
- TOTAL
- CORREO ELEC
- LÍNEA
- CERRADO
- OBSERVACIONES

### 2. Actualizar Cobranzas

```bash
cd backend
node scripts/update-collections-from-csv.js
```

**Qué hace:**
- Lee `frontend/ActualizadoCobranza.csv`
- Busca clientes por contrato o cédula
- Actualiza o crea `payment_agreements` con el valor de deuda
- Marca clientes en cobranzas (`in_collections = 'Si'`) si tienen deuda > 0

**Columnas esperadas en el CSV:**
- CONTRATO
- NOMBRES
- APELLIDOS
- CEDULA
- VALOR DEUDA (última columna)

## 📊 Verificar Resultados

Después de ejecutar los scripts, puedes verificar:

```bash
# Ver clientes en cobranzas
psql -U postgres -d kempery_travel -c "SELECT COUNT(*) FROM clients WHERE in_collections = 'Si';"

# Ver payment agreements activos
psql -U postgres -d kempery_travel -c "SELECT COUNT(*) FROM payment_agreements WHERE status = 'active';"
```

## ⚠️ Notas Importantes

1. **Ubicación de archivos**: Los scripts buscan los CSV en `frontend/` (relativo a la raíz del proyecto)
2. **Backup**: Se recomienda hacer backup de la base de datos antes de actualizar
3. **Formato CSV**: Los archivos deben estar en formato UTF-8
4. **Valores monetarios**: Los montos pueden tener formato `$1,234.56` o `1234.56`, el script los limpia automáticamente

## 🔧 Solución de Problemas

### Error: "No se encontró el archivo CSV"
- Verifica que los archivos estén en `frontend/Clientes23-25.csv` y `frontend/ActualizadoCobranza.csv`
- Verifica que estés ejecutando desde el directorio `backend/`

### Clientes no encontrados
- El script busca por contrato normalizado o cédula
- Verifica que los números de contrato y cédulas coincidan en ambos CSV
- Revisa el reporte de "clientes no encontrados" al final del script

### Errores de formato
- Asegúrate de que los CSV estén guardados en UTF-8
- Verifica que las comillas estén correctamente cerradas
- Revisa que no haya caracteres especiales problemáticos

## 📝 Ejemplo de Uso

```bash
# 1. Asegúrate de estar en el directorio backend
cd backend

# 2. Actualiza todo
node scripts/actualizar-datos-completos.js

# O actualiza por separado:
# node scripts/import-new-clients-csv.js
# node scripts/update-collections-from-csv.js
```

