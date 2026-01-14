const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin, requireRequirementAccess, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();

// Generate unique requirement number
const generateRequirementNumber = () => {
  const prefix = 'REQ';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Available requirement types
const REQUIREMENT_TYPES = ['Reserva', 'Cotización de Vuelos', 'Cotización de Paquetes'];

// Available statuses
const REQUIREMENT_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

// Search clients by contract number for requirements
router.get('/search-contract/:contractNumber', authenticateToken, async (req, res) => {
  try {
    const { contractNumber } = req.params;

    const result = await pool.query(`
      SELECT 
        id, first_name, last_name, email, phone, contract_number
      FROM clients 
      WHERE contract_number ILIKE $1 AND is_active = true
      ORDER BY contract_number
      LIMIT 10
    `, [`%${contractNumber}%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron clientes con ese número de contrato' 
      });
    }

    const clients = result.rows.map(client => ({
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      email: client.email,
      phone: client.phone,
      contract_number: client.contract_number
    }));
    
    res.json({
      clients,
      requirement_types: REQUIREMENT_TYPES
    });

  } catch (error) {
    console.error('Search contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all requirements (with pagination and filters)
router.get('/', authenticateToken, requireModuleAccess(['requirements']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verificar si la tabla requirements existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'requirements'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({
        requirements: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRequirements: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    const {
      page = 1,
      limit = 10,
      status = '',
      requirement_type = '',
      assigned_to = '',
      contract_number = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT
        r.id, r.contract_number, r.requirement_type, r.status, r.description,
        r.assigned_to, r.created_by, r.created_at, r.updated_at, r.completed_at, r.notes,
        c.first_name, c.last_name, c.email, c.phone
      FROM requirements r
      JOIN clients c ON r.client_id = c.id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*)
      FROM requirements r
      JOIN clients c ON r.client_id = c.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    // Add filters
    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      countQuery += ` AND r.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (requirement_type) {
      paramCount++;
      query += ` AND r.requirement_type = $${paramCount}`;
      countQuery += ` AND r.requirement_type = $${paramCount}`;
      queryParams.push(requirement_type);
    }

    if (assigned_to) {
      paramCount++;
      query += ` AND r.assigned_to ILIKE $${paramCount}`;
      countQuery += ` AND r.assigned_to ILIKE $${paramCount}`;
      queryParams.push(`%${assigned_to}%`);
    }

    if (contract_number) {
      paramCount++;
      query += ` AND r.contract_number ILIKE $${paramCount}`;
      countQuery += ` AND r.contract_number ILIKE $${paramCount}`;
      queryParams.push(`%${contract_number}%`);
    }

    // Add sorting
    const allowedSortColumns = ['created_at', 'updated_at', 'requirement_type', 'status', 'assigned_to'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? `r.${sortBy}` : 'r.created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn} ${order}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const [requirementsResult, countResult] = await Promise.all([
      client.query(query, queryParams),
      client.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const totalRequirements = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRequirements / limit);

    res.json({
      requirements: requirementsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRequirements,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get requirements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get requirement by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        r.*,
        c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.country, c.contract_number
      FROM requirements r
      JOIN clients c ON r.client_id = c.id
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    const requirement = result.rows[0];

    res.json({
      requirement: {
        ...requirement,
        client_name: `${requirement.first_name} ${requirement.last_name}`
      }
    });

  } catch (error) {
    console.error('Get requirement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new requirement
router.post('/', authenticateToken, requireRequirementAccess, async (req, res) => {
  try {
    const {
      contract_number,
      requirement_type,
      description,
      assigned_to,
      notes
    } = req.body;

    // Validate required fields
    if (!contract_number || !requirement_type || !description) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: número de contrato, tipo de requerimiento y descripción'
      });
    }

    // Validate requirement type
    if (!REQUIREMENT_TYPES.includes(requirement_type)) {
      return res.status(400).json({
        error: 'Tipo de requerimiento no válido. Tipos disponibles: ' + REQUIREMENT_TYPES.join(', ')
      });
    }

    // Get client info
    const clientResult = await pool.query(`
      SELECT id, first_name, last_name
      FROM clients
      WHERE contract_number = $1 AND is_active = true
    `, [contract_number]);

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Cliente no encontrado con este número de contrato'
      });
    }

    const clientData = clientResult.rows[0];

    // Create requirement
    const requirementResult = await pool.query(`
      INSERT INTO requirements (
        contract_number, client_id, requirement_type, description, assigned_to, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, contract_number, requirement_type, status, created_at
    `, [
      contract_number,
      clientData.id,
      requirement_type,
      description.trim(),
      assigned_to?.trim(),
      notes?.trim(),
      req.user.email
    ]);

    res.status(201).json({
      message: 'Requerimiento creado exitosamente',
      requirement: {
        ...requirementResult.rows[0],
        client_name: `${clientData.first_name} ${clientData.last_name}`
      }
    });

  } catch (error) {
    console.error('Create requirement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update requirement status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const allowedStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
    }

    if (notes !== undefined) {
      paramCount++;
      updateFields.push(`notes = $${paramCount}`);
      updateValues.push(notes?.trim());
    }

    if (status === 'completed') {
      paramCount++;
      updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    paramCount++;
    updateValues.push(id);

    const result = await pool.query(`
      UPDATE requirements SET
        ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, status, notes, updated_at, completed_at
    `, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    res.json({
      message: 'Estado del requerimiento actualizado exitosamente',
      requirement: result.rows[0]
    });

  } catch (error) {
    console.error('Update requirement status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete requirement
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM requirements WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    res.json({ message: 'Requerimiento eliminado exitosamente' });

  } catch (error) {
    console.error('Delete requirement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get requirement statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_requirements,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requirements,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_requirements,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requirements,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_requirements,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as requirements_30_days,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as requirements_7_days,
        COUNT(CASE WHEN requirement_type = 'Reserva' THEN 1 END) as reservation_requirements,
        COUNT(CASE WHEN requirement_type = 'Cotización de Vuelos' THEN 1 END) as flight_quote_requirements,
        COUNT(CASE WHEN requirement_type = 'Cotización de Paquetes' THEN 1 END) as package_quote_requirements
      FROM requirements
    `);

    res.json({ stats: statsResult.rows[0] });

  } catch (error) {
    console.error('Get requirement stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get requirements by client ID
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(`
      SELECT
        r.id, r.contract_number, r.requirement_type, r.description, r.status,
        r.assigned_to, r.notes, r.created_at, r.updated_at, r.completed_at,
        c.first_name, c.last_name, c.email, c.phone
      FROM requirements r
      JOIN clients c ON r.client_id = c.id
      WHERE r.client_id = $1
      ORDER BY r.created_at DESC
    `, [clientId]);

    res.json({ requirements: result.rows });
  } catch (error) {
    console.error('Error fetching client requirements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
