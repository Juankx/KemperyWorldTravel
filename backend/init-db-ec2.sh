#!/bin/bash
# Script para inicializar la base de datos en EC2
# Ejecutar en EC2: bash init-db-ec2.sh

set -e

echo "=== Inicializando base de datos en EC2 ==="

# Instalar extensión uuid-ossp
echo "[*] Instalando extension uuid-ossp..."
sudo dnf install -y postgresql15-contrib

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Crear extensión en la base de datos
echo "[*] Creando extension uuid-ossp en la base de datos..."
PGPASSWORD='Princonserkids2025+' psql -U postgres -d kempery_travel -h localhost <<EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
EOF

echo "[OK] Extension uuid-ossp creada"

# Ejecutar schema
echo "[*] Ejecutando schema SQL..."
cd ~/kempery-backend
PGPASSWORD='Princonserkids2025+' psql -U postgres -d kempery_travel -h localhost -f config/schema.sql

echo "[OK] Schema ejecutado correctamente"

# Verificar tablas creadas
echo "[*] Verificando tablas creadas..."
PGPASSWORD='Princonserkids2025+' psql -U postgres -d kempery_travel -h localhost -c "\dt"

echo ""
echo "=== Base de datos inicializada correctamente ==="

