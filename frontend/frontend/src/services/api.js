import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas de error
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const errorData = error.response?.data;
      
      // Check if token is expired
      if (errorData?.code === 'TOKEN_EXPIRED') {
        console.log('🔐 Token expirado detectado:', errorData.message);
        
        // Clear token and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Show user-friendly message
        alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        
        // Redirect to login page
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      // Check if token is invalid
      if (errorData?.code === 'INVALID_TOKEN') {
        console.log('🔐 Token inválido detectado:', errorData.message);
        
        // Clear token and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Show user-friendly message
        alert('Token de autenticación inválido. Por favor, inicia sesión nuevamente.');
        
        // Redirect to login page
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      // Other authentication errors
      console.log('🔐 Error de autenticación detectado:', error.response?.status, errorData);
    }
    return Promise.reject(error);
  }
);

// Función para verificar si el token está próximo a expirar o ya expiró
// Retorna: 'expired' | 'warning' | 'valid' | null (si no hay token)
export const checkTokenExpiration = (showAlerts = false) => {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  try {
    // Decodificar el token JWT (sin verificar la firma)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    // Si el token ya expiró
    if (timeUntilExpiry <= 0) {
      if (showAlerts) {
        alert('Tu sesión ha expirado. Serás redirigido al login.');
      }
      return 'expired';
    }
    
    // Si el token expira en menos de 5 minutos, mostrar advertencia (solo si showAlerts es true)
    if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
      if (showAlerts) {
        const minutesLeft = Math.floor(timeUntilExpiry / 60);
        const secondsLeft = timeUntilExpiry % 60;
        alert(`⚠️ Tu sesión expirará en ${minutesLeft} minutos y ${secondsLeft} segundos.\n\nPor favor, guarda tu trabajo y prepárate para iniciar sesión nuevamente.`);
      }
      return 'warning';
    }
    
    return 'valid';
  } catch (error) {
    console.error('Error verificando expiración del token:', error);
    return null;
  }
};

// Función para obtener el tiempo restante del token
export const getTokenTimeRemaining = () => {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    if (timeUntilExpiry <= 0) return 0;
    
    return timeUntilExpiry;
  } catch (error) {
    console.error('Error obteniendo tiempo restante del token:', error);
    return null;
  }
};

// Servicios de autenticación
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

// Servicios de clientes
export const clientService = {
  getClients: async (params = {}) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  getClient: async (id) => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  createClient: async (clientData) => {
    const response = await api.post('/clients', clientData);
    return response.data;
  },

  updateClient: async (id, clientData) => {
    const response = await api.put(`/clients/${id}`, clientData);
    return response.data;
  },

  deleteClient: async (id) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },

  getClientStats: async () => {
    const response = await api.get('/clients/stats/overview');
    return response.data;
  },
};

// Servicios de reservas
export const bookingService = {
  getBookings: async (params = {}) => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  getBooking: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  updateBookingStatus: async (id, statusData) => {
    const response = await api.patch(`/bookings/${id}/status`, statusData);
    return response.data;
  },

  getBookingEditInfo: async (id) => {
    const response = await api.get(`/bookings/${id}/edit-info`);
    return response.data;
  },

  updateBooking: async (id, bookingData) => {
    const response = await api.put(`/bookings/${id}`, bookingData);
    return response.data;
  },

  deleteBooking: async (id, data) => {
    const response = await api.delete(`/bookings/${id}`, { data });
    return response.data;
  },

  getBookingStats: async () => {
    const response = await api.get('/bookings/stats/overview');
    return response.data;
  },

  getClientBookings: async (clientId, params = {}) => {
    const response = await api.get(`/bookings/client/${clientId}`, { params });
    return response.data;
  },

  validateContract: async (contractNumber) => {
    const response = await api.get(`/bookings/validate-contract/${contractNumber}`);
    return response.data;
  },

  searchContracts: async (lastDigits) => {
    const response = await api.get(`/bookings/search-contracts/${lastDigits}`);
    return response.data;
  },
};

// Servicios de requerimientos
export const requirementService = {
  getRequirements: async (params = {}) => {
    const response = await api.get('/reports/requirements', { params });
    return response.data;
  },

  getRequirement: async (id) => {
    const response = await api.get(`/reports/requirements/${id}`);
    return response.data;
  },

  createRequirement: async (requirementData) => {
    const response = await api.post('/reports/requirements', requirementData);
    return response.data;
  },

  updateRequirementStatus: async (id, statusData) => {
    const response = await api.patch(`/reports/requirements/${id}/status`, statusData);
    return response.data;
  },

  deleteRequirement: async (id) => {
    const response = await api.delete(`/reports/requirements/${id}`);
    return response.data;
  },

  getRequirementStats: async () => {
    const response = await api.get('/requirements/stats/overview');
    return response.data;
  },

  searchContract: async (contractNumber) => {
    const response = await api.get(`/requirements/search-contract/${contractNumber}`);
    return response.data;
  },

  getRequirementsByClient: async (clientId) => {
    const response = await api.get(`/requirements/client/${clientId}`);
    return response.data;
  },
};

