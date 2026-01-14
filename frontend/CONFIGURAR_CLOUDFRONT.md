# Configurar CloudFront para SPA (Single Page Application)

## Problema

Cuando accedes a `https://kemperyworldtravel.com/login`, CloudFront devuelve un error 403 porque busca un objeto "login" que no existe en S3. En una SPA de React, todas las rutas deben servir `index.html` para que React Router maneje el enrutamiento.

## Solución: Configurar Custom Error Responses en CloudFront

### Opción 1: Usar el Script Automático

1. **Obtén el Distribution ID de CloudFront:**
   - Ve a: https://console.aws.amazon.com/cloudfront/
   - Busca la distribución que apunta a `kemperyworldtravel.com`
   - Copia el **Distribution ID** (formato: `E1234567890ABC`)

2. **Ejecuta el script:**
   ```powershell
   cd frontend
   .\configurar-cloudfront.ps1 -DistributionId 'TU_DISTRIBUTION_ID' -AwsProfile kempery
   ```

### Opción 2: Configuración Manual desde la Consola de AWS

1. **Ve a CloudFront:**
   - https://console.aws.amazon.com/cloudfront/

2. **Selecciona tu distribución:**
   - Busca la distribución que apunta a `kemperyworldtravel.com`
   - Haz clic en el **Distribution ID**

3. **Ve a la pestaña "Error Pages":**
   - En el menú superior, haz clic en "Error Pages"

4. **Crea Custom Error Responses:**

   **Para Error 403:**
   - Haz clic en "Create Custom Error Response"
   - **HTTP Error Code:** `403: Forbidden`
   - **Customize Error Response:** `Yes`
   - **Response Page Path:** `/index.html`
   - **HTTP Response Code:** `200: OK`
   - **Error Caching Minimum TTL:** `300` (5 minutos)
   - Haz clic en "Create Custom Error Response"

   **Para Error 404:**
   - Haz clic en "Create Custom Error Response"
   - **HTTP Error Code:** `404: Not Found`
   - **Customize Error Response:** `Yes`
   - **Response Page Path:** `/index.html`
   - **HTTP Response Code:** `200: OK`
   - **Error Caching Minimum TTL:** `300` (5 minutos)
   - Haz clic en "Create Custom Error Response"

5. **Espera la propagación:**
   - Los cambios en CloudFront pueden tardar **15-20 minutos** en propagarse
   - Puedes ver el estado en la pestaña "General" de tu distribución
   - Cuando el estado cambie a "Deployed", los cambios estarán activos

## Verificación

Después de que CloudFront se haya actualizado:

1. Abre `https://kemperyworldtravel.com/login` en el navegador
2. Debe cargar la aplicación React correctamente
3. React Router manejará la ruta `/login` internamente

## Notas Importantes

- **Propagación:** Los cambios en CloudFront pueden tardar hasta 20 minutos
- **Cache:** CloudFront cachea las respuestas, así que puede que necesites esperar o invalidar el cache
- **Invalidación de Cache (opcional):** Si quieres que los cambios se apliquen inmediatamente:
  ```powershell
  aws cloudfront create-invalidation --distribution-id TU_DISTRIBUTION_ID --paths "/*" --profile kempery
  ```

## Permisos IAM Necesarios

Si el script falla por permisos, asegúrate de que el usuario `juankx` tenga estos permisos:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudfront:GetDistribution",
                "cloudfront:GetDistributionConfig",
                "cloudfront:UpdateDistribution",
                "cloudfront:CreateInvalidation"
            ],
            "Resource": "*"
        }
    ]
}
```

O simplemente agrega la política predefinida: `CloudFrontFullAccess`

