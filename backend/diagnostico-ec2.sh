#!/bin/bash
# Script de diagnóstico para EC2
# Ejecutar en EC2: bash diagnostico-ec2.sh

echo "=== DIAGNOSTICO DEL SERVIDOR EC2 ==="
echo ""

# Verificar si PM2 está instalado
echo "[*] Verificando PM2..."
if command -v pm2 &> /dev/null; then
    echo "[OK] PM2 esta instalado"
    pm2 --version
else
    echo "[ERROR] PM2 no esta instalado"
    echo "Instalando PM2..."
    sudo npm install -g pm2
fi
echo ""

# Verificar estado del servidor
echo "[*] Estado del servidor con PM2:"
pm2 status
echo ""

# Verificar si el servidor está escuchando en el puerto 5000
echo "[*] Verificando puerto 5000:"
if sudo netstat -tulpn | grep -q ":5000"; then
    echo "[OK] Puerto 5000 esta en uso"
    sudo netstat -tulpn | grep ":5000"
else
    echo "[ERROR] Puerto 5000 no esta en uso"
fi
echo ""

# Verificar logs del servidor
echo "[*] Ultimas 20 lineas de logs:"
pm2 logs kempery-backend --lines 20 --nostream
echo ""

# Verificar que Node.js está instalado
echo "[*] Verificando Node.js:"
if command -v node &> /dev/null; then
    echo "[OK] Node.js esta instalado"
    node --version
    npm --version
else
    echo "[ERROR] Node.js no esta instalado"
fi
echo ""

# Verificar PostgreSQL
echo "[*] Verificando PostgreSQL:"
if command -v psql &> /dev/null; then
    echo "[OK] PostgreSQL esta instalado"
    psql --version
    sudo systemctl status postgresql --no-pager | head -5
else
    echo "[ADVERTENCIA] PostgreSQL no esta instalado"
fi
echo ""

# Verificar archivo .env
echo "[*] Verificando archivo .env:"
if [ -f ~/kempery-backend/.env ]; then
    echo "[OK] Archivo .env existe"
    echo "Variables configuradas:"
    grep -E "^(DB_|PORT=|NODE_ENV=)" ~/kempery-backend/.env | sed 's/=.*/=***/' 
else
    echo "[ERROR] Archivo .env no existe"
fi
echo ""

# Verificar firewall
echo "[*] Verificando firewall:"
if command -v firewall-cmd &> /dev/null; then
    echo "Estado del firewall:"
    sudo firewall-cmd --list-all
elif command -v ufw &> /dev/null; then
    echo "Estado del firewall:"
    sudo ufw status
else
    echo "[INFO] No se encontro firewall configurado"
fi
echo ""

# Intentar iniciar el servidor si no está corriendo
if ! pm2 list | grep -q "kempery-backend.*online"; then
    echo "[*] El servidor no esta corriendo. Intentando iniciar..."
    cd ~/kempery-backend
    pm2 start server.js --name kempery-backend
    sleep 3
    pm2 status
fi

echo ""
echo "=== FIN DEL DIAGNOSTICO ==="

