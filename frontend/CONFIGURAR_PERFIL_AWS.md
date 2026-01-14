# Configurar Perfil AWS para Kempery World Travel

## ¿Por qué usar un perfil?

Si cambias las credenciales globales con `aws configure`, **afectará TODOS tus proyectos** que usen AWS CLI. 

Usando **perfiles de AWS**, puedes tener múltiples configuraciones sin que se interfieran entre sí.

## Configuración Rápida

### Opción 1: Usar el Script (Recomendado)

```powershell
cd frontend
.\configurar-aws-perfil.ps1
```

El script te pedirá:
- Access Key ID
- Secret Access Key

Y creará un perfil llamado `kempery` que solo afecta este proyecto.

### Opción 2: Configuración Manual

```powershell
# Crear perfil específico para Kempery
aws configure --profile kempery
```

Ingresa:
- **AWS Access Key ID**: [Tu Access Key ID del usuario juankx]
- **AWS Secret Access Key**: [Tu Secret Access Key]
- **Default region name**: `us-east-1`
- **Default output format**: `json`

## Usar el Perfil en el Deploy

### Método 1: Especificar perfil en el script

```powershell
cd frontend
.\deploy-s3.ps1 -AwsProfile kempery
```

### Método 2: Variable de entorno (solo para esta sesión)

```powershell
$env:AWS_PROFILE = "kempery"
.\deploy-s3.ps1
```

### Método 3: Configurar como perfil por defecto (solo para este proyecto)

Crea un archivo `.env.local` en la carpeta `frontend`:

```env
AWS_PROFILE=kempery
```

Y modifica `deploy-s3.ps1` para leerlo automáticamente.

## Verificar que Funciona

```powershell
# Verificar identidad con el perfil
aws sts get-caller-identity --profile kempery

# Deberías ver:
# {
#     "UserId": "...",
#     "Account": "260477932869",
#     "Arn": "arn:aws:iam::260477932869:user/juankx"
# }
```

## Ventajas de Usar Perfiles

✅ **No afecta otros proyectos**: Cada proyecto puede tener su propio perfil  
✅ **Fácil de cambiar**: Solo cambias el perfil que usas  
✅ **Más seguro**: No mezclas credenciales entre proyectos  
✅ **Fácil de compartir**: Puedes documentar qué perfil usar sin exponer credenciales  

## Listar Perfiles Configurados

```powershell
# Ver todos los perfiles
aws configure list-profiles

# Ver configuración de un perfil específico
aws configure list --profile kempery
```

## Cambiar entre Perfiles

Si tienes múltiples proyectos:

```powershell
# Para Kempery
$env:AWS_PROFILE = "kempery"
.\deploy-s3.ps1

# Para otro proyecto
$env:AWS_PROFILE = "otro-proyecto"
# ... comandos del otro proyecto
```

## Nota Importante

Las credenciales se guardan en:
- **Windows**: `C:\Users\TuUsuario\.aws\credentials`
- **Linux/Mac**: `~/.aws/credentials`

Este archivo contiene las credenciales en texto plano. **NUNCA** lo subas a Git.

## Solución de Problemas

### Error: "The config profile (kempery) could not be found"

El perfil no existe. Ejecuta:
```powershell
aws configure --profile kempery
```

### Error: "Unable to locate credentials"

Verifica que el perfil esté configurado:
```powershell
aws configure list --profile kempery
```

### Verificar permisos del usuario

```powershell
aws sts get-caller-identity --profile kempery
```

Si funciona, el perfil está configurado correctamente.

