# Solucionar Problema de Conexión a EC2

## Problema
No se puede conectar al servidor en `http://3.141.103.248:5000` aunque el Security Group está configurado.

## Soluciones

### 1. Verificar que el Servidor Está Corriendo

Conecta a EC2 y ejecuta:

```bash
ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248

# Verificar estado de PM2
pm2 status

# Si no está corriendo, iniciarlo
cd ~/kempery-backend
pm2 start server.js --name kempery-backend
pm2 save
```

### 2. Verificar que el Servidor Escucha en 0.0.0.0

El servidor debe escuchar en `0.0.0.0` (todas las interfaces) y no solo en `localhost`.

**Ya corregido en server.js**, pero necesitas reiniciar el servidor:

```bash
# En EC2
cd ~/kempery-backend
pm2 restart kempery-backend

# Verificar que está escuchando correctamente
sudo netstat -tulpn | grep 5000
# Debe mostrar: 0.0.0.0:5000 o :::5000
```

### 3. Verificar Firewall Local (si existe)

```bash
# Amazon Linux 2023 generalmente no tiene firewall activo por defecto
# Pero verifica:
sudo firewall-cmd --list-all 2>/dev/null || echo "Firewall no configurado"
```

### 4. Verificar Logs del Servidor

```bash
# Ver logs en tiempo real
pm2 logs kempery-backend

# Ver últimas 50 líneas
pm2 logs kempery-backend --lines 50 --nostream
```

### 5. Probar Localmente en EC2

```bash
# Desde dentro de EC2, probar:
curl http://localhost:5000/api/health

# Si funciona localmente pero no desde fuera, el problema es el Security Group o el servidor no escucha en 0.0.0.0
```

### 6. Verificar Security Group

Asegúrate de que la regla de entrada para el puerto 5000:
- Tipo: Custom TCP
- Puerto: 5000
- Origen: 0.0.0.0/0 (o tu IP específica)
- Estado: Activa

### 7. Actualizar Código en EC2

Si acabas de corregir `server.js`, necesitas subir el cambio:

```powershell
# Desde tu máquina local
scp -i kemperyworldtravel.pem backend/server.js ec2-user@3.141.103.248:~/kempery-backend/

# Luego en EC2, reiniciar:
pm2 restart kempery-backend
```

## Comandos Rápidos de Diagnóstico

```bash
# Script completo de diagnóstico
ssh -i kemperyworldtravel.pem ec2-user@3.141.103.248 'bash -s' < diagnostico-ec2.sh

# O ejecutar manualmente en EC2:
pm2 status
pm2 logs kempery-backend --lines 20
sudo netstat -tulpn | grep 5000
curl http://localhost:5000/api/health
```

## Solución Rápida

Si el servidor no está corriendo, ejecuta esto en EC2:

```bash
cd ~/kempery-backend

# Asegurar que el servidor escucha en 0.0.0.0 (ya corregido en server.js)
# Subir el archivo corregido si es necesario

# Instalar PM2 si no está
sudo npm install -g pm2

# Iniciar servidor
pm2 stop kempery-backend 2>/dev/null || true
pm2 delete kempery-backend 2>/dev/null || true
pm2 start server.js --name kempery-backend
pm2 save
pm2 startup

# Verificar
pm2 status
pm2 logs kempery-backend
```

