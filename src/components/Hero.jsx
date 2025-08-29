import React from 'react'
import { ArrowRight, MapPin, Globe } from 'lucide-react'

const Hero = () => {
  const openWhatsApp = () => {
    window.open('https://wa.me/593999222210?text=Hola! Me gustaría solicitar una cotización para mis próximas vacaciones.', '_blank')
  }

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center pt-16">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80')"
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="animate-fade-in">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Vive la experiencia de viajar con{' '}
            <span className="text-accent">Kempery World Travel</span>
          </h1>
          
          <p className="text-xl sm:text-2xl mb-8 text-gray-200 leading-relaxed">
            Descubre destinos increíbles alrededor del mundo. Desde aventuras nacionales 
            hasta experiencias internacionales únicas que transformarán tu vida.
          </p>

          {/* Features */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-accent">
              <MapPin size={20} />
              <span className="text-sm font-medium">Destinos Nacionales</span>
            </div>
            <div className="flex items-center gap-2 text-accent">
              <Globe size={20} />
              <span className="text-sm font-medium">Experiencias Internacionales</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={openWhatsApp}
            className="btn-secondary text-lg px-8 py-4 flex items-center gap-3 mx-auto group"
          >
            Solicita tu cotización ahora
            <ArrowRight 
              size={20} 
              className="group-hover:translate-x-1 transition-transform duration-300" 
            />
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}

export default Hero
