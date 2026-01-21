import React, { useState, useEffect } from 'react'
import PackageCarousel from './PackageCarousel'
import { Play, Pause } from 'lucide-react'

const Hero = () => {
  const [isPlaying, setIsPlaying] = useState(true)

  // Múltiples videos de viaje disponibles
  const videos = [
    'https://videos.pexels.com/video-files/7191289/7191289-sd_640_360_25fps.mp4', // Viaje tropical
    'https://videos.pexels.com/video-files/3045163/3045163-sd_640_360_25fps.mp4', // Naturaleza
    'https://videos.pexels.com/video-files/8515880/8515880-sd_640_360_25fps.mp4'  // Aventura
  ]

  const [videoUrl] = useState(videos[0])

  return (
    <section id="inicio" className="relative h-screen overflow-hidden">
      {/* Video de fondo - Optimizado */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: 'brightness(0.4) contrast(1.1)',
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        Tu navegador no soporta videos HTML5
      </video>

      {/* Overlay gradiente premium */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"></div>

      {/* Efecto de partículas/brillo (opcional) */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent opacity-20"></div>

      {/* Contenido principal - HERO TEXT */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-4">
        {/* Animación de entrada */}
        <div className="space-y-8 animate-fade-in">
          {/* Logo/Branding animado */}
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 to-yellow-300 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
            
            {/* Título Principal */}
            <h1 className="relative text-6xl md:text-8xl font-black text-white mb-6 drop-shadow-2xl">
              <span className="bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent animate-pulse">
                Innovation Business
              </span>
            </h1>
          </div>

          {/* Subtítulo */}
          <div className="space-y-4">
            <p className="text-xl md:text-3xl text-amber-100 drop-shadow-lg font-light tracking-wider">
              ✈️ Experiencias de Viaje Únicas y Personalizadas ✈️
            </p>
            
            {/* Divisor decorativo */}
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="h-1 w-12 bg-gradient-to-r from-transparent to-amber-400"></div>
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <div className="h-1 w-12 bg-gradient-to-l from-transparent to-amber-400"></div>
            </div>

            {/* Descripción */}
            <p className="text-lg md:text-xl text-amber-50 drop-shadow-md max-w-2xl mx-auto font-light">
              Descubre los destinos más increíbles del mundo con nosotros
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button className="px-8 py-4 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 font-bold rounded-lg hover:from-amber-500 hover:to-yellow-400 transition transform hover:scale-105 shadow-2xl">
              Explorar Paquetes
            </button>
            <button className="px-8 py-4 border-2 border-amber-300 text-amber-100 font-semibold rounded-lg hover:bg-amber-500/20 transition backdrop-blur-sm">
              Reservar Ahora
            </button>
          </div>
        </div>

        {/* Indicador de scroll */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <span className="text-amber-200 text-sm font-light">Desplaza hacia abajo</span>
            <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Carrusel de Paquetes */}
      <div className="relative z-20 w-full h-full">
        <PackageCarousel />
      </div>

      {/* Controles de video (opcional) */}
      <div className="absolute bottom-4 right-4 z-30">
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition"
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>
    </section>
  )
}

export default Hero
