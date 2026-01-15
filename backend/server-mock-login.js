const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// JWT Secret
const JWT_SECRET = 'Kempery2025+SecureKey2026';

// Usuarios de prueba (en memoria)
const users = {
  'admin': { 
    id: 1, 
    email: 'admin', 
    password: 'Kempery2025+', 
    first_name: 'Admin', 
    last_name: 'User', 
    role: 'admin' 
  },
  'paola': { 
    id: 2, 
    email: 'paola', 
    password: 'Kempery2025+', 
    first_name: 'Paola', 
    last_name: 'Usuario', 
    role: 'employee' 
  },
  'cobranzas': {
    id: 3,
    email: 'cobranzas',
    password: 'Kempery2025+',
    first_name: 'Cobranzas',
    last_name: 'User',
    role: 'cobranza' 
  }
};

// Rutas de autenticación
app.post('/api/auth/login', async (req, res) => {
  console.log('📨 Solicitud de login recibida:', req.body);
  
  const { email, password } = req.body;

  // Validar entrada
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Email y password son requeridos' 
    });
  }

  // Buscar usuario (el email puede ser username o email)
  const user = users[email];

  if (!user || user.password !== password) {
    console.log('❌ Credenciales inválidas para:', email);
    return res.status(401).json({ 
      error: 'Credenciales inválidas' 
    });
  }

  // Generar JWT
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('✅ Login exitoso para:', email, '- Rol:', user.role);

  res.json({
    ok: true,
    message: 'Login exitoso',
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    }
  });
});

// Verificar token
app.get('/api/auth/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ valid: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ 
      valid: true, 
      user: decoded 
    });
  } catch (err) {
    res.status(401).json({ 
      valid: false, 
      error: 'Token inválido o expirado',
      code: 'TOKEN_EXPIRED'
    });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ ok: true, message: 'Logout exitoso' });
});

// Obtener perfil
app.get('/api/auth/profile', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users[decoded.email];
    res.json({ 
      ok: true, 
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Datos de prueba para clientes
let clients = [
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
];

let nextClientId = 3;

// Obtener clientes con paginación
app.get('/api/clients', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    
    // Parámetros de paginación y búsqueda
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    // Filtrar clientes por búsqueda
    let filteredClients = clients;
    if (search) {
      filteredClients = clients.filter(c => 
        c.first_name.toLowerCase().includes(search.toLowerCase()) ||
        c.last_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.contract_number.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedClients = filteredClients.slice(startIndex, endIndex);

    res.json({
      ok: true,
      data: paginatedClients,
      clients: paginatedClients,
      pagination: {
        page,
        limit,
        total: filteredClients.length,
        pages: Math.ceil(filteredClients.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ 
      error: 'Token inválido',
      message: err.message 
    });
  }
});

// Crear nuevo cliente
app.post('/api/clients', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    // Decodificar token para obtener user_id
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const userId = decodedToken.id;
    
    const { first_name, last_name, email, phone, contract_number, status } = req.body;

    // Validar campos requeridos
    if (!first_name || !last_name || !email || !contract_number) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['first_name', 'last_name', 'email', 'contract_number']
      });
    }

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
    };

    clients.push(newClient);

    console.log('✅ Cliente creado:', newClient);

    res.status(201).json({
      ok: true,
      message: 'Cliente creado exitosamente',
      data: newClient
    });
  } catch (err) {
    res.status(401).json({ 
      error: 'Token inválido',
      message: err.message 
    });
  }
});

// Obtener estadísticas de clientes
app.get('/api/clients/stats/overview', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    
    // Calcular estadísticas
    const stats = {
      total_clients: clients.length,
      active_clients: clients.filter(c => c.status === 'activo').length,
      total_revenue: 5000, // Mock data
      unpaid_clients: 2, // Mock data
      new_clients_30_days: 1,
      paid_clients: clients.filter(c => c.status === 'activo').length
    };

    console.log('✅ Estadísticas de clientes obtenidas');

    res.json({
      ok: true,
      stats
    });
  } catch (err) {
    res.status(401).json({ 
      error: 'Token inválido',
      message: err.message 
    });
  }
});

// Datos de prueba para reservas
let bookings = [
  {
    id: 1,
    reference: 'RES001',
    client_id: 1,
    client_name: 'Juan Pérez',
    status: 'confirmed',
    destination: 'París',
    check_in: '2026-02-15',
    check_out: '2026-02-22',
    created_at: '2026-01-10'
  },
  {
    id: 2,
    reference: 'RES002',
    client_id: 2,
    client_name: 'María García',
    status: 'pending',
    destination: 'Barcelona',
    check_in: '2026-03-01',
    check_out: '2026-03-08',
    created_at: '2026-01-11'
  }
];

