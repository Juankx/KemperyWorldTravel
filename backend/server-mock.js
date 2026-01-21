const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Mock Data - Users (Innovation Business)
const mockUsers = {
  'demo@innovation.com': {
    id: '1',
    email: 'demo@innovation.com',
    password: 'demo123',
    name: 'Demo User',
    role: 'customer',
    createdAt: new Date().toISOString()
  },
  'admin@innovation.com': {
    id: '2',
    email: 'admin@innovation.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  'customer@innovation.com': {
    id: '3',
    email: 'customer@innovation.com',
    password: 'customer123',
    name: 'Customer User',
    role: 'customer',
    createdAt: new Date().toISOString()
  }
};

// Mock Packages
const mockPackages = [
  {
    id: '1',
    city: 'Cartagena',
    country: 'Colombia',
    price: 800,
    description: 'Explora la magia de la ciudad amurallada',
    rating: 4.8,
    days: 5,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop'
  },
  {
    id: '2',
    city: 'Galápagos',
    country: 'Ecuador',
    price: 800,
    description: 'Descubre la vida silvestre única del planeta',
    rating: 4.9,
    days: 7,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop'
  },
  {
    id: '3',
    city: 'Punta Cana',
    country: 'República Dominicana',
    price: 800,
    description: 'Relájate en playas paradisíacas',
    rating: 4.7,
    days: 6,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop'
  }
];

// Mock Bookings
const mockBookings = [];

// Mock Reviews
const mockReviews = [
  {
    id: '1',
    userId: '1',
    packageId: '1',
    rating: 5,
    text: 'Experiencia extraordinaria. Innovation Business superó todas mis expectativas.',
    name: 'María González',
    destination: 'Cartagena, Colombia',
    verified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    userId: '2',
    packageId: '2',
    rating: 5,
    text: 'Increíble. La organización fue perfecta, guías profesionales y la naturaleza nos dejó sin palabras.',
    name: 'Juan Carlos Rodríguez',
    destination: 'Galápagos, Ecuador',
    verified: true,
    createdAt: new Date().toISOString()
  }
];

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
    message: 'Innovation Business Backend Mock Server',
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

// NEW: AUTH ENDPOINTS (Innovation Business)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers[email];
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    user: userWithoutPassword,
    token: 'mock-token-' + Date.now(),
    expiresIn: 86400
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (mockUsers[email]) {
    return res.status(400).json({ error: 'El email ya está registrado' });
  }

  const newUser = {
    id: String(Object.keys(mockUsers).length + 1),
    email,
    password,
    name,
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  mockUsers[email] = newUser;
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.status(201).json({
    user: userWithoutPassword,
    token: 'mock-token-' + Date.now(),
    expiresIn: 86400
  });
});

// NEW: PACKAGES ENDPOINTS (Innovation Business)
app.get('/api/packages', (req, res) => {
  res.json({
    data: mockPackages,
    total: mockPackages.length,
    totalPages: 1
  });
});

app.get('/api/packages/:id', (req, res) => {
  const pkg = mockPackages.find(p => p.id === req.params.id);
  if (!pkg) {
    return res.status(404).json({ error: 'Paquete no encontrado' });
  }
  res.json(pkg);
});

// NEW: BOOKINGS ENDPOINTS (Innovation Business)
app.post('/api/bookings', (req, res) => {
  const newBooking = {
    id: String(mockBookings.length + 1),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  mockBookings.push(newBooking);
  res.status(201).json(newBooking);
});

app.get('/api/bookings', (req, res) => {
  res.json({
    data: mockBookings,
    total: mockBookings.length,
    totalPages: 1
  });
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = mockBookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Reserva no encontrada' });
  }
  res.json(booking);
});

// NEW: REVIEWS ENDPOINTS (Innovation Business)
app.get('/api/reviews', (req, res) => {
  res.json({
    data: mockReviews,
    total: mockReviews.length,
    totalPages: 1
  });
});

app.post('/api/reviews', (req, res) => {
  const newReview = {
    id: String(mockReviews.length + 1),
    ...req.body,
    verified: false,
    createdAt: new Date().toISOString()
  };
  mockReviews.push(newReview);
  res.status(201).json(newReview);
});

app.get('/api/reviews/package/:packageId', (req, res) => {
  const reviews = mockReviews.filter(r => r.packageId === req.params.packageId);
  res.json({
    data: reviews,
    total: reviews.length,
    totalPages: 1
  });
});

// NEW: USERS ENDPOINTS (Innovation Business)
app.get('/api/users/profile', (req, res) => {
  // Mock: siempre devuelve el primer usuario
  const user = Object.values(mockUsers)[0];
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// LEGACY: Clients (mantener compatibilidad con Kempery)
app.get('/api/clients', (req, res) => {
  res.json({ data: mockClients, total: mockClients.length, totalPages: 1 });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🌟 Innovation Business Backend Mock Server running on http://localhost:' + PORT);
  console.log('CORS enabled for: http://localhost:3000, http://localhost:3001');
  console.log('Mode: DEVELOPMENT (Mock Data - No Database)');
  console.log('');
  console.log('📚 Available Endpoints:');
  console.log('   Authentication:');
  console.log('     POST /api/auth/login');
  console.log('     POST /api/auth/register');
  console.log('   Packages:');
  console.log('     GET /api/packages');
  console.log('     GET /api/packages/:id');
  console.log('   Bookings:');
  console.log('     GET /api/bookings');
  console.log('     POST /api/bookings');
  console.log('   Reviews:');
  console.log('     GET /api/reviews');
  console.log('     POST /api/reviews');
  console.log('');
  console.log('✅ Demo Credentials:');
  console.log('   Email: demo@innovation.com');
  console.log('   Password: demo123');
  console.log('');
});

module.exports = app;