// Servicios de pagos
export const paymentService = {
  getPayments: async (params = {}) => {
    const response = await api.get('/payments', { params });
    return response.data;
  },

  getPayment: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  createPayment: async (paymentData) => {
    const response = await api.post('/payments', paymentData);
    return response.data;
  },

  getPaymentsByClient: async (clientId) => {
    const response = await api.get(`/payments/client/${clientId}`);
    return response.data;
  },

  deletePayment: async (id, data) => {
    const response = await api.delete(`/payments/${id}`, { data });
    return response.data;
  },

  getPaymentStats: async () => {
    const response = await api.get('/payments/stats/overview');
    return response.data;
  },
};

// Servicios de convenios de pago
export const paymentAgreementService = {
  getPaymentAgreements: async (params = {}) => {
    const response = await api.get('/payment-agreements', { params });
    return response.data;
  },

  getPaymentAgreement: async (id) => {
    const response = await api.get(`/payment-agreements/${id}`);
    return response.data;
  },

  createPaymentAgreement: async (agreementData) => {
    const response = await api.post('/payment-agreements', agreementData);
    return response.data;
  },

  updatePaymentAgreementStatus: async (id, statusData) => {
    const response = await api.patch(`/payment-agreements/${id}/status`, statusData);
    return response.data;
  },

  updatePaymentAgreementDueDate: async (id, data) => {
    const response = await api.patch(`/payment-agreements/${id}/due-date`, data);
    return response.data;
  },

  getPaymentAgreementsByClient: async (clientId) => {
    const response = await api.get(`/payment-agreements/client/${clientId}`);
    return response.data;
  },

  deletePaymentAgreement: async (id, data) => {
    const response = await api.delete(`/payment-agreements/${id}`, { data });
    return response.data;
  },

  deleteAllPaymentAgreements: async (data) => {
    const response = await api.delete('/payment-agreements', { data });
    return response.data;
  },

  getPaymentAgreementStats: async () => {
    const response = await api.get('/payment-agreements/stats/overview');
    return response.data;
  },
};

// Servicios de gestiones de clientes
export const clientManagementService = {
  getClientManagements: async (params = {}) => {
    const response = await api.get('/client-managements', { params });
    return response.data;
  },

  getClientManagement: async (id) => {
    const response = await api.get(`/client-managements/${id}`);
    return response.data;
  },

  getClientManagementsByClient: async (clientId) => {
    const response = await api.get(`/client-managements/client/${clientId}`);
    return response.data;
  },

  createClientManagement: async (data) => {
    const response = await api.post('/client-managements', data);
    return response.data;
  },

  updateClientManagement: async (id, data) => {
    const response = await api.patch(`/client-managements/${id}`, data);
    return response.data;
  },

  deleteClientManagement: async (id) => {
    const response = await api.delete(`/client-managements/${id}`);
    return response.data;
  },
};

export const clientCollectionsCommentsService = {
  getClientComments: async (clientId) => {
    const response = await api.get(`/client-collections-comments/client/${clientId}`);
    return response.data;
  },

  createClientComment: async (data) => {
    const response = await api.post('/client-collections-comments', data);
    return response.data;
  },

  updateClientComment: async (id, data) => {
    const response = await api.patch(`/client-collections-comments/${id}`, data);
    return response.data;
  },

  deleteClientComment: async (id) => {
    const response = await api.delete(`/client-collections-comments/${id}`);
    return response.data;
  },
};

// Servicios de agenda de reservas
export const reservationAgendaService = {
  getReservationAgendas: async (params = {}) => {
    const response = await api.get('/reservation-agenda', { params });
    return response.data;
  },

  getReservationAgenda: async (id) => {
    const response = await api.get(`/reservation-agenda/${id}`);
    return response.data;
  },

  createReservationAgenda: async (data) => {
    const response = await api.post('/reservation-agenda', data);
    return response.data;
  },

  updateReservationAgenda: async (id, data) => {
    const response = await api.put(`/reservation-agenda/${id}`, data);
    return response.data;
  },

  deleteReservationAgenda: async (id) => {
    const response = await api.delete(`/reservation-agenda/${id}`);
    return response.data;
  },
};

