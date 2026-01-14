#!/bin/bash
# Script para actualizar el .env en EC2 con la configuración de producción
# Ejecutar en EC2: bash ACTUALIZAR_ENV_EC2.sh

set -e

echo "=== Actualizando configuración de producción en EC2 ==="

cd ~/kempery-backend

# Crear backup del .env actual
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "[OK] Backup del .env creado"
fi

# Crear/actualizar .env con configuración de producción
cat > .env <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kempery_travel
DB_USER=postgres
DB_PASSWORD=Princonserkids2025+

# JWT Configuration
JWT_SECRET=kempery_world_travel_super_secret_key_2025
JWT_EXPIRES_IN=1h

# Server Configuration
PORT=5000
NODE_ENV=production
HOST=0.0.0.0

# CORS Configuration
# Permitir conexiones desde el frontend en S3
FRONTEND_URL=https://kemperyworldtravel.com

# AWS S3 Configuration (opcional - para almacenar documentos)
# Descomenta y configura si quieres usar S3 para documentos:
# AWS_ACCESS_KEY_ID=tu_access_key_id
# AWS_SECRET_ACCESS_KEY=tu_secret_access_key
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=kemperyworldtravel.com
EOF

echo "[OK] Archivo .env actualizado"
echo ""
echo "=== Configuración aplicada ==="
echo ""
echo "Variables configuradas:"
echo "  - DB_HOST: localhost"
echo "  - DB_NAME: kempery_travel"
echo "  - PORT: 5000"
echo "  - NODE_ENV: production"
echo "  - HOST: 0.0.0.0"
echo "  - FRONTEND_URL: https://kemperyworldtravel.com"
echo ""
echo "Para aplicar los cambios, reinicia el servidor:"
echo "  pm2 restart kempery-backend"
echo "  pm2 logs kempery-backend"

