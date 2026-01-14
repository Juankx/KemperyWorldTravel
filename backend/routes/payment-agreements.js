const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireClientAccess } = require('../middleware/auth');

const router = express.Router();

// Get all payment agreements with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Verificar si la tabla existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_agreements'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(200).json({
        agreements: [],
        pagination: {
          totalAgreements: 0,
          totalPages: 0,
          currentPage: 1,
          limit: 10,
        },
      });
    }
    
    const { page = 1, limit = 10, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        pa.id, pa.client_id, pa.contract_number, pa.total_amount, pa.remaining_amount,
        pa.installment_count, pa.installment_amount, pa.start_date, pa.end_date, pa.due_date,
        pa.status, pa.notes, pa.created_at, pa.updated_at,
        c.first_name, c.last_name, c.email, c.phone,
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Cliente sin nombre') as client_name,
        0 as payments_made,
        0 as total_paid
      FROM payment_agreements pa
      LEFT JOIN clients c ON pa.client_id = c.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) FROM payment_agreements pa LEFT JOIN clients c ON pa.client_id = c.id WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    // Add search functionality
    if (search) {
      paramCount++;
      query += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR pa.contract_number ILIKE $${paramCount})`;
      countQuery += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR pa.contract_number ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add sorting
    const allowedSortColumns = ['created_at', 'start_date', 'end_date', 'status', 'total_amount'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? `pa.${sortBy}` : 'pa.created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn} ${order}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const [agreementsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, search ? [queryParams[0]] : [])
    ]);

    const totalAgreements = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalAgreements / limit);

    res.json({
      agreements: agreementsResult.rows,
      pagination: {
        totalAgreements,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });

  } catch (error) {
    console.error('Error fetching payment agreements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment agreement by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        pa.id, pa.client_id, pa.contract_number, pa.total_amount, pa.remaining_amount,
        pa.installment_count, pa.installment_amount, pa.start_date, pa.end_date, pa.due_date,
        pa.status, pa.notes, pa.created_at, pa.updated_at,
        c.first_name, c.last_name, c.email, c.phone,
        COUNT(p.id) as payments_made,
        COALESCE(SUM(p.payment_amount), 0) as total_paid
      FROM payment_agreements pa
      JOIN clients c ON pa.client_id = c.id
      LEFT JOIN payments p ON pa.id = p.payment_agreement_id
      WHERE pa.id = $1
      GROUP BY pa.id, c.first_name, c.last_name, c.email, c.phone
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Convenio de pago no encontrado' });
    }
    res.json({ agreement: result.rows[0] });
  } catch (error) {
    console.error('Error fetching payment agreement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new payment agreement
router.post('/', authenticateToken, requireClientAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verificar si la tabla existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_agreements'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      await client.release();
      return res.status(500).json({ 
        error: 'La tabla payment_agreements no existe. Por favor, ejecuta el script de creación de esquema primero.' 
      });
    }
    
    await client.query('BEGIN');

    const {
      client_id,
      contract_number,
      total_amount,
      installment_count,
      installment_amount,
      start_date,
      end_date,
      due_date,
      notes
    } = req.body;

    // Validate required fields
    if (!client_id || !contract_number || !total_amount || !installment_count || !installment_amount || !start_date || !end_date) {
      return res.status(400).json({ error: 'Faltan campos requeridos para el convenio de pago' });
    }

    // Calculate remaining amount
    const remaining_amount = total_amount;

    // Insert payment agreement
    const agreementResult = await client.query(`
      INSERT INTO payment_agreements (
        client_id, contract_number, total_amount, remaining_amount,
        installment_count, installment_amount, start_date, end_date, due_date, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [client_id, contract_number, total_amount, remaining_amount, installment_count, installment_amount, start_date, end_date, due_date || null, notes, req.user.id]);

    // Update client to indicate they have a payment agreement (solo si las columnas existen)
    try {
      await client.query(`
        UPDATE clients 
        SET has_payment_agreement = TRUE, payment_agreement_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [agreementResult.rows[0].id, client_id]);
    } catch (updateError) {
      // Si las columnas no existen, solo loguear el error pero no fallar
      console.warn('No se pudo actualizar has_payment_agreement en clients:', updateError.message);
    }

    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'Convenio de pago creado exitosamente', 
      agreement: agreementResult.rows[0] 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment agreement:', error);
    
    // Mensajes de error más específicos
    if (error.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'El client_id proporcionado no existe' });
    } else if (error.code === '23502') { // Not null violation
      res.status(400).json({ error: 'Faltan campos requeridos: ' + error.column });
    } else if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Ya existe un convenio con estos datos' });
    } else {
      res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
  } finally {
    client.release();
  }
});

// Update payment agreement status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['active', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de convenio inválido' });
    }

    const result = await pool.query(`
      UPDATE payment_agreements SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Convenio de pago no encontrado' });
    }
    res.json({ message: 'Estado del convenio actualizado', agreement: result.rows[0] });
  } catch (error) {
    console.error('Error updating payment agreement status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment agreement due_date
router.patch('/:id/due-date', authenticateToken, requireClientAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date } = req.body;

    if (!due_date) {
      return res.status(400).json({ error: 'La fecha de vencimiento es requerida' });
    }

    const result = await pool.query(`
      UPDATE payment_agreements 
      SET due_date = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `, [due_date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Convenio de pago no encontrado' });
    }
    res.json({ message: 'Fecha de vencimiento actualizada', agreement: result.rows[0] });
  } catch (error) {
    console.error('Error updating payment agreement due_date:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Get payment agreement by client ID
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    // Verificar si la tabla existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_agreements'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({ agreements: [] });
    }
    
    const { clientId } = req.params;
    
    // Verificar si la tabla payments tiene payment_agreement_id
    const paymentsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND table_schema = 'public'
      AND column_name = 'payment_agreement_id'
    `);
    
    const hasPaymentAgreementId = paymentsColumns.rows.length > 0;
    
    let result;
    if (hasPaymentAgreementId) {
      // Si payments tiene payment_agreement_id, hacer JOIN
      result = await pool.query(`
        SELECT
          pa.id, pa.contract_number, pa.total_amount, pa.remaining_amount,
          pa.installment_count, pa.installment_amount, pa.start_date, pa.end_date, pa.due_date,
          pa.status, pa.notes, pa.created_at,
          COUNT(p.id) as payments_made,
          COALESCE(SUM(p.payment_amount), 0) as total_paid
        FROM payment_agreements pa
        LEFT JOIN payments p ON pa.id = p.payment_agreement_id
        WHERE pa.client_id = $1
        GROUP BY pa.id
        ORDER BY pa.created_at DESC
      `, [clientId]);
    } else {
      // Si no tiene payment_agreement_id, solo obtener convenios
      result = await pool.query(`
        SELECT
          pa.id, pa.contract_number, pa.total_amount, pa.remaining_amount,
          pa.installment_count, pa.installment_amount, pa.start_date, pa.end_date, pa.due_date,
          pa.status, pa.notes, pa.created_at,
          0 as payments_made,
          0 as total_paid
        FROM payment_agreements pa
        WHERE pa.client_id = $1
        ORDER BY pa.created_at DESC
      `, [clientId]);
    }

    res.json({ agreements: result.rows });
  } catch (error) {
    console.error('Error fetching client payment agreements:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Delete all payment agreements
router.delete('/', authenticateToken, requireClientAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { password } = req.body;

    // Verificar contraseña
    if (password !== 'admin2025') {
      client.release();
      return res.status(403).json({ error: 'Contraseña incorrecta' });
    }

    await client.query('BEGIN');

    // Verificar si la tabla existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_agreements'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'La tabla payment_agreements no existe' });
    }

    // Verificar si hay pagos asociados a algún convenio
    const paymentsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND table_schema = 'public'
        AND column_name = 'payment_agreement_id'
      )
    `);

    if (paymentsCheck.rows[0].exists) {
      const paymentsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM payments
        WHERE payment_agreement_id IS NOT NULL
      `);

      if (parseInt(paymentsResult.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ 
          error: 'No se pueden eliminar todos los convenios porque hay pagos asociados. Elimine los pagos primero.' 
        });
      }
    }

    // Verificar si hay clientes que referencian convenios
    const clientsColumnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND table_schema = 'public'
      AND column_name = 'payment_agreement_id'
    `);

    if (clientsColumnsCheck.rows.length > 0) {
      // Actualizar todos los clientes que referencian convenios
      await client.query(`
        UPDATE clients
        SET payment_agreement_id = NULL, has_payment_agreement = FALSE
        WHERE payment_agreement_id IS NOT NULL
      `);
    }

    // Obtener el conteo antes de eliminar
    const countResult = await client.query(`
      SELECT COUNT(*) as count
      FROM payment_agreements
    `);
    const deletedCount = parseInt(countResult.rows[0].count);

    // Eliminar todos los convenios
    await client.query(`
      DELETE FROM payment_agreements
    `);

    await client.query('COMMIT');
    res.json({ 
      message: `Todos los convenios eliminados exitosamente (${deletedCount} convenios eliminados)`,
      deletedCount 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting all payment agreements:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// Delete payment agreement
router.delete('/:id', authenticateToken, requireClientAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Verificar contraseña
    if (password !== 'admin2025') {
      client.release();
      return res.status(403).json({ error: 'Contraseña incorrecta' });
    }

    await client.query('BEGIN');

    // Verificar si la tabla existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_agreements'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'La tabla payment_agreements no existe' });
    }

    // Verificar si el convenio existe
    const agreementCheck = await client.query(`
      SELECT id, client_id, total_amount, remaining_amount
      FROM payment_agreements
      WHERE id = $1
    `, [id]);

    if (agreementCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Convenio no encontrado' });
    }

    const agreement = agreementCheck.rows[0];

    // Verificar si hay pagos asociados al convenio
    const paymentsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND table_schema = 'public'
        AND column_name = 'payment_agreement_id'
      )
    `);

    if (paymentsCheck.rows[0].exists) {
      const paymentsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM payments
        WHERE payment_agreement_id = $1
      `, [id]);

      if (parseInt(paymentsResult.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ 
          error: 'No se puede eliminar el convenio porque tiene pagos asociados. Elimine los pagos primero.' 
        });
      }
    }

    // Verificar si hay clientes que referencian este convenio
    const clientsColumnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND table_schema = 'public'
      AND column_name = 'payment_agreement_id'
    `);

    if (clientsColumnsCheck.rows.length > 0) {
      // Actualizar todos los clientes que referencian este convenio
      await client.query(`
        UPDATE clients
        SET payment_agreement_id = NULL
        WHERE payment_agreement_id = $1
      `, [id]);
    }

    // Eliminar el convenio
    await client.query(`
      DELETE FROM payment_agreements
      WHERE id = $1
    `, [id]);

    await client.query('COMMIT');
    res.json({ message: 'Convenio eliminado exitosamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting payment agreement:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// Get payment agreement statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_agreements,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_agreements,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_agreements,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_agreements,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as agreements_30_days,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as agreements_7_days,
        COALESCE(SUM(total_amount), 0) as total_agreement_amount,
        COALESCE(SUM(remaining_amount), 0) as total_remaining_amount,
        COALESCE(AVG(installment_count), 0) as average_installments
      FROM payment_agreements
    `);

    res.json({ stats: statsResult.rows[0] });
  } catch (error) {
    console.error('Error fetching payment agreement stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