let nextBookingId = 3;

// Obtener reservas
app.get('/api/bookings', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    
    // Parámetros de paginación y búsqueda
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    // Filtrar reservas por búsqueda
    let filteredBookings = bookings;
    if (search) {
      filteredBookings = bookings.filter(b => 
        b.client_name.toLowerCase().includes(search.toLowerCase()) ||
        b.reference.toLowerCase().includes(search.toLowerCase()) ||
        b.destination.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

    res.json({
      ok: true,
      bookings: paginatedBookings,
      pagination: {
        page,
        limit,
        total: filteredBookings.length,
        pages: Math.ceil(filteredBookings.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ 
      error: 'Token inválido',
      message: err.message 
    });
  }
});

// Datos de prueba para pagos
let payments = [
  {
    id: 1,
    client_id: 1,
    client_name: 'Cliente Test 1',
    amount: 100,
    date: '2026-01-10',
    method: 'efectivo',
    status: 'completado',
    reference: 'PAG001'
  }
];

let nextPaymentId = 2;

// Obtener pagos
app.get('/api/payments', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    
    // Parámetros de paginación y búsqueda
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    // Filtrar pagos por búsqueda
    let filteredPayments = payments;
    if (search) {
      filteredPayments = payments.filter(p => 
        p.client_name.toLowerCase().includes(search.toLowerCase()) ||
        p.reference.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

    res.json({
      ok: true,
      data: paginatedPayments,
      pagination: {
        page,
        limit,
        total: filteredPayments.length,
        pages: Math.ceil(filteredPayments.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ 
      error: 'Token inválido',
      message: err.message 
    });
  }
});

// Registrar nuevo pago
app.post('/api/payments', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    
    // Aceptar ambos formatos de nombres de campo
    const client_id = req.body.client_id;
    const client_name = req.body.client_name;
    const amount = req.body.payment_amount || req.body.amount;
    const date = req.body.payment_date || req.body.date;
    const method = req.body.payment_method || req.body.method;
    const reference = req.body.reference;
    const notes = req.body.notes || '';
    const installment_number = req.body.installment_number;

    // Validar campos requeridos
    if (!client_id || !client_name || !amount || !date || !method) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['client_id', 'client_name', 'amount/payment_amount', 'date/payment_date', 'method/payment_method']
      });
    }

    // Crear nuevo pago
    const newPayment = {
      id: nextPaymentId++,
      client_id: parseInt(client_id),
      client_name,
      payment_amount: parseFloat(amount),
      payment_date: date,
      payment_method: method,
      installment_number: installment_number ? parseInt(installment_number) : null,
      reference: reference || `PAG${String(nextPaymentId).padStart(3, '0')}`,
      notes: notes || '',
      status: 'completado',
      created_at: new Date().toISOString()
    };

    payments.push(newPayment);

    console.log('✅ Pago registrado:', newPayment);

    res.status(201).json({
      ok: true,
      message: 'Pago registrado exitosamente',
      data: newPayment
    });
  } catch (err) {
    res.status(401).json({ 
      error: 'Token inválido',
      message: err.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Kempery Mock API is running',
    timestamp: new Date().toISOString()
  });
});

