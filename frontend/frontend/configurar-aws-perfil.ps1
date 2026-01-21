# Script para configurar un perfil de AWS específico para Kempery World Travel
# Esto NO afectará otros proyectos que usen AWS CLI
# Ejecutar: .\configurar-aws-perfil.ps1

param(
    [string]$ProfileName = "kempery",
    [string]$AccessKeyId = "",
    [string]$SecretAccessKey = "",
    [string]$Region = "us-east-1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CONFIGURACION DE PERFIL AWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script configurará un perfil específico para Kempery World Travel" -ForegroundColor Yellow
Write-Host "Esto NO afectará otros proyectos que usen AWS CLI" -ForegroundColor Green
Write-Host ""

# Si no se proporcionaron credenciales, pedirlas
if ([string]::IsNullOrEmpty($AccessKeyId)) {
    Write-Host "Ingresa las credenciales del usuario IAM 'juankx':" -ForegroundColor Cyan
    $AccessKeyId = Read-Host "Access Key ID"
    $SecretAccessKey = Read-Host "Secret Access Key" -AsSecureString
    $SecretAccessKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretAccessKey)
    )
}

# Configurar perfil
Write-Host "Configurando perfil '$ProfileName'..." -ForegroundColor Yellow

aws configure set aws_access_key_id $AccessKeyId --profile $ProfileName
aws configure set aws_secret_access_key $SecretAccessKey --profile $ProfileName
aws configure set region $Region --profile $ProfileName
aws configure set output json --profile $ProfileName

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Perfil '$ProfileName' configurado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error configurando el perfil" -ForegroundColor Red
    exit 1
}

# Verificar que funciona
Write-Host ""
Write-Host "Verificando configuración..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --profile $ProfileName 2>&1 | ConvertFrom-Json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Configuración verificada" -ForegroundColor Green
    Write-Host "   Usuario: $($identity.Arn)" -ForegroundColor White
    Write-Host "   Account: $($identity.Account)" -ForegroundColor White
} else {
    Write-Host "❌ Error verificando configuración" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "CONFIGURACION COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para usar este perfil en el deploy, actualiza deploy-s3.ps1 o usa:" -ForegroundColor Yellow
Write-Host "  aws s3 ls --profile kempery" -ForegroundColor White
Write-Host ""
Write-Host "O configura la variable de entorno:" -ForegroundColor Yellow
Write-Host "  `$env:AWS_PROFILE = 'kempery'" -ForegroundColor White
Write-Host ""

