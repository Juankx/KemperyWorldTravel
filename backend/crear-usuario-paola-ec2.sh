#!/bin/bash
# Script para crear el usuario Paola en EC2

echo "=========================================="
echo "Creando usuario Paola en la base de datos"
echo "=========================================="
echo ""

cd ~/kempery-backend

# Verificar usuarios existentes
echo "1. Verificando usuarios existentes..."
node scripts/verificar-usuarios-ec2.js

echo ""
echo "2. Creando usuario Paola..."
node scripts/verificar-usuarios-ec2.js --crear-paola

echo ""
echo "3. Verificando que el usuario fue creado..."
node scripts/verificar-usuarios-ec2.js

echo ""
echo "=========================================="
echo "✅ Proceso completado"
echo "=========================================="
echo ""
echo "Credenciales del usuario Paola:"
echo "   Email: Paola"
echo "   Contraseña: Kempery2025+"
echo ""



