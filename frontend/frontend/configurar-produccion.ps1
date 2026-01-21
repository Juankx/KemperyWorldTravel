# Script para configurar el archivo .env.production con HTTPS
# Este script crea el archivo .env.production necesario para el build de producción

$envFile = Join-Path $PSScriptRoot ".env.production"

Write-Host "Configurando archivo .env.production..." -ForegroundColor Green
Write-Host ""

$content = @"
# API Configuration for Production
VITE_API_URL=https://api.kemperyworldtravel.com/api

# Environment
NODE_ENV=production
"@

try {
    $content | Out-File -FilePath $envFile -Encoding utf8 -NoNewline
    Write-Host "✅ Archivo .env.production creado exitosamente" -ForegroundColor Green
    Write-Host "   Ubicación: $envFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Contenido:" -ForegroundColor Yellow
    Write-Host $content -ForegroundColor Gray
    Write-Host ""
    Write-Host "Próximo paso: Ejecuta 'npm run build' y luego '.\deploy-s3.ps1 -AwsProfile kempery'" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error al crear el archivo: $_" -ForegroundColor Red
    exit 1
}

