# Configurar CloudFront para el Backend (Solución HTTPS)

## Problema

El frontend está en HTTPS pero el backend está en HTTP, causando errores de "contenido mixto".

## Solución: CloudFront como Proxy HTTPS para el Backend

CloudFront puede servir como proxy HTTPS que apunta a tu backend HTTP en EC2.

### Opción 1: Usar el mismo CloudFront con múltiples orígenes

Si ya tienes CloudFront configurado para el frontend:

1. **Ve a CloudFront Console:**
   - https://console.aws.amazon.com/cloudfront/

2. **Edita tu distribución existente:**
   - Selecciona la distribución que apunta a `kemperyworldtravel.com`
   - Ve a la pestaña "Origins"

3. **Agrega un nuevo origen para el backend:**
   - Click en "Create origin"
   - **Origin domain:** `3.141.103.248` (o crea un Custom Origin)
   - **Origin path:** `/api` (opcional, si quieres que CloudFront maneje el prefijo)
   - **Origin protocol:** `HTTP Only`
   - **HTTP port:** `5000`
   - **Origin ID:** `kempery-backend-api`

4. **Crea un Behavior para la API:**
   - Ve a la pestaña "Behaviors"
   - Click en "Create behavior"
   - **Path pattern:** `/api/*`
   - **Origin:** Selecciona `kempery-backend-api`
   - **Viewer protocol policy:** `Redirect HTTP to HTTPS`
   - **Allowed HTTP methods:** `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
   - **Cache policy:** `CachingDisabled` (para APIs dinámicas)
   - **Origin request policy:** `AllViewer` (para pasar headers)

5. **Espera la propagación (15-20 minutos)**

6. **Actualiza el frontend:**
   
   Edita `frontend/.env.production`:
   ```env
   VITE_API_URL=https://kemperyworldtravel.com/api
   ```
   
   O si prefieres un subdominio:
   ```env
   VITE_API_URL=https://api.kemperyworldtravel.com/api
   ```

### Opción 2: Crear una distribución CloudFront separada para la API

1. **Crear nueva distribución CloudFront:**
   - Ve a: https://console.aws.amazon.com/cloudfront/
   - Click en "Create distribution"

2. **Configurar el origen:**
   - **Origin domain:** `3.141.103.248`
   - **Origin protocol:** `HTTP Only`
   - **HTTP port:** `5000`
   - **Origin path:** (dejar vacío)

3. **Configurar el viewer:**
   - **Viewer protocol policy:** `Redirect HTTP to HTTPS`
   - **Allowed HTTP methods:** `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`

4. **Configurar cache:**
   - **Cache policy:** `CachingDisabled` (para APIs)
   - **Origin request policy:** `AllViewer`

5. **Configurar dominio alternativo (opcional):**
   - **Alternate domain names (CNAMEs):** `api.kemperyworldtravel.com`
   - **SSL certificate:** Selecciona el certificado de `kemperyworldtravel.com` o crea uno nuevo

6. **Crear registro en Route 53:**
   - Ve a: https://console.aws.amazon.com/route53/
   - Edita la zona `kemperyworldtravel.com`
   - Crea un registro:
     - **Name:** `api`
     - **Type:** `A`
     - **Alias:** `Yes`
     - **Alias target:** Selecciona la distribución CloudFront que acabas de crear

7. **Espera la propagación (15-20 minutos)**

8. **Actualiza el frontend:**
   
   Edita `frontend/.env.production`:
   ```env
   VITE_API_URL=https://api.kemperyworldtravel.com/api
   ```
   
   Luego redesplega:
   ```powershell
   cd frontend
   npm run build
   .\deploy-s3.ps1 -AwsProfile kempery
   ```

## Verificación

1. **Verifica que CloudFront responde:**
   ```bash
   curl https://kemperyworldtravel.com/api/health
   # O
   curl https://api.kemperyworldtravel.com/api/health
   ```

2. **Verifica desde el navegador:**
   - Abre `https://kemperyworldtravel.com`
   - Intenta hacer login
   - No deberías ver errores de "contenido mixto"

## Ventajas de esta solución

- ✅ No requiere configurar Nginx en EC2
- ✅ CloudFront maneja HTTPS automáticamente
- ✅ CloudFront puede cachear respuestas estáticas
- ✅ CloudFront puede proteger contra DDoS
- ✅ No necesitas certificados SSL en EC2

## Notas importantes

- **Cache:** Asegúrate de usar `CachingDisabled` para endpoints de API dinámicos
- **Headers:** Configura `AllViewer` en Origin Request Policy para pasar todos los headers (incluyendo Authorization)
- **CORS:** El backend debe seguir configurado para aceptar requests desde `https://kemperyworldtravel.com`
- **Propagación:** Los cambios en CloudFront pueden tardar 15-20 minutos

## Troubleshooting

### Error 502 Bad Gateway
- Verifica que el backend está corriendo en EC2
- Verifica que el Security Group permite tráfico desde CloudFront
- Verifica que el puerto 5000 está abierto

### Error CORS
- Verifica que el backend tiene configurado CORS para `https://kemperyworldtravel.com`
- Verifica que CloudFront está pasando los headers correctos

### Error 403 Forbidden
- Verifica que el Origin Request Policy está configurado para pasar todos los headers
- Verifica que el backend está escuchando en `0.0.0.0:5000`

