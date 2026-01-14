# Script para configurar CloudFront para SPA (Single Page Application)
# Este script configura Custom Error Responses para que todas las rutas sirvan index.html

param(
    [string]$DistributionId = "",
    [string]$AwsProfile = ""
)

Write-Host "Configurando CloudFront para SPA..." -ForegroundColor Green
Write-Host ""

if (-not $DistributionId) {
    Write-Host "ERROR: Debes proporcionar el Distribution ID de CloudFront" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para obtener el Distribution ID:" -ForegroundColor Yellow
    Write-Host "  1. Ve a: https://console.aws.amazon.com/cloudfront/" -ForegroundColor White
    Write-Host "  2. Busca la distribucion que apunta a kemperyworldtravel.com" -ForegroundColor White
    Write-Host "  3. Copia el Distribution ID" -ForegroundColor White
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\configurar-cloudfront.ps1 -DistributionId 'E1234567890ABC' -AwsProfile kempery" -ForegroundColor White
    exit 1
}

# Obtener la configuración actual de CloudFront
Write-Host "Obteniendo configuracion actual de CloudFront..." -ForegroundColor Blue
$getConfigCmd = if ($AwsProfile) {
    "aws cloudfront get-distribution-config --id $DistributionId --profile $AwsProfile"
} else {
    "aws cloudfront get-distribution-config --id $DistributionId"
}

$configJson = Invoke-Expression $getConfigCmd | ConvertFrom-Json

if (-not $configJson) {
    Write-Host "ERROR: No se pudo obtener la configuracion de CloudFront" -ForegroundColor Red
    Write-Host "Verifica que el Distribution ID sea correcto y que tengas permisos" -ForegroundColor Yellow
    exit 1
}

$config = $configJson.DistributionConfig
$etag = $configJson.ETag

# Verificar si ya existen Custom Error Responses
$hasCustomErrors = $config.CustomErrorResponses -and $config.CustomErrorResponses.Items.Count -gt 0

if ($hasCustomErrors) {
    Write-Host "Ya existen Custom Error Responses configurados" -ForegroundColor Yellow
    Write-Host "Actualizando configuracion..." -ForegroundColor Blue
} else {
    Write-Host "Configurando Custom Error Responses..." -ForegroundColor Blue
    $config.CustomErrorResponses = @{
        Quantity = 2
        Items = @(
            @{
                ErrorCode = 403
                ResponsePagePath = "/index.html"
                ResponseCode = "200"
                ErrorCachingMinTTL = 300
            },
            @{
                ErrorCode = 404
                ResponsePagePath = "/index.html"
                ResponseCode = "200"
                ErrorCachingMinTTL = 300
            }
        )
    }
}

# Actualizar la configuración
Write-Host "Actualizando distribucion de CloudFront..." -ForegroundColor Blue

# Convertir la configuración a JSON
$configJsonString = $config | ConvertTo-Json -Depth 10

# Guardar en archivo temporal
$tempConfigFile = [System.IO.Path]::GetTempFileName()
$configJsonString | Out-File -FilePath $tempConfigFile -Encoding utf8 -NoNewline

$updateCmd = if ($AwsProfile) {
    "aws cloudfront update-distribution --id $DistributionId --if-match $etag --distribution-config file://$tempConfigFile --profile $AwsProfile"
} else {
    "aws cloudfront update-distribution --id $DistributionId --if-match $etag --distribution-config file://$tempConfigFile"
}

$updateResult = Invoke-Expression $updateCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "CloudFront configurado exitosamente!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTA IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "Los cambios en CloudFront pueden tardar 15-20 minutos en propagarse" -ForegroundColor White
    Write-Host "Despues de la propagacion, todas las rutas (como /login) serviran index.html" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "ERROR: No se pudo actualizar CloudFront" -ForegroundColor Red
    Write-Host "Verifica que tengas permisos de cloudfront:UpdateDistribution" -ForegroundColor Yellow
}

Remove-Item $tempConfigFile -ErrorAction SilentlyContinue

