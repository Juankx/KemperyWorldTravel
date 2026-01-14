const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireClientAccess } = require('../middleware/auth');

const router = express.Router();

// Get all comments for a client
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    // Verificar si la tabla existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_collections_comments'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({ comments: [] });
    }
    
    const { clientId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ccc.id,
        ccc.client_id,
        ccc.comment,
        ccc.created_at,
        ccc.updated_at,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        u.email as created_by_email
      FROM client_collections_comments ccc
      LEFT JOIN users u ON ccc.created_by = u.id
      WHERE ccc.client_id = $1
      ORDER BY ccc.created_at DESC
    `, [clientId]);

    res.json({ comments: result.rows });
  } catch (error) {
    console.error('Error fetching client comments:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Create new comment
router.post('/', authenticateToken, requireClientAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verificar si la tabla existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_collections_comments'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      client.release();
      return res.status(500).json({ 
        error: 'La tabla client_collections_comments no existe. Por favor, ejecuta el script de creación de esquema primero.' 
      });
    }
    
    await client.query('BEGIN');

    const { client_id, comment } = req.body;

    // Validate required fields
    if (!client_id || !comment || !comment.trim()) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'client_id y comment son requeridos' });
    }

    // Insert comment
    const result = await client.query(`
      INSERT INTO client_collections_comments (client_id, comment, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [client_id, comment.trim(), req.user.id]);

    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'Comentario creado exitosamente', 
      comment: result.rows[0] 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Update comment
router.patch('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { comment } = req.body;

    // Validate required fields
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'comment es requerido' });
    }

    // Check if comment exists and user has permission
    const checkResult = await client.query(`
      SELECT created_by FROM client_collections_comments WHERE id = $1
    `, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    // Update comment
    const result = await client.query(`
      UPDATE client_collections_comments
      SET comment = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [comment.trim(), id]);

    await client.query('COMMIT');
    res.json({ 
      message: 'Comentario actualizado exitosamente', 
      comment: result.rows[0] 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Delete comment
router.delete('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if comment exists
    const checkResult = await client.query(`
      SELECT id FROM client_collections_comments WHERE id = $1
    `, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    // Delete comment
    await client.query(`
      DELETE FROM client_collections_comments WHERE id = $1
    `, [id]);

    await client.query('COMMIT');
    res.json({ message: 'Comentario eliminado exitosamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;

