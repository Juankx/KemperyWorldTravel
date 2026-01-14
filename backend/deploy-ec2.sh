#!/bin/bash
# Script de despliegue para EC2 - Kempery World Travel Backend
# Uso: ./deploy-ec2.sh -pem-path /ruta/a/kemperyworldtravel.pem

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Valores por defecto
PEM_PATH=""
EC2_IP="3.141.103.248"
USER="ubuntu"
BACKEND_PATH="./backend"

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -pem-path|--pem-path)
            PEM_PATH="$2"
            shift 2
            ;;
        -ec2-ip|--ec2-ip)
            EC2_IP="$2"
            shift 2
            ;;
        -user|--user)
            USER="$2"
            shift 2
            ;;
        -backend-path|--backend-path)
            BACKEND_PATH="$2"
            shift 2
            ;;
        *)
            echo "Opción desconocida: $1"
            exit 1
            ;;
    esac
done

# Validar que se proporcionó el archivo PEM
if [ -z "$PEM_PATH" ]; then
    echo -e "${RED}❌ Error: Debes proporcionar la ruta al archivo PEM${NC}"
    echo "Uso: $0 -pem-path /ruta/a/kemperyworldtravel.pem"
    exit 1
fi

# Validar que el archivo PEM existe
if [ ! -f "$PEM_PATH" ]; then
    echo -e "${RED}❌ Error: No se encontró el archivo PEM en: $PEM_PATH${NC}"
    exit 1
fi

# Validar que la carpeta backend existe
if [ ! -d "$BACKEND_PATH" ]; then
    echo -e "${RED}❌ Error: No se encontró la carpeta backend en: $BACKEND_PATH${NC}"
    exit 1
fi

# Configurar permisos del archivo PEM
chmod 400 "$PEM_PATH"

echo -e "${GREEN}🚀 Iniciando despliegue a EC2...${NC}"
echo -e "${CYAN}📍 IP: $EC2_IP${NC}"
echo -e "${CYAN}👤 Usuario: $USER${NC}"
echo -e "${CYAN}📁 Ruta PEM: $PEM_PATH${NC}"

# Crear script de configuración del servidor
SETUP_SCRIPT=$(cat <<'EOF'
#!/bin/bash
set -e

echo "🔧 Configurando servidor EC2..."

# Actualizar sistema
sudo apt-get update -y

# Instalar Node.js 18.x si no está instalado
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Instalar PostgreSQL si no está instalado
if ! command -v psql &> /dev/null; then
    echo "📦 Instalando PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Instalar LibreOffice si no está instalado
if ! command -v libreoffice &> /dev/null; then
    echo "📦 Instalando LibreOffice..."
    sudo apt-get install -y libreoffice
fi

# Instalar PM2 globalmente si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# Instalar build-essential para compilar módulos nativos
sudo apt-get install -y build-essential

echo "✅ Configuración del servidor completada"
EOF
)

# Subir y ejecutar script de configuración
echo -e "${YELLOW}📤 Subiendo script de configuración...${NC}"
echo "$SETUP_SCRIPT" | ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$USER@$EC2_IP" "cat > /tmp/ec2-setup.sh && chmod +x /tmp/ec2-setup.sh && bash /tmp/ec2-setup.sh"

# Crear directorio en EC2
echo -e "${CYAN}📁 Creando directorio en EC2...${NC}"
ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$USER@$EC2_IP" "mkdir -p ~/kempery-backend"

# Subir archivos del backend
echo -e "${YELLOW}📤 Subiendo código del backend...${NC}"
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '*.log' --exclude 'generated-documents/*' \
    -e "ssh -i $PEM_PATH -o StrictHostKeyChecking=no" \
    "$BACKEND_PATH/" "$USER@$EC2_IP:~/kempery-backend/"

# Crear script de instalación
INSTALL_SCRIPT=$(cat <<'EOF'
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
EOF
)

# Subir y ejecutar script de instalación
echo -e "${YELLOW}📦 Instalando dependencias en EC2...${NC}"
echo "$INSTALL_SCRIPT" | ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$USER@$EC2_IP" "cat > /tmp/ec2-install.sh && chmod +x /tmp/ec2-install.sh && bash /tmp/ec2-install.sh"

# Crear script PM2
PM2_SCRIPT=$(cat <<'EOF'
#!/bin/bash
cd ~/kempery-backend

# Detener instancia anterior si existe
pm2 stop kempery-backend 2>/dev/null || true
pm2 delete kempery-backend 2>/dev/null || true

# Iniciar nueva instancia
pm2 start server.js --name kempery-backend
pm2 save
pm2 startup

echo "✅ Servidor iniciado con PM2"
echo "📊 Para ver logs: pm2 logs kempery-backend"
echo "📊 Para ver estado: pm2 status"
EOF
)

# Subir y ejecutar script PM2
echo -e "${YELLOW}🚀 Iniciando servidor con PM2...${NC}"
echo "$PM2_SCRIPT" | ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$USER@$EC2_IP" "cat > /tmp/ec2-pm2.sh && chmod +x /tmp/ec2-pm2.sh && bash /tmp/ec2-pm2.sh"

echo -e "${GREEN}✅ Despliegue completado!${NC}"
echo -e "${CYAN}🌐 Servidor disponible en: http://$EC2_IP:5000${NC}"
echo -e "${CYAN}📊 Health check: http://$EC2_IP:5000/api/health${NC}"
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo "1. Configurar Security Group en AWS para permitir tráfico en puerto 5000"
echo "2. Editar ~/kempery-backend/.env con las credenciales de producción"
echo "3. Configurar base de datos PostgreSQL en EC2"
echo "4. Verificar logs: ssh -i $PEM_PATH $USER@$EC2_IP 'pm2 logs kempery-backend'"

