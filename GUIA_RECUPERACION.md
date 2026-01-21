# 🔄 GUÍA DE RECUPERACIÓN - Innovation Business V1.1.0

## Instrucciones para Recuperar el Proyecto

### ✅ Guardados Disponibles

1. **Git Repository** (Recomendado)
   - Commit: `5557b71`
   - Mensaje: "CHECKPOINT V1.1.0: Video Hero, Navbar mejorado, TestimonialsPremium y Autenticación con Backend Mock"

2. **Archivos de Respaldo**
   - Ubicación: `C:\Users\Miguel\Desktop\InnovationBusiness\`
   - Todos los archivos están versionados en git

3. **Documentación**
   - `CHECKPOINT_V1.1.0.md` - Detalles completos del checkpoint

---

## 🚨 Escenario 1: Cambios Recientes sin Guardar

Si hiciste cambios que no guardaste en git:

```bash
# Ver estado actual
cd C:\Users\Miguel\Desktop\InnovationBusiness
git status

# Descartar cambios locales (CUIDADO: irreversible)
git checkout -- .

# O si borraste archivos
git restore <archivo>
```

---

## 🚨 Escenario 2: Accidental Delete de Carpeta

Si eliminaste accidentalmente la carpeta frontend/frontend:

```bash
# Restaurar desde el último commit
git reset --hard HEAD
git clean -fd
```

---

## 🚨 Escenario 3: Necesitas Volver a Version Anterior

Si quieres volver al checkpoint actual:

```bash
cd C:\Users\Miguel\Desktop\InnovationBusiness

# Ver el historial
git log --oneline

# Restaurar al commit específico
git reset --hard 5557b71

# O si ya avanzaste y necesitas recuperar
git reflog  # Ver todos los cambios
git reset --hard <commit-hash>
```

---

## 📦 Escenario 4: Hacer Respaldo Manual Externo

Para crear una copia de seguridad en otro lugar:

```bash
# En PowerShell
$source = "C:\Users\Miguel\Desktop\InnovationBusiness"
$destination = "D:\Backups\InnovationBusiness_V1.1.0"  # O la ruta que prefieras

Copy-Item -Path $source -Destination $destination -Recurse -Force
```

---

## 🔧 Verificación de Integridad

### Verificar que todo está correcto:

```bash
cd C:\Users\Miguel\Desktop\InnovationBusiness

# 1. Verificar status de git
git status  # Debe mostrar "working tree clean"

# 2. Verificar que existen los archivos clave
Test-Path "frontend/frontend/src/components/Hero.jsx"           # Debe ser True
Test-Path "frontend/frontend/src/components/TestimonialsPremium.jsx"  # Debe ser True
Test-Path "frontend/frontend/src/components/Navbar.jsx"         # Debe ser True
Test-Path "backend/server-mock-login.js"                        # Debe ser True

# 3. Verificar node_modules
Test-Path "frontend/frontend/node_modules"  # Debe ser True
Test-Path "backend/node_modules"            # Debe ser True

# Si falta node_modules, reinstalar:
cd frontend/frontend && npm install
cd ..\.. && cd backend && npm install
```

---

## 🌐 Verificar Servicios Corriendo

```bash
# Verificar si puerto 3000 está disponible
netstat -ano | findstr :3000

# Verificar si puerto 5000 está disponible
netstat -ano | findstr :5000

# Si están ocupados, matar procesos
taskkill /PID <pid> /F
```

---

## 📝 Logs Importantes

### Ubicación de logs:
- **Frontend Vite**: Consola del terminal donde corre `npm run dev`
- **Backend Mock**: Consola del terminal donde corre `node server-mock-login.js`

### Guardar logs para referencia:
```bash
# Redirigir output a archivo
npm run dev > vite_log.txt 2>&1
node server-mock-login.js > backend_log.txt 2>&1
```

---

## 🔐 Información Sensible a Respaldar

Si necesitas respaldar credenciales o configuración:

### Usuarios de Prueba (Ya en el código):
```
admin / Kempery2025+
paola / Kempery2025+
cobranzas / Kempery2025+
```

### Puertos:
- Frontend: **3000** (Vite)
- Backend: **5000** (Server Mock)

### URLs:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api/auth/login

---

## 📋 Checklist de Recuperación Exitosa

Después de recuperar, verifica:

- [ ] Git está inicializado: `git init` ✓
- [ ] Última revisión es 5557b71: `git log --oneline -1`
- [ ] Todos los archivos principales existen
- [ ] node_modules están instalados
- [ ] Frontend inicia sin errores: `npm run dev`
- [ ] Backend mock responde: `node server-mock-login.js`
- [ ] Acceso a http://localhost:3000 funciona
- [ ] Modal de login muestra 3 usuarios de prueba
- [ ] Video se ve en la sección Hero
- [ ] Testimonios Premium visible en homepage

---

## 🆘 Si Todo Falla

### Opción 1: Reinstalar desde cero
```bash
# Eliminar proyecto
Remove-Item "C:\Users\Miguel\Desktop\InnovationBusiness" -Recurse -Force

# Clonar desde respaldo si tienes GitHub
git clone <tu-repo-url>

# O copiar desde respaldo manual
```

### Opción 2: Verificar Git History
```bash
cd C:\Users\Miguel\Desktop\InnovationBusiness
git reflog  # Ver TODOS los cambios históricos
git log --all --graph --decorate  # Visualizar árbol de commits
```

### Opción 3: Recuperar archivo específico
```bash
# Si borraste un archivo específico
git checkout 5557b71 -- "ruta/al/archivo"

# Ejemplo:
git checkout 5557b71 -- "frontend/frontend/src/components/TestimonialsPremium.jsx"
```

---

## 📊 Estado del Checkpoint

```
Commit: 5557b71
Fecha: 21 Enero 2026
Cambios: 205 archivos modificados
Líneas: +8384 -69398
Estado: ✅ Estable y Funcional
```

---

## 🎯 Resumen Rápido

| Elemento | Ubicación | Estado |
|----------|-----------|--------|
| Código Frontend | `frontend/frontend/src/` | ✅ Guardado |
| Código Backend | `backend/` | ✅ Guardado |
| Git History | `.git/` | ✅ Guardado |
| Checkpoint Doc | `CHECKPOINT_V1.1.0.md` | ✅ Guardado |
| Recuperación | Este archivo | ✅ Guardado |

---

**Última actualización**: 21 Enero 2026
**Responsable**: Miguel
**Versión**: 1.1.0