// Servicios de agenda de visados
export const visaAgendaService = {
  getVisaAgendas: async (params = {}) => {
    const response = await api.get('/visa-agenda', { params });
    return response.data;
  },

  getVisaAgenda: async (id) => {
    const response = await api.get(`/visa-agenda/${id}`);
    return response.data;
  },

  createVisaAgenda: async (data) => {
    const response = await api.post('/visa-agenda', data);
    return response.data;
  },

  updateVisaAgenda: async (id, data) => {
    const response = await api.put(`/visa-agenda/${id}`, data);
    return response.data;
  },

  deleteVisaAgenda: async (id) => {
    const response = await api.delete(`/visa-agenda/${id}`);
    return response.data;
  },
};

// Servicios de agenda de vuelos
export const flightAgendaService = {
  getFlightAgendas: async (params = {}) => {
    const response = await api.get('/flight-agenda', { params });
    return response.data;
  },

  getFlightAgenda: async (id) => {
    const response = await api.get(`/flight-agenda/${id}`);
    return response.data;
  },

  createFlightAgenda: async (data) => {
    const response = await api.post('/flight-agenda', data);
    return response.data;
  },

  updateFlightAgenda: async (id, data) => {
    const response = await api.put(`/flight-agenda/${id}`, data);
    return response.data;
  },

  deleteFlightAgenda: async (id) => {
    const response = await api.delete(`/flight-agenda/${id}`);
    return response.data;
  },
};

// Servicios de usuarios
export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  changePassword: async (id, passwordData) => {
    const response = await api.patch(`/users/${id}/password`, passwordData);
    return response.data;
  },

  deactivateUser: async (id) => {
    const response = await api.patch(`/users/${id}/deactivate`);
    return response.data;
  },

  getUserStats: async () => {
    const response = await api.get('/users/stats/overview');
    return response.data;
  },
};

// Servicio de paquetes (para el frontend público)
export const packageService = {
  getPackages: async () => {
    // Por ahora retornamos datos estáticos, pero se puede conectar con la API
    return {
      packages: [
        {
          id: '1',
          name: 'Galápagos Aventura',
          description: 'Descubre las Islas Galápagos con esta aventura única de 5 días.',
          destination: 'Islas Galápagos, Ecuador',
          duration_days: 5,
          price: 1200.00,
          currency: 'USD',
          highlights: ['Fauna única', 'Aguas cristalinas', 'Guías expertos'],
          difficulty_level: 'medium',
          image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
        },
        {
          id: '2',
          name: 'Amazonía Ecuatoriana',
          description: 'Sumérgete en la selva amazónica con esta experiencia de 4 días en lodges de lujo.',
          destination: 'Amazonía, Ecuador',
          duration_days: 4,
          price: 800.00,
          currency: 'USD',
          highlights: ['Biodiversidad', 'Lodges de lujo', 'Cultura local'],
          difficulty_level: 'easy',
          image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80'
        },
        {
          id: '3',
          name: 'Quito Colonial',
          description: 'Explora la historia y arquitectura del Quito Colonial en este tour de 2 días.',
          destination: 'Quito, Ecuador',
          duration_days: 2,
          price: 300.00,
          currency: 'USD',
          highlights: ['Historia', 'Arquitectura', 'Gastronomía'],
          difficulty_level: 'easy',
          image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
        }
      ]
    };
  }
};

// Servicios de documentos
export const documentService = {
  generateReservationDocument: async (bookingId) => {
    const response = await api.post(`/documents/generate-reservation/${bookingId}`);
    return response.data;
  },

  sendWhatsAppDocument: async (bookingId) => {
    const response = await api.post(`/documents/send-whatsapp/${bookingId}`);
    return response.data;
  },

  generateAndSendDocument: async (bookingId) => {
    const response = await api.post(`/documents/generate-and-send/${bookingId}`);
    return response.data;
  },

  downloadDocument: async (fileName) => {
    const response = await api.get(`/documents/download/${fileName}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  downloadPdf: async (bookingId) => {
    const response = await api.get(`/documents/download-pdf/${bookingId}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Servicios de reportes
export const reportService = {
  getSalesReport: async (period = 'month') => {
    const response = await api.get(`/reports/sales?period=${period}`);
    return response.data;
  },

  getCollectionsReport: async (period = 'month') => {
    const response = await api.get(`/reports/collections?period=${period}`);
    return response.data;
  },

  getRequirementsReport: async (period = 'month') => {
    const response = await api.get(`/reports/requirements?period=${period}`);
    return response.data;
  },

  getBookingsReport: async (period = 'month') => {
    const response = await api.get(`/reports/bookings?period=${period}`);
    return response.data;
  },

  getDashboardReport: async (period = 'month') => {
    const response = await api.get(`/reports/dashboard?period=${period}`);
    return response.data;
  }
};

export default api;
export { api };








