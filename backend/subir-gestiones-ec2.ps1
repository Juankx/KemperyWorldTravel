# Script para subir archivos de gestiones a EC2
# Uso: .\subir-gestiones-ec2.ps1

$PEM_PATH = ".\kemperyworldtravel.pem"
$EC2_HOST = "ec2-user@3.141.103.248"
$EC2_BACKEND_PATH = "~/kempery-backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Subiendo archivos de gestiones a EC2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo PEM
if (-not (Test-Path $PEM_PATH)) {
    Write-Host "❌ Error: No se encontró el archivo PEM: $PEM_PATH" -ForegroundColor Red
    Write-Host "Por favor, verifica la ruta del archivo PEM." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo PEM encontrado: $PEM_PATH" -ForegroundColor Green
Write-Host ""

# Subir scripts de base de datos
Write-Host "📤 Subiendo scripts de base de datos..." -ForegroundColor Yellow
scp -i $PEM_PATH ".\scripts\add-payment-agreement-due-date.js" "${EC2_HOST}:${EC2_BACKEND_PATH}/scripts/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ add-payment-agreement-due-date.js subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error subiendo add-payment-agreement-due-date.js" -ForegroundColor Red
}

scp -i $PEM_PATH ".\scripts\create-client-managements-schema.js" "${EC2_HOST}:${EC2_BACKEND_PATH}/scripts/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ create-client-managements-schema.js subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error subiendo create-client-managements-schema.js" -ForegroundColor Red
}

scp -i $PEM_PATH ".\scripts\sincronizar-gestiones-ec2.js" "${EC2_HOST}:${EC2_BACKEND_PATH}/scripts/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ sincronizar-gestiones-ec2.js subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error subiendo sincronizar-gestiones-ec2.js" -ForegroundColor Red
}

Write-Host ""

# Subir ruta de client-managements
Write-Host "📤 Subiendo ruta de client-managements..." -ForegroundColor Yellow
scp -i $PEM_PATH ".\routes\client-managements.js" "${EC2_HOST}:${EC2_BACKEND_PATH}/routes/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ client-managements.js subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error subiendo client-managements.js" -ForegroundColor Red
}

Write-Host ""

# Subir payment-agreements.js actualizado
Write-Host "📤 Subiendo payment-agreements.js actualizado..." -ForegroundColor Yellow
scp -i $PEM_PATH ".\routes\payment-agreements.js" "${EC2_HOST}:${EC2_BACKEND_PATH}/routes/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ payment-agreements.js subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error subiendo payment-agreements.js" -ForegroundColor Red
}

Write-Host ""

# Subir server.js actualizado
Write-Host "📤 Subiendo server.js actualizado..." -ForegroundColor Yellow
scp -i $PEM_PATH ".\server.js" "${EC2_HOST}:${EC2_BACKEND_PATH}/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ server.js subido" -ForegroundColor Green
} else {
    Write-Host "❌ Error subiendo server.js" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Archivos subidos exitosamente" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos en EC2:" -ForegroundColor Yellow
Write-Host "1. Conecta a EC2:" -ForegroundColor White
Write-Host "   ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ejecuta el script de sincronización:" -ForegroundColor White
Write-Host "   cd ~/kempery-backend" -ForegroundColor Gray
Write-Host "   node scripts/sincronizar-gestiones-ec2.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Reinicia el backend:" -ForegroundColor White
Write-Host "   pm2 restart kempery-backend" -ForegroundColor Gray
Write-Host "   pm2 logs kempery-backend --lines 20" -ForegroundColor Gray
Write-Host ""

