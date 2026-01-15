# KEMPERY - SOLUCIÓN DE PROBLEMAS DE LOGIN

## Problema: La página se recarga pero no ingresa

### Causa: Desconexión entre Frontend y Backend

El frontend está intentando conectarse al backend pero hay un problema de comunicación.

## SOLUCIÓN: Reiniciar correctamente

### Paso 1: Cerrar todo
Presiona `q` en ambas terminales para salir de Frontend y Backend

### Paso 2: Ejecutar el script de inicio
Abre una terminal PowerShell como Administrador y ejecuta:

```powershell
& "C:\Users\Miguel\Desktop\kempery\KemperyWorldTravel\start-kempery.bat"
```

Esto abrirá:
- Una terminal con el Backend en puerto 5000
- Una terminal con el Frontend en puerto 3000
- Abrirá el navegador automáticamente

### Paso 3: Verificar que está funcionando

**Backend**: Debe mostrar:
```
✅ Backend Mock Server running on http://localhost:5000
🔌 CORS enabled for: http://localhost:3000
```

**Frontend**: Debe mostrar:
```
VITE v4.5.14  ready in XXX ms
➜  Local:   http://localhost:3000/
```

### Paso 4: Ingresar

Usa estas credenciales:
```
Email: cobranzas@kempery.com
Contraseña: Kempery2025+
```

## Si sigue sin funcionar:

### Verificar que los puertos estén libres
```powershell
# En PowerShell
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

Si algo está ocupando los puertos, ejecuta:
```powershell
taskkill /PID <PID> /F
```

### Limpiar todo y reiniciar
```powershell
# Matar todos los procesos node
taskkill /F /IM node.exe

# Esperar 3 segundos
Start-Sleep -Seconds 3

# Reiniciar el script
& "C:\Users\Miguel\Desktop\kempery\KemperyWorldTravel\start-kempery.bat"
```

## RESUMEN DE ARCHIVOS:

- **Backend Mock**: `C:\Users\Miguel\Desktop\kempery\KemperyWorldTravel\backend\server-mock.js`
- **Usuarios disponibles**:
  - admin@kempery.com / Kempery2025+
  - paola@kempery.com / Kempery2025+
  - cobranzas@kempery.com / Kempery2025+

- **Puertos**:
  - Frontend: 3000
  - Backend: 5000

Si todavía hay problemas, verifica que ambas terminales muestren "running" y que el navegador esté en http://localhost:3000
