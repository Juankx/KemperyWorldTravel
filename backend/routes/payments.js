const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireClientAccess } = require('../middleware/auth');

const router = express.Router();

// Generate unique receipt number
const generateReceiptNumber = () => {
  const prefix = 'REC';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Get all payments with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      sortBy = 'payment_date', 
      sortOrder = 'DESC',
      date,
      start_date,
      end_date
    } = req.query;
    const offset = (page - 1) * limit;

    // Verificar qué columnas tiene la tabla payments
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND table_schema = 'public'
    `);
    
    const columnNames = columnsCheck.rows.map(r => r.column_name);
    const hasClientId = columnNames.includes('client_id');
    const hasPaymentAmount = columnNames.includes('payment_amount');
    const hasAmount = columnNames.includes('amount');

    let query = '';
    let countQuery = '';
    const queryParams = [];
    let paramCount = 0;

    if (hasClientId && hasPaymentAmount) {
      // Esquema nuevo: client_id, payment_amount
      query = `
        SELECT
          p.id, p.client_id, p.booking_id, 
          COALESCE(p.payment_amount, 0) as payment_amount,
          COALESCE(p.payment_amount, 0) as amount,
          p.payment_date, p.payment_method,
          COALESCE(p.receipt_number, p.transaction_id, '') as receipt_number,
          p.status, p.notes, p.created_at, p.installment_number,
          c.first_name, c.last_name, c.email, c.phone,
          CONCAT(c.first_name, ' ', c.last_name) as client_name,
          pa.due_date
        FROM payments p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN payment_agreements pa ON p.payment_agreement_id = pa.id
        WHERE 1=1
      `;
      countQuery = `
        SELECT COUNT(*) 
        FROM payments p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE 1=1
      `;
    } else {
      // Esquema original: booking_id, amount
      query = `
        SELECT
          p.id, p.booking_id, 
          COALESCE(p.amount, 0) as payment_amount,
          COALESCE(p.amount, 0) as amount,
          p.payment_date, p.payment_method,
          COALESCE(p.transaction_id, '') as receipt_number,
          p.status, p.notes, p.created_at,
          b.booking_number, b.total_price, b.travel_date, b.participants,
          c.first_name, c.last_name, c.email, c.phone,
          CONCAT(c.first_name, ' ', c.last_name) as client_name,
          NULL as due_date
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN clients c ON b.client_id = c.id
        WHERE 1=1
      `;
      countQuery = `
        SELECT COUNT(*) 
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN clients c ON b.client_id = c.id
        WHERE 1=1
      `;
    }

    // Add search functionality
    if (search) {
      paramCount++;
      if (hasClientId) {
        query += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR p.receipt_number ILIKE $${paramCount} OR p.transaction_id ILIKE $${paramCount})`;
        countQuery += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR p.receipt_number ILIKE $${paramCount} OR p.transaction_id ILIKE $${paramCount})`;
      } else {
        query += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR b.booking_number ILIKE $${paramCount} OR p.transaction_id ILIKE $${paramCount})`;
        countQuery += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR b.booking_number ILIKE $${paramCount} OR p.transaction_id ILIKE $${paramCount})`;
      }
      queryParams.push(`%${search}%`);
    }

    // Add date filters
    if (date) {
      paramCount++;
      query += ` AND DATE(p.payment_date) = $${paramCount}`;
      countQuery += ` AND DATE(p.payment_date) = $${paramCount}`;
      queryParams.push(date);
    }

    if (start_date) {
      paramCount++;
      query += ` AND DATE(p.payment_date) >= $${paramCount}`;
      countQuery += ` AND DATE(p.payment_date) >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND DATE(p.payment_date) <= $${paramCount}`;
      countQuery += ` AND DATE(p.payment_date) <= $${paramCount}`;
      queryParams.push(end_date);
    }

    // Add sorting
    const allowedSortColumns = ['payment_date', 'payment_amount', 'amount', 'receipt_number', 'created_at'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? `p.${sortBy}` : 'p.payment_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn} ${order}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    // Prepare count query parameters (only search and date filters, no pagination)
    const countParams = queryParams.slice(0, paramCount);
    
    const [paymentsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const totalPayments = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPayments / limit);

    // Formatear los resultados para el frontend
    const formattedPayments = paymentsResult.rows.map(p => ({
      ...p,
      amount: parseFloat(p.amount || p.payment_amount || 0),
      payment_amount: parseFloat(p.payment_amount || p.amount || 0),
      client_name: p.client_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Cliente sin nombre',
      client_phone: p.phone || null,
      due_date: p.due_date || p.payment_date
    }));

    res.json({
      payments: formattedPayments,
      pagination: {
        totalPayments,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Get payment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        p.id, p.booking_id, p.amount as payment_amount, p.payment_date, p.payment_method,
        p.transaction_id as receipt_number, p.status, p.notes, p.created_at,
        b.booking_number, b.total_price, b.travel_date, b.participants,
        c.first_name, c.last_name, c.email, c.phone
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN clients c ON b.client_id = c.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json({ payment: result.rows[0] });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new payment
router.post('/', authenticateToken, requireClientAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      booking_id,
      client_id,
      contract_number,
      payment_amount,
      amount,
      payment_method,
      payment_date,
      transaction_id,
      notes,
      installment_number
    } = req.body;

    // Validate required fields
    const finalAmount = payment_amount || amount;
    if (!finalAmount || !payment_method) {
      return res.status(400).json({ error: 'Faltan campos requeridos: amount y payment_method son obligatorios' });
    }

    // Para pagos de cobranzas sin booking_id, necesitamos crear un booking temporal o usar otra estrategia
    // Por ahora, si no hay booking_id, retornamos error indicando que se necesita
    if (!booking_id && !client_id) {
      return res.status(400).json({ error: 'Se requiere booking_id o client_id para registrar el pago' });
    }

    // Si hay client_id pero no booking_id, intentar encontrar un booking existente del cliente
    // Si no existe, crear un booking temporal para pagos de cobranzas
    let finalBookingId = booking_id;
    if (!finalBookingId && client_id) {
      const bookingResult = await client.query(`
        SELECT id FROM bookings 
        WHERE client_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [client_id]);
      
      if (bookingResult.rows.length > 0) {
        finalBookingId = bookingResult.rows[0].id;
      } else {
        // Si no hay booking, crear uno temporal para pagos de cobranzas
        try {
          // Obtener información del cliente
          const clientInfo = await client.query(`
            SELECT id, contract_number, first_name, last_name
            FROM clients 
            WHERE id = $1
          `, [client_id]);
          
          if (clientInfo.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
          }
          
          const clientData = clientInfo.rows[0];
          
          // Generar número de booking único
          const generateBookingNumber = () => {
            const prefix = 'COB'; // Cobranzas
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            return `${prefix}${timestamp}${random}`;
          };
          
          // Verificar si la tabla packages existe
          const packagesTableCheck = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'packages'
            )
          `);
          
          if (!packagesTableCheck.rows[0].exists) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(500).json({ 
              error: 'La tabla packages no existe. Por favor, ejecuta el script de creación de esquema primero.' 
            });
          }
          
          // Buscar o crear un package temporal para cobranzas
          let tempPackageId;
          const packageResult = await client.query(`
            SELECT id FROM packages 
            WHERE name = 'Pago de Cobranzas' 
            LIMIT 1
          `);
          
          if (packageResult.rows.length > 0) {
            tempPackageId = packageResult.rows[0].id;
          } else {
            // Crear package temporal
            const newPackage = await client.query(`
              INSERT INTO packages (name, description, destination, duration_days, price, currency, is_active)
              VALUES ('Pago de Cobranzas', 'Package temporal para pagos de cobranzas', 'Ecuador', 1, 0, 'USD', false)
              RETURNING id
            `);
            tempPackageId = newPackage.rows[0].id;
          }
          
          // Crear booking temporal
          const tempBooking = await client.query(`
            INSERT INTO bookings (
              booking_number, client_id, package_id, travel_date, return_date,
              participants, total_price, currency, status, payment_status,
              special_requests, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
          `, [
            generateBookingNumber(),
            client_id,
            tempPackageId,
            new Date(),
            new Date(),
            1,
            0,
            'USD',
            'pending',
            'pending',
            JSON.stringify({ 
              contract_number: clientData.contract_number,
              tipo: 'pago_cobranzas',
              created_for_payment: true
            }),
            req.user.id
          ]);
          
          finalBookingId = tempBooking.rows[0].id;
        } catch (createError) {
          console.error('Error creando booking temporal:', createError);
          await client.query('ROLLBACK');
          client.release();
          return res.status(500).json({ 
            error: 'Error al crear booking temporal para el pago: ' + createError.message 
          });
        }
      }
    }

    if (!finalBookingId) {
      return res.status(400).json({ error: 'Se requiere booking_id para registrar el pago' });
    }

    // Generate unique transaction ID if not provided
    const finalTransactionId = transaction_id || generateReceiptNumber();

    // Verificar qué esquema tiene la tabla payments
    const paymentsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND table_schema = 'public'
    `);
    
    const columnNames = paymentsColumns.rows.map(row => row.column_name);
    const hasBookingId = columnNames.includes('booking_id');
    const hasClientId = columnNames.includes('client_id');
    const hasAmount = columnNames.includes('amount');
    const hasPaymentAmount = columnNames.includes('payment_amount');
    
    let paymentResult;
    
    if (hasBookingId && hasAmount) {
      // Esquema original: booking_id, amount
      paymentResult = await client.query(`
        INSERT INTO payments (
          booking_id, amount, payment_method, payment_date, transaction_id, notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'completed')
        RETURNING *
      `, [finalBookingId, finalAmount, payment_method, payment_date || new Date().toISOString().split('T')[0], finalTransactionId, notes]);
    } else if (hasClientId && hasPaymentAmount) {
      // Esquema nuevo: client_id, payment_amount
      // Obtener payment_agreement_id si existe un convenio activo
      let paymentAgreementId = null;
      if (client_id) {
        const agreementCheck = await client.query(`
          SELECT id FROM payment_agreements
          WHERE client_id = $1 AND status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        `, [client_id]);
        if (agreementCheck.rows.length > 0) {
          paymentAgreementId = agreementCheck.rows[0].id;
        }
      }
      
      paymentResult = await client.query(`
        INSERT INTO payments (
          client_id, payment_agreement_id, contract_number, payment_amount, 
          payment_date, payment_method, installment_number, receipt_number, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        client_id,
        paymentAgreementId,
        contract_number || '',
        finalAmount,
        payment_date || new Date().toISOString().split('T')[0],
        payment_method,
        installment_number || null,
        finalTransactionId,
        notes || null,
        req.user.id
      ]);
    } else {
      await client.query('ROLLBACK');
      client.release();
      return res.status(500).json({ 
        error: 'Esquema de tabla payments no reconocido. Por favor, verifica la estructura de la base de datos.' 
      });
    }
    
    // Si es un pago de cobranzas (usando client_id), actualizar el convenio de pago si existe
    if (client_id) {
      // Verificar si la tabla payment_agreements existe antes de intentar actualizar
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_agreements'
        )
      `);
      
      if (tableCheck.rows[0].exists) {
        // Buscar el convenio de pago activo del cliente
        const agreementResult = await client.query(`
          SELECT id, remaining_amount, installment_count
          FROM payment_agreements
          WHERE client_id = $1 AND status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        `, [client_id]);
      
      if (agreementResult.rows.length > 0) {
        const agreement = agreementResult.rows[0];
        const newRemaining = Math.max(0, parseFloat(agreement.remaining_amount) - parseFloat(finalAmount));
        
        // Actualizar el remaining_amount del convenio
        await client.query(`
          UPDATE payment_agreements
          SET remaining_amount = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [newRemaining, agreement.id]);
        
        // Si el remaining_amount es 0, marcar el convenio como completado
        if (newRemaining === 0) {
          await client.query(`
            UPDATE payment_agreements
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [agreement.id]);
        }
      }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'Pago registrado exitosamente', 
      payment: paymentResult.rows[0] 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment:', error);
    
    // Mensajes de error más específicos
    if (error.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'El booking_id proporcionado no existe' });
    } else if (error.code === '23502') { // Not null violation
      res.status(400).json({ error: 'Faltan campos requeridos en la base de datos' });
    } else {
      res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
  } finally {
    client.release();
  }
});

