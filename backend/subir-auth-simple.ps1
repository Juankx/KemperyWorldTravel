# Script simple para subir archivos de autenticación a EC2
# Ejecuta este script desde el directorio backend

$pem = ".\kemperyworldtravel.pem"
$ec2 = "ec2-user@3.141.103.248"

Write-Host "Subiendo archivos corregidos a EC2..." -ForegroundColor Green
Write-Host ""

# Verificar que existe el PEM
if (-not (Test-Path $pem)) {
    Write-Host "ERROR: No se encontro: $pem" -ForegroundColor Red
    Write-Host "Asegurate de estar en el directorio backend y que el archivo PEM este ahi" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo PEM encontrado" -ForegroundColor Green
Write-Host ""

# Subir auth.js
Write-Host "Subiendo routes/auth.js..." -ForegroundColor Cyan
scp -i $pem ".\routes\auth.js" "${ec2}:~/kempery-backend/routes/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ auth.js subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error al subir auth.js" -ForegroundColor Red
}

Write-Host ""

# Subir script de verificación
Write-Host "Subiendo scripts/verificar-usuarios-ec2.js..." -ForegroundColor Cyan
scp -i $pem ".\scripts\verificar-usuarios-ec2.js" "${ec2}:~/kempery-backend/scripts/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ verificar-usuarios-ec2.js subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error al subir verificar-usuarios-ec2.js" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Próximos pasos en EC2:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Conecta: ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248" -ForegroundColor White
Write-Host "2. Verifica usuarios: cd ~/kempery-backend && node scripts/verificar-usuarios-ec2.js" -ForegroundColor White
Write-Host "3. Crea Paola: node scripts/verificar-usuarios-ec2.js --crear-paola" -ForegroundColor White
Write-Host "4. Reinicia: pm2 restart kempery-backend" -ForegroundColor White
Write-Host ""



