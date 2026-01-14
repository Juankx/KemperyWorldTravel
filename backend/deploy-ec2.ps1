# Script de despliegue para EC2 - Kempery World Travel Backend
# Uso: .\deploy-ec2.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$PemPath,
    
    [Parameter(Mandatory=$false)]
    [string]$Ec2Ip = "3.141.103.248",
    
    [string]$User = "ubuntu",
    [string]$BackendPath = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

Write-Host "[*] Iniciando despliegue a EC2..." -ForegroundColor Green
Write-Host "[*] IP: $Ec2Ip" -ForegroundColor Cyan
Write-Host "[*] Usuario: $User" -ForegroundColor Cyan
Write-Host "[*] Ruta PEM: $PemPath" -ForegroundColor Cyan

# Verificar que el archivo PEM existe
if (-not (Test-Path $PemPath)) {
    Write-Host "[ERROR] No se encontro el archivo PEM en: $PemPath" -ForegroundColor Red
    exit 1
}

# Corregir permisos del archivo PEM (requerido por SSH)
Write-Host "[*] Corrigiendo permisos del archivo PEM..." -ForegroundColor Cyan
try {
    # Remover todos los permisos excepto del propietario
    $null = icacls $PemPath /inheritance:r 2>&1
    # Otorgar solo lectura al usuario actual
    $grantCmd = "$env:USERNAME`:(R)"
    $null = icacls $PemPath /grant:r $grantCmd 2>&1
    Write-Host "[OK] Permisos del archivo PEM corregidos" -ForegroundColor Green
} catch {
    Write-Host "[ADVERTENCIA] No se pudieron corregir los permisos automaticamente. Ejecuta manualmente:" -ForegroundColor Yellow
    Write-Host "  icacls `"$PemPath`" /inheritance:r" -ForegroundColor Yellow
    $grantExample = "$env:USERNAME`:(R)"
    Write-Host "  icacls `"$PemPath`" /grant:r $grantExample" -ForegroundColor Yellow
}

# Verificar conexión SSH antes de continuar
Write-Host "[*] Verificando conexion SSH..." -ForegroundColor Cyan
$null = ssh -i $PemPath -o StrictHostKeyChecking=no -o ConnectTimeout=5 $User@$Ec2Ip "echo 'Conexion exitosa'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] No se pudo conectar a EC2. Posibles causas:" -ForegroundColor Red
    Write-Host "  1. El archivo PEM no corresponde a esta instancia EC2" -ForegroundColor Yellow
    Write-Host "  2. El usuario no es '$User'. Prueba con: ec2-user, admin, o root" -ForegroundColor Yellow
    Write-Host "  3. La clave publica no esta configurada en el servidor EC2" -ForegroundColor Yellow
    Write-Host "  4. El Security Group no permite conexiones SSH desde tu IP" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para diagnosticar, prueba manualmente:" -ForegroundColor Cyan
    Write-Host "  ssh -i `"$PemPath`" $User@$Ec2Ip" -ForegroundColor White
    Write-Host ""
    Write-Host "Si el usuario es diferente, usa el parametro -User:" -ForegroundColor Cyan
    Write-Host "  .\deploy-ec2.ps1 -PemPath `"$PemPath`" -Ec2Ip `"$Ec2Ip`" -User ec2-user" -ForegroundColor White
    exit 1
} else {
    Write-Host "[OK] Conexion SSH verificada" -ForegroundColor Green
}

# Verificar que la carpeta backend existe
if (-not (Test-Path $BackendPath)) {
    Write-Host "[ERROR] No se encontro la carpeta backend en: $BackendPath" -ForegroundColor Red
    exit 1
}

# Crear archivo temporal con comandos de configuración (Amazon Linux usa yum)
$setupScript = @"
#!/bin/bash
set -e

echo "Configurando servidor EC2 (Amazon Linux)..."

# Actualizar sistema
sudo yum update -y

