# Script simple para generar SQL de actualización de noches
$csvPath = "..\Base Kempery.csv"
$outputPath = "scripts/update-all-nights.sql"

Write-Host "Generando script SQL para actualizar noches..."

# Leer el CSV
$csvData = Import-Csv $csvPath

Write-Host "Procesando $($csvData.Count) registros..."

$sqlCommands = @()
$sqlCommands += "-- Script generado para actualizar noches desde CSV"
$sqlCommands += ""

$updatedCount = 0

foreach ($row in $csvData) {
    $contractNumber = $row.'CONTRATO'.Trim()
    $nightsStr = $row.'NOCHES'.Trim()
    
    if ([string]::IsNullOrEmpty($contractNumber) -or [string]::IsNullOrEmpty($nightsStr)) {
        continue
    }
    
    $nights = [int]$nightsStr
    if ($nights -lt 0) {
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

# Escribir el archivo SQL
$sqlCommands | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "Script SQL generado: $outputPath"
Write-Host "Comandos UPDATE generados: $updatedCount"
Write-Host "Para ejecutar: psql -U postgres -d kempery_travel -f scripts/update-all-nights.sql"
