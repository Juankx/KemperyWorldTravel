# Configuración de AWS S3 para Kempery World Travel

## Descripción
El backend ahora puede almacenar documentos generados (DOCX y PDF) en AWS S3. Si S3 no está configurado, los documentos se guardan solo localmente en el servidor.

## Configuración

### 1. Obtener Credenciales de AWS

1. Ve a la [Consola de AWS IAM](https://console.aws.amazon.com/iam/)
2. Navega a **Usuarios** → Tu usuario → **Pestaña "Seguridad"**
3. Crea una nueva **Access Key** si no tienes una
4. Guarda:
   - **Access Key ID**
   - **Secret Access Key**

### 2. Configurar Variables de Entorno

#### En Desarrollo Local

Edita `backend/.env` o `backend/config.env`:

```env
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=kemperyworldtravel.com
```

#### En EC2 (Producción)

Conecta a EC2 y edita el archivo `.env`:

```bash
ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248
cd ~/kempery-backend
nano .env
```

Agrega las variables:

```env
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=kemperyworldtravel.com
```

Guarda y reinicia el servidor:

```bash
pm2 restart kempery-backend
pm2 logs kempery-backend
```

### 3. Permisos IAM Requeridos

El usuario de AWS necesita los siguientes permisos en el bucket S3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::kemperyworldtravel.com/documents/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::kemperyworldtravel.com"
      ],
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "documents/*"
          ]
        }
      }
    }
  ]
}
```

### 4. Estructura en S3

Los documentos se organizan así:

```
kemperyworldtravel.com/
  └── documents/
      └── {bookingId}/
          ├── Reserva_{contract_number}.docx
          └── Reserva_{contract_number}.pdf
```

## Funcionamiento

1. **Generación de Documentos**: Cuando se genera un documento de reserva:
   - Se crea localmente (DOCX y PDF)
   - Si S3 está configurado, se sube automáticamente a S3
   - Se guarda la información de S3 en la respuesta

2. **Descarga de Documentos**: 
   - Si el PDF existe en S3, se redirige a una URL firmada (válida por 1 hora)
   - Si no existe en S3, se genera y se sirve desde el servidor local

3. **Fallback**: Si S3 no está configurado o falla:
   - Los documentos se guardan solo localmente
   - El sistema continúa funcionando normalmente

## Verificación

### Verificar que S3 está funcionando

1. Genera un documento de reserva desde la aplicación
2. Revisa los logs del servidor:
   ```bash
   pm2 logs kempery-backend
   ```
   Deberías ver:
   ```
   ✅ S3Service inicializado
   📤 Subiendo DOCX a S3...
   ✅ DOCX subido a S3: documents/{bookingId}/...
   📤 Subiendo PDF a S3...
   ✅ PDF subido a S3: documents/{bookingId}/...
   ```

3. Verifica en la consola de S3:
   - Ve a [S3 Console](https://s3.console.aws.amazon.com/)
   - Navega a tu bucket → `documents/`
   - Deberías ver las carpetas por `bookingId`

## Solución de Problemas

### Error: "S3Service no inicializado"
- Verifica que las variables de entorno estén configuradas
- Verifica que las credenciales sean correctas
- Reinicia el servidor después de cambiar las variables

### Error: "Access Denied" al subir a S3
- Verifica los permisos IAM del usuario
- Asegúrate de que el bucket existe
- Verifica que la región sea correcta

### Los documentos no se suben a S3
- Revisa los logs del servidor para ver errores específicos
- Verifica que el bucket tenga el nombre correcto
- Asegúrate de que las credenciales tengan permisos de escritura

## Notas de Seguridad

- **NUNCA** subas el archivo `.env` con credenciales a Git
- Usa variables de entorno o un gestor de secretos en producción
- Las URLs firmadas de S3 expiran después de 1 hora por seguridad
- Considera usar roles IAM en EC2 en lugar de credenciales estáticas