# Instalar Node.js 18.x si no está instalado
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Instalar PostgreSQL si no está instalado
if ! command -v psql &> /dev/null; then
    echo "Instalando PostgreSQL..."
    # Amazon Linux 2023 usa dnf directamente
    sudo dnf install -y postgresql15-server postgresql15
    sudo postgresql-setup --initdb
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Instalar LibreOffice si no está instalado
if ! command -v libreoffice &> /dev/null; then
    echo "Instalando LibreOffice..."
    sudo yum install -y libreoffice
fi

# Instalar PM2 globalmente si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    sudo npm install -g pm2
fi

# Instalar herramientas de compilación para módulos nativos
sudo yum groupinstall -y "Development Tools"
sudo yum install -y gcc-c++ make

echo "Configuracion del servidor completada"
"@

# Guardar script de configuración temporalmente (con terminadores de línea Unix)
$setupScriptPath = "$env:TEMP\ec2-setup.sh"
# Convertir terminadores de línea a Unix (LF) y guardar
$setupScript -replace "`r`n", "`n" | Out-File -FilePath $setupScriptPath -Encoding ASCII -NoNewline
# Agregar nueva línea final
Add-Content -Path $setupScriptPath -Value "`n" -NoNewline

Write-Host "`n[*] Subiendo archivos a EC2..." -ForegroundColor Yellow

# Crear directorio en EC2 si no existe
Write-Host "[*] Creando directorio en EC2..." -ForegroundColor Cyan
ssh -i $PemPath -o StrictHostKeyChecking=no $User@$Ec2Ip "mkdir -p ~/kempery-backend"

# Subir script de configuración
Write-Host "[*] Subiendo script de configuracion..." -ForegroundColor Cyan
scp -i $PemPath -o StrictHostKeyChecking=no $setupScriptPath "$User@${Ec2Ip}:~/ec2-setup.sh"

# Ejecutar script de configuración
Write-Host "[*] Ejecutando configuracion del servidor..." -ForegroundColor Yellow
ssh -i $PemPath -o StrictHostKeyChecking=no $User@$Ec2Ip "chmod +x ~/ec2-setup.sh && bash ~/ec2-setup.sh"

