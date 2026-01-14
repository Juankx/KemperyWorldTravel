# Script para subir correcciones de dashboard a EC2

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
Write-Host "Correcciones de Dashboard" -ForegroundColor Cyan
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

# Archivos a subir
$files = @(
    @{
        Local = Join-Path $BackendDir "routes\reports.js"
        Remote = "~/kempery-backend/routes/reports.js"
        Description = "Corrección de queries de reportes (in_collections)"
    },
    @{
        Local = Join-Path $BackendDir "routes\bookings.js"
        Remote = "~/kempery-backend/routes/bookings.js"
        Description = "Corrección de query de bookings (contract_number)"
    },
    @{
        Local = Join-Path $BackendDir "scripts\sincronizar-bookings-esquema-ec2.js"
        Remote = "~/kempery-backend/scripts/sincronizar-bookings-esquema-ec2.js"
        Description = "Script para agregar columnas faltantes en bookings"
    }
)

foreach ($file in $files) {
    if (-not (Test-Path $file.Local)) {
        Write-Host "ERROR: No se encontro el archivo: $($file.Local)" -ForegroundColor Red
        continue
    }

    Write-Host "Subiendo: $($file.Description)..." -ForegroundColor Cyan
    Write-Host "  Local: $($file.Local)" -ForegroundColor Gray
    Write-Host "  Remote: $($file.Remote)" -ForegroundColor Gray

    try {
        scp -i $pemPath $file.Local "ec2-user@${Ec2Ip}:$($file.Remote)"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Subido exitosamente" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Error al subir" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Archivos subidos" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos en EC2:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conecta a EC2:" -ForegroundColor White
Write-Host "   ssh -i $PemFile ec2-user@$Ec2Ip" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Agrega columnas faltantes a bookings:" -ForegroundColor White
Write-Host "   cd ~/kempery-backend" -ForegroundColor Gray
Write-Host "   node scripts/sincronizar-bookings-esquema-ec2.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Reinicia el backend:" -ForegroundColor White
Write-Host "   pm2 restart kempery-backend" -ForegroundColor Gray
Write-Host "   pm2 logs kempery-backend --lines 20" -ForegroundColor Gray
Write-Host ""

