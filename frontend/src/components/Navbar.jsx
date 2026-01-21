import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    login({
      id: 1,
      email: email,
      name: email.split('@')[0],
      token: 'mock-token-' + Date.now()
    })
    setShowLogin(false)
    setEmail('')
    setPassword('')
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-amber-900 to-amber-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="text-2xl font-bold text-yellow-300 hover:text-yellow-200 transition">
                🌟 Innovation Business
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link to="/" className="text-amber-50 hover:text-yellow-300 px-3 py-2 text-sm font-medium transition-colors">
                  INICIO
                </Link>
                <Link to="/paquetes" className="text-amber-50 hover:text-yellow-300 px-3 py-2 text-sm font-medium transition-colors">
                  PAQUETES
                </Link>
                <Link to="/resenias" className="text-amber-50 hover:text-yellow-300 px-3 py-2 text-sm font-medium transition-colors">
                  RESEÑAS
                </Link>
                <Link to="/contacto" className="text-amber-50 hover:text-yellow-300 px-3 py-2 text-sm font-medium transition-colors">
                  CONTACTO
                </Link>
              </div>
            </div>

            {/* Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-300 flex items-center justify-center">
                      <span className="text-amber-900 font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-amber-50 text-sm">{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
                  >
                    <LogOut size={16} />
                    <span>Salir</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center space-x-1 bg-yellow-400 hover:bg-yellow-300 text-amber-900 px-4 py-2 rounded font-semibold transition"
                >
                  <LogIn size={16} />
                  <span>Iniciar Sesión</span>
                </button>
              )}
            </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <div className="w-8 h-8 rounded-full bg-yellow-300 flex items-center justify-center">
                <span className="text-amber-900 font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-amber-50 hover:text-yellow-300 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-amber-800">
            <Link to="/" className="text-yellow-300 font-semibold block px-3 py-2 text-base hover:bg-amber-700 rounded" onClick={() => setIsOpen(false)}>
              INICIO
            </Link>
            <Link to="/paquetes" className="text-amber-50 hover:text-yellow-300 hover:bg-amber-700 block px-3 py-2 text-base font-medium rounded" onClick={() => setIsOpen(false)}>
              PAQUETES
            </Link>
            <Link to="/resenias" className="text-amber-50 hover:text-yellow-300 hover:bg-amber-700 block px-3 py-2 text-base font-medium rounded" onClick={() => setIsOpen(false)}>
              RESEÑAS
            </Link>
            <Link to="/contacto" className="text-amber-50 hover:text-yellow-300 hover:bg-amber-700 block px-3 py-2 text-base font-medium rounded" onClick={() => setIsOpen(false)}>
              CONTACTO
            </Link>
            <div className="pt-2 border-t border-amber-700">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout()
                    setIsOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-red-300 hover:bg-amber-700 rounded transition"
                >
                  Cerrar Sesión
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowLogin(true)
                    setIsOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-yellow-300 hover:bg-amber-700 rounded transition"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-amber-900 mb-6">Iniciar Sesión</h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2 border-2 border-amber-200 rounded focus:outline-none focus:border-amber-500 text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border-2 border-amber-200 rounded focus:outline-none focus:border-amber-500 text-gray-800"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-900 font-bold py-3 rounded hover:from-amber-600 hover:to-yellow-500 transition"
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('demo@innovation.com')
                  setPassword('demo123')
                }}
                className="w-full bg-gray-200 text-gray-800 font-semibold py-2 rounded hover:bg-gray-300 transition text-sm"
              >
                Usar Demo (demo@innovation.com)
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowLogin(false)}
                className="text-amber-600 hover:text-amber-800 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
