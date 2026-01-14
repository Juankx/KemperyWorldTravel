// Ejemplo de implementación de endpoints de auditoría para el backend
// Este archivo muestra cómo implementar los endpoints necesarios para el sistema de auditoría

const express = require('express');
const router = express.Router();

// Modelo de ejemplo para la tabla de auditoría
const AuditLog = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  action: 'VARCHAR(50) NOT NULL', // CREATE, UPDATE, DELETE
  entity_type: 'VARCHAR(50) NOT NULL', // CLIENT, BOOKING, REQUIREMENT, PAYMENT
  entity_id: 'VARCHAR(100) NOT NULL',
  user_id: 'INTEGER NOT NULL',
  user_email: 'VARCHAR(255) NOT NULL',
  user_role: 'VARCHAR(50) NOT NULL',
  old_data: 'TEXT', // JSON string de datos anteriores
  new_data: 'TEXT', // JSON string de datos nuevos
  details: 'TEXT',
  timestamp: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  ip_address: 'VARCHAR(45)',
  user_agent: 'TEXT'
};

// Middleware para registrar automáticamente cambios
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Registrar la acción después de que se complete la operación
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const auditData = {
          action,
          entity_type: entityType,
          entity_id: req.params.id || data.id || 'unknown',
          user_id: req.user?.id || 0,
          user_email: req.user?.email || 'unknown',
          user_role: req.user?.role || 'unknown',
          old_data: req.oldData ? JSON.stringify(req.oldData) : null,
          new_data: JSON.stringify(req.body),
          details: `${action} ${entityType}: ${req.user?.email}`,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent')
        };
        
        // Insertar en la base de datos (implementar según tu ORM/DB)
        insertAuditLog(auditData).catch(console.error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Endpoint para crear entrada de auditoría
router.post('/audit-logs', async (req, res) => {
  try {
    const auditData = {
      ...req.body,
      timestamp: new Date().toISOString()
    };
    
    const result = await insertAuditLog(auditData);
    res.status(201).json({
      success: true,
      audit_log: result
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating audit log'
    });
  }
});

// Endpoint para obtener historial de auditoría con filtros
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      sort = 'timestamp',
      order = 'desc',
      start_date,
      end_date,
      user_id,
      action,
      entity_type
    } = req.query;
    
    // Construir query con filtros
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (start_date) {
      query += ' AND timestamp >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND timestamp <= ?';
      params.push(end_date);
    }
    
    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }
    
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    
    if (entity_type) {
      query += ' AND entity_type = ?';
      params.push(entity_type);
    }
    
    // Ordenamiento
    query += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    
    // Paginación
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const auditLogs = await db.all(query, params);
    
    // Contar total para paginación
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)').replace(' LIMIT ? OFFSET ?', '');
    const countParams = params.slice(0, -2);
    const total = await db.get(countQuery, countParams);
    
    res.json({
      success: true,
      audit_logs: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total['COUNT(*)'],
        pages: Math.ceil(total['COUNT(*)'] / limit)
      }
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting audit logs'
    });
  }
});

// Endpoint para obtener historial por usuario
router.get('/audit-logs/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const auditLogs = await db.all(
      'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    
    res.json({
      success: true,
      audit_logs: auditLogs
    });
  } catch (error) {
    console.error('Error getting audit logs by user:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting audit logs by user'
    });
  }
});

// Endpoint para obtener historial por acción
router.get('/audit-logs/action/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { page = 1, limit = 100 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const auditLogs = await db.all(
      'SELECT * FROM audit_logs WHERE action = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [action, limit, offset]
    );
    
    res.json({
      success: true,
      audit_logs: auditLogs
    });
  } catch (error) {
    console.error('Error getting audit logs by action:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting audit logs by action'
    });
  }
});

// Endpoint para obtener estadísticas de auditoría
router.get('/audit-logs/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (start_date) {
      whereClause += ' AND timestamp >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND timestamp <= ?';
      params.push(end_date);
    }
    
    // Total de acciones
    const totalActions = await db.get(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params
    );
    
    // Acciones por tipo
    const actionsByType = await db.all(
      `SELECT action, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY action`,
      params
    );
    
    // Acciones por usuario
    const actionsByUser = await db.all(
      `SELECT user_email, user_role, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY user_email, user_role ORDER BY count DESC LIMIT 10`,
      params
    );
    
    // Actividad reciente (últimas 24 horas)
    const recentActivity = await db.all(
      `SELECT * FROM audit_logs ${whereClause} AND timestamp >= datetime('now', '-1 day') ORDER BY timestamp DESC LIMIT 20`,
      params
    );
    
    res.json({
      success: true,
      stats: {
        totalActions: totalActions.count,
        actionsByType: actionsByType.reduce((acc, item) => {
          acc[item.action] = item.count;
          return acc;
        }, {}),
        actionsByUser: actionsByUser,
        recentActivity: recentActivity
      }
    });
  } catch (error) {
    console.error('Error getting audit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting audit stats'
    });
  }
});

// Función helper para insertar entrada de auditoría
async function insertAuditLog(auditData) {
  const query = `
    INSERT INTO audit_logs (
      action, entity_type, entity_id, user_id, user_email, user_role,
      old_data, new_data, details, timestamp, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    auditData.action,
    auditData.entity_type,
    auditData.entity_id,
    auditData.user_id,
    auditData.user_email,
    auditData.user_role,
    auditData.old_data,
    auditData.new_data,
    auditData.details,
    auditData.timestamp,
    auditData.ip_address,
    auditData.user_agent
  ];
  
  const result = await db.run(query, params);
  return { id: result.lastID, ...auditData };
}

// Ejemplo de uso del middleware en rutas existentes
router.put('/clients/:id', auditMiddleware('UPDATE', 'CLIENT'), async (req, res) => {
  // Obtener datos anteriores antes de la actualización
  const oldData = await db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  req.oldData = oldData;
  
  // Continuar con la lógica de actualización...
  // El middleware registrará automáticamente el cambio
});

router.delete('/clients/:id', auditMiddleware('DELETE', 'CLIENT'), async (req, res) => {
  // Obtener datos del cliente antes de eliminarlo
  const oldData = await db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  req.oldData = oldData;
  
  // Continuar con la lógica de eliminación...
  // El middleware registrará automáticamente el cambio
});

module.exports = router;



