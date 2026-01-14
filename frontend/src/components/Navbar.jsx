import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, MapPin, Plane, Mountain, Building } from 'lucide-react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white shadow-lg fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {/* Pin Icon with Landscape */}
            <div className="relative">
              <MapPin size={40} className="text-navy fill-current" />
              {/* Landscape inside pin */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 relative">
                  {/* Mountains */}
                  <Mountain size={12} className="text-white absolute bottom-0 left-1" />
                  {/* Building */}
                  <Building size={8} className="text-white absolute bottom-0 right-1" />
                  {/* Plane */}
                  <Plane size={6} className="text-white absolute top-1 right-0" />
                </div>
              </div>
            </div>
            
            {/* Text */}
            <div className="flex flex-col">
              <div className="text-xl font-bold text-gray-800 leading-tight">
                KEMPERY WORLD TRAVEL
              </div>
              <div className="text-sm text-gray-500">
                Viajes turismo
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link to="/" className="text-light-blue font-semibold px-3 py-2 text-sm transition-colors">
                INICIO
              </Link>
              <Link to="/nosotros" className="text-gray-700 hover:text-navy px-3 py-2 text-sm font-medium transition-colors">
                NOSOTROS
              </Link>
              <Link to="/paquetes" className="text-gray-700 hover:text-navy px-3 py-2 text-sm font-medium transition-colors">
                PAQUETES
              </Link>
              <Link to="/experiencias" className="text-gray-700 hover:text-navy px-3 py-2 text-sm font-medium transition-colors">
                EXPERIENCIAS
              </Link>
              <Link to="/contactanos" className="text-gray-700 hover:text-navy px-3 py-2 text-sm font-medium transition-colors">
                CONTACTANOS
              </Link>
            </div>
          </div>

              {/* Buttons */}
              <div className="hidden md:flex items-center gap-4">
                {/* Login Button */}
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-navy px-3 py-2 text-sm font-medium transition-colors"
                >
                  Iniciar Sesión
                </Link>
              </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-navy focus:outline-none focus:text-navy"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
            <Link to="/" className="text-light-blue font-semibold block px-3 py-2 text-base" onClick={() => setIsOpen(false)}>
              INICIO
            </Link>
            <Link to="/nosotros" className="text-gray-700 hover:text-navy block px-3 py-2 text-base font-medium" onClick={() => setIsOpen(false)}>
              NOSOTROS
            </Link>
            <Link to="/paquetes" className="text-gray-700 hover:text-navy block px-3 py-2 text-base font-medium" onClick={() => setIsOpen(false)}>
              PAQUETES
            </Link>
            <Link to="/experiencias" className="text-gray-700 hover:text-navy block px-3 py-2 text-base font-medium" onClick={() => setIsOpen(false)}>
              EXPERIENCIAS
            </Link>
            <Link to="/contactanos" className="text-gray-700 hover:text-navy block px-3 py-2 text-base font-medium" onClick={() => setIsOpen(false)}>
              CONTACTANOS
            </Link>
                <div className="pt-4 space-y-2">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-navy block px-3 py-2 text-base font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Iniciar Sesión
                  </Link>
                </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
