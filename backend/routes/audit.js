const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get audit logs with pagination and filters
router.get('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verificar si audit_logs existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        audit_logs: [],
        pagination: {
          page: parseInt(req.query.page || 1),
          limit: parseInt(req.query.limit || 100),
          total: 0,
          pages: 0
        }
      });
    }

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

    const offset = (page - 1) * limit;

    // Build query with filters
    let query = `
      SELECT 
        id, action, entity_type, entity_id, user_id, user_email, user_role,
        old_data, new_data, details, timestamp, ip_address, user_agent
      FROM audit_logs 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      query += ` AND timestamp >= $${paramCount}`;
      countQuery += ` AND timestamp >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND timestamp <= $${paramCount}`;
      countQuery += ` AND timestamp <= $${paramCount}`;
      queryParams.push(end_date);
    }

    if (user_id) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      countQuery += ` AND user_id = $${paramCount}`;
      queryParams.push(user_id);
    }

    if (action) {
      paramCount++;
      query += ` AND action = $${paramCount}`;
      countQuery += ` AND action = $${paramCount}`;
      queryParams.push(action);
    }

    if (entity_type) {
      paramCount++;
      query += ` AND entity_type = $${paramCount}`;
      countQuery += ` AND entity_type = $${paramCount}`;
      queryParams.push(entity_type);
    }

    // Sorting
    const allowedSortColumns = ['timestamp', 'action', 'entity_type', 'user_email'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'timestamp';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    // Prepare count query parameters (only filters, no pagination)
    const countParams = queryParams.slice(0, paramCount);

    const [auditLogsResult, countResult] = await Promise.all([
      client.query(query, queryParams),
      client.query(countQuery, countParams)
    ]);

    const totalLogs = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalLogs / limit);

    res.json({
      success: true,
      audit_logs: auditLogsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalLogs,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting audit logs'
    });
  } finally {
    client.release();
  }
});

// Get audit logs by user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        id, action, entity_type, entity_id, user_id, user_email, user_role,
        old_data, new_data, details, timestamp, ip_address, user_agent
      FROM audit_logs 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      success: true,
      audit_logs: result.rows
    });

  } catch (error) {
    console.error('Error getting audit logs by user:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting audit logs by user'
    });
  }
});

// Get audit logs by action
router.get('/action/:action', authenticateToken, async (req, res) => {
  try {
    const { action } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        id, action, entity_type, entity_id, user_id, user_email, user_role,
        old_data, new_data, details, timestamp, ip_address, user_agent
      FROM audit_logs 
      WHERE action = $1 
      ORDER BY timestamp DESC 
      LIMIT $2 OFFSET $3
    `, [action, limit, offset]);

    res.json({
      success: true,
      audit_logs: result.rows
    });

  } catch (error) {
    console.error('Error getting audit logs by action:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting audit logs by action'
    });
  }
});

// Get audit statistics
router.get('/stats', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verificar si audit_logs existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        stats: {
          totalActions: 0,
          actionsByType: {},
          actionsByUser: [],
          recentActivity: []
        }
      });
    }

    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND timestamp >= $1';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND timestamp <= $${params.length + 1}`;
      params.push(end_date);
    }

    // Total actions
    const totalActionsResult = await client.query(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params
    );

    // Actions by type
    const actionsByTypeResult = await client.query(
      `SELECT action, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY action`,
      params
    );

    // Actions by user
    const actionsByUserResult = await client.query(
      `SELECT user_email, user_role, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY user_email, user_role ORDER BY count DESC LIMIT 10`,
      params
    );

    // Recent activity (last 24 hours)
    const recentActivityResult = await client.query(
      `SELECT * FROM audit_logs ${whereClause} AND timestamp >= NOW() - INTERVAL '1 day' ORDER BY timestamp DESC LIMIT 20`,
      params
    );

    res.json({
      success: true,
      stats: {
        totalActions: parseInt(totalActionsResult.rows[0].count),
        actionsByType: actionsByTypeResult.rows.reduce((acc, item) => {
          acc[item.action] = parseInt(item.count);
          return acc;
        }, {}),
        actionsByUser: actionsByUserResult.rows,
        recentActivity: recentActivityResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting audit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting audit stats'
    });
  } finally {
    client.release();
  }
});

// Create audit log entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      action,
      entity_type,
      entity_id,
      user_id,
      user_email,
      user_role,
      old_data,
      new_data,
      details,
      ip_address,
      user_agent
    } = req.body;

    const result = await pool.query(`
      INSERT INTO audit_logs (
        action, entity_type, entity_id, user_id, user_email, user_role,
        old_data, new_data, details, timestamp, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)
      RETURNING *
    `, [
      action, entity_type, entity_id, user_id, user_email, user_role,
      old_data, new_data, details, ip_address, user_agent
    ]);

    res.status(201).json({
      success: true,
      audit_log: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating audit log'
    });
  }
});

module.exports = router;

