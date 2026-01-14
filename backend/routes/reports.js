const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware para verificar acceso a reportes
const requireReportsAccess = (req, res, next) => {
  const userRole = req.user.role;
  const userEmail = req.user.email;
  // Permitir admin, cobranzas, o employee con email "Cobranzas" (usuario de cobranzas)
  if (userRole === 'admin' || userRole === 'cobranzas' || (userRole === 'employee' && userEmail === 'Cobranzas')) {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador o cobranzas.' });
  }
};

// Middleware para verificar acceso a reportes básicos (empleados)
const requireBasicReportsAccess = (req, res, next) => {
  const userRole = req.user.role;
  if (userRole === 'admin' || userRole === 'cobranzas' || userRole === 'employee') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de usuario autorizado.' });
  }
};

// Función para obtener fechas según el período
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
      break;
    case '13days':
      const thirteenDaysAgo = new Date(now);
      thirteenDaysAgo.setDate(now.getDate() - 13);
      startDate = new Date(thirteenDaysAgo.getFullYear(), thirteenDaysAgo.getMonth(), thirteenDaysAgo.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'week':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      startDate = startOfWeek;
      endDate = new Date(startOfWeek);
      endDate.setDate(startOfWeek.getDate() + 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  return { startDate, endDate };
};

// Reporte de ventas por período
router.get('/sales', authenticateToken, requireReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const salesQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        SUM(total_amount) as total_monto,
        AVG(total_amount) as promedio_venta,
        MIN(total_amount) as venta_minima,
        MAX(total_amount) as venta_maxima,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as ventas_pagadas,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as ventas_pendientes,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as monto_pagado,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as monto_pendiente
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true
    `;

    const salesResult = await client.query(salesQuery, [startDate, endDate]);

    // Ventas por día del período
    const dailySalesQuery = `
      SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as ventas_dia,
        SUM(total_amount) as monto_dia
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `;

    const dailySalesResult = await client.query(dailySalesQuery, [startDate, endDate]);

    // Top clientes por monto
    const topClientsQuery = `
      SELECT 
        contract_number,
        CONCAT(first_name, ' ', last_name) as nombre_completo,
        total_amount,
        payment_status,
        created_at
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true
      ORDER BY total_amount DESC
      LIMIT 10
    `;

    const topClientsResult = await client.query(topClientsQuery, [startDate, endDate]);

    res.json({
      period,
      dateRange: { startDate, endDate },
      total_sales: salesResult.rows[0].total_monto || 0,
      new_clients: salesResult.rows[0].total_ventas || 0,
      average_ticket: salesResult.rows[0].promedio_venta || 0,
      summary: salesResult.rows[0],
      dailySales: dailySalesResult.rows,
      topClients: topClientsResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo reporte de ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Reporte de cobranzas por período
router.get('/collections', authenticateToken, requireReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Clientes en cobranzas del período
    const collectionsQuery = `
      SELECT 
        COUNT(*) as total_cobranzas,
        SUM(total_amount) as monto_total_cobranzas,
        AVG(total_amount) as promedio_cobranza,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as cobranzas_pagadas,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as cobranzas_pendientes,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as monto_cobrado,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as monto_por_cobrar
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true AND in_collections = 'Si'
    `;

    const collectionsResult = await client.query(collectionsQuery, [startDate, endDate]);

    // Cobranzas por día
    const dailyCollectionsQuery = `
      SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as cobranzas_dia,
        SUM(total_amount) as monto_dia
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true AND in_collections = 'Si'
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `;

    const dailyCollectionsResult = await client.query(dailyCollectionsQuery, [startDate, endDate]);

    // Clientes con mayor deuda
    const topDebtorsQuery = `
      SELECT 
        contract_number,
        CONCAT(first_name, ' ', last_name) as nombre_completo,
        total_amount,
        payment_status,
        created_at,
        remaining_nights
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true AND in_collections = 'Si'
      ORDER BY total_amount DESC
      LIMIT 15
    `;

    const topDebtorsResult = await client.query(topDebtorsQuery, [startDate, endDate]);

    res.json({
      period,
      dateRange: { startDate, endDate },
      total_clients: collectionsResult.rows[0].total_cobranzas || 0,
      in_collections: collectionsResult.rows[0].total_cobranzas || 0,
      active_clients: collectionsResult.rows[0].cobranzas_pagadas || 0,
      summary: collectionsResult.rows[0],
      dailyCollections: dailyCollectionsResult.rows,
      topDebtors: topDebtorsResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo reporte de cobranzas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Reporte de requerimientos por usuario y período
router.get('/requirements', authenticateToken, requireReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verificar si requirements existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'requirements'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({
        period: req.query.period || 'month',
        dateRange: { startDate: null, endDate: null },
        total_requirements: 0,
        completed_requirements: 0,
        pending_requirements: 0,
        byUser: [],
        dailyRequirements: [],
        byType: []
      });
    }

    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Requerimientos por usuario
    const requirementsByUserQuery = `
      SELECT 
        r.created_by as email,
        'user' as role,
        COUNT(r.id) as total_requerimientos,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as requerimientos_completados,
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as requerimientos_pendientes,
        COUNT(CASE WHEN r.requirement_type = 'Reserva' THEN 1 END) as reservas_atendidas,
        COUNT(CASE WHEN r.requirement_type = 'Cotización de Vuelos' THEN 1 END) as cotizaciones_vuelos,
        COUNT(CASE WHEN r.requirement_type = 'Cotización de Paquetes' THEN 1 END) as cotizaciones_paquetes
      FROM requirements r
      WHERE r.created_at >= $1 AND r.created_at < $2
      GROUP BY r.created_by
      ORDER BY total_requerimientos DESC
    `;

    const requirementsByUserResult = await client.query(requirementsByUserQuery, [startDate, endDate]);

    // Requerimientos por día
    const dailyRequirementsQuery = `
      SELECT 
        DATE(r.created_at) as fecha,
        COUNT(r.id) as requerimientos_dia,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completados_dia,
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pendientes_dia
      FROM requirements r
      WHERE r.created_at >= $1 AND r.created_at < $2
      GROUP BY DATE(r.created_at)
      ORDER BY fecha DESC
    `;

    const dailyRequirementsResult = await client.query(dailyRequirementsQuery, [startDate, endDate]);

    // Requerimientos por tipo
    const requirementsByTypeQuery = `
      SELECT 
        requirement_type,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completados,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendientes
      FROM requirements
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY requirement_type
      ORDER BY total DESC
    `;

    const requirementsByTypeResult = await client.query(requirementsByTypeQuery, [startDate, endDate]);

    // Calcular totales
    const totalRequirements = requirementsByUserResult.rows.reduce((sum, row) => sum + parseInt(row.total_requerimientos), 0);
    const completedRequirements = requirementsByUserResult.rows.reduce((sum, row) => sum + parseInt(row.requerimientos_completados || 0), 0);
    const pendingRequirements = requirementsByUserResult.rows.reduce((sum, row) => sum + parseInt(row.requerimientos_pendientes || 0), 0);

    res.json({
      period,
      dateRange: { startDate, endDate },
      total_requirements: totalRequirements,
      completed_requirements: completedRequirements,
      pending_requirements: pendingRequirements,
      byUser: requirementsByUserResult.rows,
      dailyRequirements: dailyRequirementsResult.rows,
      byType: requirementsByTypeResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo reporte de requerimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Reporte de reservas por estado
router.get('/bookings', authenticateToken, requireReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Resumen por estado
    const bookingStatusQuery = `
      SELECT 
        status,
        COUNT(*) as total_reservas,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as reservas_activas,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as reservas_pendientes,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as reservas_canceladas,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as reservas_completadas,
        SUM(CASE WHEN status = 'active' THEN total_price ELSE 0 END) as monto_activas,
        SUM(CASE WHEN status = 'pending' THEN total_price ELSE 0 END) as monto_pendientes,
        SUM(CASE WHEN status = 'cancelled' THEN total_price ELSE 0 END) as monto_canceladas,
        SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as monto_completadas
      FROM bookings
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY status
    `;

    const bookingStatusResult = await client.query(bookingStatusQuery, [startDate, endDate]);

    // Reservas por ciudad
    const bookingsByCityQuery = `
      SELECT 
        COALESCE(
          CASE 
            WHEN special_requests IS NOT NULL THEN special_requests::jsonb->>'city'
            ELSE NULL
          END,
          'No especificada'
        ) as ciudad,
        COUNT(*) as total_reservas,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activas,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendientes,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceladas,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completadas,
        SUM(total_price) as monto_total
      FROM bookings
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY COALESCE(
        CASE 
          WHEN special_requests IS NOT NULL THEN special_requests::jsonb->>'city'
          ELSE NULL
        END,
        'No especificada'
      )
      ORDER BY total_reservas DESC
    `;

    const bookingsByCityResult = await client.query(bookingsByCityQuery, [startDate, endDate]);

    // Reservas por día
    const dailyBookingsQuery = `
      SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as reservas_dia,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activas_dia,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendientes_dia,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceladas_dia,
        SUM(total_price) as monto_dia
      FROM bookings
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
    `;

    const dailyBookingsResult = await client.query(dailyBookingsQuery, [startDate, endDate]);

    // Reservas canceladas recientes
    const cancelledBookingsQuery = `
      SELECT 
        b.booking_number,
        b.status,
        b.total_price,
        b.created_at,
        c.contract_number,
        CONCAT(c.first_name, ' ', c.last_name) as cliente_nombre,
        COALESCE(b.special_requests::jsonb->>'city', 'No especificada') as ciudad
      FROM bookings b
      JOIN clients c ON b.client_id = c.id
      WHERE b.created_at >= $1 AND b.created_at < $2 AND b.status = 'cancelled'
      ORDER BY b.created_at DESC
      LIMIT 20
    `;

    const cancelledBookingsResult = await client.query(cancelledBookingsQuery, [startDate, endDate]);

    // Calcular totales
    const totalBookings = bookingStatusResult.rows.reduce((sum, row) => sum + parseInt(row.total_reservas), 0);
    const confirmedBookings = bookingStatusResult.rows.reduce((sum, row) => sum + parseInt(row.reservas_activas || 0), 0);
    const cancelledBookings = bookingStatusResult.rows.reduce((sum, row) => sum + parseInt(row.reservas_canceladas || 0), 0);
    const pendingBookings = bookingStatusResult.rows.reduce((sum, row) => sum + parseInt(row.reservas_pendientes || 0), 0);

    res.json({
      period,
      dateRange: { startDate, endDate },
      total_bookings: totalBookings,
      confirmed_bookings: confirmedBookings,
      cancelled_bookings: cancelledBookings,
      pending_bookings: pendingBookings,
      byStatus: bookingStatusResult.rows,
      byCity: bookingsByCityResult.rows,
      dailyBookings: dailyBookingsResult.rows,
      cancelledBookings: cancelledBookingsResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo reporte de reservas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Reporte general/dashboard
router.get('/dashboard', authenticateToken, requireReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Métricas generales - para mostrar datos reales, usamos un rango más amplio
    // Verificar si requirements existe antes de usarlo
    let requirementsCount = 0;
    try {
      const requirementsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'requirements'
        )
      `);
      
      if (requirementsCheck.rows[0].exists) {
        const reqResult = await client.query(`
          SELECT COUNT(*) as count 
          FROM requirements 
          WHERE created_at >= $1 AND created_at < $2
        `, [startDate, endDate]);
        requirementsCount = parseInt(reqResult.rows[0].count) || 0;
      }
    } catch (error) {
      console.log('⚠️  No se pudo obtener count de requirements, usando 0...');
    }
    
    const generalMetricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM clients WHERE is_active = true) as total_clientes,
        (SELECT COUNT(*) FROM bookings WHERE created_at >= $1 AND created_at < $2) as total_reservas,
        $3::INTEGER as total_requerimientos,
        (SELECT COUNT(*) FROM clients WHERE is_active = true AND in_collections = 'Si') as total_cobranzas,
        (SELECT SUM(total_amount) FROM clients WHERE is_active = true) as total_ventas,
        (SELECT SUM(total_price) FROM bookings WHERE created_at >= $1 AND created_at < $2) as total_reservas_monto,
        (SELECT COUNT(*) FROM bookings WHERE created_at >= $1 AND created_at < $2 AND status = 'active') as reservas_activas,
        (SELECT COUNT(*) FROM bookings WHERE created_at >= $1 AND created_at < $2 AND status = 'cancelled') as reservas_canceladas
    `;

    const generalMetricsResult = await client.query(generalMetricsQuery, [startDate, endDate, requirementsCount]);

    // Tendencias de los últimos 7 días
    // Nota: requirements puede no existir, usar LEFT JOIN o verificar existencia
    let trendsQuery = `
      SELECT 
        DATE(created_at) as fecha,
        COUNT(CASE WHEN table_name = 'clients' THEN 1 END) as nuevos_clientes,
        COUNT(CASE WHEN table_name = 'bookings' THEN 1 END) as nuevas_reservas,
        COUNT(CASE WHEN table_name = 'requirements' THEN 1 END) as nuevos_requerimientos
      FROM (
        SELECT created_at, 'clients' as table_name FROM clients WHERE created_at >= $1 AND created_at < $2 AND is_active = true
        UNION ALL
        SELECT created_at, 'bookings' as table_name FROM bookings WHERE created_at >= $1 AND created_at < $2
    `;
    
    // Verificar si requirements existe antes de agregarlo
    try {
      const requirementsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'requirements'
        )
      `);
      
      if (requirementsCheck.rows[0].exists) {
        trendsQuery += `
        UNION ALL
        SELECT created_at, 'requirements' as table_name FROM requirements WHERE created_at >= $1 AND created_at < $2
        `;
      }
    } catch (error) {
      // Si falla la verificación, simplemente no incluimos requirements
      console.log('⚠️  No se pudo verificar tabla requirements, omitiendo...');
    }
    
    trendsQuery += `
      ) as combined_data
      GROUP BY DATE(created_at)
      ORDER BY fecha DESC
      LIMIT 7
    `;

    const trendsResult = await client.query(trendsQuery, [startDate, endDate]);

    res.json({
      period,
      dateRange: { startDate, endDate },
      metrics: generalMetricsResult.rows[0],
      trends: trendsResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo reporte general:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Reporte de sumatorias del último mes
// Endpoint específico para cobranzas - datos del dashboard
router.get('/cobranzas-dashboard', authenticateToken, requireBasicReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { period = 'this_month' } = req.query;
    
    let startDate, endDate;
    
    // Calcular el rango según el período solicitado
    const now = new Date();
    
    switch (period) {
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
        
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = thisMonth.toISOString().split('T')[0];
        break;
        
      case 'this_month':
      default:
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        startDate = currentMonth.toISOString().split('T')[0];
        endDate = nextMonth.toISOString().split('T')[0];
        break;
    }

    console.log(`📅 Calculando datos del dashboard para cobranzas - ${period}: ${startDate} a ${endDate}`);

    // Consultas específicas para cobranzas
    const salesQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total_amount), 0) as total_monto,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as ventas_pagadas,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as monto_pagado
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true
    `;

    const collectionsQuery = `
      SELECT 
        COUNT(*) as total_cobranzas,
        COALESCE(SUM(total_amount), 0) as total_monto_cobranzas,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as cobranzas_pagadas,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as monto_cobranzas_pagado
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true AND in_collections = 'Si'
    `;

    // Verificar qué columnas tiene la tabla payments
    const paymentsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND table_schema = 'public'
    `);
    
    const columnNames = paymentsColumns.rows.map(r => r.column_name);
    const hasPaymentAmount = columnNames.includes('payment_amount');
    const hasAmount = columnNames.includes('amount');
    const hasClientId = columnNames.includes('client_id');
    
    // Construir la consulta según las columnas disponibles
    let paymentsQuery;
    if (hasPaymentAmount) {
      // Esquema nuevo: payment_amount
      paymentsQuery = `
        SELECT 
          COALESCE(SUM(payment_amount), 0) as monto_cobrado_real
        FROM payments 
        WHERE payment_date >= $1 AND payment_date < $2
      `;
    } else if (hasAmount) {
      // Esquema original: amount
      paymentsQuery = `
        SELECT 
          COALESCE(SUM(amount), 0) as monto_cobrado_real
        FROM payments 
        WHERE payment_date >= $1 AND payment_date < $2
      `;
    } else {
      // No hay columna de monto, retornar 0
      paymentsQuery = `
        SELECT 0 as monto_cobrado_real
      `;
    }

    const [salesResult, collectionsResult, paymentsResult] = await Promise.all([
      client.query(salesQuery, [startDate, endDate]),
      client.query(collectionsQuery, [startDate, endDate]),
      hasPaymentAmount || hasAmount 
        ? client.query(paymentsQuery, [startDate, endDate])
        : client.query(paymentsQuery)
    ]);

    // Usar el monto cobrado real de la tabla payments
    const montoCobradoReal = parseFloat(paymentsResult.rows[0].monto_cobrado_real) || 0;
    
    // Actualizar el monto_pagado con el valor real de pagos
    const salesData = salesResult.rows[0];
    salesData.monto_pagado = montoCobradoReal;
    
    const collectionsData = collectionsResult.rows[0];
    collectionsData.monto_cobranzas_pagado = montoCobradoReal;

    const summary = {
      period: period,
      dateRange: { startDate, endDate },
      sales: salesData,
      collections: collectionsData
    };

    console.log(`📊 Datos del dashboard para cobranzas calculados:`, summary);
    console.log(`💰 Monto cobrado real (de tabla payments): $${montoCobradoReal}`);

    res.json(summary);

  } catch (error) {
    console.error('Error obteniendo datos del dashboard para cobranzas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Endpoint específico para empleados - datos básicos del dashboard
router.get('/employee-dashboard', authenticateToken, requireBasicReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { period = 'this_month' } = req.query;
    
    let startDate, endDate;
    
    // Calcular el rango según el período solicitado
    const now = new Date();
    
    switch (period) {
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
        
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = thisMonth.toISOString().split('T')[0];
        break;
        
      case 'this_month':
      default:
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        startDate = currentMonth.toISOString().split('T')[0];
        endDate = nextMonth.toISOString().split('T')[0];
        break;
    }

    console.log(`📅 Calculando datos del dashboard para empleados - ${period}: ${startDate} a ${endDate}`);

    // Consultas básicas para empleados
    const salesQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total_amount), 0) as total_monto,
        COUNT(CASE WHEN payment_status = 'pago_completo' THEN 1 END) as ventas_pagadas,
        COALESCE(SUM(CASE WHEN payment_status = 'pago_completo' THEN total_amount ELSE 0 END), 0) as monto_pagado
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true
    `;

    const bookingsQuery = `
      SELECT 
        COUNT(*) as total_reservas,
        0 as total_monto,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmadas,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceladas
      FROM bookings 
      WHERE created_at >= $1 AND created_at < $2
    `;

    // Verificar si requirements existe
    let hasRequirements = false;
    try {
      const requirementsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'requirements'
        )
      `);
      hasRequirements = requirementsCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla requirements, omitiendo...');
    }

    let requirementsQuery;
    if (hasRequirements) {
      requirementsQuery = `
        SELECT 
          COUNT(*) as total_requerimientos,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completados,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendientes
        FROM requirements 
        WHERE created_at >= $1 AND created_at < $2
      `;
    } else {
      // Si no existe, devolver valores por defecto
      requirementsQuery = `
        SELECT 
          0 as total_requerimientos,
          0 as completados,
          0 as pendientes
      `;
    }

    const queryPromises = [
      client.query(salesQuery, [startDate, endDate]),
      client.query(bookingsQuery, [startDate, endDate])
    ];
    
    if (hasRequirements) {
      queryPromises.push(client.query(requirementsQuery, [startDate, endDate]));
    } else {
      queryPromises.push(client.query(requirementsQuery));
    }

    const [salesResult, bookingsResult, requirementsResult] = await Promise.all(queryPromises);

    const summary = {
      period: period,
      dateRange: { startDate, endDate },
      sales: salesResult.rows[0],
      bookings: bookingsResult.rows[0],
      requirements: requirementsResult.rows[0]
    };

    console.log(`📊 Datos del dashboard para empleados calculados:`, summary);

    res.json(summary);

  } catch (error) {
    console.error('Error obteniendo datos del dashboard para empleados:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
});

