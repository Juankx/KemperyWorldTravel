# Script para subir script de agregar columna years y script de importación actualizado a EC2

param(
    [string]$PemFile = "kemperyworldtravel.pem",
    [string]$Ec2Ip = "3.141.103.248",
    [string]$User = "ec2-user"
)

$ErrorActionPreference = "Stop"

# Obtener el directorio del script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = $ScriptDir
$ProjectRoot = Split-Path -Parent $BackendDir

Write-Host "Subiendo scripts para agregar columna years a EC2..." -ForegroundColor Green
Write-Host ""

# Buscar el archivo PEM en varias ubicaciones posibles
$pemPaths = @(
    (Join-Path $BackendDir $PemFile),
    (Join-Path $ProjectRoot $PemFile),
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
    Write-Host "Ubicaciones buscadas:" -ForegroundColor Yellow
    foreach ($path in $pemPaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    exit 1
}

Write-Host "✅ Archivo PEM encontrado: $pemPath" -ForegroundColor Green
Write-Host ""

# Archivos a subir
$files = @(
    @{
        Local = Join-Path $BackendDir "scripts\add-years-column.js"
        Remote = "~/kempery-backend/scripts/add-years-column.js"
        Description = "Script para agregar columna years a la tabla clients"
    },
    @{
        Local = Join-Path $BackendDir "scripts\import-new-clients-csv.js"
        Remote = "~/kempery-backend/scripts/import-new-clients-csv.js"
        Description = "Script de importación actualizado (incluye campo years)"
    },
    @{
        Local = Join-Path $BackendDir "routes\clients.js"
        Remote = "~/kempery-backend/routes/clients.js"
        Description = "Ruta de clients actualizada (incluye campo years en query)"
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
        scp -i $pemPath $file.Local "${User}@${Ec2Ip}:$($file.Remote)"
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
Write-Host "Archivos subidos. Próximos pasos:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Conecta a EC2:" -ForegroundColor White
Write-Host "   ssh -i $pemPath ${User}@${Ec2Ip}" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ejecuta el script para agregar la columna years:" -ForegroundColor White
Write-Host "   cd ~/kempery-backend" -ForegroundColor Gray
Write-Host "   node scripts/add-years-column.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. (Opcional) Si tienes el CSV en EC2, ejecuta la importación:" -ForegroundColor White
Write-Host "   node scripts/import-new-clients-csv.js" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Reinicia el backend:" -ForegroundColor White
Write-Host "   pm2 restart kempery-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Verifica los logs:" -ForegroundColor White
Write-Host "   pm2 logs kempery-backend --lines 50" -ForegroundColor Gray
Write-Host ""

