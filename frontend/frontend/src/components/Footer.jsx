import React from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle, Globe } from 'lucide-react'

const Footer = () => {
  const openWhatsApp = () => {
    window.open('https://wa.me/593999222210?text=Hola! Me gustaría obtener información sobre sus servicios turísticos.', '_blank')
  }

  const openFacebook = () => {
    window.open('https://facebook.com/kemperytravel', '_blank')
  }

  const openInstagram = () => {
    window.open('https://instagram.com/kemperytravel', '_blank')
  }

  const openWebsite = () => {
    window.open('https://kemperytravel.com', '_blank')
  }

  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold mb-6">Kempery World Travel</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Somos tu compañía de confianza para crear experiencias de viaje únicas e inolvidables. 
              Desde destinos nacionales hasta aventuras internacionales, nos encargamos de cada detalle 
              para que solo te preocupes por disfrutar.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-accent" />
                <span className="text-gray-300">+593 99 922 2210</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-accent" />
                <span className="text-gray-300">info@kemperytravel.com</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-accent" />
                <span className="text-gray-300">Quito, Ecuador</span>
              </div>
            </div>
          </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-lg font-semibold mb-6">Enlaces Rápidos</h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/" className="text-gray-300 hover:text-accent transition-colors duration-300">
                      Inicio
                    </Link>
                  </li>
                  <li>
                    <Link to="/nosotros" className="text-gray-300 hover:text-accent transition-colors duration-300">
                      Nosotros
                    </Link>
                  </li>
                  <li>
                    <Link to="/paquetes" className="text-gray-300 hover:text-accent transition-colors duration-300">
                      Paquetes
                    </Link>
                  </li>
                  <li>
                    <Link to="/experiencias" className="text-gray-300 hover:text-accent transition-colors duration-300">
                      Experiencias
                    </Link>
                  </li>
                  <li>
                    <Link to="/contactanos" className="text-gray-300 hover:text-accent transition-colors duration-300">
                      Contactanos
                    </Link>
                  </li>
                </ul>
              </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Nuestros Servicios</h4>
            <ul className="space-y-3">
              <li className="text-gray-300">Viajes Nacionales</li>
              <li className="text-gray-300">Viajes Internacionales</li>
              <li className="text-gray-300">Paquetes Personalizados</li>
              <li className="text-gray-300">Asesoría de Viajes</li>
              <li className="text-gray-300">Reservas de Hoteles</li>
              <li className="text-gray-300">Tours Guiados</li>
            </ul>
          </div>
        </div>

        {/* Social Media & CTA */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Social Media */}
            <div className="flex items-center gap-4">
              <span className="text-gray-300 font-medium">Síguenos en:</span>
              <div className="flex gap-3">
                <button
                  onClick={openFacebook}
                  className="bg-light-blue hover:bg-light-blue/90 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-110"
                  aria-label="Facebook"
                >
                  <Facebook size={20} />
                </button>
                <button
                  onClick={openInstagram}
                  className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-110"
                  aria-label="Instagram"
                >
                  <Instagram size={20} />
                </button>
                <button
                  onClick={openWhatsApp}
                  className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-110"
                  aria-label="WhatsApp"
                >
                  <MessageCircle size={20} />
                </button>
                <button
                  onClick={openWebsite}
                  className="bg-accent hover:bg-accent/90 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-110"
                  aria-label="Sitio Web"
                >
                  <Globe size={20} />
                </button>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={openWhatsApp}
              className="btn-secondary flex items-center gap-2"
            >
              <MessageCircle size={18} />
              Contactar Ahora
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <div className="text-center md:text-left">
              <p>&copy; 2024 Kempery World Travel. Todos los derechos reservados.</p>
            </div>
            <div className="flex gap-6 text-center">
              <a href="#" className="hover:text-accent transition-colors duration-300">
                Política de Privacidad
              </a>
              <a href="#" className="hover:text-accent transition-colors duration-300">
                Términos de Servicio
              </a>
              <a href="#" className="hover:text-accent transition-colors duration-300">
                Política de Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
