#!/bin/bash
# Script para configurar PostgreSQL en EC2
# Ejecutar en EC2: bash fix-postgres-ec2.sh

set -e

echo "=== Configurando PostgreSQL en EC2 ==="

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

# Asegurar que PostgreSQL está corriendo
echo "[*] Iniciando PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql --no-pager | head -5

# Configurar autenticación de PostgreSQL
echo "[*] Configurando autenticacion de PostgreSQL..."

# Editar pg_hba.conf para permitir conexiones con contraseña
sudo sed -i 's/^host.*all.*all.*127.0.0.1\/32.*ident$/host    all             all             127.0.0.1\/32            scram-sha-256/' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/^host.*all.*all.*::1\/128.*ident$/host    all             all             ::1\/128                 scram-sha-256/' /var/lib/pgsql/data/pg_hba.conf

# Reiniciar PostgreSQL para aplicar cambios
sudo systemctl restart postgresql

# Crear base de datos y usuario
echo "[*] Creando base de datos y usuario..."
sudo -u postgres psql <<EOF
-- Crear base de datos si no existe
SELECT 'CREATE DATABASE kempery_travel'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kempery_travel')\gexec

-- Crear usuario si no existe
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'postgres') THEN
        CREATE USER postgres WITH PASSWORD 'Princonserkids2025+';
    ELSE
        ALTER USER postgres WITH PASSWORD 'Princonserkids2025+';
    END IF;
END
\$\$;

-- Otorgar permisos
ALTER USER postgres CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE kempery_travel TO postgres;

-- Conectar a la base de datos y otorgar permisos en el esquema
\c kempery_travel
GRANT ALL ON SCHEMA public TO postgres;
EOF

echo "[OK] Base de datos configurada"

# Verificar conexión
echo "[*] Verificando conexion..."
PGPASSWORD='Princonserkids2025+' psql -U postgres -d kempery_travel -h localhost -c "SELECT version();" || {
    echo "[ERROR] No se pudo conectar a la base de datos"
    echo "Verifica las credenciales en ~/kempery-backend/.env"
    exit 1
}

echo "[OK] Conexion a PostgreSQL verificada"
echo ""
echo "=== Configuracion completada ==="

