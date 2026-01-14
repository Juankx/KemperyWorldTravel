const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/visa-agenda - Obtener todas las agendas de visados
router.get('/', authenticateToken, requireModuleAccess(['visa-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { search, status, page = 1, limit = 50, sortBy = 'fecha', sortOrder = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        va.*,
        u.email as created_by_email
      FROM visa_agenda va
      LEFT JOIN users u ON va.created_by = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filtro de búsqueda
    if (search) {
      paramCount++;
      query += ` AND (
        va.nombre ILIKE $${paramCount} OR 
        va.socio ILIKE $${paramCount} OR 
        va.ciudad ILIKE $${paramCount} OR 
        va.embajada ILIKE $${paramCount} OR
        va.correo ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    // Filtro por estatus
    if (status) {
      paramCount++;
      query += ` AND va.estatus = $${paramCount}`;
      queryParams.push(status);
    }

    // Ordenamiento
    const validSortColumns = ['fecha', 'socio', 'nombre', 'embajada', 'estatus', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'fecha';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY va.${sortColumn} ${sortDirection} NULLS LAST`;

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
      FROM visa_agenda va
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        va.nombre ILIKE $${countParamCount} OR 
        va.socio ILIKE $${countParamCount} OR 
        va.ciudad ILIKE $${countParamCount} OR 
        va.embajada ILIKE $${countParamCount} OR
        va.correo ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND va.estatus = $${countParamCount}`;
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
    console.error('Error fetching visa agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// GET /api/visa-agenda/:id - Obtener una agenda específica
router.get('/:id', authenticateToken, requireModuleAccess(['visa-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      SELECT 
        va.*,
        u.email as created_by_email
      FROM visa_agenda va
      LEFT JOIN users u ON va.created_by = u.id
      WHERE va.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de visado no encontrada' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching visa agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// POST /api/visa-agenda - Crear nueva agenda de visado
router.post('/', authenticateToken, requireModuleAccess(['visa-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      fecha,
      socio,
      ciudad,
      nombre,
      embajada,
      ads,
      correo,
      contrasena,
      estatus,
      fecha_entrevista_embajada,
      hora_entrevista_embajada,
      fecha_asesoramiento,
      observaciones,
      link_reunion
    } = req.body;

    const userId = req.user.userId;

    const result = await client.query(`
      INSERT INTO visa_agenda (
        fecha, socio, ciudad, nombre, embajada, ads, correo, contrasena,
        estatus, fecha_entrevista_embajada, hora_entrevista_embajada,
        fecha_asesoramiento, observaciones, link_reunion, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      fecha || null,
      socio || null,
      ciudad || null,
      nombre || null,
      embajada || null,
      ads || null,
      correo || null,
      contrasena || null,
      estatus || null,
      fecha_entrevista_embajada || null,
      hora_entrevista_embajada || null,
      fecha_asesoramiento || null,
      observaciones || null,
      link_reunion || null,
      userId
    ]);

    res.status(201).json({
      message: 'Agenda de visado creada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating visa agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /api/visa-agenda/:id - Actualizar agenda de visado
router.put('/:id', authenticateToken, requireModuleAccess(['visa-agenda']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      fecha,
      socio,
      ciudad,
      nombre,
      embajada,
      ads,
      correo,
      contrasena,
      estatus,
      fecha_entrevista_embajada,
      hora_entrevista_embajada,
      fecha_asesoramiento,
      observaciones,
      link_reunion
    } = req.body;

    const result = await client.query(`
      UPDATE visa_agenda SET
        fecha = COALESCE($1, fecha),
        socio = COALESCE($2, socio),
        ciudad = COALESCE($3, ciudad),
        nombre = COALESCE($4, nombre),
        embajada = COALESCE($5, embajada),
        ads = COALESCE($6, ads),
        correo = COALESCE($7, correo),
        contrasena = COALESCE($8, contrasena),
        estatus = COALESCE($9, estatus),
        fecha_entrevista_embajada = COALESCE($10, fecha_entrevista_embajada),
        hora_entrevista_embajada = COALESCE($11, hora_entrevista_embajada),
        fecha_asesoramiento = COALESCE($12, fecha_asesoramiento),
        observaciones = COALESCE($13, observaciones),
        link_reunion = COALESCE($14, link_reunion),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `, [
      fecha,
      socio,
      ciudad,
      nombre,
      embajada,
      ads,
      correo,
      contrasena,
      estatus,
      fecha_entrevista_embajada,
      hora_entrevista_embajada,
      fecha_asesoramiento,
      observaciones,
      link_reunion,
      id
    ]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de visado no encontrada' });
    }

    res.json({
      message: 'Agenda de visado actualizada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating visa agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

// DELETE /api/visa-agenda/:id - Eliminar agenda de visado
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      DELETE FROM visa_agenda
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agenda de visado no encontrada' });
    }

    res.json({ message: 'Agenda de visado eliminada exitosamente' });

  } catch (error) {
    console.error('Error deleting visa agenda:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  } finally {
    client.release();
  }
});

module.exports = router;

