Write-Host "Iniciando configuracion de PostgreSQL..." -ForegroundColor Cyan

Stop-Service postgresql-x64-16 -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$pgDataPath = "C:\Program Files\PostgreSQL\16\data"
$pgHbaPath = "$pgDataPath\pg_hba.conf"

Copy-Item $pgHbaPath "$pgHbaPath.backup" -Force -ErrorAction SilentlyContinue

$content = Get-Content $pgHbaPath
$newContent = @()

foreach ($line in $content) {
    if ($line -match "^(local|host)" -and -not $line.StartsWith("#")) {
        if ($line -match "127.0.0.1|::1|localhost") {
            $line = $line -replace "scram-sha-256|md5|password", "trust"
        } elseif ($line -match "^local\s+all\s+all") {
            $line = $line -replace "scram-sha-256|md5|password", "trust"
        }
    }
    $newContent += $line
}

$newContent | Set-Content $pgHbaPath -Encoding ASCII -Force
Write-Host "[OK] pg_hba.conf modificado" -ForegroundColor Green

Write-Host "Iniciando PostgreSQL..." -ForegroundColor Yellow
Start-Service postgresql-x64-16
Start-Sleep -Seconds 5

Write-Host "Cambiando contrasena..." -ForegroundColor Yellow
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
& $psqlPath -U postgres -h localhost -c "ALTER USER postgres WITH PASSWORD 'Kempery2025+';" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Contrasena actualizada a: Kempery2025+" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se pudo cambiar la contrasena" -ForegroundColor Red
}

Start-Sleep -Seconds 2

Write-Host "Restaurando autenticacion segura..." -ForegroundColor Yellow
Stop-Service postgresql-x64-16 -Force
Start-Sleep -Seconds 2

$content = Get-Content $pgHbaPath
$newContent = @()
foreach ($line in $content) {
    if ($line -match "\s+trust\s*$") {
        $newContent += ($line -replace "\s+trust\s*$", " scram-sha-256")
    } else {
        $newContent += $line
    }
}

$newContent | Set-Content $pgHbaPath -Encoding ASCII -Force

Start-Service postgresql-x64-16
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[OK] PostgreSQL configurado correctamente" -ForegroundColor Green
Write-Host "Usuario: postgres" -ForegroundColor Cyan
Write-Host "Contrasena: Kempery2025+" -ForegroundColor Cyan

Write-Host ""
Write-Host "Verificando conectividad..." -ForegroundColor Yellow
$env:PGPASSWORD = "Kempery2025+"
$result = & $psqlPath -U postgres -h localhost -c "SELECT 'Conexion OK' as status;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Conexion exitosa" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Error de conexion" -ForegroundColor Red
    Write-Host "$result" -ForegroundColor Red
}
