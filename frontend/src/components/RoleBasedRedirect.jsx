import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import AdminPanel from '../pages/AdminPanel'
import EmployeePanel from '../pages/EmployeePanel'
import CobranzasPanel from '../pages/CobranzasPanel'

const RoleBasedRedirect = () => {
  const { user } = useAuth()

  // Si no hay usuario, mostrar mensaje de carga
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirigir según el rol del usuario
  switch (user.role) {
    case 'admin':
      return <AdminPanel />
    case 'employee':
      // Verificar si es el usuario de cobranzas
      if (user.email === 'Cobranzas') {
        return <CobranzasPanel />
      } else {
        // Paola y Cristhian van al panel de empleados
        return <EmployeePanel />
      }
    default:
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Rol No Reconocido</h2>
            <p className="text-gray-600">Tu rol de usuario no está configurado correctamente.</p>
          </div>
        </div>
      )
  }
}

export default RoleBasedRedirect
