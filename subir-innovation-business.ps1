# Script para subir Innovation Business a GitHub
# Autor: Miguel
# Uso: .\subir-innovation-business.ps1

param(
    [Parameter(Mandatory = $false)]
    [string]$username = "TU_USUARIO",
    
    [Parameter(Mandatory = $false)]
    [string]$message = "Initial commit: Innovation Business Frontend v1.0"
)

Write-Host "🚀 Subiendo Innovation Business a GitHub" -ForegroundColor Green

# Verificar si estamos en el directorio correcto
if (!(Test-Path ".\frontend")) {
    Write-Host "❌ Error: No estás en la carpeta raíz del proyecto" -ForegroundColor Red
    Write-Host "   Navega a: C:\Users\Miguel\Desktop\kempery\KemperyWorldTravel" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Pasos a realizar:" -ForegroundColor Cyan
Write-Host "1. Inicializar Git"
Write-Host "2. Agregar todos los archivos"
Write-Host "3. Hacer primer commit"
Write-Host "4. Crear rama main"
Write-Host "5. Conectar con GitHub"
Write-Host "6. Subir archivos"

Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "- Reemplaza 'TU_USUARIO' con tu usuario real en GitHub"
Write-Host "- Asegúrate de haber creado el repositorio en GitHub primero"
Write-Host "- Nombre del repositorio: innovation_busines"

Write-Host ""
$continuar = Read-Host "¿Deseas continuar? (s/n)"

if ($continuar -ne "s") {
    Write-Host "Operación cancelada" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "▶ Paso 1: Inicializando Git..." -ForegroundColor Cyan
git init

Write-Host "▶ Paso 2: Agregando archivos..." -ForegroundColor Cyan
git add .

Write-Host "▶ Paso 3: Primer commit..." -ForegroundColor Cyan
git commit -m "$message"

Write-Host "▶ Paso 4: Creando rama main..." -ForegroundColor Cyan
git branch -M main

Write-Host ""
Write-Host "▶ Paso 5: Conectando con GitHub..." -ForegroundColor Cyan
Write-Host "   URL: https://github.com/$username/innovation_busines.git" -ForegroundColor Gray
git remote add origin "https://github.com/$username/innovation_busines.git"

Write-Host "▶ Paso 6: Subiendo archivos..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "✅ ¡Listo!" -ForegroundColor Green
Write-Host "📍 Accede a: https://github.com/$username/innovation_busines" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Backend developer revisa BACKEND_INSTRUCTIONS.md"
Write-Host "2. Implementar endpoints API"
Write-Host "3. Actualizar frontend con URL real del backend"
Write-Host "4. Hacer git commit con nuevos cambios"
Write-Host ""