// Get payments by client ID
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    // Buscar pagos a través de bookings (pagos normales)
    const bookingsPayments = await pool.query(`
      SELECT
        p.id, p.amount as payment_amount, p.payment_date, p.payment_method,
        p.transaction_id as receipt_number, p.notes, p.created_at,
        b.booking_number, b.total_price, b.travel_date, b.participants,
        c.id as client_id, c.first_name, c.last_name, c.contract_number
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN clients c ON b.client_id = c.id
      WHERE b.client_id = $1
      ORDER BY p.payment_date DESC
    `, [clientId]);
    
    // También buscar pagos asociados a convenios de pago del cliente
    // Nota: Esto requiere que los pagos tengan payment_agreement_id o que se busquen por contract_number
    // Por ahora, solo retornamos los pagos con booking_id
    // TODO: Implementar búsqueda de pagos sin booking_id cuando se agregue payment_agreement_id a payments

    res.json({ payments: bookingsPayments.rows });
  } catch (error) {
    console.error('Error fetching client payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payment
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

    // Verificar qué columnas tiene la tabla payments
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND table_schema = 'public'
    `);
    
    const columnNames = columnsCheck.rows.map(r => r.column_name);
    const hasPaymentAmount = columnNames.includes('payment_amount');
    const hasAmount = columnNames.includes('amount');
    const hasPaymentAgreementId = columnNames.includes('payment_agreement_id');
    const hasClientId = columnNames.includes('client_id');

    // Construir la consulta SELECT según las columnas disponibles
    let selectFields = ['id'];
    if (hasPaymentAmount) selectFields.push('payment_amount');
    if (hasAmount) selectFields.push('amount');
    if (hasPaymentAgreementId) selectFields.push('payment_agreement_id');
    if (hasClientId) selectFields.push('client_id');

    // Verificar si el pago existe
    const paymentCheck = await client.query(`
      SELECT ${selectFields.join(', ')}
      FROM payments
      WHERE id = $1
    `, [id]);

    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const payment = paymentCheck.rows[0];
    const paymentAmount = parseFloat(payment.payment_amount || payment.amount || 0);

    // Si el pago está asociado a un convenio, actualizar el remaining_amount
    if (hasPaymentAgreementId && payment.payment_agreement_id) {
      const agreementCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_agreements'
        )
      `);

      if (agreementCheck.rows[0].exists) {
        const agreementResult = await client.query(`
          SELECT id, remaining_amount, status
          FROM payment_agreements
          WHERE id = $1
        `, [payment.payment_agreement_id]);

        if (agreementResult.rows.length > 0) {
          const agreement = agreementResult.rows[0];
          const newRemaining = parseFloat(agreement.remaining_amount || 0) + paymentAmount;

          // Actualizar el remaining_amount del convenio
          await client.query(`
            UPDATE payment_agreements
            SET remaining_amount = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [newRemaining, agreement.id]);

          // Si el convenio estaba completado, reactivarlo si hay deuda
          if (agreement.status === 'completed' && newRemaining > 0) {
            await client.query(`
              UPDATE payment_agreements
              SET status = 'active', updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
            `, [agreement.id]);
          }
        }
      }
    }

    // Eliminar el pago
    await client.query(`
      DELETE FROM payments
      WHERE id = $1
    `, [id]);

    await client.query('COMMIT');
    res.json({ message: 'Pago eliminado exitosamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// Get payment statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as payments_30_days,
        COUNT(CASE WHEN payment_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as payments_7_days,
        COALESCE(SUM(amount), 0) as total_collected,
        COALESCE(SUM(CASE WHEN payment_date >= CURRENT_DATE - INTERVAL '30 days' THEN amount END), 0) as collected_30_days,
        COALESCE(SUM(CASE WHEN payment_date >= CURRENT_DATE - INTERVAL '7 days' THEN amount END), 0) as collected_7_days,
        COALESCE(AVG(amount), 0) as average_payment,
        COUNT(CASE WHEN payment_method = 'efectivo' THEN 1 END) as cash_payments,
        COUNT(CASE WHEN payment_method = 'transferencia' THEN 1 END) as transfer_payments,
        COUNT(CASE WHEN payment_method = 'tarjeta' THEN 1 END) as card_payments
      FROM payments
    `);

    res.json({ stats: statsResult.rows[0] });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
