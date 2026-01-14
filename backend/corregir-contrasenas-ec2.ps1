# Script para subir y ejecutar el script de corrección de contraseñas en EC2

param(
    [string]$PemFile = "kemperyworldtravel.pem",
    [string]$Ec2Ip = "3.141.103.248"
)

$ErrorActionPreference = "Stop"

# Obtener el directorio del script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = $ScriptDir
$ProjectRoot = Split-Path -Parent $BackendDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Corrección de Contraseñas en EC2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Buscar el archivo PEM
$pemPaths = @(
    (Join-Path $BackendDir $PemFile)
    (Join-Path $ProjectRoot $PemFile)
    $PemFile
)

$pemPath = $null
foreach ($path in $pemPaths) {
    if (Test-Path $path) {
        $pemPath = $path
        break
    }
}

if (-not $pemPath) {
    Write-Host "ERROR: No se encontro el archivo PEM: $PemFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivo PEM encontrado: $pemPath" -ForegroundColor Green
Write-Host ""

# Subir script de corrección
Write-Host "Subiendo script de corrección a EC2..." -ForegroundColor Yellow
Write-Host ""

$correccionScript = Join-Path $BackendDir "scripts\corregir-contrasenas-ec2.js"
if (-not (Test-Path $correccionScript)) {
    Write-Host "ERROR: No se encontro el script: $correccionScript" -ForegroundColor Red
    exit 1
}

Write-Host "Subiendo: $correccionScript" -ForegroundColor Cyan
scp -i $pemPath $correccionScript "ec2-user@${Ec2Ip}:~/kempery-backend/scripts/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al subir el script" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Script subido exitosamente" -ForegroundColor Green
Write-Host ""

# Instrucciones
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Script subido" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos en EC2:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conecta a EC2:" -ForegroundColor White
Write-Host "   ssh -i $PemFile ec2-user@$Ec2Ip" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ejecuta el script de corrección:" -ForegroundColor White
Write-Host "   cd ~/kempery-backend" -ForegroundColor Gray
Write-Host "   node scripts/corregir-contrasenas-ec2.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Reinicia el backend:" -ForegroundColor White
Write-Host "   pm2 restart kempery-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verifica los usuarios:" -ForegroundColor White
Write-Host "   node scripts/verificar-usuarios-ec2.js" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Este script convertirá todas las contraseñas en texto plano" -ForegroundColor Yellow
Write-Host "   a hashes bcrypt con la contraseña: Kempery2025+" -ForegroundColor Yellow
Write-Host ""

