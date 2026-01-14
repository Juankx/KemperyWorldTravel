#!/bin/bash
# Script para corregir la configuración de Nginx

echo "Corrigiendo configuración de Nginx..."

# Crear configuración corregida (solo HTTP, Certbot agregará SSL)
cat > /etc/nginx/conf.d/kempery-backend.conf << 'EOF'
# Upstream para el backend Node.js
upstream kempery_backend {
    server localhost:5000;
    keepalive 64;
}

# Configuración HTTP inicial (Certbot agregará HTTPS después)
server {
    listen 80;
    server_name 3.141.103.248 api.kemperyworldtravel.com;
    
    # Permitir certificados Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Proxy al backend
    location / {
        proxy_pass http://kempery_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Verificar configuración
echo "Verificando configuración de Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuración válida"
    echo "Iniciando Nginx..."
    systemctl restart nginx
    systemctl status nginx --no-pager
    echo ""
    echo "✅ Nginx corregido y funcionando"
    echo ""
    echo "PRÓXIMOS PASOS:"
    echo "1. Crea un registro A en Route 53: api.kemperyworldtravel.com -> 3.141.103.248"
    echo "2. Espera unos minutos para que el DNS se propague"
    echo "3. Ejecuta: sudo certbot --nginx -d api.kemperyworldtravel.com"
    echo ""
else
    echo "❌ Error en la configuración. Revisa los errores arriba."
    exit 1
fi

