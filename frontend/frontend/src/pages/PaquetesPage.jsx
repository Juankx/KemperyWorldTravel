import React from 'react'
import Navbar from '../components/Navbar'
import Packages from '../components/Packages'
import Footer from '../components/Footer'
import WhatsAppFloat from '../components/WhatsAppFloat'

const PaquetesPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <Packages />
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  )
}

export default PaquetesPage