router.get('/last-month-summary', authenticateToken, requireReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { period = 'this_month' } = req.query;
    
    let startDate, endDate;
    
    // Calcular el rango según el período solicitado
    const now = new Date();
    
    switch (period) {
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
        
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = thisMonth.toISOString().split('T')[0];
        break;
        
      case 'this_month':
      default:
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        startDate = currentMonth.toISOString().split('T')[0];
        endDate = nextMonth.toISOString().split('T')[0];
        break;
    }

    console.log(`📅 Calculando sumatorias para ${period}: ${startDate} a ${endDate}`);

    // Sumatoria de ventas del período
    const salesQuery = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(total_amount), 0) as total_monto_ventas,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as ventas_pagadas,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as monto_pagado
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true
    `;

    // Sumatoria de cobranzas del período
    const collectionsQuery = `
      SELECT 
        COUNT(*) as total_cobranzas,
        COALESCE(SUM(total_amount), 0) as total_monto_cobranzas,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as cobranzas_pagadas,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as monto_cobranzas_pagado
      FROM clients 
      WHERE created_at >= $1 AND created_at < $2 AND is_active = true AND in_collections = 'Si'
    `;

    // Verificar si requirements existe
    let hasRequirements = false;
    try {
      const requirementsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'requirements'
        )
      `);
      hasRequirements = requirementsCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla requirements, omitiendo...');
    }

    // Sumatoria de requerimientos del período
    let requirementsQuery;
    if (hasRequirements) {
      requirementsQuery = `
        SELECT 
          COUNT(*) as total_requerimientos,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as requerimientos_completados,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as requerimientos_pendientes
        FROM requirements 
        WHERE created_at >= $1 AND created_at < $2
      `;
    } else {
      requirementsQuery = `
        SELECT 
          0 as total_requerimientos,
          0 as requerimientos_completados,
          0 as requerimientos_pendientes
      `;
    }

    // Sumatoria de reservas del período
    const bookingsQuery = `
      SELECT 
        COUNT(*) as total_reservas,
        COALESCE(SUM(total_price), 0) as total_monto_reservas,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as reservas_confirmadas,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as reservas_canceladas
      FROM bookings 
      WHERE created_at >= $1 AND created_at < $2
    `;

    const queryPromises = [
      client.query(salesQuery, [startDate, endDate]),
      client.query(collectionsQuery, [startDate, endDate])
    ];
    
    // Agregar requirements query
    if (hasRequirements) {
      queryPromises.push(client.query(requirementsQuery, [startDate, endDate]));
    } else {
      queryPromises.push(client.query(requirementsQuery));
    }
    
    // Agregar bookings query
    queryPromises.push(client.query(bookingsQuery, [startDate, endDate]));

    const [salesResult, collectionsResult, requirementsResult, bookingsResult] = await Promise.all(queryPromises);

    const summary = {
      period: period,
      dateRange: { startDate, endDate },
      sales: {
        total_ventas: parseInt(salesResult.rows[0].total_ventas) || 0,
        total_monto: parseFloat(salesResult.rows[0].total_monto_ventas) || 0,
        ventas_pagadas: parseInt(salesResult.rows[0].ventas_pagadas) || 0,
        monto_pagado: parseFloat(salesResult.rows[0].monto_pagado) || 0
      },
      collections: {
        total_cobranzas: parseInt(collectionsResult.rows[0].total_cobranzas) || 0,
        total_monto: parseFloat(collectionsResult.rows[0].total_monto_cobranzas) || 0,
        cobranzas_pagadas: parseInt(collectionsResult.rows[0].cobranzas_pagadas) || 0,
        monto_pagado: parseFloat(collectionsResult.rows[0].monto_cobranzas_pagado) || 0
      },
      requirements: {
        total_requerimientos: parseInt(requirementsResult.rows[0].total_requerimientos) || 0,
        completados: parseInt(requirementsResult.rows[0].requerimientos_completados) || 0,
        pendientes: parseInt(requirementsResult.rows[0].requerimientos_pendientes) || 0
      },
      bookings: {
        total_reservas: parseInt(bookingsResult.rows[0].total_reservas) || 0,
        total_monto: parseFloat(bookingsResult.rows[0].total_monto_reservas) || 0,
        confirmadas: parseInt(bookingsResult.rows[0].reservas_confirmadas) || 0,
        canceladas: parseInt(bookingsResult.rows[0].reservas_canceladas) || 0
      }
    };

    console.log(`📊 Sumatorias para ${period} calculadas:`, summary);

    res.json(summary);

  } catch (error) {
    console.error('Error obteniendo sumatorias del período:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Reporte detallado de cobranzas para admin
router.get('/collections-detailed', authenticateToken, requireReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
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

    // Verificar si client_managements existe
    let hasClientManagements = false;
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'client_managements'
        )
      `);
      hasClientManagements = tableCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla client_managements, omitiendo gestiones...');
    }

    // 1. Total de clientes que deben (con deuda pendiente)
    // Contar todos los clientes en cobranzas con deuda > 0
    let clientsWithDebtQuery = `
      SELECT COUNT(DISTINCT c.id) as total_clientes_deben
      FROM clients c
      WHERE c.is_active = true 
      AND c.in_collections = 'Si'
      AND c.total_amount > 0
    `;

    // Si existe payment_agreements, considerar el remaining_amount (deuda real pendiente)
    if (hasPaymentAgreements) {
      clientsWithDebtQuery = `
        SELECT COUNT(DISTINCT c.id) as total_clientes_deben
        FROM clients c
        WHERE c.is_active = true 
        AND c.in_collections = 'Si'
        AND COALESCE(
          (SELECT remaining_amount
           FROM payment_agreements
           WHERE client_id = c.id
           ORDER BY created_at DESC
           LIMIT 1),
          c.total_amount
        ) > 0
      `;
    }

    // 2. Total de la deuda global (suma de todas las deudas pendientes)
    // Para todos los clientes en cobranzas, calcular su deuda pendiente real
    let totalDebtQuery = `
      SELECT 
        COALESCE(SUM(c.total_amount), 0) as total_deuda_global
      FROM clients c
      WHERE c.is_active = true 
      AND c.in_collections = 'Si'
      AND c.total_amount > 0
    `;

    // Si existe payment_agreements, usar remaining_amount (deuda real pendiente)
    if (hasPaymentAgreements) {
      totalDebtQuery = `
        SELECT 
          COALESCE(SUM(
            COALESCE(
              (SELECT remaining_amount
               FROM payment_agreements
               WHERE client_id = c.id
               ORDER BY created_at DESC
               LIMIT 1),
              c.total_amount
            )
          ), 0) as total_deuda_global
        FROM clients c
        WHERE c.is_active = true 
        AND c.in_collections = 'Si'
        AND COALESCE(
          (SELECT remaining_amount
           FROM payment_agreements
           WHERE client_id = c.id
           ORDER BY created_at DESC
           LIMIT 1),
          c.total_amount
        ) > 0
      `;
    }

    // 3. Total de la deuda por año (agrupado por año de creación del cliente)
    let debtByYearQuery = `
      SELECT 
        EXTRACT(YEAR FROM c.created_at) as año,
        COUNT(DISTINCT c.id) as cantidad_clientes,
        COALESCE(SUM(c.total_amount), 0) as total_deuda
      FROM clients c
      WHERE c.is_active = true 
      AND c.in_collections = 'Si'
      AND c.total_amount > 0
      GROUP BY EXTRACT(YEAR FROM c.created_at)
      ORDER BY año DESC
    `;

    // Si existe payment_agreements, usar remaining_amount (deuda real pendiente)
    if (hasPaymentAgreements) {
      debtByYearQuery = `
        SELECT 
          EXTRACT(YEAR FROM c.created_at) as año,
          COUNT(DISTINCT c.id) as cantidad_clientes,
          COALESCE(SUM(
            COALESCE(
              (SELECT remaining_amount
               FROM payment_agreements
               WHERE client_id = c.id
               ORDER BY created_at DESC
               LIMIT 1),
              c.total_amount
            )
          ), 0) as total_deuda
        FROM clients c
        WHERE c.is_active = true 
        AND c.in_collections = 'Si'
        AND COALESCE(
          (SELECT remaining_amount
           FROM payment_agreements
           WHERE client_id = c.id
           ORDER BY created_at DESC
           LIMIT 1),
          c.total_amount
        ) > 0
        GROUP BY EXTRACT(YEAR FROM c.created_at)
        ORDER BY año DESC
      `;
    }

    // 4. Cantidad de personas que están dentro de cobranzas
    const clientsInCollectionsQuery = `
      SELECT COUNT(*) as total_en_cobranzas
      FROM clients c
      WHERE c.is_active = true 
      AND c.in_collections = 'Si'
    `;

    // 5. Gestiones realizadas por usuarios de cobranzas
    let managementsQuery = `
      SELECT 
        0 as total_gestiones,
        ARRAY[]::json[] as gestiones
    `;

    if (hasClientManagements) {
      managementsQuery = `
        SELECT 
          COUNT(*) as total_gestiones,
          COALESCE(
            json_agg(
              json_build_object(
                'id', cm.id,
                'client_id', cm.client_id,
                'contract_number', cm.contract_number,
                'management_date', cm.management_date,
                'observation', cm.observation,
                'created_at', cm.created_at,
                'client_name', CONCAT(c.first_name, ' ', c.last_name),
                'created_by_name', CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))
              ) ORDER BY cm.management_date DESC, cm.created_at DESC
            ),
            '[]'::json
          ) as gestiones
        FROM client_managements cm
        JOIN clients c ON cm.client_id = c.id
        LEFT JOIN users u ON cm.created_by = u.id
        WHERE c.is_active = true
        AND c.in_collections = 'Si'
      `;
    }

    // Ejecutar todas las consultas
    const [
      clientsWithDebtResult,
      totalDebtResult,
      debtByYearResult,
      clientsInCollectionsResult,
      managementsResult
    ] = await Promise.all([
      client.query(clientsWithDebtQuery),
      client.query(totalDebtQuery),
      client.query(debtByYearQuery),
      client.query(clientsInCollectionsQuery),
      client.query(managementsQuery)
    ]);

    // Procesar gestiones
    let gestiones = [];
    if (hasClientManagements && managementsResult.rows[0].gestiones) {
      gestiones = Array.isArray(managementsResult.rows[0].gestiones) 
        ? managementsResult.rows[0].gestiones 
        : JSON.parse(managementsResult.rows[0].gestiones || '[]');
    }

    res.json({
      total_clientes_deben: parseInt(clientsWithDebtResult.rows[0].total_clientes_deben) || 0,
      total_deuda_global: parseFloat(totalDebtResult.rows[0].total_deuda_global) || 0,
      deuda_por_año: debtByYearResult.rows.map(row => ({
        año: parseInt(row.año) || 0,
        cantidad_clientes: parseInt(row.cantidad_clientes) || 0,
        total_deuda: parseFloat(row.total_deuda) || 0
      })),
      total_en_cobranzas: parseInt(clientsInCollectionsResult.rows[0].total_en_cobranzas) || 0,
      total_gestiones: hasClientManagements ? parseInt(managementsResult.rows[0].total_gestiones) || 0 : 0,
      gestiones: gestiones
    });

  } catch (error) {
    console.error('Error obteniendo reporte detallado de cobranzas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Reporte completo de cobranzas para exportación
router.get('/collections-full-report', authenticateToken, requireReportsAccess, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verificar si las tablas existen
    let hasPaymentAgreements = false;
    let hasClientManagements = false;
    let hasPayments = false;

    try {
      const paymentAgreementsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_agreements'
        )
      `);
      hasPaymentAgreements = paymentAgreementsCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla payment_agreements');
    }

    try {
      const clientManagementsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'client_managements'
        )
      `);
      hasClientManagements = clientManagementsCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla client_managements');
    }

    try {
      const paymentsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payments'
        )
      `);
      hasPayments = paymentsCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla payments');
    }

    // Consulta principal: Obtener todos los clientes en cobranzas con su información completa
    const clientsQuery = `
      SELECT 
        c.id as client_id,
        c.contract_number,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.total_amount as client_total_amount,
        c.payment_status,
        c.in_collections,
        c.created_at as client_created_at
      FROM clients c
      WHERE c.is_active = true 
      AND c.in_collections = 'Si'
      ORDER BY c.created_at DESC
    `;

    const clientsResult = await client.query(clientsQuery);
    const clients = clientsResult.rows;

    // Para cada cliente, obtener información completa
    const fullReport = await Promise.all(clients.map(async (client) => {
      const clientId = client.client_id;
      const contractNumber = client.contract_number;

      // 1. Gestiones del cliente
      let managements = [];
      if (hasClientManagements) {
        try {
          const managementsResult = await client.query(`
            SELECT 
              cm.id,
              cm.management_date,
              cm.observation,
              cm.created_at,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name,
              u.email as created_by_email
            FROM client_managements cm
            LEFT JOIN users u ON cm.created_by = u.id
            WHERE cm.client_id = $1
            ORDER BY cm.management_date DESC, cm.created_at DESC
          `, [clientId]);
          managements = managementsResult.rows;
        } catch (error) {
          console.error(`Error cargando gestiones para cliente ${clientId}:`, error);
        }
      }

      // 2. Convenios de pago del cliente
      let agreements = [];
      if (hasPaymentAgreements) {
        try {
          const agreementsResult = await client.query(`
            SELECT 
              pa.id as agreement_id,
              pa.contract_number,
              pa.total_amount as agreement_total_amount,
              pa.remaining_amount,
              pa.installment_count,
              pa.installment_amount,
              pa.start_date,
              pa.end_date,
              pa.due_date,
              pa.status as agreement_status,
              pa.notes as agreement_notes,
              pa.created_at as agreement_created_at,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name,
              u.email as created_by_email
            FROM payment_agreements pa
            LEFT JOIN users u ON pa.created_by = u.id
            WHERE pa.client_id = $1
            ORDER BY pa.created_at DESC
          `, [clientId]);
          agreements = agreementsResult.rows;
        } catch (error) {
          console.error(`Error cargando convenios para cliente ${clientId}:`, error);
        }
      }

      // 3. Pagos del cliente (todos los pagos, con o sin convenio)
      let payments = [];
      let totalPaymentsAmount = 0;
      let totalPaymentsCount = 0;
      let paymentsByAgreement = {};

      if (hasPayments) {
        try {
          // Verificar qué columnas tiene la tabla payments
          const paymentsColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND table_schema = 'public'
          `);
          
          const columnNames = paymentsColumns.rows.map(r => r.column_name);
          const hasClientId = columnNames.includes('client_id');
          const hasPaymentAmount = columnNames.includes('payment_amount');
          const hasAmount = columnNames.includes('amount');

          if (hasClientId && hasPaymentAmount) {
            // Esquema nuevo: client_id, payment_amount
            const paymentsResult = await client.query(`
              SELECT 
                p.id as payment_id,
                p.client_id,
                p.payment_agreement_id,
                COALESCE(p.payment_amount, 0) as payment_amount,
                p.payment_date,
                p.payment_method,
                COALESCE(p.receipt_number, p.transaction_id, '') as receipt_number,
                p.installment_number,
                p.notes as payment_notes,
                p.created_at as payment_created_at,
                pa.contract_number as agreement_contract_number,
                pa.installment_amount as agreement_installment_amount,
                u.first_name as created_by_first_name,
                u.last_name as created_by_last_name,
                u.email as created_by_email
              FROM payments p
              LEFT JOIN payment_agreements pa ON p.payment_agreement_id = pa.id
              LEFT JOIN users u ON p.created_by = u.id
              WHERE p.client_id = $1
              ORDER BY p.payment_date DESC, p.created_at DESC
            `, [clientId]);
            payments = paymentsResult.rows;
          } else {
            // Esquema original: booking_id, amount - buscar a través de bookings
            const paymentsResult = await client.query(`
              SELECT 
                p.id as payment_id,
                p.booking_id,
                NULL as payment_agreement_id,
                COALESCE(p.amount, 0) as payment_amount,
                p.payment_date,
                p.payment_method,
                COALESCE(p.transaction_id, '') as receipt_number,
                NULL as installment_number,
                p.notes as payment_notes,
                p.created_at as payment_created_at,
                NULL as agreement_contract_number,
                NULL as agreement_installment_amount,
                NULL as created_by_first_name,
                NULL as created_by_last_name,
                NULL as created_by_email
              FROM payments p
              JOIN bookings b ON p.booking_id = b.id
              WHERE b.client_id = $1
              ORDER BY p.payment_date DESC, p.created_at DESC
            `, [clientId]);
            payments = paymentsResult.rows;
          }

          // Calcular totales
          totalPaymentsAmount = payments.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);
          totalPaymentsCount = payments.length;

          // Agrupar pagos por convenio
          payments.forEach(payment => {
            const agreementId = payment.payment_agreement_id;
            if (!paymentsByAgreement[agreementId]) {
              paymentsByAgreement[agreementId] = {
                agreement_id: agreementId,
                payments: [],
                total_paid: 0,
                payments_count: 0
              };
            }
            paymentsByAgreement[agreementId].payments.push(payment);
            paymentsByAgreement[agreementId].total_paid += parseFloat(payment.payment_amount || 0);
            paymentsByAgreement[agreementId].payments_count += 1;
          });
        } catch (error) {
          console.error(`Error cargando pagos para cliente ${clientId}:`, error);
        }
      }

      // 4. Enriquecer convenios con información de pagos
      const agreementsWithPayments = agreements.map(agreement => {
        const agreementPayments = paymentsByAgreement[agreement.agreement_id] || {
          payments: [],
          total_paid: 0,
          payments_count: 0
        };

        return {
          ...agreement,
          payments_made: agreementPayments.payments_count,
          total_paid: agreementPayments.total_paid,
          remaining_amount: parseFloat(agreement.remaining_amount || 0),
          payments_detail: agreementPayments.payments
        };
      });

      // 5. Calcular deuda pendiente
      let pendingDebt = parseFloat(client.client_total_amount || 0);
      if (hasPaymentAgreements && agreements.length > 0) {
        // Usar el remaining_amount del convenio más reciente
        const latestAgreement = agreements[0];
        pendingDebt = parseFloat(latestAgreement.remaining_amount || client.client_total_amount || 0);
      }

      return {
        client: {
          id: client.client_id,
          contract_number: contractNumber,
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email,
          phone: client.phone,
          total_amount: parseFloat(client.client_total_amount || 0),
          pending_debt: pendingDebt,
          payment_status: client.payment_status,
          in_collections: client.in_collections,
          created_at: client.client_created_at
        },
        managements: {
          total: managements.length,
          list: managements.map(m => ({
            id: m.id,
            management_date: m.management_date,
            observation: m.observation,
            created_at: m.created_at,
            created_by: m.created_by_first_name && m.created_by_last_name 
              ? `${m.created_by_first_name} ${m.created_by_last_name} (${m.created_by_email})`
              : m.created_by_email || 'Sistema'
          }))
        },
        agreements: {
          total: agreements.length,
          list: agreementsWithPayments.map(a => ({
            id: a.agreement_id,
            contract_number: a.contract_number,
            total_amount: parseFloat(a.agreement_total_amount || 0),
            remaining_amount: parseFloat(a.remaining_amount || 0),
            installment_count: parseInt(a.installment_count || 0),
            installment_amount: parseFloat(a.installment_amount || 0),
            start_date: a.start_date,
            end_date: a.end_date,
            due_date: a.due_date,
            status: a.agreement_status,
            notes: a.agreement_notes,
            created_at: a.agreement_created_at,
            created_by: a.created_by_first_name && a.created_by_last_name
              ? `${a.created_by_first_name} ${a.created_by_last_name} (${a.created_by_email})`
              : a.created_by_email || 'Sistema',
            payments_made: a.payments_made,
            total_paid: a.total_paid,
            payments_detail: a.payments_detail.map(p => ({
              id: p.payment_id,
              payment_amount: parseFloat(p.payment_amount || 0),
              payment_date: p.payment_date,
              payment_method: p.payment_method,
              receipt_number: p.receipt_number,
              installment_number: p.installment_number,
              notes: p.payment_notes,
              created_at: p.payment_created_at,
              created_by: p.created_by_first_name && p.created_by_last_name
                ? `${p.created_by_first_name} ${p.created_by_last_name} (${p.created_by_email})`
                : p.created_by_email || 'Sistema'
            }))
          }))
        },
        payments_summary: {
          total_payments: totalPaymentsCount,
          total_amount: totalPaymentsAmount,
          payments_detail: payments.map(p => ({
            id: p.payment_id,
            agreement_id: p.payment_agreement_id,
            agreement_contract_number: p.agreement_contract_number,
            payment_amount: parseFloat(p.payment_amount || 0),
            payment_date: p.payment_date,
            payment_method: p.payment_method,
            receipt_number: p.receipt_number,
            installment_number: p.installment_number,
            notes: p.payment_notes,
            created_at: p.payment_created_at,
            created_by: p.created_by_first_name && p.created_by_last_name
              ? `${p.created_by_first_name} ${p.created_by_last_name} (${p.created_by_email})`
              : p.created_by_email || 'Sistema'
          }))
        }
      };
    }));

    res.json({
      generated_at: new Date().toISOString(),
      total_clients: fullReport.length,
      report: fullReport
    });

  } catch (error) {
    console.error('Error generando reporte completo de cobranzas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Obtener historial completo de un cliente específico (gestiones, pagos, convenios)
router.get('/collections-history/:clientId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { clientId } = req.params;

    // Verificar si las tablas existen
    let hasPaymentAgreements = false;
    let hasClientManagements = false;
    let hasPayments = false;

    try {
      const paymentAgreementsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_agreements'
        )
      `);
      hasPaymentAgreements = paymentAgreementsCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla payment_agreements');
    }

    try {
      const clientManagementsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'client_managements'
        )
      `);
      hasClientManagements = clientManagementsCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla client_managements');
    }

    try {
      const paymentsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payments'
        )
      `);
      hasPayments = paymentsCheck.rows[0].exists;
    } catch (error) {
      console.log('⚠️  No se pudo verificar tabla payments');
    }

    // Obtener información del cliente
    const clientResult = await client.query(`
      SELECT 
        c.id, c.contract_number, c.first_name, c.last_name, c.email, c.phone,
        c.total_amount, c.years, c.payment_status, c.in_collections, c.created_at
      FROM clients c
      WHERE c.id = $1 AND c.is_active = true
    `, [clientId]);

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const clientData = clientResult.rows[0];

    // Obtener parámetros de fecha del query string
    const { startDate, endDate } = req.query;
    
    // 1. Gestiones del cliente
    let managements = [];
    if (hasClientManagements) {
      try {
        let managementsQuery = `
          SELECT 
            cm.id, cm.management_date, cm.observation, cm.created_at,
            u.first_name as created_by_first_name,
            u.last_name as created_by_last_name,
            u.email as created_by_email
          FROM client_managements cm
          LEFT JOIN users u ON cm.created_by = u.id
          WHERE cm.client_id = $1
        `;
        const queryParams = [clientId];
        
        // Agregar filtro de fechas si están presentes
        if (startDate && endDate) {
          managementsQuery += ` AND cm.management_date >= $2 AND cm.management_date <= $3`;
          queryParams.push(startDate, endDate);
        } else if (startDate) {
          managementsQuery += ` AND cm.management_date >= $2`;
          queryParams.push(startDate);
        } else if (endDate) {
          managementsQuery += ` AND cm.management_date <= $2`;
          queryParams.push(endDate);
        }
        
        managementsQuery += ` ORDER BY cm.management_date DESC, cm.created_at DESC`;
        
        const managementsResult = await client.query(managementsQuery, queryParams);
        managements = managementsResult.rows.map(m => ({
          ...m,
          type: 'management',
          created_by_name: m.created_by_first_name && m.created_by_last_name
            ? `${m.created_by_first_name} ${m.created_by_last_name}`
            : m.created_by_email || 'Sistema'
        }));
      } catch (error) {
        console.error(`Error cargando gestiones para cliente ${clientId}:`, error);
      }
    }

    // 2. Convenios de pago del cliente
    let agreements = [];
    if (hasPaymentAgreements) {
      try {
        const agreementsResult = await client.query(`
          SELECT 
            pa.id, pa.contract_number, pa.total_amount, pa.remaining_amount,
            pa.installment_count, pa.installment_amount, pa.start_date, pa.end_date,
            pa.due_date, pa.status, pa.notes, pa.created_at,
            u.first_name as created_by_first_name,
            u.last_name as created_by_last_name,
            u.email as created_by_email
          FROM payment_agreements pa
          LEFT JOIN users u ON pa.created_by = u.id
          WHERE pa.client_id = $1
          ORDER BY pa.created_at DESC
        `, [clientId]);
        agreements = agreementsResult.rows.map(a => ({
          ...a,
          type: 'agreement',
          created_by_name: a.created_by_first_name && a.created_by_last_name
            ? `${a.created_by_first_name} ${a.created_by_last_name}`
            : a.created_by_email || 'Sistema'
        }));
      } catch (error) {
        console.error(`Error cargando convenios para cliente ${clientId}:`, error);
      }
    }

    // 3. Pagos del cliente (todos los pagos, con o sin convenio)
    let payments = [];
    if (hasPayments) {
      try {
        // Verificar qué columnas tiene la tabla payments
        const paymentsColumns = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'payments' 
          AND table_schema = 'public'
        `);
        
        const columnNames = paymentsColumns.rows.map(r => r.column_name);
        const hasClientId = columnNames.includes('client_id');
        const hasPaymentAmount = columnNames.includes('payment_amount');
        const hasAmount = columnNames.includes('amount');

        let paymentsResult;
        if (hasClientId && hasPaymentAmount) {
          // Esquema nuevo: client_id, payment_amount
          paymentsResult = await client.query(`
            SELECT 
              p.id, 
              p.client_id,
              p.payment_agreement_id, 
              COALESCE(p.payment_amount, 0) as payment_amount,
              p.payment_date, 
              p.payment_method, 
              COALESCE(p.receipt_number, p.transaction_id, '') as receipt_number,
              p.installment_number, 
              p.notes, 
              p.created_at,
              pa.contract_number as agreement_contract_number,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name,
              u.email as created_by_email
            FROM payments p
            LEFT JOIN payment_agreements pa ON p.payment_agreement_id = pa.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.client_id = $1
            ORDER BY p.payment_date DESC, p.created_at DESC
          `, [clientId]);
        } else {
          // Esquema original: booking_id, amount - buscar a través de bookings
          paymentsResult = await client.query(`
            SELECT 
              p.id, 
              NULL as payment_agreement_id, 
              COALESCE(p.amount, 0) as payment_amount,
              p.payment_date, 
              p.payment_method, 
              COALESCE(p.transaction_id, '') as receipt_number,
              NULL as installment_number, 
              p.notes, 
              p.created_at,
              NULL as agreement_contract_number,
              NULL as created_by_first_name,
              NULL as created_by_last_name,
              NULL as created_by_email
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            WHERE b.client_id = $1
            ORDER BY p.payment_date DESC, p.created_at DESC
          `, [clientId]);
        }
        
        payments = paymentsResult.rows.map(p => ({
          ...p,
          type: 'payment',
          created_by_name: p.created_by_first_name && p.created_by_last_name
            ? `${p.created_by_first_name} ${p.created_by_last_name}`
            : p.created_by_email || 'Sistema'
        }));
      } catch (error) {
        console.error(`Error cargando pagos para cliente ${clientId}:`, error);
      }
    }

    // Combinar todo en un historial ordenado por fecha
    const history = [
      ...managements.map(m => ({ ...m, date: m.management_date, sort_date: new Date(m.management_date) })),
      ...agreements.map(a => ({ ...a, date: a.created_at, sort_date: new Date(a.created_at) })),
      ...payments.map(p => ({ ...p, date: p.payment_date, sort_date: new Date(p.payment_date) }))
    ].sort((a, b) => b.sort_date - a.sort_date);

    res.json({
      client: {
        id: clientData.id,
        contract_number: clientData.contract_number,
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        phone: clientData.phone,
        total_amount: parseFloat(clientData.total_amount || 0),
        years: parseInt(clientData.years || 0),
        payment_status: clientData.payment_status,
        in_collections: clientData.in_collections
      },
      history: history,
      summary: {
        total_managements: managements.length,
        total_agreements: agreements.length,
        total_payments: payments.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial del cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
