# Script para sincronizar usuarios de desarrollo a producción
# Este script exporta usuarios desde desarrollo y los importa en EC2

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
Write-Host "Sincronización de Usuarios" -ForegroundColor Cyan
Write-Host "Desarrollo -> Producción (EC2)" -ForegroundColor Cyan
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

# Paso 1: Exportar usuarios desde desarrollo
Write-Host "Paso 1: Exportando usuarios desde desarrollo..." -ForegroundColor Yellow
Write-Host ""

$exportScript = Join-Path $BackendDir "scripts\sincronizar-usuarios.js"
if (-not (Test-Path $exportScript)) {
    Write-Host "ERROR: No se encontro el script: $exportScript" -ForegroundColor Red
    exit 1
}

Push-Location $BackendDir
try {
    node scripts/sincronizar-usuarios.js --export
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al exportar usuarios" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host ""

# Paso 2: Subir archivo de exportación a EC2
Write-Host "Paso 2: Subiendo archivo de exportación a EC2..." -ForegroundColor Yellow
Write-Host ""

$exportFile = Join-Path $BackendDir "scripts\usuarios-export.json"
if (-not (Test-Path $exportFile)) {
    Write-Host "ERROR: No se encontro el archivo de exportación: $exportFile" -ForegroundColor Red
    exit 1
}

Write-Host "Subiendo: $exportFile" -ForegroundColor Cyan
scp -i $pemPath $exportFile "ec2-user@${Ec2Ip}:~/kempery-backend/scripts/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al subir el archivo" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivo subido exitosamente" -ForegroundColor Green
Write-Host ""

# Paso 3: Subir script de sincronización a EC2
Write-Host "Paso 3: Subiendo script de sincronización a EC2..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Subiendo: $exportScript" -ForegroundColor Cyan
scp -i $pemPath $exportScript "ec2-user@${Ec2Ip}:~/kempery-backend/scripts/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al subir el script" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Script subido exitosamente" -ForegroundColor Green
Write-Host ""

# Paso 4: Instrucciones para importar en EC2
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Exportación completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos en EC2:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conecta a EC2:" -ForegroundColor White
Write-Host "   ssh -i $PemFile ec2-user@$Ec2Ip" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Importa los usuarios:" -ForegroundColor White
Write-Host "   cd ~/kempery-backend" -ForegroundColor Gray
Write-Host "   node scripts/sincronizar-usuarios.js --import" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verifica los usuarios:" -ForegroundColor White
Write-Host "   node scripts/verificar-usuarios-ec2.js" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Nota: El usuario 'Paola' NO se sincroniza" -ForegroundColor Yellow
Write-Host "   ya que tiene credenciales diferentes en producción." -ForegroundColor Yellow
Write-Host ""