// Endpoints de reportes
app.get('/api/reports/dashboard', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        total_sales: 15000,
        total_collections: 12000,
        pending_payments: 3000,
        active_bookings: 5,
        new_clients: 3
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/sales', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        total: 15000,
        details: []
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/collections', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        total: 12000,
        details: []
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/requirements', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        total: 8,
        completed: 6,
        pending: 2
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/bookings', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        total: 10,
        confirmed: 8,
        pending: 2
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/last-month-summary', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        sales: 15000,
        collections: 12000,
        expenses: 3000,
        net_income: 9000
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/employee-dashboard', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        totalClients: 25,
        unpaidClients: 5,
        totalDebt: 15000,
        collectedAmount: 12000,
        pendingAmount: 3000,
        collectionRate: 80,
        periodSummary: {
          sales: {
            total_ventas: 15000,
            ventas_completadas: 12000,
            ventas_pendientes: 3000
          },
          collections: {
            total_cobrado: 12000,
            total_por_cobrar: 3000,
            tasa_cobranza: 80
          }
        }
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/cobranzas-dashboard', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        total_collected: 12000,
        pending_collection: 3000,
        collection_rate: 80,
        periodSummary: {
          sales: {
            total_ventas: 15000,
            ventas_completadas: 12000,
            ventas_pendientes: 3000
          },
          collections: {
            total_cobrado: 12000,
            total_por_cobrar: 3000,
            tasa_cobranza: 80
          }
        }
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/collections-detailed', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        collections: [],
        total: 0
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/reports/collections-full-report', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({
      ok: true,
      data: {
        report: [],
        summary: {}
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Mock data para audit logs
let auditLogs = [
  {
    id: 1,
    user_id: 1,
    user_name: 'Admin User',
    action: 'CREATE_CLIENT',
    action_type: 'create',
    description: 'Created new client Juan Pérez',
    resource_type: 'client',
    resource_id: 1,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    ip_address: '192.168.1.1',
    status: 'success'
  },
  {
    id: 2,
    user_id: 2,
    user_name: 'Paola Usuario',
    action: 'CREATE_PAYMENT',
    action_type: 'create',
    description: 'Created payment for client',
    resource_type: 'payment',
    resource_id: 1,
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    ip_address: '192.168.1.2',
    status: 'success'
  },
  {
    id: 3,
    user_id: 1,
    user_name: 'Admin User',
    action: 'VIEW_REPORT',
    action_type: 'view',
    description: 'Viewed sales report',
    resource_type: 'report',
    resource_id: 5,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    ip_address: '192.168.1.1',
    status: 'success'
  }
];

// Mock data para agendas
let reservationAgendas = [
  {
    id: 1,
    booking_id: 1,
    booking_reference: 'BK001-2025',
    client_name: 'Juan Pérez',
    destination: 'París',
    check_in: '2025-02-15',
    check_out: '2025-02-22',
    status: 'confirmed',
    notes: 'Reserva confirmada para París'
  },
  {
    id: 2,
    booking_id: 2,
    booking_reference: 'BK002-2025',
    client_name: 'María García',
    destination: 'Barcelona',
    check_in: '2025-03-01',
    check_out: '2025-03-05',
    status: 'pending',
    notes: 'Pendiente de confirmación'
  }
];

let visaAgendas = [
  {
    id: 1,
    client_id: 1,
    client_name: 'Juan Pérez',
    destination_country: 'Francia',
    visa_type: 'Schengen',
    appointment_date: '2025-02-05',
    appointment_time: '10:00 AM',
    status: 'scheduled',
    notes: 'Cita para entrevista de visa'
  },
  {
    id: 2,
    client_id: 2,
    client_name: 'María García',
    destination_country: 'España',
    visa_type: 'Schengen',
    appointment_date: '2025-02-10',
    appointment_time: '02:00 PM',
    status: 'pending',
    notes: 'Pendiente de confirmación'
  }
];

let flightAgendas = [
  {
    id: 1,
    booking_id: 1,
    booking_reference: 'BK001-2025',
    flight_number: 'AF1234',
    airline: 'Air France',
    departure_city: 'Miami',
    arrival_city: 'París',
    departure_date: '2025-02-15',
    departure_time: '08:00 AM',
    status: 'confirmed',
    notes: 'Vuelo confirmado'
  },
  {
    id: 2,
    booking_id: 2,
    flight_number: 'IB5678',
    airline: 'Iberia',
    departure_city: 'Miami',
    arrival_city: 'Barcelona',
    departure_date: '2025-03-01',
    departure_time: '06:00 PM',
    status: 'pending',
    notes: 'Confirmación pendiente'
  }
];

// Endpoints de Audit Logs
app.get('/api/audit-logs', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const paginatedLogs = auditLogs.slice(skip, skip + limit);
    
    res.json({
      ok: true,
      logs: paginatedLogs,
      data: paginatedLogs,
      pagination: {
        total: auditLogs.length,
        page,
        limit,
        pages: Math.ceil(auditLogs.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.post('/api/audit-logs', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const newLog = {
      id: auditLogs.length + 1,
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    auditLogs.push(newLog);
    
    res.status(201).json({
      ok: true,
      data: newLog,
      message: 'Audit log created successfully'
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/audit-logs/stats', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const stats = {
      total_logs: auditLogs.length,
      actions_count: {},
      users_count: {},
      today_logs: auditLogs.filter(log => {
        const logDate = new Date(log.timestamp).toDateString();
        const today = new Date().toDateString();
        return logDate === today;
      }).length,
      success_rate: 95,
      error_rate: 5
    };
    
    // Contar acciones
    auditLogs.forEach(log => {
      stats.actions_count[log.action] = (stats.actions_count[log.action] || 0) + 1;
      stats.users_count[log.user_name] = (stats.users_count[log.user_name] || 0) + 1;
    });
    
    res.json({
      ok: true,
      stats,
      data: stats
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/audit-logs/user/:userId', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const userId = parseInt(req.params.userId);
    const userLogs = auditLogs.filter(log => log.user_id === userId);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const paginatedLogs = userLogs.slice(skip, skip + limit);
    
    res.json({
      ok: true,
      logs: paginatedLogs,
      data: paginatedLogs,
      pagination: {
        total: userLogs.length,
        page,
        limit,
        pages: Math.ceil(userLogs.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.get('/api/audit-logs/action/:action', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const action = req.params.action.toUpperCase();
    const actionLogs = auditLogs.filter(log => log.action === action);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const paginatedLogs = actionLogs.slice(skip, skip + limit);
    
    res.json({
      ok: true,
      logs: paginatedLogs,
      data: paginatedLogs,
      pagination: {
        total: actionLogs.length,
        page,
        limit,
        pages: Math.ceil(actionLogs.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Endpoints de Reservation Agenda
app.get('/api/reservation-agenda', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const paginatedAgendas = reservationAgendas.slice(skip, skip + limit);
    
    res.json({
      ok: true,
      data: paginatedAgendas,
      agendas: paginatedAgendas,
      pagination: {
        total: reservationAgendas.length,
        page,
        limit,
        pages: Math.ceil(reservationAgendas.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Endpoints de Visa Agenda
app.get('/api/visa-agenda', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const paginatedAgendas = visaAgendas.slice(skip, skip + limit);
    
    res.json({
      ok: true,
      data: paginatedAgendas,
      agendas: paginatedAgendas,
      pagination: {
        total: visaAgendas.length,
        page,
        limit,
        pages: Math.ceil(visaAgendas.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Endpoints de Flight Agenda
app.get('/api/flight-agenda', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const paginatedAgendas = flightAgendas.slice(skip, skip + limit);
    
    res.json({
      ok: true,
      data: paginatedAgendas,
      agendas: paginatedAgendas,
      pagination: {
        total: flightAgendas.length,
        page,
        limit,
        pages: Math.ceil(flightAgendas.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Mock data para payment agreements
let paymentAgreements = [
  {
    id: 1,
    client_id: 1,
    client_name: 'Juan Pérez',
    agreement_number: 'PA-001-2025',
    amount: 5000,
    currency: 'USD',
    status: 'active',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    payment_frequency: 'monthly',
    description: 'Acuerdo de pago mensual para viaje a París'
  },
  {
    id: 2,
    client_id: 2,
    client_name: 'María García',
    agreement_number: 'PA-002-2025',
    amount: 3500,
    currency: 'USD',
    status: 'active',
    start_date: '2025-02-01',
    end_date: '2025-08-31',
    payment_frequency: 'monthly',
    description: 'Acuerdo de pago para viaje a Barcelona'
  }
];

// Endpoints de Payment Agreements
app.get('/api/payment-agreements', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const limit = parseInt(req.query.limit) || 1000;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const paginatedAgreements = paymentAgreements.slice(skip, skip + limit);
    
    res.json({
      ok: true,
      data: paginatedAgreements,
      agreements: paginatedAgreements,
      total: paymentAgreements.length,
      totalPages: Math.ceil(paymentAgreements.length / limit),
      pagination: {
        total: paymentAgreements.length,
        page,
        limit,
        pages: Math.ceil(paymentAgreements.length / limit)
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.post('/api/payment-agreements', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    
    const newAgreement = {
      id: paymentAgreements.length + 1,
      ...req.body,
      created_at: new Date().toISOString()
    };
    
    paymentAgreements.push(newAgreement);
    
    res.status(201).json({
      ok: true,
      data: newAgreement,
      message: 'Payment agreement created successfully'
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 SERVIDOR MOCK INICIADO');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('\n📋 Usuarios de prueba:');
  console.log('   • admin (Kempery2025+) - Rol: admin');
  console.log('   • paola (Kempery2025+) - Rol: employee');
  console.log('   • cobranzas (Kempery2025+) - Rol: employee');
  console.log('\n✅ CORS habilitado para http://localhost:3000\n');
});

