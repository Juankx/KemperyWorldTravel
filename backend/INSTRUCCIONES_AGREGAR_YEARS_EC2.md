# Instrucciones para Agregar Columna Years en EC2

## Paso 1: Subir archivos a EC2

Ejecuta el script PowerShell desde el directorio `backend`:

```powershell
.\subir-years-column-ec2.ps1
```

Este script subirá:
- `scripts/add-years-column.js` - Script para agregar la columna `years`
- `scripts/import-new-clients-csv.js` - Script de importación actualizado
- `routes/clients.js` - Ruta actualizada que incluye el campo `years`

## Paso 2: Conectar a EC2

```bash
ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248
```

## Paso 3: Ejecutar script para agregar columna

Una vez conectado a EC2, ejecuta:

```bash
cd ~/kempery-backend
node scripts/add-years-column.js
```

Deberías ver:
```
🔧 Verificando/agregando columna years a la tabla clients...
✅ Columna years agregada exitosamente a la tabla clients
🎉 Proceso completado
```

## Paso 4: (Opcional) Importar datos del CSV

Si tienes el archivo CSV `Clientes23-25.csv` en EC2, puedes ejecutar la importación:

**Primero, sube el CSV a EC2 desde tu máquina local:**

```powershell
# Desde PowerShell en Windows (desde el directorio frontend)
cd ..\frontend
scp -i ..\backend\kemperyworldtravel.pem .\Clientes23-25.csv ec2-user@3.141.103.248:~/kempery-backend/
```

O si estás en el directorio backend:

```powershell
# Desde PowerShell en Windows (desde el directorio backend)
scp -i .\kemperyworldtravel.pem ..\frontend\Clientes23-25.csv ec2-user@3.141.103.248:~/kempery-backend/
```

**Luego, en EC2, ejecuta la importación:**

```bash
cd ~/kempery-backend
node scripts/import-new-clients-csv.js
```

Esto actualizará todos los clientes existentes con el campo `years` del CSV.

## Paso 5: Reiniciar el backend

```bash
pm2 restart kempery-backend
```

## Paso 6: Verificar que todo funciona

```bash
pm2 logs kempery-backend --lines 50
```

## Verificación

Para verificar que la columna se agregó correctamente, puedes ejecutar en EC2:

```bash
cd ~/kempery-backend
psql -U postgres -d kempery_travel -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'years';"
```

Deberías ver:
```
 column_name | data_type 
-------------+-----------
 years       | integer
```

## Notas

- El script `add-years-column.js` es idempotente: puedes ejecutarlo múltiples veces sin problemas.
- Si la columna ya existe, el script simplemente lo indicará y no hará nada.
- El script de importación actualizará los clientes existentes si el `contract_number` coincide.

