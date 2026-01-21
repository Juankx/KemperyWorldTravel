# Script para subir archivos a S3 con tipos MIME correctos para Kempery World Travel

param(
    [string]$BucketName = "kemperyworldtravel.com",
    [string]$BuildPath = "dist",
    [string]$Region = "us-east-1",
    [switch]$SkipBuild = $false,
    [string]$AwsProfile = ""  # Perfil de AWS a usar (opcional, si no se especifica usa el perfil por defecto)
)

Write-Host "Iniciando despliegue a S3 con tipos MIME correctos..." -ForegroundColor Green

# ============================================================================
# VERIFICACIONES PREVIAS DE AWS
# ============================================================================
Write-Host ""
Write-Host "Verificando configuracion de AWS..." -ForegroundColor Cyan

# 1. Verificar que AWS CLI esté instalado
Write-Host "  1. Verificando AWS CLI..." -ForegroundColor White
try {
    $awsVersion = aws --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "     ✅ AWS CLI instalado: $awsVersion" -ForegroundColor Green
    } else {
        Write-Host "     ❌ AWS CLI no encontrado" -ForegroundColor Red
        Write-Host ""
        Write-Host "ERROR: AWS CLI no esta instalado o no esta en el PATH" -ForegroundColor Red
        Write-Host "Instalacion:" -ForegroundColor Yellow
        Write-Host "  1. Descarga AWS CLI desde: https://aws.amazon.com/cli/" -ForegroundColor White
        Write-Host "  2. O instala con: winget install Amazon.AWSCLI" -ForegroundColor White
        Write-Host "  3. Reinicia PowerShell despues de instalar" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "     ❌ Error al verificar AWS CLI" -ForegroundColor Red
    exit 1
}

# 2. Verificar que las credenciales estén configuradas
Write-Host "  2. Verificando credenciales de AWS..." -ForegroundColor White

# Construir comando con perfil si se especificó
$awsCmdPrefix = if ($AwsProfile) { "aws --profile $AwsProfile" } else { "aws" }

