import React from 'react'
import Navbar from '../components/Navbar'
import Experiencias from '../components/Experiencias'
import Footer from '../components/Footer'
import WhatsAppFloat from '../components/WhatsAppFloat'

const ExperienciasPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <Experiencias />
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  )
}

export default ExperienciasPage
