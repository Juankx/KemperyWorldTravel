# Script para subir el proyecto a GitHub
# Ejecutar desde el directorio raíz del proyecto

Write-Host "=== Preparando proyecto para GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en un repositorio git
if (-not (Test-Path .git)) {
    Write-Host "Error: No se encontró un repositorio git. Inicializando..." -ForegroundColor Yellow
    git init
    Write-Host "Repositorio inicializado. Necesitas configurar el remote:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git" -ForegroundColor Yellow
    exit
}

# Mostrar estado actual
Write-Host "Estado actual del repositorio:" -ForegroundColor Cyan
git status --short
Write-Host ""

# Agregar todos los archivos nuevos y cambios
Write-Host "Agregando archivos al staging..." -ForegroundColor Cyan
git add .

# Mostrar qué se va a commitear
Write-Host ""
Write-Host "Archivos preparados para commit:" -ForegroundColor Cyan
git status --short
Write-Host ""

# Preguntar si continuar
$continuar = Read-Host "¿Deseas continuar con el commit? (S/N)"
if ($continuar -ne "S" -and $continuar -ne "s") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit
}

# Hacer commit
$mensajeCommit = Read-Host "Ingresa el mensaje del commit (o presiona Enter para usar el mensaje por defecto)"
if ([string]::IsNullOrWhiteSpace($mensajeCommit)) {
    $mensajeCommit = "Reorganización del proyecto: frontend, backend y KemperySoft"
}

Write-Host ""
Write-Host "Haciendo commit..." -ForegroundColor Cyan
git commit -m $mensajeCommit

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Commit realizado exitosamente" -ForegroundColor Green
    Write-Host ""
    
    # Verificar si hay un remote configurado
    $remote = git remote get-url origin 2>$null
    if ($remote) {
        Write-Host "Remote configurado: $remote" -ForegroundColor Cyan
        Write-Host ""
        
        $subir = Read-Host "¿Deseas subir los cambios a GitHub? (S/N)"
        if ($subir -eq "S" -or $subir -eq "s") {
            Write-Host "Subiendo cambios a GitHub..." -ForegroundColor Cyan
            git push origin main
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✓ Proyecto subido exitosamente a GitHub!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "Error al subir. Verifica tu conexión y permisos." -ForegroundColor Red
                Write-Host "Puedes intentar manualmente con: git push origin main" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Cambios guardados localmente. Para subir más tarde:" -ForegroundColor Yellow
            Write-Host "  git push origin main" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No hay remote configurado. Para configurarlo:" -ForegroundColor Yellow
        Write-Host "  git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git" -ForegroundColor Yellow
        Write-Host "  git push -u origin main" -ForegroundColor Yellow
    }
} else {
    Write-Host "Error al hacer commit. Verifica los cambios." -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Proceso completado ===" -ForegroundColor Cyan
