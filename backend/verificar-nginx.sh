#!/bin/bash
# Script para verificar que Nginx y el backend están funcionando correctamente

echo "=========================================="
echo "Verificación de Nginx y Backend"
echo "=========================================="
echo ""

# 1. Verificar que Nginx está corriendo
echo "1. Verificando estado de Nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está corriendo"
    systemctl status nginx --no-pager -l | head -n 5
else
    echo "❌ Nginx NO está corriendo"
    exit 1
fi

echo ""

# 2. Verificar que el backend está corriendo
echo "2. Verificando que el backend está corriendo..."
if pm2 list | grep -q "kempery-backend.*online"; then
    echo "✅ Backend está corriendo en PM2"
    pm2 list | grep kempery-backend
else
    echo "⚠️  Backend no encontrado en PM2. Verificando puerto 5000..."
    if netstat -tuln | grep -q ":5000"; then
        echo "✅ Algo está escuchando en el puerto 5000"
    else
        echo "❌ Nada está escuchando en el puerto 5000"
    fi
fi

echo ""

# 3. Verificar que Nginx puede acceder al backend
echo "3. Verificando conexión Nginx -> Backend..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Nginx puede acceder al backend en localhost:5000"
    curl -s http://localhost:5000/api/health | head -n 3
else
    echo "❌ Nginx NO puede acceder al backend"
    exit 1
fi

echo ""

# 4. Verificar que Nginx responde desde el exterior
echo "4. Verificando que Nginx responde desde el exterior..."
EXTERNAL_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "   IP pública: $EXTERNAL_IP"

if curl -s -o /dev/null -w "%{http_code}" http://$EXTERNAL_IP/api/health | grep -q "200"; then
    echo "✅ Nginx responde correctamente desde el exterior"
    echo "   Respuesta:"
    curl -s http://$EXTERNAL_IP/api/health | head -n 3
else
    echo "⚠️  Nginx no responde desde el exterior"
    echo "   Verifica el Security Group de EC2 (puerto 80 debe estar abierto)"
fi

echo ""

# 5. Verificar configuración de Nginx
echo "5. Verificando configuración de Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Configuración de Nginx es válida"
else
    echo "❌ Error en la configuración de Nginx:"
    nginx -t
    exit 1
fi

echo ""

# 6. Verificar que el puerto 80 está abierto
echo "6. Verificando puerto 80..."
if netstat -tuln | grep -q ":80"; then
    echo "✅ Nginx está escuchando en el puerto 80"
else
    echo "❌ Nginx NO está escuchando en el puerto 80"
fi

echo ""

# 7. Resumen
echo "=========================================="
echo "RESUMEN"
echo "=========================================="
echo ""
echo "✅ Nginx: $(systemctl is-active nginx)"
echo "✅ Backend: $(pm2 list | grep kempery-backend | awk '{print $10}' || echo 'Verificar manualmente')"
echo "✅ Configuración: Válida"
echo ""
echo "PRÓXIMOS PASOS:"
echo "1. Crea un registro A en Route 53: api.kemperyworldtravel.com -> $EXTERNAL_IP"
echo "2. Espera 5-10 minutos para que el DNS se propague"
echo "3. Verifica DNS: nslookup api.kemperyworldtravel.com"
echo "4. Ejecuta: sudo certbot --nginx -d api.kemperyworldtravel.com"
echo "5. Actualiza frontend/.env.production: VITE_API_URL=https://api.kemperyworldtravel.com/api"
echo ""

