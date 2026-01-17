const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Mock Data
const mockUsers = {
  'admin': {
    id: '1',
    email: 'admin',
    password: 'Kempery2025+',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin'
  },
  'paola': {
    id: '2',
    email: 'paola',
    password: 'Kempery2025+',
    first_name: 'Paola',
    last_name: 'Usuario',
    role: 'employee'
  },
  'cobranzas': {
    id: '3',
    email: 'cobranzas',
    password: 'Kempery2025+',
    first_name: 'Cobranzas',
    last_name: 'User',
    role: 'cobranza'
  }
};

const mockClients = [
  { id: '1', first_name: 'Juan', last_name: 'P�rez', email: 'juan@example.com', phone: '123456789', contract_number: 'CON-001' },
  { id: '2', first_name: 'Mar�a', last_name: 'Garc�a', email: 'maria@example.com', phone: '987654321', contract_number: 'CON-002' }
];

const mockPayments = [];
const mockAgreements = [];

// Middleware
// app.use(helmet()); // Desactivado para desarrollo
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Kempery Backend Mock Server',
    version: '1.0.0',
    mode: 'DEVELOPMENT (Mock Data)',
    endpoints: {
      health: '/api/health',
      login: 'POST /api/auth/login',
      clients: 'GET /api/clients',
      payments: 'GET /api/payments'
    }
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend (Mock Mode) is running' });
});

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers[email];
  
  if (user && user.password === password) {
    res.json({
      token: 'mock-jwt-token-' + Date.now(),
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/auth/verify', (req, res) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false, error: 'No token provided' });
  }
  
  // Mock token validation (starts with 'mock-jwt-token-')
  if (token.startsWith('mock-jwt-token-')) {
    // Return a mock user based on stored user info
    res.json({
      valid: true,
      user: {
        id: '1',
        email: 'cobranzas@kempery.com',
        first_name: 'Cobranzas',
        last_name: 'User',
        role: 'cobranza'
      }
    });
  } else {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

// Clients
app.get('/api/clients', (req, res) => {
  res.json({ data: mockClients, total: mockClients.length, totalPages: 1 });
});

app.post('/api/clients', (req, res) => {
  const newClient = { id: String(mockClients.length + 1), ...req.body, created_at: new Date() };
  mockClients.push(newClient);
  res.status(201).json(newClient);
});

// Payments
app.get('/api/payments', (req, res) => {
  res.json({ data: mockPayments, total: mockPayments.length, totalPages: 1 });
});

app.post('/api/payments', (req, res) => {
  const newPayment = { id: String(mockPayments.length + 1), ...req.body, created_at: new Date() };
  mockPayments.push(newPayment);
  res.status(201).json(newPayment);
});

// Payment Agreements
app.get('/api/payment-agreements', (req, res) => {
  res.json({ data: mockAgreements, total: mockAgreements.length, totalPages: 1 });
});

app.post('/api/payment-agreements', (req, res) => {
  const newAgreement = { id: String(mockAgreements.length + 1), ...req.body, created_at: new Date() };
  mockAgreements.push(newAgreement);
  res.status(201).json(newAgreement);
});

// Reports
app.get('/api/reports/dashboard', (req, res) => {
  res.json({
    totalClients: mockClients.length,
    unpaidClients: 2,
    totalDebt: 15000,
    collectedAmount: 5000,
    pendingAmount: 10000,
    collectionRate: 33.33
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('Backend Mock Server running on http://localhost:' + PORT);
  console.log('CORS enabled for: http://localhost:3000');
  console.log('Mode: DEVELOPMENT (Mock Data - No Database)');
  console.log('');
  console.log('Login Credentials (DEMO):');
  console.log('   Email: admin, paola, cobranzas');
  console.log('   Password: Kempery2025+');
  console.log('');
});

module.exports = app;


