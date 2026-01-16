import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Users, 
  DollarSign, 
  LogOut, 
  Menu, 
  X,
  Search,
  Plus,
  Eye,
  Edit,
  FileText,
  CreditCard,
  TrendingUp,
  AlertCircle,
  History,
  Clock,
  Trash2
} from 'lucide-react'
import { clientService, paymentService, paymentAgreementService, clientManagementService, clientCollectionsCommentsService } from '../services/api'
import AddClientModal from '../components/AddClientModal'
import reportService from '../services/reportService'
import SessionWarning from '../components/SessionWarning'

const CobranzasPanel = () => {
  const { user, logout } = useAuth()
  const [activeModule, setActiveModule] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Estados para cada mÃ³dulo
  const [clients, setClients] = useState([])
  const [payments, setPayments] = useState([])
  const [paymentAgreements, setPaymentAgreements] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalClients, setTotalClients] = useState(0)
  
  // Estados para modales
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAgreementModal, setShowAgreementModal] = useState(false)
  const [showManagementModal, setShowManagementModal] = useState(false)
  const [showManagementHistoryModal, setShowManagementHistoryModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedClientForPayment, setSelectedClientForPayment] = useState(null)
  const [selectedClientForAgreement, setSelectedClientForAgreement] = useState(null)
  const [selectedClientForManagement, setSelectedClientForManagement] = useState(null)
  const [selectedClientForHistory, setSelectedClientForHistory] = useState(null)
  const [clientPaymentAgreement, setClientPaymentAgreement] = useState(null)
  const [clientManagements, setClientManagements] = useState([])
  const [loadingManagements, setLoadingManagements] = useState(false)
  
  // Estados para mÃ³dulo de historial completo
  const [collectionsHistoryData, setCollectionsHistoryData] = useState(null)
  const [collectionsHistoryLoading, setCollectionsHistoryLoading] = useState(false)
  const [collectionsHistoryFilters, setCollectionsHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    clientSearch: ''
  })
  const [showClientHistoryModal, setShowClientHistoryModal] = useState(false)
  const [clientHistoryData, setClientHistoryData] = useState(null)
  const [loadingClientHistory, setLoadingClientHistory] = useState(false)
  const [activeHistoryTab, setActiveHistoryTab] = useState('gestiones')
  
  // Estados para comentarios
  const [clientComments, setClientComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  
  // Estados para pagos y convenios del cliente
  const [clientPayments, setClientPayments] = useState([])
  const [clientAgreements, setClientAgreements] = useState([])
  const [newComment, setNewComment] = useState('')
  
  // Estados para ver y eliminar pagos
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletePasswordError, setDeletePasswordError] = useState('')
  
  // Estados para ver y eliminar convenios
  const [selectedAgreement, setSelectedAgreement] = useState(null)
  const [showAgreementDetails, setShowAgreementDetails] = useState(false)
  const [showDeleteAgreementModal, setShowDeleteAgreementModal] = useState(false)
  const [deleteAgreementPassword, setDeleteAgreementPassword] = useState('')
  const [deleteAgreementPasswordError, setDeleteAgreementPasswordError] = useState('')
  
  // Estados para eliminar todos los convenios
  const [showDeleteAllAgreementsModal, setShowDeleteAllAgreementsModal] = useState(false)
  const [deleteAllAgreementsPassword, setDeleteAllAgreementsPassword] = useState('')
  const [deleteAllAgreementsPasswordError, setDeleteAllAgreementsPasswordError] = useState('')
  
  // Estados para editar fecha de vencimiento del pagarÃ©
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [dueDateValue, setDueDateValue] = useState(null)
  const [savingDueDate, setSavingDueDate] = useState(false)
  
  // Estados para formularios
  const [paymentFormData, setPaymentFormData] = useState({
    client_id: '',
    payment_agreement_id: '',
    contract_number: '',
    payment_amount: '',
    payment_date: '',
    payment_method: '',
    installment_number: '',
    notes: ''
  })
  const [agreementFormData, setAgreementFormData] = useState({
    client_id: '',
    contract_number: '',
    total_amount: '',
    installment_count: '',
    installment_amount: '',
    start_date: '',
    end_date: '',
    notes: ''
  })
  const [managementFormData, setManagementFormData] = useState({
    client_id: '',
    contract_number: '',
    management_date: new Date().toISOString().split('T')[0],
    observation: ''
  })
  
  // Estados para dashboard de cobranzas
  const [dashboardData, setDashboardData] = useState({
    totalClients: 0,
    unpaidClients: 0,
    totalDebt: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    collectionRate: 0
  })
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardPeriod, setDashboardPeriod] = useState('this_month')
  
  // Estados para notificaciones
  const [notifications, setNotifications] = useState({
    todayPayments: [],
    monthlyPayments: [],
    todayAgreements: [],
    monthlyAgreements: []
  })
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  
  // Estados para resumen de pagos
  const [paymentsSummary, setPaymentsSummary] = useState({
    lastPeriod: {
      totalPayments: 0,
      collectedAmount: 0,
      pendingAmount: 0,
      collectionRate: 0
    },
    currentPeriod: {
      totalPending: 0,
      overdueAmount: 0,
      upcomingAmount: 0,
      agreementsPending: 0
    },
    totalOutstanding: {
      totalDebt: 0,
      overdueDebt: 0,
      currentDebt: 0
    }
  })
  const [paymentsSummaryLoading, setPaymentsSummaryLoading] = useState(false)
  const [periodSummary, setPeriodSummary] = useState({
    sales: { total_ventas: 0, total_monto: 0, ventas_pagadas: 0, monto_pagado: 0 },
    collections: { total_cobranzas: 0, total_monto: 0, cobranzas_pagadas: 0, monto_pagado: 0 }
  })

  // Limpiar estado cuando cambia de usuario
  useEffect(() => {
    setPeriodSummary({
      sales: { total_ventas: 0, total_monto: 0, ventas_pagadas: 0, monto_pagado: 0 },
      collections: { total_cobranzas: 0, total_monto: 0, cobranzas_pagadas: 0, monto_pagado: 0 }
    })
  }, [user?.id])

  // Resetear a pÃ¡gina 1 cuando cambia el tÃ©rmino de bÃºsqueda o el mÃ³dulo
  useEffect(() => {
    if (activeModule === 'clients') {
      setCurrentPage(1)
    }
  }, [searchTerm, activeModule])

  // Cargar datos segÃºn el mÃ³dulo activo
  useEffect(() => {
    if (activeModule === 'dashboard') {
      loadDashboardData()
      loadNotifications()
      loadPaymentsSummary()
    } else if (activeModule === 'clients') {
      loadClients()
    } else if (activeModule === 'payments') {
      loadPayments()
    } else if (activeModule === 'agreements') {
      loadAgreements()
    } else if (activeModule === 'history') {
      loadCollectionsHistory()
    }
  }, [activeModule, currentPage, searchTerm, dashboardPeriod])

  const loadClients = async () => {
    try {
      setLoading(true)
      // Cargar todos los clientes para filtrar los que estÃ¡n en cobranzas
      const response = await clientService.getClients({ 
        limit: 1000, 
        search: searchTerm 
      })
      
      // Filtrar solo clientes en cobranzas
      let allCollectionClients = response.clients?.filter(client => 
        client.in_collections === 'Si' || client.in_collections === 'true'
      ) || []
      
      // Aplicar paginaciÃ³n manual
      const clientsPerPage = 20
      const startIndex = (currentPage - 1) * clientsPerPage
      const endIndex = startIndex + clientsPerPage
      const paginatedClients = allCollectionClients.slice(startIndex, endIndex)
      
      setClients(paginatedClients)
      setTotalClients(allCollectionClients.length)
      setTotalPages(Math.max(1, Math.ceil(allCollectionClients.length / clientsPerPage)))
      
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
      setTotalClients(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // Cargar clientes en cobranzas con paginaciÃ³n
  const loadUnpaidClients = async (page = 1, search = '') => {
    try {
      setLoading(true)
      // Obtener todos los clientes para filtrar los de cobranzas
      const response = await clientService.getClients({ limit: 1000 })
      const allCollectionClients = response.clients?.filter(client => client.in_collections === 'Si') || []
      
      // Aplicar bÃºsqueda si existe
      let filteredClients = allCollectionClients
      if (search) {
        const searchLower = search.toLowerCase().trim()
        filteredClients = allCollectionClients.filter(client => {
          const contractNumber = client.contract_number?.toLowerCase() || ''
          const lastFourDigits = contractNumber.length >= 4 ? contractNumber.slice(-4) : ''
          return (
            client.first_name?.toLowerCase().includes(searchLower) ||
            client.last_name?.toLowerCase().includes(searchLower) ||
            client.email?.toLowerCase().includes(searchLower) ||
            contractNumber.includes(searchLower) ||
            lastFourDigits === searchLower
          )
        })
      }
      
      // Implementar paginaciÃ³n manual
      const clientsPerPage = 20
      const startIndex = (page - 1) * clientsPerPage
      const endIndex = startIndex + clientsPerPage
      const paginatedClients = filteredClients.slice(startIndex, endIndex)
      
      setClients(paginatedClients)
      setTotalPages(Math.ceil(filteredClients.length / clientsPerPage))
      setCurrentPage(page)
      
    } catch (error) {
      console.error('Error loading unpaid clients:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar pagos
  const loadPayments = async () => {
    try {
      setLoading(true)
      const response = await paymentService.getPayments({
        page: currentPage,
        limit: 20,
        search: searchTerm
      })
      setPayments(response.payments || [])
    } catch (error) {
      console.error('Error loading payments:', error)
      setPayments([])
    } finally {
      setLoading(false)
    }
  }
  
  const loadAgreements = async () => {
    try {
      setLoading(true)
      // Resetear a pÃ¡gina 1 si hay un tÃ©rmino de bÃºsqueda
      const pageToLoad = searchTerm ? 1 : currentPage
      console.log('Cargando convenios con parÃ¡metros:', { page: pageToLoad, limit: 20, search: searchTerm })
      const response = await paymentAgreementService.getPaymentAgreements({
        page: pageToLoad,
        limit: 20,
        search: searchTerm || ''
      })
      console.log('Respuesta de convenios:', response)
      console.log('Convenios recibidos:', response.agreements)
      console.log('Cantidad de convenios:', response.agreements?.length || 0)
      const agreements = response.agreements || []
      console.log('Convenios a mostrar:', agreements)
      setPaymentAgreements(agreements)
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1)
      }
    } catch (error) {
      console.error('Error loading agreements:', error)
      setPaymentAgreements([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar convenios de pago
  const loadPaymentAgreements = async () => {
    try {
      setLoading(true)
      // Simular carga de convenios - aquÃ­ deberÃ­as usar el servicio real
      setPaymentAgreements([])
    } catch (error) {
      console.error('Error loading payment agreements:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar payment agreement del cliente
  const loadClientPaymentAgreement = async (clientId) => {
    try {
      const response = await paymentAgreementService.getPaymentAgreementsByClient(clientId)
      if (response.agreements && response.agreements.length > 0) {
        // Obtener el convenio mÃ¡s reciente (ya viene ordenado por created_at DESC)
        const agreement = response.agreements[0]
        setClientPaymentAgreement(agreement)
        // Si hay una fecha de vencimiento, inicializar el valor del editor
        if (agreement.due_date && !dueDateValue) {
          setDueDateValue(new Date(agreement.due_date).toISOString().split('T')[0])
        }
      } else {
        setClientPaymentAgreement(null)
      }
    } catch (error) {
      console.error('Error loading payment agreement:', error)
      setClientPaymentAgreement(null)
    }
  }

  // Funciones de manejo de pagos y convenios
  const handleViewClient = async (client) => {
    try {
      // Cargar datos completos del cliente desde el backend
      const clientResponse = await clientService.getClient(client.id)
      setSelectedClient(clientResponse.client || client)
    } catch (error) {
      console.error('Error loading client details:', error)
      // Si falla, usar los datos del cliente de la lista
      setSelectedClient(client)
    }
    setShowClientDetails(true)
    // Cargar payment agreement del cliente
    await loadClientPaymentAgreement(client.id)
    // Cargar comentarios del cliente
    await loadClientComments(client.id)
    // Cargar pagos del cliente
    await loadClientPayments(client.id)
    // Cargar convenios del cliente
    await loadClientAgreements(client.id)
  }
  
  // Cargar pagos del cliente
  const loadClientPayments = async (clientId) => {
    try {
      const response = await paymentService.getPaymentsByClient(clientId)
      setClientPayments(response.payments || [])
    } catch (error) {
      console.error('Error loading client payments:', error)
      setClientPayments([])
    }
  }
  
  // Cargar convenios del cliente
  const loadClientAgreements = async (clientId) => {
    try {
      const response = await paymentAgreementService.getPaymentAgreementsByClient(clientId)
      setClientAgreements(response.agreements || [])
    } catch (error) {
      console.error('Error loading client agreements:', error)
      setClientAgreements([])
    }
  }
  
  // Cargar comentarios del cliente
  const loadClientComments = async (clientId) => {
    try {
      setLoadingComments(true)
      const response = await clientCollectionsCommentsService.getClientComments(clientId)
      setClientComments(response.comments || [])
    } catch (error) {
      console.error('Error loading client comments:', error)
      setClientComments([])
    } finally {
      setLoadingComments(false)
    }
  }
  
  // Guardar comentario del cliente
  const handleSaveComment = async () => {
    if (!newComment.trim() || !selectedClient) {
      alert('Por favor, ingresa un comentario')
      return
    }
    
    try {
      setLoadingComments(true)
      await clientCollectionsCommentsService.createClientComment({
        client_id: selectedClient.id,
        comment: newComment.trim()
      })
      
      // Recargar comentarios
      await loadClientComments(selectedClient.id)
      
      // Limpiar el campo
      setNewComment('')
      
      alert('Comentario guardado exitosamente')
    } catch (error) {
      console.error('Error saving comment:', error)
      alert('Error al guardar el comentario: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoadingComments(false)
    }
  }

  // Guardar fecha de vencimiento del pagarÃ©
  const handleSaveDueDate = async () => {
    if (!dueDateValue || !clientPaymentAgreement) {
      alert('Por favor, selecciona una fecha')
      return
    }
    
    try {
      setSavingDueDate(true)
      await paymentAgreementService.updatePaymentAgreementDueDate(clientPaymentAgreement.id, {
        due_date: dueDateValue
      })
      
      // Recargar el convenio de pago
      await loadClientPaymentAgreement(selectedClient.id)
      
      // Cerrar el editor
      setEditingDueDate(false)
      setDueDateValue(null)
      
      alert('Fecha de vencimiento guardada exitosamente')
    } catch (error) {
      console.error('Error saving due date:', error)
      alert('Error al guardar la fecha de vencimiento: ' + (error.response?.data?.error || error.message))
    } finally {
      setSavingDueDate(false)
    }
  }


  const handleAddPayment = (client) => {
    setSelectedClientForPayment(client)
    setPaymentFormData({
      client_id: client.id,
      contract_number: client.contract_number,
      payment_amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: '',
      installment_number: '',
      notes: ''
    })
    setShowPaymentModal(true)
  }

  const handleAddAgreement = (client) => {
    setSelectedClientForAgreement(client)
    setAgreementFormData({
      client_id: client.id,
      contract_number: client.contract_number,
      total_amount: client.total_amount || '',
      installment_count: '',
      installment_amount: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notes: ''
    })
    setShowAgreementModal(true)
  }

  // FunciÃ³n para manejar el botÃ³n unificado de pago/convenio/gestiÃ³n
  const handlePaymentAction = (client, action) => {
    if (action === 'payment') {
      handleAddPayment(client)
    } else if (action === 'agreement') {
      handleAddAgreement(client)
    } else if (action === 'management') {
      handleAddManagement(client)
    }
  }

  // FunciÃ³n para abrir modal de gestiÃ³n
  const handleAddManagement = (client) => {
    setSelectedClientForManagement(client)
    setManagementFormData({
      client_id: client.id,
      contract_number: client.contract_number,
      management_date: new Date().toISOString().split('T')[0],
      observation: ''
    })
    setShowManagementModal(true)
  }

  // FunciÃ³n para guardar gestiÃ³n
  const handleSaveManagement = async () => {
    try {
      if (!managementFormData.observation || managementFormData.observation.trim() === '') {
        alert('Por favor, ingresa una observaciÃ³n')
        return
      }
      
      setLoading(true)
      await clientManagementService.createClientManagement(managementFormData)
      alert('GestiÃ³n registrada exitosamente')
      setShowManagementModal(false)
      setSelectedClientForManagement(null)
      setManagementFormData({
        client_id: '',
        contract_number: '',
        management_date: new Date().toISOString().split('T')[0],
        observation: ''
      })
      // Recargar clientes si estamos en la vista de clientes
      if (activeModule === 'clientes') {
        await loadClients(currentPage, searchTerm)
      }
    } catch (error) {
      console.error('Error saving management:', error)
      alert('Error al guardar la gestiÃ³n: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }
  
  // FunciÃ³n para guardar pago
  const handleSavePayment = async () => {
    try {
      if (!paymentFormData.client_id || !paymentFormData.payment_amount || 
          !paymentFormData.payment_date || !paymentFormData.payment_method) {
        alert('Por favor, completa todos los campos requeridos (Cliente, Monto, Fecha y MÃ©todo de Pago)')
        return
      }
      
      setLoading(true)
      const paymentData = {
        ...paymentFormData,
        payment_amount: parseFloat(paymentFormData.payment_amount),
        installment_number: paymentFormData.installment_number ? parseInt(paymentFormData.installment_number) : null,
        booking_id: null // Los pagos de cobranzas pueden no tener booking_id
      }
      
      await paymentService.createPayment(paymentData)
      alert('Pago registrado exitosamente')
      

      // SIEMPRE recargar la lista de pagos después de crear uno
      if (activeModule === 'payments') {
        await loadPayments()
      }
      // Recargar datos del cliente si el modal de detalles estÃ¡ abierto