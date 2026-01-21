import React from 'react'
import PackageCarousel from './PackageCarousel'

const Hero = () => {
  return (
    <section id="inicio" className="relative h-screen overflow-hidden">
      {/* Video de fondo */}
      <video 
        autoPlay 
        muted 
        loop 
        className="absolute inset-0 w-full h-full object-cover brightness-50"
      >
        <source 
          src="https://videos.pexels.com/video-files/7191289/7191289-sd_640_360_25fps.mp4" 
          type="video/mp4" 
        />
      </video>

      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Contenido principal */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg">
            Innovation Business
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 drop-shadow-md font-light">
            Experiencias de Viaje Únicas y Personalizadas
          </p>
        </div>
      </div>

      {/* Carrusel de Paquetes */}
      <div className="relative z-20 w-full h-full">
        <PackageCarousel />
      </div>
    </section>
  )
}

export default Hero
