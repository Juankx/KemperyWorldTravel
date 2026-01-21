# Guía: Crear Usuario IAM y Configurar Permisos S3

## Situación Actual

El diagnóstico muestra que estás usando el usuario `juankx`, pero el panel de IAM muestra "Personas: 0". Esto puede significar:
- El usuario existe pero no aparece en el conteo
- El usuario está en otra cuenta de AWS
- Necesitas crear el usuario

## Solución: Crear Usuario IAM con Permisos S3

### Paso 1: Ir a la Consola de IAM

1. Abre: https://console.aws.amazon.com/iam/
2. En el menú lateral izquierdo, haz clic en **"Personas"** (Users)

### Paso 2: Crear Nuevo Usuario

1. Haz clic en el botón **"Agregar usuarios"** (Add users) en la parte superior
2. **Nombre de usuario**: `juankx`
3. **Tipo de acceso**: Selecciona **"Acceso mediante programación"** (Programmatic access)
   - Esto creará Access Key ID y Secret Access Key para usar con AWS CLI
4. Haz clic en **"Siguiente"**

### Paso 3: Asignar Permisos

1. Selecciona **"Adjuntar políticas directamente"** (Attach policies directly)
2. En el buscador, escribe: `S3`
3. Selecciona **"AmazonS3FullAccess"**
   - ⚠️ **Nota**: Esta política da acceso completo a TODOS los buckets S3. Es útil para desarrollo, pero para producción deberías usar una política más restrictiva.
4. Haz clic en **"Siguiente"**
5. Revisa la configuración y haz clic en **"Crear usuario"**

### Paso 4: Guardar las Credenciales

**⚠️ IMPORTANTE**: Después de crear el usuario, AWS mostrará:
- **Access Key ID**
- **Secret Access Key**

**Guarda estas credenciales de forma segura**. Solo se mostrarán una vez.

### Paso 5: Configurar AWS CLI

Configura las credenciales en tu máquina local:

```powershell
aws configure
```

Ingresa:
- **AWS Access Key ID**: [La que obtuviste en el paso 4]
- **AWS Secret Access Key**: [La que obtuviste en el paso 4]
- **Default region name**: `us-east-1`
- **Default output format**: `json`

### Paso 6: Verificar que Funciona

```powershell
cd frontend
.\verificar-permisos-s3.ps1
```

Deberías ver:
- ✅ s3:ListBucket: PERMITIDO
- ✅ s3:GetBucketLocation: PERMITIDO
- ✅ s3:PutObject: PERMITIDO

### Paso 7: Intentar Deploy

```powershell
cd frontend
.\deploy-s3.ps1
```

## Alternativa: Si el Usuario Ya Existe

Si el usuario `juankx` ya existe pero no tiene permisos:

1. Ve a: https://console.aws.amazon.com/iam/
2. **Personas** → `juankx`
3. Pestaña **"Permisos"**
4. Haz clic en **"Agregar permisos"**
5. Selecciona **"Adjuntar políticas directamente"**
6. Busca y selecciona: **"AmazonS3FullAccess"**
7. Haz clic en **"Siguiente"** y luego **"Agregar permisos"**

## Política Personalizada (Más Segura para Producción)

Si prefieres una política más restrictiva que solo permita acceso al bucket específico:

1. Ve a: https://console.aws.amazon.com/iam/
2. **Políticas** → **"Crear política"**
3. Pestaña **"JSON"**
4. Pega este JSON:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:GetBucketLocation",
                "s3:ListBucket",
                "s3:PutBucketWebsite",
                "s3:PutBucketPolicy"
            ],
            "Resource": [
                "arn:aws:s3:::kemperyworldtravel.com",
                "arn:aws:s3:::kemperyworldtravel.com/*"
            ]
        }
    ]
}
```

5. Haz clic en **"Siguiente"**
6. Nombre: `KemperyWorldTravelS3Deploy`
7. Descripción: `Permisos para desplegar frontend a S3`
8. Haz clic en **"Crear política"**
9. Luego adjunta esta política al usuario `juankx`

## Verificar Usuario Actual

Para ver qué usuario estás usando actualmente:

```powershell
aws sts get-caller-identity
```

Esto mostrará el ARN del usuario actual.

