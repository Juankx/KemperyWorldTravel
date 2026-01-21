# Script para verificar y diagnosticar permisos de S3
# Ejecutar: .\verificar-permisos-s3.ps1

param(
    [string]$BucketName = "kemperyworldtravel.com",
    [string]$Region = "us-east-1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO DE PERMISOS S3" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar identidad
Write-Host "1. IDENTIDAD DE AWS:" -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host "   Usuario: $($identity.Arn)" -ForegroundColor White
    Write-Host "   Account: $($identity.Account)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error al obtener identidad" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Verificar permisos del usuario
Write-Host "2. VERIFICANDO PERMISOS DEL USUARIO:" -ForegroundColor Yellow
Write-Host "   Usuario: juankx" -ForegroundColor White

# Intentar listar el bucket
Write-Host "   Probando s3:ListBucket..." -ForegroundColor Gray
$listResult = aws s3 ls "s3://$BucketName" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ s3:ListBucket: PERMITIDO" -ForegroundColor Green
} else {
    Write-Host "   ❌ s3:ListBucket: DENEGADO" -ForegroundColor Red
    Write-Host "      Error: $listResult" -ForegroundColor Gray
}

# Intentar obtener ubicación del bucket
Write-Host "   Probando s3:GetBucketLocation..." -ForegroundColor Gray
$locationResult = aws s3api get-bucket-location --bucket $BucketName 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ s3:GetBucketLocation: PERMITIDO" -ForegroundColor Green
    $location = $locationResult | ConvertFrom-Json
    $actualRegion = if ($location.LocationConstraint) { $location.LocationConstraint } else { "us-east-1" }
    Write-Host "      Región del bucket: $actualRegion" -ForegroundColor Gray
} else {
    Write-Host "   ❌ s3:GetBucketLocation: DENEGADO" -ForegroundColor Red
}

# Intentar subir un archivo de prueba
Write-Host "   Probando s3:PutObject..." -ForegroundColor Gray
$testFile = New-TemporaryFile
"test" | Out-File -FilePath $testFile -Encoding utf8
$uploadResult = aws s3 cp $testFile "s3://$BucketName/test-permissions.txt" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ s3:PutObject: PERMITIDO" -ForegroundColor Green
    # Limpiar archivo de prueba
    aws s3 rm "s3://$BucketName/test-permissions.txt" 2>&1 | Out-Null
} else {
    Write-Host "   ❌ s3:PutObject: DENEGADO" -ForegroundColor Red
    Write-Host "      Error: $uploadResult" -ForegroundColor Gray
}
Remove-Item $testFile -Force

Write-Host ""

# 3. Verificar políticas del bucket
Write-Host "3. VERIFICANDO POLITICAS DEL BUCKET:" -ForegroundColor Yellow
$policyResult = aws s3api get-bucket-policy --bucket $BucketName 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Política de bucket encontrada" -ForegroundColor Green
    $policy = $policyResult | ConvertFrom-Json
    $policyJson = $policy.Policy | ConvertFrom-Json
    Write-Host "      Statements: $($policyJson.Statement.Count)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  No se pudo obtener la política del bucket" -ForegroundColor Yellow
    Write-Host "      Esto puede ser normal si no hay política configurada" -ForegroundColor Gray
}

Write-Host ""

# 4. Verificar políticas IAM del usuario
Write-Host "4. VERIFICANDO POLITICAS IAM:" -ForegroundColor Yellow
Write-Host "   Para ver las políticas del usuario, ejecuta:" -ForegroundColor White
Write-Host "   aws iam list-attached-user-policies --user-name juankx" -ForegroundColor Cyan
Write-Host "   aws iam list-user-policies --user-name juankx" -ForegroundColor Cyan

Write-Host ""

# 5. Solución recomendada
Write-Host "5. SOLUCION RECOMENDADA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Si s3:PutObject está DENEGADO, necesitas agregar permisos:" -ForegroundColor White
Write-Host ""
Write-Host "   Opción A - Política personalizada (recomendado):" -ForegroundColor Cyan
Write-Host "   1. Ve a: https://console.aws.amazon.com/iam/" -ForegroundColor White
Write-Host "   2. Usuarios → juankx → Agregar permisos → Adjuntar políticas directamente" -ForegroundColor White
Write-Host "   3. Crea una política personalizada con este JSON:" -ForegroundColor White
Write-Host ""
$policyJson = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:GetBucketLocation",
                "s3:ListBucket",
                "s3:PutBucketWebsite",
                "s3:PutBucketPolicy"
            ],
            "Resource": [
                "arn:aws:s3:::$BucketName",
                "arn:aws:s3:::$BucketName/*"
            ]
        }
    ]
}
"@
Write-Host $policyJson -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Nombra la política: KemperyWorldTravelS3Deploy" -ForegroundColor White
Write-Host "   5. Adjunta la política al usuario juankx" -ForegroundColor White
Write-Host ""
Write-Host "   Opción B - Política predefinida (rápido pero menos seguro):" -ForegroundColor Cyan
Write-Host "   1. Ve a: https://console.aws.amazon.com/iam/" -ForegroundColor White
Write-Host "   2. Usuarios → juankx → Agregar permisos → Adjuntar políticas directamente" -ForegroundColor White
Write-Host "   3. Busca y selecciona: AmazonS3FullAccess" -ForegroundColor White
Write-Host "   4. Adjunta la política" -ForegroundColor White
Write-Host ""
Write-Host "   NOTA: AmazonS3FullAccess da acceso completo a TODOS los buckets S3" -ForegroundColor Yellow
Write-Host "         Úsalo solo si confías en el usuario o es para desarrollo" -ForegroundColor Yellow
Write-Host ""

