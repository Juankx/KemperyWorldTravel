# Script para subir archivos de autenticación corregidos a EC2

param(
    [string]$PemFile = "kemperyworldtravel.pem",
    [string]$Ec2Ip = "3.141.103.248"
)

$ErrorActionPreference = "Stop"

# Obtener el directorio del script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = $ScriptDir
$ProjectRoot = Split-Path -Parent $BackendDir

Write-Host "Subiendo archivos corregidos a EC2..." -ForegroundColor Green
Write-Host ""

# Buscar el archivo PEM en varias ubicaciones posibles
$pemPaths = @(
    Join-Path $BackendDir $PemFile,  # backend/kemperyworldtravel.pem
    Join-Path $ProjectRoot $PemFile, # raíz/kemperyworldtravel.pem
    $PemFile                          # Ruta absoluta o relativa
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
    Write-Host ""
    Write-Host "Por favor, especifica la ruta correcta del archivo PEM" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo PEM encontrado: $pemPath" -ForegroundColor Green
Write-Host ""

# Archivos a subir
$files = @(
    @{
        Local = Join-Path $BackendDir "routes\auth.js"
        Remote = "~/kempery-backend/routes/auth.js"
        Description = "Código de autenticación corregido"
    },
    @{
        Local = Join-Path $BackendDir "scripts\verificar-usuarios-ec2.js"
        Remote = "~/kempery-backend/scripts/verificar-usuarios-ec2.js"
        Description = "Script de verificación de usuarios"
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
Write-Host "Archivos subidos. Próximos pasos:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Conecta a EC2:" -ForegroundColor White
Write-Host "   ssh -i $PemFile ec2-user@$Ec2Ip" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verifica usuarios existentes:" -ForegroundColor White
Write-Host "   cd ~/kempery-backend" -ForegroundColor Gray
Write-Host "   node scripts/verificar-usuarios-ec2.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Crea el usuario Paola si no existe:" -ForegroundColor White
Write-Host "   node scripts/verificar-usuarios-ec2.js --crear-paola" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Reinicia el backend:" -ForegroundColor White
Write-Host "   pm2 restart kempery-backend" -ForegroundColor Gray
Write-Host "   pm2 logs kempery-backend --lines 20" -ForegroundColor Gray
Write-Host ""

