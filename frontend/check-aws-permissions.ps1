# Script para verificar permisos de AWS en el bucket S3

param(
    [string]$BucketName = "kemperyworldtravel.com",
    [string]$Region = "us-east-1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO DE PERMISOS AWS S3" -ForegroundColor Cyan
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

# 2. Verificar si el bucket existe
Write-Host "2. VERIFICACION DEL BUCKET:" -ForegroundColor Yellow
Write-Host "   Bucket: $BucketName" -ForegroundColor White
Write-Host "   Region: $Region" -ForegroundColor White

# Intentar obtener la ubicación del bucket
$bucketLocation = aws s3api get-bucket-location --bucket $BucketName 2>&1
if ($LASTEXITCODE -eq 0) {
    $location = $bucketLocation | ConvertFrom-Json
    $actualRegion = if ($location.LocationConstraint) { $location.LocationConstraint } else { "us-east-1" }
    Write-Host "   ✅ Bucket existe en region: $actualRegion" -ForegroundColor Green
    
    if ($actualRegion -ne $Region) {
        Write-Host "   ⚠️  ADVERTENCIA: La region del bucket ($actualRegion) no coincide con la especificada ($Region)" -ForegroundColor Yellow
        Write-Host "   Usa: .\deploy-s3.ps1 -Region '$actualRegion'" -ForegroundColor Gray
    }
} else {
    $errorMsg = $bucketLocation -join " "
    if ($errorMsg -match "NoSuchBucket") {
        Write-Host "   ❌ El bucket no existe" -ForegroundColor Red
        Write-Host "   Crear con: aws s3 mb s3://$BucketName --region $Region" -ForegroundColor Gray
    } elseif ($errorMsg -match "AccessDenied") {
        Write-Host "   ⚠️  No se puede verificar el bucket (AccessDenied)" -ForegroundColor Yellow
        Write-Host "   Esto puede indicar que no tienes permisos s3:GetBucketLocation" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Error al verificar bucket: $errorMsg" -ForegroundColor Yellow
    }
}

Write-Host ""

# 3. Probar permisos específicos
Write-Host "3. VERIFICACION DE PERMISOS:" -ForegroundColor Yellow

# Test 1: ListBucket
Write-Host "   Probando s3:ListBucket..." -ForegroundColor White
$listTest = aws s3 ls "s3://$BucketName" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Tienes permiso s3:ListBucket" -ForegroundColor Green
} else {
    Write-Host "   ❌ NO tienes permiso s3:ListBucket" -ForegroundColor Red
    Write-Host "      Error: $($listTest -join ' ')" -ForegroundColor Gray
}

# Test 2: PutObject (intentar subir un archivo de prueba)
Write-Host "   Probando s3:PutObject..." -ForegroundColor White
$testFile = New-TemporaryFile
"test" | Out-File -FilePath $testFile -Encoding utf8
$putTest = aws s3 cp $testFile "s3://$BucketName/test-permissions.txt" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Tienes permiso s3:PutObject" -ForegroundColor Green
    # Limpiar el archivo de prueba
    aws s3 rm "s3://$BucketName/test-permissions.txt" 2>&1 | Out-Null
} else {
    Write-Host "   ❌ NO tienes permiso s3:PutObject" -ForegroundColor Red
    $errorMsg = $putTest -join " "
    if ($errorMsg -match "AccessDenied") {
        Write-Host "      Error: Access Denied - No tienes permisos para subir archivos" -ForegroundColor Gray
    } else {
        Write-Host "      Error: $errorMsg" -ForegroundColor Gray
    }
}
Remove-Item $testFile -Force

# Test 3: PutBucketWebsite
Write-Host "   Probando s3:PutBucketWebsite..." -ForegroundColor White
$websiteTest = aws s3api put-bucket-website --bucket $BucketName --website-configuration '{"IndexDocument":{"Suffix":"index.html"}}' 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Tienes permiso s3:PutBucketWebsite" -ForegroundColor Green
} else {
    $errorMsg = $websiteTest -join " "
    if ($errorMsg -match "AccessDenied") {
        Write-Host "   ❌ NO tienes permiso s3:PutBucketWebsite" -ForegroundColor Red
    } else {
        Write-Host "   ⚠️  No se pudo verificar (puede que ya esté configurado)" -ForegroundColor Yellow
    }
}

Write-Host ""

# 4. Mostrar política IAM necesaria
Write-Host "4. POLITICA IAM NECESARIA:" -ForegroundColor Yellow
Write-Host ""
$policy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "KemperyWorldTravelDeploy",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:GetBucketLocation",
                "s3:ListBucket",
                "s3:PutBucketWebsite",
                "s3:GetBucketWebsite",
                "s3:PutBucketPolicy",
                "s3:GetBucketPolicy"
            ],
            "Resource": [
                "arn:aws:s3:::$BucketName",
                "arn:aws:s3:::$BucketName/*"
            ]
        }
    ]
}
"@
Write-Host $policy -ForegroundColor Gray
Write-Host ""

# 5. Instrucciones
Write-Host "5. COMO AGREGAR PERMISOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   OPCION 1: Desde la Consola de AWS" -ForegroundColor White
Write-Host "   1. Ve a: https://console.aws.amazon.com/iam/" -ForegroundColor Gray
Write-Host "   2. Usuarios → juankx → Agregar permisos" -ForegroundColor Gray
Write-Host "   3. Crear política personalizada (JSON)" -ForegroundColor Gray
Write-Host "   4. Pega la política de arriba" -ForegroundColor Gray
Write-Host "   5. Nombra la política: KemperyWorldTravelS3Deploy" -ForegroundColor Gray
Write-Host "   6. Adjuntar política al usuario" -ForegroundColor Gray
Write-Host ""
Write-Host "   OPCION 2: Con AWS CLI (si tienes permisos de administrador)" -ForegroundColor White
Write-Host "   aws iam put-user-policy --user-name juankx --policy-name KemperyWorldTravelS3Deploy --policy-document file://policy.json" -ForegroundColor Gray
Write-Host ""
Write-Host "   OPCION 3: Usar política predefinida (más permisos de los necesarios)" -ForegroundColor White
Write-Host "   Agrega la política: AmazonS3FullAccess (solo para desarrollo)" -ForegroundColor Gray
Write-Host ""

# 6. Verificar permisos actuales del usuario
Write-Host "6. VERIFICANDO POLITICAS ACTUALES DEL USUARIO:" -ForegroundColor Yellow
try {
    $userPolicies = aws iam list-user-policies --user-name juankx 2>&1
    if ($LASTEXITCODE -eq 0) {
        $policies = $userPolicies | ConvertFrom-Json
        if ($policies.PolicyNames.Count -gt 0) {
            Write-Host "   Políticas inline del usuario:" -ForegroundColor White
            foreach ($policy in $policies.PolicyNames) {
                Write-Host "   - $policy" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ⚠️  No se encontraron políticas inline" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  No se pudieron listar políticas (puede requerir permisos adicionales)" -ForegroundColor Yellow
    }
    
    $attachedPolicies = aws iam list-attached-user-policies --user-name juankx 2>&1
    if ($LASTEXITCODE -eq 0) {
        $attached = $attachedPolicies | ConvertFrom-Json
        if ($attached.AttachedPolicies.Count -gt 0) {
            Write-Host "   Políticas adjuntas:" -ForegroundColor White
            foreach ($policy in $attached.AttachedPolicies) {
                Write-Host "   - $($policy.PolicyName)" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ⚠️  No se encontraron políticas adjuntas" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ⚠️  No se pudieron verificar políticas (requiere permisos IAM)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIN DEL DIAGNOSTICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

