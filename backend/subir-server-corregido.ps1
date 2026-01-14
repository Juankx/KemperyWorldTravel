# Script para subir server.js corregido a EC2
# Ejecutar desde PowerShell en tu máquina local

param(
    [Parameter(Mandatory=$true)]
    [string]$PemPath,
    
    [Parameter(Mandatory=$false)]
    [string]$Ec2Ip = "3.141.103.248",
    
    [string]$User = "ec2-user"
)

Write-Host "[*] Subiendo server.js corregido a EC2..." -ForegroundColor Cyan

# Verificar que el archivo existe
if (-not (Test-Path ".\server.js")) {
    Write-Host "[ERROR] No se encontro server.js en el directorio actual" -ForegroundColor Red
    Write-Host "Asegurate de estar en la carpeta backend" -ForegroundColor Yellow
    exit 1
}

# Subir archivo
scp -i $PemPath -o StrictHostKeyChecking=no ".\server.js" "$User@${Ec2Ip}:~/kempery-backend/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Archivo subido correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "[*] Ahora conecta a EC2 y reinicia el servidor:" -ForegroundColor Yellow
    Write-Host "  ssh -i $PemPath $User@$Ec2Ip" -ForegroundColor White
    Write-Host ""
    Write-Host "Luego ejecuta:" -ForegroundColor Yellow
    Write-Host "  cd ~/kempery-backend" -ForegroundColor White
    Write-Host "  pm2 restart kempery-backend" -ForegroundColor White
} else {
    Write-Host "[ERROR] Error al subir el archivo" -ForegroundColor Red
    exit 1
}

