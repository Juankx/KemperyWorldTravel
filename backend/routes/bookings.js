const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin, requireBookingAccess, requireModuleAccess } = require('../middleware/auth');
const DocumentGenerator = require('../services/documentGenerator');
const WhatsAppService = require('../services/whatsappService');

const router = express.Router();
const documentGenerator = new DocumentGenerator();
const whatsappService = new WhatsAppService();

// Generate unique booking number
const generateBookingNumber = () => {
  const prefix = 'KWT';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Available cities for reservations
const AVAILABLE_CITIES = ['Baños', 'Cuenca', 'Quito', 'Manta', 'Tonsupa', 'Salinas', 'Otros'];

// Search contracts by last 4 digits
router.get('/search-contracts/:lastDigits', authenticateToken, async (req, res) => {
  try {
    const { lastDigits } = req.params;

    // Validar que sean exactamente 4 dígitos
    if (!/^\d{4}$/.test(lastDigits)) {
      return res.status(400).json({ 
        error: 'Debe ingresar exactamente 4 dígitos' 
      });
    }

    const result = await pool.query(`
      SELECT 
        id, first_name, last_name, email, phone, 
        total_nights, remaining_nights, contract_number
      FROM clients 
      WHERE contract_number LIKE $1 AND is_active = true
      ORDER BY contract_number
      LIMIT 10
    `, [`%${lastDigits}`]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontraron contratos con esos últimos 4 dígitos' 
      });
    }

    const clients = result.rows.map(client => ({
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      email: client.email,
      phone: client.phone,
      contract_number: client.contract_number,
      total_nights: client.total_nights,
      remaining_nights: client.remaining_nights
    }));
    
    res.json({
      clients,
      available_cities: AVAILABLE_CITIES
    });

  } catch (error) {
    console.error('Search contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate contract number and get client info
router.get('/validate-contract/:contractNumber', authenticateToken, async (req, res) => {
  try {
    const { contractNumber } = req.params;

    const result = await pool.query(`
      SELECT 
        id, first_name, last_name, email, phone, 
        total_nights, remaining_nights, contract_number
      FROM clients 
      WHERE contract_number = $1 AND is_active = true
    `, [contractNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Cliente no encontrado con este número de contrato' 
      });
    }

    const client = result.rows[0];
    
    res.json({
      client: {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        phone: client.phone,
        contract_number: client.contract_number,
        total_nights: client.total_nights,
        remaining_nights: client.remaining_nights
      },
      available_cities: AVAILABLE_CITIES
    });

  } catch (error) {
    console.error('Validate contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all bookings (with pagination and filters)
router.get('/', authenticateToken, requireModuleAccess(['bookings']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      client_id = '', 
      contract_number = '',
      city = '',
      sortBy = 'created_at', 
      sortOrder = 'DESC' 
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Verificar si las columnas total_nights y remaining_nights existen
    let hasTotalNights = false;
    let hasRemainingNights = false;
    try {
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND table_schema = 'public'
        AND column_name IN ('total_nights', 'remaining_nights')
      `);
      const columnNames = columnsCheck.rows.map(r => r.column_name);
      hasTotalNights = columnNames.includes('total_nights');
      hasRemainingNights = columnNames.includes('remaining_nights');
    } catch (error) {
      console.log('⚠️  No se pudieron verificar columnas de nights, omitiendo...');
    }

    let query = `
      SELECT
        b.id, b.booking_number, b.status, b.created_at, b.updated_at,
        b.special_requests,
        c.first_name, c.last_name, c.email, c.phone, c.contract_number
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
    
    query += `
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE 1=1
    `;
    
    let countQuery = `
      SELECT COUNT(*)
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // Add filters
    if (status) {
      paramCount++;
      query += ` AND b.status = $${paramCount}`;
      countQuery += ` AND b.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (client_id) {
      paramCount++;
      query += ` AND b.client_id = $${paramCount}`;
      countQuery += ` AND b.client_id = $${paramCount}`;
      queryParams.push(client_id);
    }

    if (contract_number) {
      paramCount++;
      query += ` AND c.contract_number ILIKE $${paramCount}`;
      countQuery += ` AND c.contract_number ILIKE $${paramCount}`;
      queryParams.push(`%${contract_number}%`);
    }

    if (city) {
      paramCount++;
      // Buscar en special_requests JSONB (manejar NULLs)
      query += ` AND (
        (b.special_requests IS NOT NULL AND b.special_requests::jsonb->>'city' ILIKE $${paramCount})
        OR (b.special_requests IS NOT NULL AND b.special_requests::jsonb->>'custom_city' ILIKE $${paramCount})
      )`;
      countQuery += ` AND (
        (b.special_requests IS NOT NULL AND b.special_requests::jsonb->>'city' ILIKE $${paramCount})
        OR (b.special_requests IS NOT NULL AND b.special_requests::jsonb->>'custom_city' ILIKE $${paramCount})
      )`;
      queryParams.push(`%${city}%`);
    }

    // Add sorting
    const allowedSortColumns = ['created_at', 'nights_requested', 'people_count', 'status', 'city'];
    let sortColumn = 'b.created_at';
    if (sortBy === 'created_at' || sortBy === 'status') {
      sortColumn = `b.${sortBy}`;
    } else if (sortBy === 'nights_requested' || sortBy === 'people_count') {
      // Estos campos están en special_requests JSONB (manejar NULLs)
      sortColumn = `COALESCE((b.special_requests::jsonb->>'${sortBy}')::INTEGER, 0)`;
    } else if (sortBy === 'city') {
      // Ciudad está en special_requests JSONB (manejar NULLs)
      sortColumn = `COALESCE(b.special_requests::jsonb->>'city', b.special_requests::jsonb->>'custom_city', '')`;
    }
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${order}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const [bookingsResult, countResult] = await Promise.all([
      client.query(query, queryParams),
      client.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);

    const totalBookings = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBookings / limit);

    // Process bookings to extract data from special_requests JSONB
    const processedBookings = bookingsResult.rows.map(booking => {
      let specialRequests = {};
      try {
        if (booking.special_requests) {
          // Si es string, parsearlo; si ya es objeto, usarlo directamente
          specialRequests = typeof booking.special_requests === 'string' 
            ? JSON.parse(booking.special_requests) 
            : booking.special_requests;
        }
      } catch (parseError) {
        console.error('Error parsing special_requests:', parseError);
        specialRequests = {};
      }
      
      return {
        id: booking.id,
        booking_number: booking.booking_number,
        status: booking.status,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        client_name: `${booking.first_name || ''} ${booking.last_name || ''}`.trim(),
        client_email: booking.email,
        client_phone: booking.phone,
        contract_number: booking.contract_number,
        total_nights: booking.total_nights || null,
        remaining_nights: booking.remaining_nights || null,
        city: specialRequests.city || '',
        custom_city: specialRequests.custom_city || '',
        city_display: specialRequests.city === 'Otros' ? specialRequests.custom_city : specialRequests.city,
        nights_requested: specialRequests.nights_requested || 0,
        people_count: specialRequests.people_count || 0,
        additional_people: specialRequests.additional_people || 0,
        additional_cost: specialRequests.additional_cost || 0,
        contact_source: specialRequests.contact_source || '',
        observations: specialRequests.observations || '',
        check_in_date: specialRequests.check_in_date || null,
        check_out_date: specialRequests.check_out_date || null,
        emergency_contact: specialRequests.emergency_contact || null,
        dietary_restrictions: specialRequests.dietary_restrictions || null,
        special_requests: specialRequests.special_requests || null,
        participants_data: specialRequests.participants_data || [],
        wifi_name: specialRequests.wifi_name || null,
        wifi_password: specialRequests.wifi_password || null,
        google_maps_link: specialRequests.google_maps_link || null
      };
    });

    res.json({
      bookings: processedBookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalBookings,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
});

// Get booking edit information
router.get('/:id/edit-info', authenticateToken, requireBookingAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        id, booking_number, edit_count, total_penalty, is_lost, last_edit_date, edit_history,
        can_edit_booking($1) as can_edit
      FROM bookings 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = result.rows[0];
    
    // Calcular información de penalidades
    const editInfo = {
      edit_count: booking.edit_count,
      total_penalty: booking.total_penalty,
      is_lost: booking.is_lost,
      can_edit: booking.can_edit,
      last_edit_date: booking.last_edit_date,
      edit_history: booking.edit_history || [],
      remaining_edits: Math.max(0, 3 - booking.edit_count),
      next_penalty: booking.edit_count < 3 ? (booking.edit_count === 0 ? 20 : (booking.edit_count === 1 ? 30 : 0)) : 0
    };

    res.json({
      booking_id: booking.id,
      booking_number: booking.booking_number,
      edit_info: editInfo
    });

  } catch (error) {
    console.error('Get booking edit info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        b.*, 
        c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.country,
        c.total_nights, c.remaining_nights, c.contract_number
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = result.rows[0];
    const specialRequests = booking.special_requests ? JSON.parse(booking.special_requests) : {};
    
    res.json({ 
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        status: booking.status,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        client_name: `${booking.first_name} ${booking.last_name}`,
        client_email: booking.email,
        client_phone: booking.phone,
        contract_number: booking.contract_number,
        city: specialRequests.city || '',
        custom_city: specialRequests.custom_city || '',
        city_display: specialRequests.city === 'Otros' ? specialRequests.custom_city : specialRequests.city,
        nights_requested: specialRequests.nights_requested || 0,
        people_count: specialRequests.people_count || 0,
        additional_people: specialRequests.additional_people || 0,
        additional_cost: specialRequests.additional_cost || 0,
        contact_source: specialRequests.contact_source || '',
        observations: specialRequests.observations || '',
        check_in_date: specialRequests.check_in_date || null,
        check_out_date: specialRequests.check_out_date || null,
        emergency_contact: specialRequests.emergency_contact || null,
        dietary_restrictions: specialRequests.dietary_restrictions || null,
        special_requests: specialRequests.special_requests || null,
        participants_data: specialRequests.participants_data || [],
        wifi_name: specialRequests.wifi_name || null,
        wifi_password: specialRequests.wifi_password || null,
        google_maps_link: specialRequests.google_maps_link || null
      }
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new booking
router.post('/', authenticateToken, requireBookingAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      contract_number,
      city,
      custom_city,
      nights_requested,
      people_count,
      additional_adults,
      additional_children,
      contact_source,
      observations,
      check_in_date,
      check_out_date,
      emergency_contact,
      dietary_restrictions,
      special_requests,
      participants_data,
      wifi_name,
      wifi_password,
      google_maps_link
    } = req.body;

    // Validate required fields
    if (!contract_number || !city || !nights_requested || !people_count || !contact_source) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: número de contrato, ciudad, noches solicitadas, cantidad de personas y fuente de contacto' 
      });
    }

    // Validate city
    if (!AVAILABLE_CITIES.includes(city)) {
      return res.status(400).json({ 
        error: 'Ciudad no válida. Ciudades disponibles: ' + AVAILABLE_CITIES.join(', ') 
      });
    }

    // If city is "Otros", custom_city is required
    if (city === 'Otros' && !custom_city?.trim()) {
      return res.status(400).json({ 
        error: 'Debe especificar el nombre de la ciudad cuando selecciona "Otros"' 
      });
    }

    // Validate nights and people count
    if (nights_requested <= 0 || nights_requested > 30) {
      return res.status(400).json({ 
        error: 'Las noches solicitadas deben ser entre 1 y 30' 
      });
    }

    if (people_count < 1 || people_count > 20) {
      return res.status(400).json({ 
        error: 'La cantidad de personas debe ser entre 1 y 20' 
      });
    }

    // Get client info and validate nights
    const clientResult = await client.query(`
      SELECT id, first_name, last_name, remaining_nights, total_nights
      FROM clients 
      WHERE contract_number = $1 AND is_active = true
    `, [contract_number]);

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Cliente no encontrado con este número de contrato' 
      });
    }

    const clientData = clientResult.rows[0];

    // Check if client has enough nights
    if (clientData.remaining_nights < nights_requested) {
      return res.status(400).json({ 
        error: `El cliente solo tiene ${clientData.remaining_nights} noches disponibles. Solicita ${nights_requested} noches.` 
      });
    }

    // Calculate additional people and cost
    // Si hay más de 6 personas, usar additional_adults y additional_children
    let additional_people = 0;
    let additional_cost = 0;
    
    if (people_count > 6) {
      const adults = parseInt(additional_adults) || 0;
      const children = parseInt(additional_children) || 0;
      additional_people = adults + children;
      // Adultos: $30 por noche, Niños: $25 por noche
      additional_cost = (adults * 30 * nights_requested) + (children * 25 * nights_requested);
    }

    const bookingNumber = generateBookingNumber();

    // Validate participants data
    if (participants_data && Array.isArray(participants_data)) {
      if (participants_data.length !== people_count) {
        return res.status(400).json({
          error: `Debe proporcionar datos para exactamente ${people_count} participantes`
        });
      }
      
      // Validate each participant has required fields
      for (let i = 0; i < participants_data.length; i++) {
        const participant = participants_data[i];
        if (!participant.first_name?.trim() || !participant.last_name?.trim() || !participant.identification?.trim()) {
          return res.status(400).json({
            error: `Participante ${i + 1}: Faltan nombre, apellido o cédula`
          });
        }
      }
    }

    // Create a temporary package for this booking
    const tempPackageResult = await client.query(`
      INSERT INTO packages (
        name, description, destination, duration_days, 
        price, currency, max_participants, min_participants,
        includes, excludes, highlights, difficulty_level, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      `Reserva ${city === 'Otros' ? custom_city?.trim() : city}`,
      `Reserva de departamento en ${city === 'Otros' ? custom_city?.trim() : city}`,
      city === 'Otros' ? custom_city?.trim() : city,
      nights_requested,
      additional_cost,
      'USD',
      people_count,
      1,
      ['Alojamiento'],
      [],
      ['Reserva de departamento'],
      'easy',
      true
    ]);

    const tempPackageId = tempPackageResult.rows[0].id;

    // Create booking with the current table structure
    const bookingResult = await client.query(`
      INSERT INTO bookings (
        booking_number, client_id, package_id, travel_date, return_date,
        participants, total_price, currency, status, payment_status,
        special_requests, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, booking_number, status, created_at
    `, [
      bookingNumber,
      clientData.id,
      tempPackageId,
      new Date(), // travel_date
      new Date(Date.now() + nights_requested * 24 * 60 * 60 * 1000), // return_date
      people_count,
      additional_cost, // total_price
      'USD',
      'pending',
      'pending',
      JSON.stringify({
        contract_number,
        city: city === 'Otros' ? custom_city?.trim() : city,
        nights_requested,
        additional_people,
        additional_adults: people_count > 6 ? (parseInt(additional_adults) || 0) : 0,
        additional_children: people_count > 6 ? (parseInt(additional_children) || 0) : 0,
        contact_source,
        observations: observations?.trim(),
        check_in_date: check_in_date || null,
        check_out_date: check_out_date || null,
        emergency_contact: emergency_contact?.trim() || null,
        dietary_restrictions: dietary_restrictions?.trim() || null,
        special_requests: special_requests?.trim() || null,
        participants_data: participants_data || [],
        wifi_name: wifi_name?.trim() || null,
        wifi_password: wifi_password?.trim() || null,
        google_maps_link: google_maps_link?.trim() || null
      }),
      req.user.id
    ]);

    // Update client's remaining nights
    await client.query(`
      UPDATE clients 
      SET remaining_nights = remaining_nights - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [nights_requested, clientData.id]);

    // Create a completed requirement for the booking
    try {
      const requirementDescription = `Reserva realizada para ${people_count} persona${people_count > 1 ? 's' : ''} en ${city === 'Otros' ? custom_city : city} por ${nights_requested} noche${nights_requested > 1 ? 's' : ''}. Fuente de contacto: ${contact_source}`;
      
      await client.query(`
        INSERT INTO requirements (
          contract_number, client_id, requirement_type, description, status, created_by, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        contract_number,
        clientData.id,
        'Reserva',
        requirementDescription,
        'completed',
        req.user.email
      ]);
      
      console.log(`✅ Requerimiento completado creado para reserva ${bookingNumber}`);
    } catch (reqError) {
      console.error('Error creando requerimiento completado:', reqError);
      // No fallar la creación de la reserva si hay error con el requerimiento
    }

    await client.query('COMMIT');

    // Generar documento automáticamente después de crear la reserva
    let documentResult = null;
    let whatsappResult = null;
    
    try {
      // Obtener datos completos del cliente para el documento
      const fullClientResult = await pool.query(`
        SELECT first_name, last_name, email, phone
        FROM clients 
        WHERE id = $1
      `, [clientData.id]);
      
      const fullClient = fullClientResult.rows[0];
      
      // Crear objeto de reserva para el documento
      const bookingForDocument = {
        ...bookingResult.rows[0],
        city: city === 'Otros' ? custom_city : city,
        custom_city: city === 'Otros' ? custom_city : null,
        nights_requested,
        people_count,
        additional_people,
        additional_cost,
        contact_source,
        observations,
        created_at: new Date().toISOString()
      };

      // Generar documento
      documentResult = await documentGenerator.generateReservationDocument(bookingForDocument, fullClient);
      
      if (documentResult.success) {
        // Generar mensaje de WhatsApp
        const whatsappMessage = documentGenerator.generateWhatsAppMessage(bookingForDocument, fullClient, documentResult.fileName);
        
        // Enviar por WhatsApp
        whatsappResult = await whatsappService.sendMessageViaWebAPI(
          fullClient.phone,
          whatsappMessage,
          documentResult.filePath
        );
        
        // Actualizar la reserva con el estado de documento enviado
        if (whatsappResult.success) {
          // TODO: Agregar columnas document_sent y document_sent_at a la tabla bookings
          // await pool.query(
          //   'UPDATE bookings SET document_sent = true, document_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
          //   [bookingResult.rows[0].id]
          // );
        }
      }
    } catch (docError) {
      console.error('Error generando/enviando documento:', docError);
      // No fallar la creación de la reserva si hay error con el documento
    }

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      booking: {
        ...bookingResult.rows[0],
        client_name: `${clientData.first_name} ${clientData.last_name}`,
        city_display: city === 'Otros' ? custom_city : city,
        nights_requested,
        people_count,
        additional_people,
        additional_adults: people_count > 6 ? (parseInt(additional_adults) || 0) : 0,
        additional_children: people_count > 6 ? (parseInt(additional_children) || 0) : 0,
        additional_cost,
        contract_number,
        city: city === 'Otros' ? custom_city : city,
        custom_city: city === 'Otros' ? custom_city : null,
        contact_source,
        observations,
        participants_data: participants_data || []
      },
      document: documentResult ? {
        generated: documentResult.success,
        fileName: documentResult.fileName,
        error: documentResult.error
      } : null,
      whatsapp: whatsappResult ? {
        sent: whatsappResult.success,
        messageId: whatsappResult.messageId,
        error: whatsappResult.error
      } : null
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update booking status
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    const allowedPaymentStatuses = ['pending', 'partial', 'paid', 'refunded'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (payment_status && !allowedPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const result = await pool.query(`
      UPDATE bookings SET 
        status = COALESCE($2, status),
        payment_status = COALESCE($3, payment_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, payment_status, updated_at
    `, [id, status, payment_status]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      message: 'Booking status updated successfully',
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as bookings_30_days,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as bookings_7_days,
        SUM(nights_requested) as total_nights_booked,
        SUM(people_count) as total_people_booked,
        SUM(additional_cost) as total_additional_revenue,
        AVG(nights_requested) as average_nights_per_booking,
        AVG(people_count) as average_people_per_booking
      FROM bookings
    `);

    res.json({ stats: statsResult.rows[0] });

  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bookings by client
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [bookingsResult, countResult] = await Promise.all([
      pool.query(`
        SELECT 
          b.id, b.booking_number, b.contract_number, b.city, b.custom_city,
          b.nights_requested, b.people_count, b.additional_people, b.additional_cost,
          b.contact_source, b.observations, b.status, b.created_at, b.updated_at
        FROM bookings b
        WHERE b.client_id = $1
        ORDER BY b.created_at DESC
        LIMIT $2 OFFSET $3
      `, [clientId, parseInt(limit), offset]),
      pool.query('SELECT COUNT(*) FROM bookings WHERE client_id = $1', [clientId])
    ]);

    const totalBookings = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBookings / limit);

    // Add city_display to each booking
    const bookings = bookingsResult.rows.map(booking => ({
      ...booking,
      city_display: booking.city === 'Otros' ? booking.custom_city : booking.city
    }));

    res.json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalBookings,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get client bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update booking
router.put('/:id', authenticateToken, requireBookingAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      city,
      custom_city,
      nights_requested,
      people_count,
      contact_source,
      observations,
      participants_data,
      status,
      wifi_name,
      wifi_password,
      google_maps_link,
      reservation_value,
      custom_value,
      check_in_date,
      check_out_date,
      emergency_contact,
      dietary_restrictions,
      special_requests
    } = req.body;

    // Verificar si la reserva puede ser editada
    const canEditResult = await pool.query(`
      SELECT can_edit_booking($1) as can_edit, edit_count, is_lost, total_penalty
      FROM bookings 
      WHERE id = $1
    `, [id]);

    if (canEditResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const { can_edit, edit_count, is_lost, total_penalty } = canEditResult.rows[0];

    if (!can_edit) {
      if (is_lost) {
        return res.status(400).json({ 
          error: 'Esta reserva ha sido marcada como perdida debido a múltiples ediciones. No se puede editar más.',
          edit_count,
          is_lost: true,
          total_penalty
        });
      } else {
        return res.status(400).json({ 
          error: 'Esta reserva ha alcanzado el límite máximo de ediciones (3). No se puede editar más.',
          edit_count,
          is_lost: false,
          total_penalty
        });
      }
    }

    // Calcular la penalidad que se aplicará
    const penaltyToApply = edit_count === 0 ? 20 : (edit_count === 1 ? 30 : 0);
    const newTotalPenalty = total_penalty + penaltyToApply;

    // Validate required fields
    if (!city || !nights_requested || !people_count) {
      return res.status(400).json({ 
        error: 'Ciudad, noches y número de personas son requeridos' 
      });
    }

    if (!AVAILABLE_CITIES.includes(city)) {
      return res.status(400).json({ 
        error: 'Ciudad no válida' 
      });
    }

    if (city === 'Otros' && !custom_city?.trim()) {
      return res.status(400).json({ 
        error: 'Debe especificar el nombre de la ciudad personalizada' 
      });
    }

    if (nights_requested < 1 || nights_requested > 30) {
      return res.status(400).json({ 
        error: 'El número de noches debe estar entre 1 y 30' 
      });
    }

    if (people_count < 1 || people_count > 20) {
      return res.status(400).json({ 
        error: 'El número de personas debe estar entre 1 y 20' 
      });
    }

    // Validate participants data
    if (participants_data && Array.isArray(participants_data)) {
      if (participants_data.length !== people_count) {
        return res.status(400).json({ 
          error: 'El número de participantes debe coincidir con el número de personas' 
        });
      }

      for (let i = 0; i < participants_data.length; i++) {
        const participant = participants_data[i];
        if (!participant.first_name?.trim() || !participant.last_name?.trim() || !participant.identification?.trim()) {
          return res.status(400).json({ 
            error: `Participante ${i + 1}: nombre, apellido e identificación son requeridos` 
          });
        }
      }
    }

    const additional_people = Math.max(0, people_count - 6);
    const additional_cost = additional_people * nights_requested * 35;

    const specialRequests = JSON.stringify({
      contract_number: req.body.contract_number,
      city: city === 'Otros' ? custom_city?.trim() : city,
      nights_requested,
      additional_people,
      contact_source,
      observations: observations?.trim(),
      participants_data: participants_data || [],
      wifi_name: wifi_name?.trim() || null,
      wifi_password: wifi_password?.trim() || null,
      google_maps_link: google_maps_link?.trim() || null,
      reservation_value: reservation_value || null,
      custom_value: custom_value || null,
      check_in_date: check_in_date || null,
      check_out_date: check_out_date || null,
      emergency_contact: emergency_contact || null,
      dietary_restrictions: dietary_restrictions || null,
      special_requests: special_requests || null
    });

    // El trigger automáticamente actualizará edit_count, total_penalty, etc.
    const result = await pool.query(`
      UPDATE bookings SET
        special_requests = $1,
        status = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, booking_number, status, updated_at, edit_count, total_penalty, is_lost
    `, [specialRequests, status || 'pending', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const updatedBooking = result.rows[0];

    res.json({
      message: `Reserva actualizada exitosamente${penaltyToApply > 0 ? `. Penalidad aplicada: $${penaltyToApply}` : ''}`,
      booking: updatedBooking,
      edit_info: {
        edit_count: updatedBooking.edit_count,
        penalty_applied: penaltyToApply,
        total_penalty: updatedBooking.total_penalty,
        is_lost: updatedBooking.is_lost,
        can_edit_again: updatedBooking.edit_count < 3 && !updatedBooking.is_lost
      }
    });

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete booking
router.delete('/:id', authenticateToken, requireBookingAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Verificar contraseña
    if (password !== 'admin2025') {
      return res.status(403).json({ error: 'Contraseña incorrecta' });
    }

    // First get the booking to restore nights to client
    const bookingResult = await pool.query(`
      SELECT b.special_requests, b.client_id
      FROM bookings b
      WHERE b.id = $1
    `, [id]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const booking = bookingResult.rows[0];
    
    // Manejar special_requests que puede ser string JSON, objeto, o null
    let specialRequests = {};
    if (booking.special_requests) {
      try {
        // Si es string, parsearlo; si ya es objeto, usarlo directamente
        if (typeof booking.special_requests === 'string') {
          specialRequests = JSON.parse(booking.special_requests);
        } else {
          specialRequests = booking.special_requests;
        }
      } catch (parseError) {
        console.error('Error parsing special_requests:', parseError);
        // Si falla el parse, usar objeto vacío
        specialRequests = {};
      }
    }
    
    const nights_requested = specialRequests.nights_requested || 0;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Restore nights to client
      if (nights_requested > 0) {
        await client.query(`
          UPDATE clients
          SET remaining_nights = remaining_nights + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [nights_requested, booking.client_id]);
      }

      // Delete the booking
      const deleteResult = await client.query(`
        DELETE FROM bookings WHERE id = $1
      `, [id]);

      await client.query('COMMIT');

      if (deleteResult.rowCount === 0) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      res.json({ message: 'Reserva eliminada exitosamente' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