try {
    $awsIdentity = if ($AwsProfile) {
        aws sts get-caller-identity --profile $AwsProfile 2>&1
    } else {
        aws sts get-caller-identity 2>&1
    }
    if ($LASTEXITCODE -eq 0) {
        $identity = $awsIdentity | ConvertFrom-Json
        Write-Host "     ✅ Credenciales configuradas" -ForegroundColor Green
        Write-Host "        Usuario/ARN: $($identity.Arn)" -ForegroundColor Gray
        Write-Host "        Account ID: $($identity.Account)" -ForegroundColor Gray
    } else {
        Write-Host "     ❌ No se pudieron verificar las credenciales" -ForegroundColor Red
        Write-Host ""
        Write-Host "ERROR: Las credenciales de AWS no estan configuradas" -ForegroundColor Red
        Write-Host ""
        Write-Host "Configuracion de credenciales:" -ForegroundColor Yellow
        Write-Host "  1. Ejecuta: aws configure" -ForegroundColor White
        Write-Host "  2. Ingresa tu Access Key ID" -ForegroundColor White
        Write-Host "  3. Ingresa tu Secret Access Key" -ForegroundColor White
        Write-Host "  4. Selecciona la region (por defecto: us-east-1)" -ForegroundColor White
        Write-Host "  5. Formato de salida (opcional): json" -ForegroundColor White
        Write-Host ""
        Write-Host "O configura variables de entorno:" -ForegroundColor Yellow
        Write-Host "  `$env:AWS_ACCESS_KEY_ID = 'tu-access-key'" -ForegroundColor White
        Write-Host "  `$env:AWS_SECRET_ACCESS_KEY = 'tu-secret-key'" -ForegroundColor White
        Write-Host "  `$env:AWS_DEFAULT_REGION = 'us-east-1'" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "     ❌ Error al verificar credenciales" -ForegroundColor Red
    Write-Host "       Error: $_" -ForegroundColor Yellow
    exit 1
}

# 3. Verificar que el bucket exista y obtener su región real
Write-Host "  3. Verificando bucket S3 '$BucketName'..." -ForegroundColor White
$actualRegion = $Region
try {
    # Intentar obtener la ubicación del bucket
    $bucketLocation = if ($AwsProfile) {
        aws s3api get-bucket-location --bucket $BucketName --profile $AwsProfile 2>&1
    } else {
        aws s3api get-bucket-location --bucket $BucketName 2>&1
    }
    if ($LASTEXITCODE -eq 0) {
        $location = $bucketLocation | ConvertFrom-Json
        $actualRegion = if ($location.LocationConstraint) { $location.LocationConstraint } else { "us-east-1" }
        Write-Host "     ✅ Bucket existe en region: $actualRegion" -ForegroundColor Green
        
        if ($actualRegion -ne $Region) {
            Write-Host "     ⚠️  ADVERTENCIA: La region del bucket ($actualRegion) no coincide con la especificada ($Region)" -ForegroundColor Yellow
            Write-Host "     Actualizando region a: $actualRegion" -ForegroundColor Yellow
            $Region = $actualRegion
        }
    } else {
        $errorMsg = $bucketLocation -join " "
        if ($errorMsg -match "NoSuchBucket") {
            Write-Host "     ❌ El bucket no existe" -ForegroundColor Red
            Write-Host ""
            Write-Host "ERROR: El bucket '$BucketName' no existe" -ForegroundColor Red
            Write-Host ""
            Write-Host "Crear bucket:" -ForegroundColor Yellow
            Write-Host "  aws s3 mb s3://$BucketName --region $Region" -ForegroundColor White
            Write-Host ""
            Write-Host "O si el bucket esta en otra region, especifica:" -ForegroundColor Yellow
            Write-Host "  .\deploy-s3.ps1 -Region 'us-west-2'" -ForegroundColor White
            exit 1
        } elseif ($errorMsg -match "AccessDenied") {
            Write-Host "     ⚠️  No se puede verificar el bucket (AccessDenied)" -ForegroundColor Yellow
            Write-Host "        Esto puede indicar falta de permisos s3:GetBucketLocation" -ForegroundColor Gray
            Write-Host "        Continuando con region especificada: $Region" -ForegroundColor Gray
        } else {
            Write-Host "     ⚠️  No se pudo obtener la region del bucket: $errorMsg" -ForegroundColor Yellow
            Write-Host "        Continuando con region especificada: $Region" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "     ⚠️  No se pudo verificar el bucket" -ForegroundColor Yellow
    Write-Host "        Continuando con region especificada: $Region" -ForegroundColor Gray
}

# 4. Verificar permisos necesarios
Write-Host "  4. Verificando permisos necesarios..." -ForegroundColor White
Write-Host "     Permisos requeridos en IAM:" -ForegroundColor Gray
Write-Host "       - s3:PutObject" -ForegroundColor Gray
Write-Host "       - s3:PutObjectAcl" -ForegroundColor Gray
Write-Host "       - s3:GetBucketLocation" -ForegroundColor Gray
Write-Host "       - s3:PutBucketWebsite" -ForegroundColor Gray
Write-Host "       - s3:PutBucketPolicy" -ForegroundColor Gray
Write-Host "     (O usar la politica AmazonS3FullAccess para desarrollo)" -ForegroundColor Gray

Write-Host ""
Write-Host "Verificaciones completadas. Continuando con el despliegue..." -ForegroundColor Green
Write-Host ""

# Verificar que estamos en el directorio correcto (debe tener package.json)
if (-not (Test-Path "package.json")) {
    Write-Host "Error: No se encontro package.json en el directorio actual" -ForegroundColor Red
    Write-Host "Asegurate de estar en el directorio del proyecto frontend" -ForegroundColor Yellow
    exit 1
}

# Verificar configuración de producción
Write-Host "Verificando configuracion de produccion..." -ForegroundColor Cyan
if (Test-Path ".env.production") {
    $prodConfig = Get-Content ".env.production" | Where-Object { $_ -match "VITE_APP_API_URL|VITE_API_URL" }
    if ($prodConfig) {
        Write-Host "Configuracion de produccion encontrada:" -ForegroundColor Green
        Write-Host "   $prodConfig" -ForegroundColor White
    } else {
        Write-Host "No se encontro VITE_APP_API_URL o VITE_API_URL en .env.production" -ForegroundColor Yellow
    }
} elseif (Test-Path "env.production") {
    $prodConfig = Get-Content "env.production" | Where-Object { $_ -match "VITE_APP_API_URL|VITE_API_URL" }
    if ($prodConfig) {
        Write-Host "Configuracion de produccion encontrada:" -ForegroundColor Green
        Write-Host "   $prodConfig" -ForegroundColor White
    } else {
        Write-Host "No se encontro VITE_APP_API_URL o VITE_API_URL en env.production" -ForegroundColor Yellow
    }
} else {
    Write-Host "Archivo .env.production o env.production no encontrado" -ForegroundColor Yellow
}

# Función para hacer la build
function Invoke-Build {
    Write-Host "Iniciando proceso de build..." -ForegroundColor Blue
    
    # Verificar si node_modules existe
    if (-not (Test-Path "node_modules")) {
        Write-Host "Instalando dependencias..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Fallo la instalacion de dependencias" -ForegroundColor Red
            exit 1
        }
    }
    
    # Limpiar build anterior si existe
    if (Test-Path $BuildPath) {
        Write-Host "Limpiando build anterior..." -ForegroundColor Yellow
        Remove-Item -Path $BuildPath -Recurse -Force
    }
    
    # Ejecutar build
    Write-Host "Ejecutando npm run build..." -ForegroundColor Blue
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Fallo la build del proyecto" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Build completada exitosamente!" -ForegroundColor Green
}

# Hacer la build si no se especifica SkipBuild
if (-not $SkipBuild) {
    Invoke-Build
} else {
    Write-Host "Saltando build (SkipBuild especificado)" -ForegroundColor Yellow
}

# Verificar que existe el directorio dist (Vite usa 'dist', no 'build')
if (-not (Test-Path $BuildPath)) {
    Write-Host "Error: No se encontro el directorio $BuildPath" -ForegroundColor Red
    Write-Host "Ejecuta 'npm run build' primero o usa el script sin SkipBuild" -ForegroundColor Yellow
    exit 1
}

# Función para obtener el tipo MIME correcto
function Get-MimeType {
    param([string]$FilePath)
    
    $extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
    
    switch ($extension) {
        ".html" { return "text/html; charset=utf-8" }
        ".css" { return "text/css" }
        ".js" { return "application/javascript" }
        ".jsx" { return "application/javascript" }
        ".ts" { return "application/javascript" }
        ".tsx" { return "application/javascript" }
        ".json" { return "application/json" }
        ".png" { return "image/png" }
        ".jpg" { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".gif" { return "image/gif" }
        ".svg" { return "image/svg+xml" }
        ".ico" { return "image/x-icon" }
        ".woff" { return "font/woff" }
        ".woff2" { return "font/woff2" }
        ".ttf" { return "font/ttf" }
        ".eot" { return "application/vnd.ms-fontobject" }
        ".mp4" { return "video/mp4" }
        ".webm" { return "video/webm" }
        ".ogg" { return "video/ogg" }
        ".pdf" { return "application/pdf" }
        ".xml" { return "application/xml" }
        ".txt" { return "text/plain" }
        ".map" { return "application/json" }
        default { return "application/octet-stream" }
    }
}

# Subir archivos con tipos MIME correctos
Write-Host "Subiendo archivos a S3..." -ForegroundColor Blue
$uploadCount = 0
$errorCount = 0

Get-ChildItem -Path $BuildPath -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring((Resolve-Path $BuildPath).Path.Length + 1)
    $s3Key = $relativePath.Replace("\", "/")
    $mimeType = Get-MimeType -FilePath $_.FullName
    
    Write-Host "Subiendo: $s3Key" -ForegroundColor Cyan
    
    # Construir comando con perfil si se especificó
    $profileArg = if ($AwsProfile) { "--profile $AwsProfile" } else { "" }
    
    # Intentar subir sin ACL primero (más común)
    if ($AwsProfile) {
        aws s3 cp $_.FullName "s3://$BucketName/$s3Key" `
            --content-type $mimeType `
            --region $Region `
            --cache-control "public, max-age=31536000, immutable" `
            --metadata-directive REPLACE `
            --no-acl `
            --profile $AwsProfile 2>&1 | Out-Null
    } else {
        aws s3 cp $_.FullName "s3://$BucketName/$s3Key" `
            --content-type $mimeType `
            --region $Region `
            --cache-control "public, max-age=31536000, immutable" `
            --metadata-directive REPLACE `
            --no-acl 2>&1 | Out-Null
    }
    
    # Si falla, intentar sin --no-acl (para buckets con ACL habilitado)
    if ($LASTEXITCODE -ne 0) {
        if ($AwsProfile) {
            aws s3 cp $_.FullName "s3://$BucketName/$s3Key" `
                --content-type $mimeType `
                --region $Region `
                --cache-control "public, max-age=31536000, immutable" `
                --metadata-directive REPLACE `
                --profile $AwsProfile 2>&1 | Out-Null
        } else {
            aws s3 cp $_.FullName "s3://$BucketName/$s3Key" `
                --content-type $mimeType `
                --region $Region `
                --cache-control "public, max-age=31536000, immutable" `
                --metadata-directive REPLACE 2>&1 | Out-Null
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        $uploadCount++
    } else {
        $errorCount++
        Write-Host "  Error al subir: $s3Key" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Archivos subidos: $uploadCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Archivos con error: $errorCount" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  ERRORES DE PERMISOS DETECTADOS" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para diagnosticar el problema, ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\check-aws-permissions.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "SOLUCION:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Ve a la Consola de AWS IAM:" -ForegroundColor White
    Write-Host "   https://console.aws.amazon.com/iam/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Navega a: Usuarios → juankx → Agregar permisos" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Crea una politica personalizada con este JSON:" -ForegroundColor White
    Write-Host ""
    $policyExample = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
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
    Write-Host $policyExample -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Nombra la politica: KemperyWorldTravelS3Deploy" -ForegroundColor White
    Write-Host ""
    Write-Host "5. Adjunta la politica al usuario" -ForegroundColor White
    Write-Host ""
    Write-Host "6. Vuelve a ejecutar el script de despliegue" -ForegroundColor White
    Write-Host ""
    Write-Host "NOTAS:" -ForegroundColor Yellow
    Write-Host "   - Bucket actual: $BucketName" -ForegroundColor Gray
    Write-Host "   - Region actual: $Region" -ForegroundColor Gray
    Write-Host "   - Usuario: juankx" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Si necesitas cambiar el bucket o region:" -ForegroundColor White
    Write-Host "   .\deploy-s3.ps1 -BucketName 'otro-bucket' -Region 'us-west-2'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   OPCION ALTERNATIVA (solo para desarrollo):" -ForegroundColor Yellow
    Write-Host "   Agrega la politica predefinida: AmazonS3FullAccess" -ForegroundColor White
    Write-Host "   (Esta politica da permisos completos a S3, usar solo para desarrollo)" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Deshabilitar Block Public Access (necesario para políticas públicas)
Write-Host ""
Write-Host "Configurando permisos publicos del bucket..." -ForegroundColor Blue
if ($AwsProfile) {
    aws s3api put-public-access-block --bucket $BucketName `
        --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" `
        --profile $AwsProfile 2>&1 | Out-Null
} else {
    aws s3api put-public-access-block --bucket $BucketName `
        --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" `
        2>&1 | Out-Null
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Block Public Access deshabilitado correctamente" -ForegroundColor Green
} else {
    Write-Host "Advertencia: No se pudo deshabilitar Block Public Access" -ForegroundColor Yellow
    Write-Host "Esto puede ser necesario para que el sitio sea accesible publicamente" -ForegroundColor Yellow
}

# Configurar el bucket para hosting web
Write-Host ""
Write-Host "Configurando bucket para hosting web..." -ForegroundColor Blue
if ($AwsProfile) {
    aws s3 website "s3://$BucketName" `
        --index-document index.html `
        --error-document index.html `
        --profile $AwsProfile
} else {
    aws s3 website "s3://$BucketName" `
        --index-document index.html `
        --error-document index.html
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Advertencia: No se pudo configurar el hosting web del bucket" -ForegroundColor Yellow
    Write-Host "El bucket puede necesitar configuracion manual" -ForegroundColor Yellow
}

# Configurar política de bucket (si es necesario)
Write-Host "Configurando politica de bucket..." -ForegroundColor Blue
$bucketPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Sid = "PublicReadGetObject"
            Effect = "Allow"
            Principal = "*"
            Action = "s3:GetObject"
            Resource = "arn:aws:s3:::$BucketName/*"
        }
    )
} | ConvertTo-Json -Depth 10 -Compress

# Guardar la política en un archivo temporal con formato correcto para AWS CLI
$tempPolicyFile = [System.IO.Path]::GetTempFileName()
$bucketPolicy | Out-File -FilePath $tempPolicyFile -Encoding utf8 -NoNewline

# Convertir la ruta de Windows a formato Unix para AWS CLI
$policyPath = $tempPolicyFile.Replace('\', '/')

if ($AwsProfile) {
    aws s3api put-bucket-policy --bucket $BucketName --policy "file://$policyPath" --profile $AwsProfile 2>&1 | Out-Null
} else {
    aws s3api put-bucket-policy --bucket $BucketName --policy "file://$policyPath" 2>&1 | Out-Null
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Politica de bucket configurada correctamente" -ForegroundColor Green
} else {
    Write-Host "Advertencia: No se pudo configurar la politica del bucket" -ForegroundColor Yellow
    Write-Host "Intentando con metodo alternativo..." -ForegroundColor Yellow
    
    # Método alternativo: pasar la política directamente como string
    $policyJson = $bucketPolicy
    if ($AwsProfile) {
        aws s3api put-bucket-policy --bucket $BucketName --policy $policyJson --profile $AwsProfile 2>&1 | Out-Null
    } else {
        aws s3api put-bucket-policy --bucket $BucketName --policy $policyJson 2>&1 | Out-Null
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Politica de bucket configurada correctamente (metodo alternativo)" -ForegroundColor Green
    } else {
        Write-Host "No se pudo configurar la politica automaticamente" -ForegroundColor Red
        Write-Host "Por favor, configurala manualmente desde la consola de AWS:" -ForegroundColor Yellow
        Write-Host "  1. Ve a: https://console.aws.amazon.com/s3/" -ForegroundColor White
        Write-Host "  2. Selecciona el bucket: $BucketName" -ForegroundColor White
        Write-Host "  3. Ve a: Permisos > Política del bucket" -ForegroundColor White
        Write-Host "  4. Pega esta politica:" -ForegroundColor White
        Write-Host $bucketPolicy -ForegroundColor Gray
    }
}

Remove-Item $tempPolicyFile -ErrorAction SilentlyContinue

# Solo mostrar éxito si no hubo errores en las subidas
if ($uploadCount -gt 0 -and $errorCount -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Despliegue completado exitosamente!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}
Write-Host ""
Write-Host "URLs del sitio:" -ForegroundColor Cyan
Write-Host "   S3 Website: http://$BucketName.s3-website-$Region.amazonaws.com" -ForegroundColor White
Write-Host "   CloudFront: https://kemperyworldtravel.com" -ForegroundColor White
Write-Host ""
Write-Host "VERIFICACION POST-DESPLIEGUE:" -ForegroundColor Yellow
Write-Host "   1. Verificar que el frontend cargue correctamente" -ForegroundColor White
Write-Host "   2. Verificar que la API este funcionando" -ForegroundColor White
Write-Host "   3. Probar login y registro de usuarios" -ForegroundColor White
Write-Host "   4. Verificar formularios de contacto" -ForegroundColor White
Write-Host "   5. Verificar integracion con WhatsApp" -ForegroundColor White
Write-Host ""
Write-Host "NOTAS IMPORTANTES:" -ForegroundColor Cyan
Write-Host "   - Si usas CloudFront, la URL sera: https://kemperyworldtravel.com" -ForegroundColor White
Write-Host "   - Asegurate de tener configurado el dominio en Route 53 y CloudFront" -ForegroundColor White
Write-Host "   - Verifica los permisos del bucket S3 en la consola de AWS" -ForegroundColor White
Write-Host ""

