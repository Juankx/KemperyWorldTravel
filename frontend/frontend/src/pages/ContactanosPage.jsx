import React from 'react'
import Navbar from '../components/Navbar'
import ContactForm from '../components/ContactForm'
import Footer from '../components/Footer'
import WhatsAppFloat from '../components/WhatsAppFloat'

const ContactanosPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <ContactForm />
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  )
}

export default ContactanosPage
