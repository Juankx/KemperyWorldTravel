# Script para subir el script de importación corregido a EC2

$pem = ".\kemperyworldtravel.pem"
$ec2 = "ec2-user@3.141.103.248"
$script = ".\scripts\importar-base-datos.js"

Write-Host "Subiendo script de importación corregido..." -ForegroundColor Cyan

if (-not (Test-Path $pem)) {
    Write-Host "ERROR: No se encontro: $pem" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $script)) {
    Write-Host "ERROR: No se encontro: $script" -ForegroundColor Red
    exit 1
}

scp -i $pem $script "${ec2}:~/kempery-backend/scripts/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Script subido exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos en EC2:" -ForegroundColor Yellow
    Write-Host "  1. ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248" -ForegroundColor Gray
    Write-Host "  2. cd ~/kempery-backend" -ForegroundColor Gray
    Write-Host "  3. node scripts/sincronizar-esquema-ec2.js" -ForegroundColor Gray
    Write-Host "  4. node scripts/importar-base-datos.js" -ForegroundColor Gray
} else {
    Write-Host "❌ Error al subir el script" -ForegroundColor Red
    exit 1
}

