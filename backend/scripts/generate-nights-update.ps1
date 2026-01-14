# Script PowerShell para generar SQL de actualización de noches
$csvPath = "..\Base Kempery.csv"
$outputPath = "scripts/update-all-nights.sql"

Write-Host "🔧 Generando script SQL para actualizar noches..." -ForegroundColor Green

# Leer el CSV
$csvData = Import-Csv $csvPath

Write-Host "📊 Procesando $($csvData.Count) registros..." -ForegroundColor Blue

$sqlCommands = @()
$sqlCommands += "-- Script generado automáticamente para actualizar noches desde CSV"
$sqlCommands += "-- Fecha: $(Get-Date)"
$sqlCommands += ""

$updatedCount = 0
$skippedCount = 0

foreach ($row in $csvData) {
    $contractNumber = $row.'CONTRATO'.Trim()
    $nightsStr = $row.'NOCHES'.Trim()
    
    if ([string]::IsNullOrEmpty($contractNumber) -or [string]::IsNullOrEmpty($nightsStr)) {
        $skippedCount++
        continue
    }
    
    $nights = [int]$nightsStr
    if ($nights -lt 0) {
        $skippedCount++
        continue
    }
    
    $sqlCommand = "UPDATE clients SET total_nights = $nights, remaining_nights = $nights WHERE contract_number = '$contractNumber';"
    $sqlCommands += $sqlCommand
    $updatedCount++
}

# Agregar consultas de verificación
$sqlCommands += ""
$sqlCommands += "-- Verificar resultados"
$sqlCommands += "SELECT COUNT(*) as total_clientes_con_noches FROM clients WHERE total_nights > 0;"
$sqlCommands += "SELECT SUM(total_nights) as total_noches_sistema FROM clients WHERE total_nights > 0;"
$sqlCommands += "SELECT AVG(total_nights) as promedio_noches FROM clients WHERE total_nights > 0;"

# Escribir el archivo SQL
$sqlCommands | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "✅ Script SQL generado: $outputPath" -ForegroundColor Green
Write-Host "📊 Estadísticas:" -ForegroundColor Yellow
Write-Host "  - Comandos UPDATE generados: $updatedCount" -ForegroundColor White
Write-Host "  - Registros omitidos: $skippedCount" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Para ejecutar el script:" -ForegroundColor Cyan
Write-Host "  psql -U postgres -d kempery_travel -f scripts/update-all-nights.sql" -ForegroundColor White
