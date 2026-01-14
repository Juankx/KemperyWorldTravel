const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireClientAccess } = require('../middleware/auth');

const router = express.Router();

// Get all client managements with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'management_date', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        cm.id, cm.client_id, cm.contract_number, cm.management_date, cm.observation,
        cm.created_at, cm.updated_at,
        c.first_name, c.last_name, c.email, c.phone,
        u.first_name as created_by_first_name, u.last_name as created_by_last_name
      FROM client_managements cm
      JOIN clients c ON cm.client_id = c.id
      LEFT JOIN users u ON cm.created_by = u.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) FROM client_managements cm JOIN clients c ON cm.client_id = c.id WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    // Add search functionality
    if (search) {
      paramCount++;
      query += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR cm.contract_number ILIKE $${paramCount} OR cm.observation ILIKE $${paramCount})`;
      countQuery += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR cm.contract_number ILIKE $${paramCount} OR cm.observation ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add sorting
    const allowedSortColumns = ['management_date', 'created_at', 'contract_number'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? `cm.${sortBy}` : 'cm.management_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn} ${order}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const [managementsResult, countResult] = await Promise.all([
      client.query(query, queryParams),
      client.query(countQuery, search ? [queryParams[0]] : [])
    ]);

    const totalManagements = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalManagements / limit);

    res.json({
      managements: managementsResult.rows,
      pagination: {
        totalManagements,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });

  } catch (error) {
    console.error('Error fetching client managements:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get client management by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const result = await client.query(`
      SELECT
        cm.id, cm.client_id, cm.contract_number, cm.management_date, cm.observation,
        cm.created_at, cm.updated_at,
        c.first_name, c.last_name, c.email, c.phone,
        u.first_name as created_by_first_name, u.last_name as created_by_last_name
      FROM client_managements cm
      JOIN clients c ON cm.client_id = c.id
      LEFT JOIN users u ON cm.created_by = u.id
      WHERE cm.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gestión no encontrada' });
    }
    res.json({ management: result.rows[0] });
  } catch (error) {
    console.error('Error fetching client management:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get client managements by client ID
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { clientId } = req.params;
    const result = await client.query(`
      SELECT
        cm.id, cm.contract_number, cm.management_date, cm.observation,
        cm.created_at, cm.updated_at,
        u.first_name as created_by_first_name, u.last_name as created_by_last_name
      FROM client_managements cm
      LEFT JOIN users u ON cm.created_by = u.id
      WHERE cm.client_id = $1
      ORDER BY cm.management_date DESC, cm.created_at DESC
    `, [clientId]);

    res.json({ managements: result.rows });
  } catch (error) {
    console.error('Error fetching client managements:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Create new client management
router.post('/', authenticateToken, requireClientAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      client_id,
      contract_number,
      management_date,
      observation
    } = req.body;

    // Validate required fields
    if (!client_id || !contract_number || !observation || observation.trim() === '') {
      return res.status(400).json({ error: 'Faltan campos requeridos: client_id, contract_number y observation son obligatorios' });
    }

    // Use current date if management_date is not provided
    const finalManagementDate = management_date || new Date().toISOString().split('T')[0];

    // Insert client management
    const managementResult = await client.query(`
      INSERT INTO client_managements (
        client_id, contract_number, management_date, observation, created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [client_id, contract_number, finalManagementDate, observation.trim(), req.user.id]);

    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'Gestión registrada exitosamente', 
      management: managementResult.rows[0] 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating client management:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update client management
router.patch('/:id', authenticateToken, requireClientAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { management_date, observation } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (management_date !== undefined) {
      paramCount++;
      updates.push(`management_date = $${paramCount}`);
      values.push(management_date);
    }

    if (observation !== undefined) {
      paramCount++;
      updates.push(`observation = $${paramCount}`);
      values.push(observation.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.query(`
      UPDATE client_managements 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gestión no encontrada' });
    }

    res.json({ 
      message: 'Gestión actualizada exitosamente', 
      management: result.rows[0] 
    });
  } catch (error) {
    console.error('Error updating client management:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Delete client management
router.delete('/:id', authenticateToken, requireClientAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    const result = await client.query(`
      DELETE FROM client_managements 
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gestión no encontrada' });
    }

    res.json({ message: 'Gestión eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting client management:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;

