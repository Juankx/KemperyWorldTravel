# Script para verificar y crear usuario IAM con permisos S3
# Ejecutar: .\crear-usuario-iam.ps1

param(
    [string]$UserName = "juankx",
    [string]$BucketName = "kemperyworldtravel.com"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACION Y CONFIGURACION DE USUARIO IAM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar usuario actual
Write-Host "1. VERIFICANDO USUARIO ACTUAL:" -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host "   Usuario actual: $($identity.Arn)" -ForegroundColor White
    Write-Host "   Account ID: $($identity.Account)" -ForegroundColor White
    
    if ($identity.Arn -match "user/$UserName") {
        Write-Host "   ✅ El usuario '$UserName' está siendo usado actualmente" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  El usuario actual no es '$UserName'" -ForegroundColor Yellow
        Write-Host "      Usuario actual: $($identity.Arn)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Error al obtener identidad" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Verificar si el usuario existe
Write-Host "2. VERIFICANDO SI EL USUARIO '$UserName' EXISTE:" -ForegroundColor Yellow
$userExists = $false
try {
    $userInfo = aws iam get-user --user-name $UserName 2>&1
    if ($LASTEXITCODE -eq 0) {
        $userExists = $true
        Write-Host "   ✅ El usuario '$UserName' existe" -ForegroundColor Green
        $user = $userInfo | ConvertFrom-Json
        Write-Host "      ARN: $($user.User.Arn)" -ForegroundColor Gray
        Write-Host "      Creado: $($user.User.CreateDate)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ El usuario '$UserName' NO existe" -ForegroundColor Red
    Write-Host "      Error: $userInfo" -ForegroundColor Gray
}

Write-Host ""

# 3. Si no existe, crear el usuario
if (-not $userExists) {
    Write-Host "3. CREANDO USUARIO '$UserName':" -ForegroundColor Yellow
    Write-Host "   ⚠️  Para crear un usuario IAM necesitas permisos de administrador" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   INSTRUCCIONES MANUALES:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   1. Ve a: https://console.aws.amazon.com/iam/" -ForegroundColor White
    Write-Host "   2. Haz clic en 'Personas' (Users) en el menú lateral" -ForegroundColor White
    Write-Host "   3. Haz clic en 'Agregar usuarios' (Add users)" -ForegroundColor White
    Write-Host "   4. Nombre de usuario: $UserName" -ForegroundColor White
    Write-Host "   5. Selecciona: 'Proporcionar acceso al portal de usuarios de IAM'" -ForegroundColor White
    Write-Host "   6. O selecciona: 'Acceso mediante programación' (para usar con AWS CLI)" -ForegroundColor White
    Write-Host "   7. Haz clic en 'Siguiente'" -ForegroundColor White
    Write-Host "   8. En 'Permisos', selecciona 'Adjuntar políticas directamente'" -ForegroundColor White
    Write-Host "   9. Busca y selecciona: 'AmazonS3FullAccess'" -ForegroundColor White
    Write-Host "   10. Haz clic en 'Siguiente' y luego 'Crear usuario'" -ForegroundColor White
    Write-Host ""
    Write-Host "   O usa AWS CLI (si tienes permisos):" -ForegroundColor Cyan
    Write-Host "   aws iam create-user --user-name $UserName" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "3. VERIFICANDO PERMISOS DEL USUARIO:" -ForegroundColor Yellow
    
    # Verificar políticas adjuntas
    $attachedPolicies = aws iam list-attached-user-policies --user-name $UserName 2>&1
    if ($LASTEXITCODE -eq 0) {
        $policies = $attachedPolicies | ConvertFrom-Json
        if ($policies.AttachedPolicies.Count -gt 0) {
            Write-Host "   Políticas adjuntas:" -ForegroundColor White
            foreach ($policy in $policies.AttachedPolicies) {
                Write-Host "      - $($policy.PolicyName)" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ⚠️  El usuario NO tiene políticas adjuntas" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "   Para agregar permisos S3:" -ForegroundColor Cyan
    Write-Host "   1. Ve a: https://console.aws.amazon.com/iam/" -ForegroundColor White
    Write-Host "   2. Personas → $UserName → Pestaña 'Permisos'" -ForegroundColor White
    Write-Host "   3. Haz clic en 'Agregar permisos'" -ForegroundColor White
    Write-Host "   4. Selecciona 'Adjuntar políticas directamente'" -ForegroundColor White
    Write-Host "   5. Busca y selecciona: 'AmazonS3FullAccess'" -ForegroundColor White
    Write-Host "   6. Haz clic en 'Siguiente' y luego 'Agregar permisos'" -ForegroundColor White
    Write-Host ""
}

Write-Host "4. POLITICA RECOMENDADA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Para desarrollo rápido, usa: AmazonS3FullAccess" -ForegroundColor White
Write-Host "   (Da acceso completo a todos los buckets S3)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Para producción, crea una política personalizada:" -ForegroundColor White
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

