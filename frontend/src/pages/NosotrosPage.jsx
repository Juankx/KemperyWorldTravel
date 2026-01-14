import React from 'react'
import Navbar from '../components/Navbar'
import Nosotros from '../components/Nosotros'
import Footer from '../components/Footer'
import WhatsAppFloat from '../components/WhatsAppFloat'

const NosotrosPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <Nosotros />
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  )
}

export default NosotrosPage