# Crear .gitignore para excluir archivos sensibles y node_modules
$gitignoreContent = @"
node_modules/
.env
config.env
*.log
generated-documents/*
!generated-documents/.gitkeep
.DS_Store
"@

# Crear .gitignore temporal
$gitignorePath = "$env:TEMP\.gitignore-backend"
$gitignoreContent | Out-File -FilePath $gitignorePath -Encoding UTF8

# Subir archivos del backend (excluyendo node_modules y archivos sensibles)
Write-Host "[*] Subiendo codigo del backend..." -ForegroundColor Yellow

# Usar SCP para subir archivos (más simple y confiable en Windows)
Write-Host "[*] Subiendo archivos con SCP..." -ForegroundColor Cyan

# Subir archivos principales primero
$filesToUpload = @(
    "server.js",
    "package.json",
    "package-lock.json",
    "config.env",
    "env.example",
    ".env.production.example"
)

foreach ($file in $filesToUpload) {
    $filePath = Join-Path $BackendPath $file
    if (Test-Path $filePath) {
        scp -i $PemPath -o StrictHostKeyChecking=no $filePath "$User@${Ec2Ip}:~/kempery-backend/"
    }
}

# Subir directorios necesarios
$directoriesToUpload = @(
    "routes",
    "services",
    "middleware",
    "config",
    "utils",
    "templates",
    "scripts"
)

foreach ($dir in $directoriesToUpload) {
    $dirPath = Join-Path $BackendPath $dir
    if (Test-Path $dirPath) {
        Write-Host "[*] Subiendo directorio: $dir" -ForegroundColor Cyan
        scp -i $PemPath -o StrictHostKeyChecking=no -r "$dirPath" "$User@${Ec2Ip}:~/kempery-backend/"
    }
}

# Crear directorio generated-documents en EC2
ssh -i $PemPath -o StrictHostKeyChecking=no $User@$Ec2Ip "mkdir -p ~/kempery-backend/generated-documents"

# Crear script de instalación y configuración
$installScript = @"
#!/bin/bash
set -e

cd ~/kempery-backend

echo "📦 Instalando dependencias de Node.js..."
npm install --production

echo "📝 Configurando variables de entorno..."
# El archivo .env se debe crear manualmente con las credenciales correctas
if [ ! -f .env ]; then
    echo "⚠️  Archivo .env no encontrado. Creando desde config.env..."
    if [ -f config.env ]; then
        cp config.env .env
        echo "✅ Archivo .env creado desde config.env"
        echo "⚠️  IMPORTANTE: Edita el archivo .env con las credenciales de producción"
    else
        echo "❌ Error: No se encontró config.env"
        exit 1
    fi
fi

echo "📁 Creando directorio para documentos generados..."
mkdir -p generated-documents

echo "✅ Instalación completada"
"@

$installScriptPath = "$env:TEMP\ec2-install.sh"
# Convertir terminadores de línea a Unix (LF) y guardar
$installScript -replace "`r`n", "`n" | Out-File -FilePath $installScriptPath -Encoding ASCII -NoNewline
Add-Content -Path $installScriptPath -Value "`n" -NoNewline
scp -i $PemPath -o StrictHostKeyChecking=no $installScriptPath "$User@${Ec2Ip}:~/ec2-install.sh"

# Ejecutar script de instalación
Write-Host "[*] Instalando dependencias en EC2..." -ForegroundColor Yellow
ssh -i $PemPath -o StrictHostKeyChecking=no $User@$Ec2Ip "chmod +x ~/ec2-install.sh && bash ~/ec2-install.sh"

# Crear script PM2 para iniciar el servidor
$pm2Script = @"
#!/bin/bash
cd ~/kempery-backend

# Detener instancia anterior si existe
pm2 stop kempery-backend 2>/dev/null || true
pm2 delete kempery-backend 2>/dev/null || true

# Iniciar nueva instancia
pm2 start server.js --name kempery-backend
pm2 save
pm2 startup

echo "Servidor iniciado con PM2"
echo "Para ver logs: pm2 logs kempery-backend"
echo "Para ver estado: pm2 status"
"@

$pm2ScriptPath = "$env:TEMP\ec2-pm2.sh"
# Convertir terminadores de línea a Unix (LF) y guardar
$pm2Script -replace "`r`n", "`n" | Out-File -FilePath $pm2ScriptPath -Encoding ASCII -NoNewline
Add-Content -Path $pm2ScriptPath -Value "`n" -NoNewline
scp -i $PemPath -o StrictHostKeyChecking=no $pm2ScriptPath "$User@${Ec2Ip}:~/ec2-pm2.sh"

# Ejecutar script PM2
Write-Host "[*] Iniciando servidor con PM2..." -ForegroundColor Yellow
ssh -i $PemPath -o StrictHostKeyChecking=no $User@$Ec2Ip "chmod +x ~/ec2-pm2.sh && bash ~/ec2-pm2.sh"

# Limpiar archivos temporales
Remove-Item $setupScriptPath -ErrorAction SilentlyContinue
Remove-Item $installScriptPath -ErrorAction SilentlyContinue
Remove-Item $pm2ScriptPath -ErrorAction SilentlyContinue
Remove-Item $gitignorePath -ErrorAction SilentlyContinue

Write-Host "`n[OK] Despliegue completado!" -ForegroundColor Green
Write-Host "[*] Servidor disponible en: http://${Ec2Ip}:5000" -ForegroundColor Cyan
Write-Host "[*] Health check: http://${Ec2Ip}:5000/api/health" -ForegroundColor Cyan
Write-Host "`n[*] Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Configurar Security Group en AWS para permitir tráfico en puerto 5000" -ForegroundColor White
Write-Host "2. Editar ~/kempery-backend/.env con las credenciales de producción" -ForegroundColor White
Write-Host "3. Configurar base de datos PostgreSQL en EC2" -ForegroundColor White
$logCommand = "ssh -i $PemPath $User@$Ec2Ip pm2 logs kempery-backend"
Write-Host "4. Verificar logs: $logCommand" -ForegroundColor White

