#!/usr/bin/env python3
# -*- coding: utf-8 -*-

file_path = "frontend/src/pages/CobranzasPanel.jsx"

# Leer el archivo
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Reemplazos a hacer
replacements = {
    'periodSummary.sales.total_monto': 'periodSummary?.sales?.total_monto ?? 0',
    'periodSummary.sales.ventas_pagadas': 'periodSummary?.sales?.ventas_pagadas ?? 0',
    'periodSummary.sales.monto_pagado': 'periodSummary?.sales?.monto_pagado ?? 0',
    'periodSummary.collections.monto_pagado': 'periodSummary?.collections?.monto_pagado ?? 0',
    'periodSummary.collections.cobranzas_pagadas': 'periodSummary?.collections?.cobranzas_pagadas ?? 0',
}

# Aplicar todos los reemplazos
for old, new in replacements.items():
    if old in content:
        content = content.replace(old, new)
        print(f"✓ Reemplazado: {old}")
    else:
        print(f"✗ No encontrado: {old}")

# Guardar el archivo
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Archivo actualizado con éxito")
