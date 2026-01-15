#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys

# Leer el archivo
with open('frontend/src/pages/CobranzasPanel.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Buscar la línea "// Resetear a página"
target_line = None
for i, line in enumerate(lines):
    if 'Resetear' in line and 'página' in line:
        target_line = i
        break

if target_line is not None:
    # Crear el nuevo useEffect
    new_use_effect = [
        "  // Limpiar estado cuando cambia de usuario\n",
        "  useEffect(() => {\n",
        "    setPeriodSummary({\n",
        "      sales: { total_ventas: 0, total_monto: 0, ventas_pagadas: 0, monto_pagado: 0 },\n",
        "      collections: { total_cobranzas: 0, total_monto: 0, cobranzas_pagadas: 0, monto_pagado: 0 }\n",
        "    })\n",
        "  }, [user?.id])\n",
        "\n"
    ]
    
    # Insertar antes de esa línea
    new_lines = lines[:target_line] + new_use_effect + lines[target_line:]
    
    # Guardar el archivo
    with open('frontend/src/pages/CobranzasPanel.jsx', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print("✅ useEffect de limpieza agregado correctamente")
    print(f"   Insertado en línea {target_line + 1}")
else:
    print("❌ No se encontró la línea de referencia")
    sys.exit(1)
