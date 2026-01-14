const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/reservation-agenda - Obtener todas las agendas de reservas
router.get('/', authenticateToken, requireModuleAccess(['reservation-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { search, status, page = 1, limit = 50, sortBy = 'fecha', sortOrder = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        ra.*,
        u.email as created_by_email
      FROM reservation_agenda ra
      LEFT JOIN users u ON ra.created_by = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filtro de búsqueda
    if (search) {
      paramCount++;
      query += ` AND (
        ra.nombre ILIKE $${paramCount} OR 
        ra.socio ILIKE $${paramCount} OR 
        ra.ciudad ILIKE $${paramCount} OR 
        ra.destino ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Filtro por estatus
    if (status) {
      paramCount++;
      query += ` AND ra.estatus = $${paramCount}`;
      queryParams.push(status);
    }

    // Ordenamiento
    const validSortColumns = ['fecha', 'socio', 'nombre', 'destino', 'estatus', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'fecha';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ra.${sortColumn} ${sortDirection} NULLS LAST`;

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
      FROM reservation_agenda ra
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        ra.nombre ILIKE $${countParamCount} OR 
        ra.socio ILIKE $${countParamCount} OR 
        ra.ciudad ILIKE $${countParamCount} OR 
        ra.destino ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND ra.estatus = $${countParamCount}`;
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
    console.error('Error fetching reservation agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// GET /api/reservation-agenda/:id - Obtener una agenda específica
router.get('/:id', authenticateToken, requireModuleAccess(['reservation-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      SELECT 
        ra.*,
        u.email as created_by_email
      FROM reservation_agenda ra
      LEFT JOIN users u ON ra.created_by = u.id
      WHERE ra.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de reserva no encontrada' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching reservation agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// POST /api/reservation-agenda - Crear nueva agenda de reserva
router.post('/', authenticateToken, requireModuleAccess(['reservation-agenda']), async (req, res) => {
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
      airbnb_nombres,
      cedulas,
      observacion,
      link_conversacion_airbnb,
      estatus,
      tarjeta_usada,
      valor_pagado_reserva,
      pago_cliente,
      observaciones_adicionales
    } = req.body;

    const userId = req.user.userId;

    const result = await client.query(`
      INSERT INTO reservation_agenda (
        fecha, socio, ciudad, nombre, destino, llegada, salida, pax,
        airbnb_nombres, cedulas, observacion, link_conversacion_airbnb,
        estatus, tarjeta_usada, valor_pagado_reserva, pago_cliente,
        observaciones_adicionales, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
      airbnb_nombres || null,
      cedulas || null,
      observacion || null,
      link_conversacion_airbnb || null,
      estatus || null,
      tarjeta_usada || null,
      valor_pagado_reserva || null,
      pago_cliente || null,
      observaciones_adicionales || null,
      userId
    ]);

    res.status(201).json({
      message: 'Agenda de reserva creada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating reservation agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /api/reservation-agenda/:id - Actualizar agenda de reserva
router.put('/:id', authenticateToken, requireModuleAccess(['reservation-agenda']), async (req, res) => {
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
      airbnb_nombres,
      cedulas,
      observacion,
      link_conversacion_airbnb,
      estatus,
      tarjeta_usada,
      valor_pagado_reserva,
      pago_cliente,
      observaciones_adicionales
    } = req.body;

    const result = await client.query(`
      UPDATE reservation_agenda SET
        fecha = COALESCE($1, fecha),
        socio = COALESCE($2, socio),
        ciudad = COALESCE($3, ciudad),
        nombre = COALESCE($4, nombre),
        destino = COALESCE($5, destino),
        llegada = COALESCE($6, llegada),
        salida = COALESCE($7, salida),
        pax = COALESCE($8, pax),
        airbnb_nombres = COALESCE($9, airbnb_nombres),
        cedulas = COALESCE($10, cedulas),
        observacion = COALESCE($11, observacion),
        link_conversacion_airbnb = COALESCE($12, link_conversacion_airbnb),
        estatus = COALESCE($13, estatus),
        tarjeta_usada = COALESCE($14, tarjeta_usada),
        valor_pagado_reserva = COALESCE($15, valor_pagado_reserva),
        pago_cliente = COALESCE($16, pago_cliente),
        observaciones_adicionales = COALESCE($17, observaciones_adicionales),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
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
      airbnb_nombres,
      cedulas,
      observacion,
      link_conversacion_airbnb,
      estatus,
      tarjeta_usada,
      valor_pagado_reserva,
      pago_cliente,
      observaciones_adicionales,
      id
    ]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de reserva no encontrada' });
    }

    res.json({
      message: 'Agenda de reserva actualizada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating reservation agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// DELETE /api/reservation-agenda/:id - Eliminar agenda de reserva
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      DELETE FROM reservation_agenda
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de reserva no encontrada' });
    }

    res.json({ message: 'Agenda de reserva eliminada exitosamente' });

  } catch (error) {
    console.error('Error deleting reservation agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

module.exports = router;

