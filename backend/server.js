const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { setupDocumentColumns } = require('./utils/databaseSetup');
const { setupBookingEditColumns } = require('./utils/bookingEditSetup');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const requirementRoutes = require('./routes/requirements');
const paymentRoutes = require('./routes/payments');
const paymentAgreementRoutes = require('./routes/payment-agreements');
const documentRoutes = require('./routes/documents');
const reportRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const reservationAgendaRoutes = require('./routes/reservation-agenda');
const visaAgendaRoutes = require('./routes/visa-agenda');
const flightAgendaRoutes = require('./routes/flight-agenda');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Configurar Helmet para permitir iframes en rutas de documentos
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'frame-ancestors': [
        "'self'", 
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'https://kemperyworldtravel.com',
        'http://kemperyworldtravel.com'
      ]
    }
  },
  crossOriginEmbedderPolicy: false, // Permitir carga de recursos en iframes
  crossOriginResourcePolicy: { policy: "cross-origin" } // Permitir recursos cross-origin (para favicon y PDFs)
}));
// Configurar CORS para permitir múltiples orígenes
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://kemperyworldtravel.com',
  'http://kemperyworldtravel.com',
  'http://localhost:3000'
].filter(Boolean); // Eliminar valores undefined/null

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // En desarrollo, permitir cualquier origen
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-agreements', paymentAgreementRoutes);
const clientManagementRoutes = require('./routes/client-managements');
app.use('/api/client-managements', clientManagementRoutes);
const clientCollectionsCommentsRoutes = require('./routes/client-collections-comments');
app.use('/api/client-collections-comments', clientCollectionsCommentsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reservation-agenda', reservationAgendaRoutes);
app.use('/api/visa-agenda', visaAgendaRoutes);
app.use('/api/flight-agenda', flightAgendaRoutes);

// Favicon handler (evitar error 404)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Kempery World Travel API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Inicializar servidor con configuración de base de datos
async function startServer() {
  try {
    // Configurar base de datos
    await setupDocumentColumns();
    await setupBookingEditColumns();
    
    // Iniciar servidor
    // Escuchar en 0.0.0.0 para aceptar conexiones externas (necesario para EC2)
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();
