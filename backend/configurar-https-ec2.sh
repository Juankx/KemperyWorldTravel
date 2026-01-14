#!/bin/bash
# Script para configurar HTTPS en el backend usando Nginx y Let's Encrypt

echo "=========================================="
echo "Configurando HTTPS para el backend"
echo "=========================================="
echo ""

# Verificar que se ejecuta como root o con sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Por favor, ejecuta este script con sudo:"
    echo "  sudo bash configurar-https-ec2.sh"
    exit 1
fi

# Instalar Nginx
echo "1. Instalando Nginx..."
dnf install -y nginx

# Instalar Certbot (Let's Encrypt)
echo ""
echo "2. Instalando Certbot..."
dnf install -y certbot python3-certbot-nginx

# Crear configuración de Nginx (solo HTTP inicialmente, Certbot agregará SSL)
echo ""
echo "3. Configurando Nginx..."
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

# Habilitar y iniciar Nginx
echo ""
echo "4. Iniciando Nginx..."
systemctl enable nginx
systemctl start nginx

# Verificar que Nginx está corriendo
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx iniciado correctamente"
else
    echo "❌ Error al iniciar Nginx"
    exit 1
fi

# Abrir puertos en firewall
echo ""
echo "5. Configurando firewall..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo "✅ Firewall configurado"
elif command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw reload
    echo "✅ Firewall configurado"
else
    echo "⚠️  No se encontró firewall. Asegúrate de abrir los puertos 80 y 443 en el Security Group de EC2"
fi

echo ""
echo "=========================================="
echo "Configuración de Nginx completada"
echo "=========================================="
echo ""
echo "✅ Nginx configurado para HTTP. Certbot configurará HTTPS automáticamente."
echo ""
echo "PRÓXIMOS PASOS:"
echo ""
echo "1. Verificar que Nginx está corriendo:"
echo "   sudo systemctl status nginx"
echo ""
echo "2. Obtener certificado SSL con Let's Encrypt:"
echo "   sudo certbot --nginx -d api.kemperyworldtravel.com"
echo ""
echo "   NOTA: Necesitas tener un registro DNS apuntando a esta IP:"
echo "   - Crea un registro A en Route 53: api.kemperyworldtravel.com -> 3.141.103.248"
echo ""
echo "3. Si Certbot funciona correctamente, automáticamente:"
echo "   - Configurará SSL"
echo "   - Redirigirá HTTP a HTTPS"
echo "   - Configurará renovación automática"
echo ""
echo "4. Verificar renovación automática:"
echo "   sudo certbot renew --dry-run"
echo ""
echo "5. Actualizar el frontend para usar HTTPS:"
echo "   Edita frontend/.env.production:"
echo "   VITE_API_URL=https://api.kemperyworldtravel.com/api"
echo ""
echo "   Luego redesplega:"
echo "   cd frontend"
echo "   npm run build"
echo "   .\deploy-s3.ps1 -AwsProfile kempery"
echo ""
echo "IMPORTANTE:"
echo "   - Let's Encrypt NO puede emitir certificados para IPs directamente"
echo "   - Necesitas un dominio (api.kemperyworldtravel.com) apuntando a esta IP"
echo "   - Si no tienes dominio, usa CloudFront como proxy HTTPS (ver CONFIGURAR_CLOUDFRONT_BACKEND.md)"
echo ""

