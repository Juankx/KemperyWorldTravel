# Script completo para sincronizar base de datos desde desarrollo a producción

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
Write-Host "Sincronización Completa de Base de Datos" -ForegroundColor Cyan
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

# Paso 1: Sincronizar esquema
Write-Host "Paso 1: Sincronizando esquema de base de datos..." -ForegroundColor Yellow
Write-Host ""

$schemaScript = Join-Path $BackendDir "scripts\sincronizar-esquema-ec2.js"
if (-not (Test-Path $schemaScript)) {
    Write-Host "ERROR: No se encontro el script: $schemaScript" -ForegroundColor Red
    exit 1
}

Write-Host "Subiendo script de sincronización de esquema..." -ForegroundColor Cyan
scp -i $pemPath $schemaScript "ec2-user@${Ec2Ip}:~/kempery-backend/scripts/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al subir el script" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Script subido" -ForegroundColor Green
Write-Host ""

# Paso 2: Exportar base de datos desde desarrollo
Write-Host "Paso 2: Exportando base de datos desde desarrollo..." -ForegroundColor Yellow
Write-Host ""

Push-Location $BackendDir
try {
    node scripts/exportar-base-datos.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al exportar base de datos" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host ""

# Paso 3: Subir archivos de exportación a EC2
Write-Host "Paso 3: Subiendo archivos de exportación a EC2..." -ForegroundColor Yellow
Write-Host ""

$exportDir = Join-Path $BackendDir "scripts\database-export"
if (-not (Test-Path $exportDir)) {
    Write-Host "ERROR: No se encontro el directorio de exportación: $exportDir" -ForegroundColor Red
    exit 1
}

Write-Host "Subiendo carpeta database-export..." -ForegroundColor Cyan
scp -i $pemPath -r $exportDir "ec2-user@${Ec2Ip}:~/kempery-backend/scripts/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al subir archivos" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Archivos subidos" -ForegroundColor Green
Write-Host ""

# Paso 4: Subir script de importación
Write-Host "Paso 4: Subiendo script de importación..." -ForegroundColor Yellow
Write-Host ""

$importScript = Join-Path $BackendDir "scripts\importar-base-datos.js"
Write-Host "Subiendo: $importScript" -ForegroundColor Cyan
scp -i $pemPath $importScript "ec2-user@${Ec2Ip}:~/kempery-backend/scripts/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al subir el script" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Script subido" -ForegroundColor Green
Write-Host ""

# Instrucciones finales
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Preparación completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos en EC2:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conecta a EC2:" -ForegroundColor White
Write-Host "   ssh -i $PemFile ec2-user@$Ec2Ip" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Sincroniza el esquema:" -ForegroundColor White
Write-Host "   cd ~/kempery-backend" -ForegroundColor Gray
Write-Host "   node scripts/sincronizar-esquema-ec2.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Importa los datos:" -ForegroundColor White
Write-Host "   node scripts/importar-base-datos.js" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Reinicia el backend:" -ForegroundColor White
Write-Host "   pm2 restart kempery-backend" -ForegroundColor Gray
Write-Host "   pm2 logs kempery-backend --lines 20" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Nota: Los usuarios se importarán excepto 'Paola'" -ForegroundColor Yellow
Write-Host "   que tiene credenciales diferentes en producción." -ForegroundColor Yellow
Write-Host ""

