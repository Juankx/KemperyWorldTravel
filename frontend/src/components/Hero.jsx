import React from 'react'
import PackageCarousel from './PackageCarousel'

const Hero = () => {
  return (
    <section id="inicio" className="relative h-screen">
      {/* Carrusel de Paquetes */}
      <div className="relative z-10 w-full h-full">
        <PackageCarousel />
      </div>
    </section>
  )
}

export default Hero
