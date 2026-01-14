const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  // Intentar obtener el token del header primero
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // Si no hay token en el header, intentar obtenerlo del query parameter
  // Esto es útil para iframes y enlaces directos
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Limpiar el token solo de espacios al inicio y final
    // Los JWT usan base64url que puede contener: A-Z, a-z, 0-9, -, _, .
    const cleanToken = token.trim();
    
    // Verificar que el token tenga el formato correcto (3 partes separadas por puntos)
    const tokenParts = cleanToken.split('.');
    if (tokenParts.length !== 3) {
      console.log('Token malformado - no tiene 3 partes:', tokenParts.length);
      return res.status(403).json({ error: 'Invalid token format' });
    }
    
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    
    // Check if token is expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired', 
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.' 
      });
    }
    
    // Check if token is invalid
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid token', 
        code: 'INVALID_TOKEN',
        message: 'Invalid token format.' 
      });
    }
    
    return res.status(403).json({ 
      error: 'Token verification failed', 
      code: 'TOKEN_VERIFICATION_FAILED',
      message: 'Unable to verify token.' 
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Employee access required' });
  }
  next();
};

const requireClientAccess = (req, res, next) => {
  if (req.user.role === 'employee' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Client management access required' });
};

const requireBookingAccess = (req, res, next) => {
  if (req.user.role === 'employee' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Booking management access required' });
};

const requireRequirementAccess = (req, res, next) => {
  if (req.user.role === 'employee' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Requirement management access required' });
};

// Middleware para verificar acceso a módulos específicos
const requireModuleAccess = (allowedModules) => {
  return (req, res, next) => {
    // Admin tiene acceso a todo
    if (req.user.role === 'admin') {
      return next();
    }

    // Verificar si el usuario tiene acceso al módulo
    if (req.user.role === 'employee') {
      // Usuario "Cobranzas" solo tiene acceso a clientes y cobranzas
      if (req.user.email === 'Cobranzas') {
        if (allowedModules.includes('clients') || allowedModules.includes('cobranzas')) {
          return next();
        }
      } else {
        // Otros empleados (Paola, Cristhian) tienen acceso a clientes, reservas, requerimientos, agenda de reservas, agenda de visados y agenda de vuelos
        if (allowedModules.includes('clients') || allowedModules.includes('bookings') || allowedModules.includes('requirements') || allowedModules.includes('reservation-agenda') || allowedModules.includes('visa-agenda') || allowedModules.includes('flight-agenda')) {
          return next();
        }
      }
    }

    return res.status(403).json({ error: 'No tienes acceso a este módulo' });
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireEmployee,
  requireClientAccess,
  requireBookingAccess,
  requireRequirementAccess,
  requireModuleAccess
};
