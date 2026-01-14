#!/bin/bash
# Script para completar la configuración en EC2 después del despliegue
# Ejecutar en EC2: bash fix-ec2-deployment.sh

set -e

echo "=== Completando configuracion del servidor EC2 ==="

# Instalar PostgreSQL si no está instalado
if ! command -v psql &> /dev/null; then
    echo "[*] Instalando PostgreSQL..."
    sudo dnf install -y postgresql15-server postgresql15
    sudo postgresql-setup --initdb
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    echo "[OK] PostgreSQL instalado"
else
    echo "[OK] PostgreSQL ya esta instalado"
fi

# Instalar LibreOffice si no está instalado
if ! command -v libreoffice &> /dev/null; then
    echo "[*] Instalando LibreOffice..."
    sudo dnf install -y libreoffice
    echo "[OK] LibreOffice instalado"
else
    echo "[OK] LibreOffice ya esta instalado"
fi

# Instalar PM2 globalmente si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "[*] Instalando PM2..."
    sudo npm install -g pm2
    echo "[OK] PM2 instalado"
else
    echo "[OK] PM2 ya esta instalado"
fi

# Configurar PostgreSQL
echo "[*] Configurando PostgreSQL..."
cd ~/kempery-backend

# Crear base de datos y usuario si no existen
sudo -u postgres psql <<EOF || true
CREATE DATABASE kempery_travel;
CREATE USER postgres WITH PASSWORD 'Princonserkids2025+';
ALTER USER postgres CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE kempery_travel TO postgres;
\q
EOF

echo "[OK] PostgreSQL configurado"

# Iniciar servidor con PM2
echo "[*] Iniciando servidor con PM2..."
cd ~/kempery-backend

# Detener instancia anterior si existe
pm2 stop kempery-backend 2>/dev/null || true
pm2 delete kempery-backend 2>/dev/null || true

# Iniciar nueva instancia
pm2 start server.js --name kempery-backend
pm2 save
pm2 startup

echo "[OK] Servidor iniciado con PM2"
echo ""
echo "=== Configuracion completada ==="
echo "[*] Para ver logs: pm2 logs kempery-backend"
echo "[*] Para ver estado: pm2 status"
echo "[*] Para reiniciar: pm2 restart kempery-backend"

