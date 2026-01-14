const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/flight-agenda - Obtener todas las agendas de vuelos
router.get('/', authenticateToken, requireModuleAccess(['flight-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { search, status, page = 1, limit = 50, sortBy = 'fecha', sortOrder = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        fa.*,
        u.email as created_by_email
      FROM flight_agenda fa
      LEFT JOIN users u ON fa.created_by = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filtro de búsqueda
    if (search) {
      paramCount++;
      query += ` AND (
        fa.nombre ILIKE $${paramCount} OR 
        fa.socio ILIKE $${paramCount} OR 
        fa.ciudad ILIKE $${paramCount} OR 
        fa.destino ILIKE $${paramCount} OR
        fa.numero_reserva ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Filtro por estatus
    if (status) {
      paramCount++;
      query += ` AND fa.estatus = $${paramCount}`;
      queryParams.push(status);
    }

    // Ordenamiento
    const validSortColumns = ['fecha', 'socio', 'nombre', 'destino', 'estatus', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'fecha';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY fa.${sortColumn} ${sortDirection} NULLS LAST`;

    // Paginación
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await client.query(query, queryParams);

    // Contar total de registros
    let countQuery = `
      SELECT COUNT(*) as total
      FROM flight_agenda fa
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        fa.nombre ILIKE $${countParamCount} OR 
        fa.socio ILIKE $${countParamCount} OR 
        fa.ciudad ILIKE $${countParamCount} OR 
        fa.destino ILIKE $${countParamCount} OR
        fa.numero_reserva ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND fa.estatus = $${countParamCount}`;
      countParams.push(status);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching flight agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// GET /api/flight-agenda/:id - Obtener una agenda específica
router.get('/:id', authenticateToken, requireModuleAccess(['flight-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      SELECT 
        fa.*,
        u.email as created_by_email
      FROM flight_agenda fa
      LEFT JOIN users u ON fa.created_by = u.id
      WHERE fa.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de vuelo no encontrada' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching flight agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// POST /api/flight-agenda - Crear nueva agenda de vuelo
router.post('/', authenticateToken, requireModuleAccess(['flight-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      fecha,
      socio,
      ciudad,
      nombre,
      destino,
      llegada,
      salida,
      pax,
      ruta,
      numero_reserva,
      estatus,
      tarjeta_usada,
      valor_pagado_reserva,
      pago_cliente,
      observacion
    } = req.body;

    const userId = req.user.userId;

    const result = await client.query(`
      INSERT INTO flight_agenda (
        fecha, socio, ciudad, nombre, destino, llegada, salida, pax,
        ruta, numero_reserva, estatus, tarjeta_usada, valor_pagado_reserva,
        pago_cliente, observacion, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      fecha || null,
      socio || null,
      ciudad || null,
      nombre || null,
      destino || null,
      llegada || null,
      salida || null,
      pax || null,
      ruta || null,
      numero_reserva || null,
      estatus || null,
      tarjeta_usada || null,
      valor_pagado_reserva || null,
      pago_cliente || null,
      observacion || null,
      userId
    ]);

    res.status(201).json({
      message: 'Agenda de vuelo creada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating flight agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /api/flight-agenda/:id - Actualizar agenda de vuelo
router.put('/:id', authenticateToken, requireModuleAccess(['flight-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      fecha,
      socio,
      ciudad,
      nombre,
      destino,
      llegada,
      salida,
      pax,
      ruta,
      numero_reserva,
      estatus,
      tarjeta_usada,
      valor_pagado_reserva,
      pago_cliente,
      observacion
    } = req.body;

    const result = await client.query(`
      UPDATE flight_agenda SET
        fecha = COALESCE($1, fecha),
        socio = COALESCE($2, socio),
        ciudad = COALESCE($3, ciudad),
        nombre = COALESCE($4, nombre),
        destino = COALESCE($5, destino),
        llegada = COALESCE($6, llegada),
        salida = COALESCE($7, salida),
        pax = COALESCE($8, pax),
        ruta = COALESCE($9, ruta),
        numero_reserva = COALESCE($10, numero_reserva),
        estatus = COALESCE($11, estatus),
        tarjeta_usada = COALESCE($12, tarjeta_usada),
        valor_pagado_reserva = COALESCE($13, valor_pagado_reserva),
        pago_cliente = COALESCE($14, pago_cliente),
        observacion = COALESCE($15, observacion),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *
    `, [
      fecha,
      socio,
      ciudad,
      nombre,
      destino,
      llegada,
      salida,
      pax,
      ruta,
      numero_reserva,
      estatus,
      tarjeta_usada,
      valor_pagado_reserva,
      pago_cliente,
      observacion,
      id
    ]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de vuelo no encontrada' });
    }

    res.json({
      message: 'Agenda de vuelo actualizada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating flight agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// DELETE /api/flight-agenda/:id - Eliminar agenda de vuelo
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      DELETE FROM flight_agenda
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de vuelo no encontrada' });
    }

    res.json({ message: 'Agenda de vuelo eliminada exitosamente' });

  } catch (error) {
    console.error('Error deleting flight agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

module.exports = router;

