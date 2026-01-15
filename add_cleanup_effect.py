# -*- coding: utf-8 -*-
import sys

file_path = "frontend/src/pages/CobranzasPanel.jsx"

# Leer el archivo con encoding UTF-8
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Encontrar la línea que contiene "Resetear"
target_idx = None
for i, line in enumerate(lines):
    if "Resetear" in line:
        target_idx = i
        print(f"Encontrada línea {i+1}: {line.strip()[:50]}")
        break

if target_idx is None:
    print("No se encontró la línea")
    sys.exit(1)

# Crear las nuevas líneas del useEffect
new_effect_lines = [
    "  // Limpiar estado cuando cambia de usuario\n",
    "  useEffect(() => {\n",
    "    setPeriodSummary({\n",
    "      sales: { total_ventas: 0, total_monto: 0, ventas_pagadas: 0, monto_pagado: 0 },\n",
    "      collections: { total_cobranzas: 0, total_monto: 0, cobranzas_pagadas: 0, monto_pagado: 0 }\n",
    "    })\n",
    "  }, [user?.id])\n",
    "\n"
]

# Insertar antes de la línea target
new_content = lines[:target_idx] + new_effect_lines + lines[target_idx:]

# Guardar con encoding UTF-8
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_content)

print(f"✅ useEffect agregado")
print(f"✅ Archivo actualizado")
