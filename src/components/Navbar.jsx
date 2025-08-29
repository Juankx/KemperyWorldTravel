import React, { useState } from 'react'
import { Menu, X, Phone } from 'lucide-react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  const openWhatsApp = () => {
    window.open('https://wa.me/593999222210?text=Hola! Me gustaría obtener información sobre sus paquetes turísticos.', '_blank')
  }

  return (
    <nav className="bg-white shadow-lg fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-navy">Kempery World Travel</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a href="#inicio" className="text-gray-700 hover:text-navy px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Inicio
              </a>
              <a href="#paquetes" className="text-gray-700 hover:text-navy px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Paquetes
              </a>
              <a href="#testimonios" className="text-gray-700 hover:text-navy px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Testimonios
              </a>
              <a href="#contacto" className="text-gray-700 hover:text-navy px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Contacto
              </a>
            </div>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <button
              onClick={openWhatsApp}
              className="btn-primary flex items-center gap-2"
            >
              <Phone size={18} />
              Contactar
            </button>
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
            <a href="#inicio" className="text-gray-700 hover:text-navy block px-3 py-2 rounded-md text-base font-medium">
              Inicio
            </a>
            <a href="#paquetes" className="text-gray-700 hover:text-navy block px-3 py-2 rounded-md text-base font-medium">
              Paquetes
            </a>
            <a href="#testimonios" className="text-gray-700 hover:text-navy block px-3 py-2 rounded-md text-base font-medium">
              Testimonios
            </a>
            <a href="#contacto" className="text-gray-700 hover:text-navy block px-3 py-2 rounded-md text-base font-medium">
              Contacto
            </a>
            <button
              onClick={openWhatsApp}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              <Phone size={18} />
              Contactar
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
