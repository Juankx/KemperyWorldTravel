# Instalación de LibreOffice para Generación de PDFs

## Problema
El sistema necesita LibreOffice para convertir documentos DOCX a PDF. Si ves el error:
```
"soffice" no se reconoce como un comando interno o externo
```

Significa que LibreOffice no está instalado o no está en el PATH del sistema.

## Solución

### Opción 1: Instalar LibreOffice (Recomendado)

1. **Descargar LibreOffice:**
   - Visita: https://www.libreoffice.org/download/
   - Descarga la versión para Windows

2. **Instalar LibreOffice:**
   - Ejecuta el instalador
   - Durante la instalación, asegúrate de marcar la opción "Agregar al PATH" o "Add to PATH"
   - Si no aparece esta opción, instala LibreOffice en la ubicación predeterminada:
     - `C:\Program Files\LibreOffice\`

3. **Verificar la instalación:**
   - Abre PowerShell o CMD
   - Ejecuta: `soffice --version`
   - Deberías ver la versión de LibreOffice

4. **Si no está en el PATH:**
   - Agrega manualmente al PATH:
     - `C:\Program Files\LibreOffice\program\`
   - O usa la ruta completa en el código

### Opción 2: Usar Ruta Completa (Temporal)

Si LibreOffice está instalado pero no está en el PATH, el código ya intenta buscar en las rutas comunes:
- `C:\Program Files\LibreOffice\program\soffice.exe`
- `C:\Program Files (x86)\LibreOffice\program\soffice.exe`

Si LibreOffice está en otra ubicación, puedes modificar el código en:
`backend/services/documentGenerator.js` en el método `convertDocxToPdf`

## Verificación

Después de instalar LibreOffice, reinicia el servidor backend y prueba nuevamente la generación de PDF.

## Nota

El sistema intentará generar el PDF automáticamente. Si LibreOffice no está disponible, verás un mensaje de error claro indicando que necesitas instalarlo.

### Modo de Ejecución

El sistema ejecuta LibreOffice en modo completamente no interactivo usando los siguientes flags:
- `--headless`: Sin interfaz gráfica
- `--nodefault`: No abrir documentos por defecto
- `--nolockcheck`: No verificar locks de archivos
- `--invisible`: Modo invisible
- `--norestore`: No restaurar ventanas
- `--nofirststartwizard`: No ejecutar el asistente inicial
- `--nologo`: No mostrar logo de inicio
- `--nocrashreport`: No mostrar reporte de errores

**En Windows:**
- El sistema crea un script batch temporal que redirige stdin a `nul` para evitar que LibreOffice espere entrada del usuario
- El proceso se ejecuta con `windowsHide: true` para ocultar cualquier ventana de consola
- Se usan variables de entorno (`SAL_USE_VCLPLUGIN`, `SAL_DISABLE_OPENCL`) para evitar diálogos

**En Linux/Mac:**
- Se ejecuta directamente usando `spawn` con los flags no interactivos
- El proceso se ejecuta en segundo plano sin mostrar ventanas

Este enfoque es esencial para producción, especialmente en servidores sin interfaz gráfica como AWS EC2.

