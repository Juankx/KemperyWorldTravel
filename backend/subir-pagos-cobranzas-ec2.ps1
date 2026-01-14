# Script para subir correcciones de pagos y convenios a EC2

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

Write-Host "Subiendo correcciones de pagos y convenios a EC2..." -ForegroundColor Green
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
        Local = Join-Path $BackendDir "routes\payments.js"
        Remote = "~/kempery-backend/routes/payments.js"
        Description = "Ruta de pagos corregida (soporta ambos esquemas, formatea datos y endpoint DELETE con contraseña)"
    },
    @{
        Local = Join-Path $BackendDir "routes\payment-agreements.js"
        Remote = "~/kempery-backend/routes/payment-agreements.js"
        Description = "Ruta de convenios corregida (incluye client_name y endpoint DELETE con contraseña)"
    },
    @{
        Local = Join-Path $BackendDir "routes\client-collections-comments.js"
        Remote = "~/kempery-backend/routes/client-collections-comments.js"
        Description = "Ruta de comentarios de cobranzas (verificación de tabla)"
    },
    @{
        Local = Join-Path $BackendDir "routes\reports.js"
        Remote = "~/kempery-backend/routes/reports.js"
        Description = "Ruta de reportes corregida (incluye pagos sin convenio)"
    },
    @{
        Local = Join-Path $BackendDir "scripts\create-payments-schema.js"
        Remote = "~/kempery-backend/scripts/create-payments-schema.js"
        Description = "Script para crear tablas de pagos y convenios"
    },
    @{
        Local = Join-Path $BackendDir "scripts\sincronizar-pagos-ec2.js"
        Remote = "~/kempery-backend/scripts/sincronizar-pagos-ec2.js"
        Description = "Script de sincronización de pagos para EC2"
    },
    @{
        Local = Join-Path $BackendDir "scripts\create-client-collections-comments-schema.js"
        Remote = "~/kempery-backend/scripts/create-client-collections-comments-schema.js"
        Description = "Script para crear tabla de comentarios de cobranzas"
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
Write-Host "2. Ejecuta el script de sincronización de pagos:" -ForegroundColor White
Write-Host "   cd ~/kempery-backend" -ForegroundColor Gray
Write-Host "   node scripts/sincronizar-pagos-ec2.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Reinicia el backend:" -ForegroundColor White
Write-Host "   pm2 restart kempery-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verifica los logs:" -ForegroundColor White
Write-Host "   pm2 logs kempery-backend --lines 50" -ForegroundColor Gray
Write-Host ""

