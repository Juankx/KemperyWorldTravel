import re
import jwt

# Leer el archivo
with open('server-mock-login.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modificar los clientes para agregar created_by_user_id
old_clients = """let clients = [
  {
    id: 1,
    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan@example.com',
    phone: '+34 666 777 888',
    contract_number: 'CONT001',
    status: 'activo',
    created_at: '2026-01-01',
    in_collections: 'Si'
  },
  {
    id: 2,
    first_name: 'María',
    last_name: 'García',
    email: 'maria@example.com',
    phone: '+34 666 777 889',
    contract_number: 'CONT002',
    status: 'activo',
    created_at: '2026-01-02',
    in_collections: 'Si'
  }
];"""

new_clients = """let clients = [
  {
    id: 1,
    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan@example.com',
    phone: '+34 666 777 888',
    contract_number: 'CONT001',
    status: 'activo',
    created_at: '2026-01-01',
    in_collections: 'Si',
    created_by_user_id: 1
  },
  {
    id: 2,
    first_name: 'María',
    last_name: 'García',
    email: 'maria@example.com',
    phone: '+34 666 777 889',
    contract_number: 'CONT002',
    status: 'activo',
    created_at: '2026-01-02',
    in_collections: 'Si',
    created_by_user_id: 1
  }
];"""

content = content.replace(old_clients, new_clients)

# 2. Modificar POST /api/clients para guardar created_by_user_id
old_post_clients = """    // Crear nuevo cliente
    const newClient = {
      id: nextClientId++,
      first_name,
      last_name,
      email,
      phone: phone || '',
      contract_number,
      status: status || 'activo',
      created_at: new Date().toISOString().split('T')[0],
      in_collections: 'Si'
    };"""

new_post_clients = """    // Decodificar token para obtener user_id
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const userId = decodedToken.id;

    // Crear nuevo cliente
    const newClient = {
      id: nextClientId++,
      first_name,
      last_name,
      email,
      phone: phone || '',
      contract_number,
      status: status || 'activo',
      created_at: new Date().toISOString().split('T')[0],
      in_collections: 'Si',
      created_by_user_id: userId
    };"""

content = content.replace(old_post_clients, new_post_clients)

# Guardar el archivo
with open('server-mock-login.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Archivo actualizado exitosamente")
