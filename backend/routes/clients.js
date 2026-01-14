const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin, requireClientAccess } = require('../middleware/auth');
const { validateClient } = require('../middleware/validation');

const router = express.Router();

// Get all clients (with pagination and search)
router.get('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    // Verificar si payment_agreements existe
    let hasPaymentAgreements = false;
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_agreements'
        )
      `);
      hasPaymentAgreements = tableCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla payment_agreements, usando valores por defecto...');
    }

    // Verificar si las columnas total_nights y remaining_nights existen
    let hasTotalNights = false;
    let hasRemainingNights = false;
    try {
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clients' 
        AND column_name IN ('total_nights', 'remaining_nights')
      `);
      const existingColumns = columnsCheck.rows.map(row => row.column_name);
      hasTotalNights = existingColumns.includes('total_nights');
      hasRemainingNights = existingColumns.includes('remaining_nights');
    } catch (error) {
      console.log('⚠️  No se pudieron verificar columnas de nights, omitiendo...');
    }

    let query = `
      SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.city, c.country, 
             c.created_at, c.updated_at, c.is_active, c.identification, c.contract_number,
             c.payment_status, c.total_amount, c.international_bonus, c.notes, c.in_collections,
             COALESCE(c.years, NULL) as years
    `;
    
    // Agregar columnas de nights solo si existen
    if (hasTotalNights) {
      query += `, c.total_nights`;
    } else {
      query += `, NULL as total_nights`;
    }
    
    if (hasRemainingNights) {
      query += `, c.remaining_nights`;
    } else {
      query += `, NULL as remaining_nights`;
    }
    
    // Usar pending_debt si existe, sino usar payment_agreements.remaining_amount como fallback
    query += `,
             COALESCE(
               c.pending_debt,
               (SELECT remaining_amount 
                FROM payment_agreements 
                WHERE client_id = c.id 
                ORDER BY created_at DESC 
                LIMIT 1),
               0
             ) as pending_amount,
             c.pending_debt,
             (SELECT remaining_amount 
              FROM payment_agreements 
              WHERE client_id = c.id 
              ORDER BY created_at DESC 
              LIMIT 1) as agreement_remaining_amount
    `;
    
    query += `
      FROM clients c
      WHERE c.is_active = true
    `;
    let countQuery = 'SELECT COUNT(*) FROM clients c WHERE c.is_active = true';
    const queryParams = [];
    let paramCount = 0;

    // Add search functionality
    if (search) {
      paramCount++;
      const searchPattern = `%${search}%`;
      const searchExact = search.replace('%', '').trim();
      // Buscar por nombre, apellido, email, número de contrato completo o últimos 4 dígitos
      query += ` AND (
        c.first_name ILIKE $${paramCount} OR 
        c.last_name ILIKE $${paramCount} OR 
        c.email ILIKE $${paramCount} OR 
        (c.contract_number IS NOT NULL AND c.contract_number ILIKE $${paramCount}) OR
        (c.contract_number IS NOT NULL AND LENGTH(c.contract_number) >= 4 AND RIGHT(c.contract_number, 4) = $${paramCount + 1})
      )`;
      countQuery += ` AND (
        c.first_name ILIKE $${paramCount} OR 
        c.last_name ILIKE $${paramCount} OR 
        c.email ILIKE $${paramCount} OR 
        (c.contract_number IS NOT NULL AND c.contract_number ILIKE $${paramCount}) OR
        (c.contract_number IS NOT NULL AND LENGTH(c.contract_number) >= 4 AND RIGHT(c.contract_number, 4) = $${paramCount + 1})
      )`;
      queryParams.push(searchPattern);
      // Agregar parámetro adicional para búsqueda por últimos 4 dígitos (sin %)
      queryParams.push(searchExact);
      paramCount++; // Incrementar paramCount porque agregamos un segundo parámetro
    }

    // Add sorting
    const allowedSortColumns = ['first_name', 'last_name', 'email', 'created_at', 'updated_at'];
    const safeSortBy = sortBy && typeof sortBy === 'string' ? sortBy.trim() : 'created_at';
    const sortColumn = allowedSortColumns.includes(safeSortBy) ? `c.${safeSortBy}` : 'c.created_at';
    const order = sortOrder && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${order}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    // Debug: Log query if there's an error (commented out for production)
    // console.log('DEBUG Query:', query);
    // console.log('DEBUG Params:', queryParams);

    const [clientsResult, countResult] = await Promise.all([
      client.query(query, queryParams),
      client.query(countQuery, search ? [queryParams[0], queryParams[1]] : [])
    ]);

    const totalClients = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalClients / limit);

    res.json({
      clients: clientsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalClients,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get client by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Verificar si payment_agreements existe
    let hasPaymentAgreements = false;
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_agreements'
        )
      `);
      hasPaymentAgreements = tableCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla payment_agreements, usando valores por defecto...');
    }

    // Usar pending_debt si existe, sino usar payment_agreements.remaining_amount como fallback
    let query = `
      SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.country, 
             c.birth_date, c.document_type, c.document_number, c.emergency_contact_name, 
             c.emergency_contact_phone, c.notes, c.is_active, c.created_at, c.updated_at, c.in_collections,
             c.identification, c.contract_number, c.payment_status, c.total_amount, c.international_bonus,
             c.total_nights, c.remaining_nights, COALESCE(c.years, NULL) as years,
             COALESCE(
               c.pending_debt,
               (SELECT remaining_amount 
                FROM payment_agreements 
                WHERE client_id = c.id 
                ORDER BY created_at DESC 
                LIMIT 1),
               0
             ) as pending_amount,
             c.pending_debt,
             (SELECT remaining_amount 
              FROM payment_agreements 
              WHERE client_id = c.id 
              ORDER BY created_at DESC 
              LIMIT 1) as agreement_remaining_amount
      FROM clients c
      WHERE c.id = $1
    `;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Client not found' });
    }

    client.release();
    res.json({ client: result.rows[0] });

  } catch (error) {
    client.release();
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new client
router.post('/', authenticateToken, requireClientAccess, validateClient, async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      country = 'Ecuador',
      birth_date,
      document_type = 'cedula',
      document_number,
      emergency_contact_name,
      emergency_contact_phone,
      notes,
      // Campos adicionales que se pueden ignorar si no existen en la tabla
      contract_number,
      total_amount,
      payment_status,
      international_bonus,
      total_nights,
      remaining_nights
    } = req.body;

    console.log('📋 Datos recibidos para crear cliente:', {
      first_name,
      last_name,
      email,
      phone,
      document_number,
      contract_number,
      city,
      country
    });

    // Check if email already exists
    const existingClient = await pool.query(
      'SELECT id FROM clients WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingClient.rows.length > 0) {
      return res.status(400).json({ error: 'Client with this email already exists' });
    }

    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, address, city, country, 
                           birth_date, document_type, document_number, emergency_contact_name, 
                           emergency_contact_phone, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, first_name, last_name, email, phone, city, country, created_at`,
      [
        first_name.trim(),
        last_name.trim(),
        email.toLowerCase().trim(),
        phone?.trim(),
        address?.trim(),
        city?.trim(),
        country,
        birth_date,
        document_type,
        document_number?.trim(),
        emergency_contact_name?.trim(),
        emergency_contact_phone?.trim(),
        notes?.trim()
      ]
    );

    res.status(201).json({
      message: 'Client created successfully',
      client: result.rows[0]
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client
router.put('/:id', authenticateToken, requireAdmin, validateClient, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      country,
      birth_date,
      document_type,
      document_number,
      emergency_contact_name,
      emergency_contact_phone,
      notes,
      identification,
      contract_number,
      payment_status,
      total_amount,
      international_bonus,
      created_at,
      in_collections,
      total_nights,
      remaining_nights
    } = req.body;

    // Check if client exists
    const existingClient = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND is_active = true',
      [id]
    );

    if (existingClient.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if email is taken by another client
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM clients WHERE email = $1 AND id != $2',
        [email.toLowerCase(), id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already taken by another client' });
      }
    }

    const result = await pool.query(
      `UPDATE clients SET 
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         address = COALESCE($6, address),
         city = COALESCE($7, city),
         country = COALESCE($8, country),
         birth_date = COALESCE($9, birth_date),
         document_type = COALESCE($10, document_type),
         document_number = COALESCE($11, document_number),
         emergency_contact_name = COALESCE($12, emergency_contact_name),
         emergency_contact_phone = COALESCE($13, emergency_contact_phone),
         notes = COALESCE($14, notes),
         identification = COALESCE($15, identification),
         contract_number = COALESCE($16, contract_number),
         payment_status = COALESCE($17, payment_status),
         total_amount = COALESCE($18, total_amount),
         international_bonus = COALESCE($19, international_bonus),
         created_at = COALESCE($20, created_at),
         in_collections = COALESCE($21, in_collections),
         total_nights = COALESCE($22, total_nights),
         remaining_nights = COALESCE($23, remaining_nights),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, first_name, last_name, email, phone, city, country, identification, contract_number, payment_status, total_amount, international_bonus, notes, created_at, in_collections, total_nights, remaining_nights, updated_at`,
      [
        id,
        first_name?.trim(),
        last_name?.trim(),
        email?.toLowerCase().trim(),
        phone?.trim(),
        address?.trim(),
        city?.trim(),
        country,
        birth_date,
        document_type,
        document_number?.trim(),
        emergency_contact_name?.trim(),
        emergency_contact_phone?.trim(),
        notes?.trim(),
        identification?.trim(),
        contract_number?.trim(),
        payment_status,
        total_amount,
        international_bonus?.trim(),
        created_at,
        in_collections?.trim(),
        total_nights,
        remaining_nights
      ]
    );

    res.json({
      message: 'Client updated successfully',
      client: result.rows[0]
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Soft delete client
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE clients SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get client statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_clients_30_days,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_clients_7_days,
        COUNT(CASE WHEN payment_status = 'sin_pago' THEN 1 END) as unpaid_clients,
        COUNT(CASE WHEN payment_status = 'pago_completo' THEN 1 END) as paid_clients,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM clients
      WHERE is_active = true
    `);

    res.json({ stats: statsResult.rows[0] });

  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
