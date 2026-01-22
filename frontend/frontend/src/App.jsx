import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FeaturedPackages from './components/FeaturedPackages'
import StatsSection from './components/StatsSection'
import TestimonialsSection from './components/TestimonialsSection'
import Footer from './components/Footer'
import WhatsAppFloat from './components/WhatsAppFloat'
import NosotrosPage from './pages/NosotrosPage'
import PaquetesPage from './pages/PaquetesPage'
import ExperienciasPage from './pages/ExperienciasPage'
import ContactanosPage from './pages/ContactanosPage'
import LoginPage from './pages/LoginPage'
import HomePageDorada from './pages/HomePageDorada'
import Reviews from './pages/Reviews'
import RoleBasedRedirect from './components/RoleBasedRedirect'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={
              <>
                <Navbar />
                <HomePageDorada />
                <Footer />
                <WhatsAppFloat />
              </>
            } />
            <Route path="/resenias" element={
              <>
                <Navbar />
                <Reviews />
                <Footer />
                <WhatsAppFloat />
              </>
            } />
            <Route path="/nosotros" element={
              <>
                <Navbar />
                <NosotrosPage />
                <Footer />
                <WhatsAppFloat />
              </>
            } />
            <Route path="/paquetes" element={
              <>
                <Navbar />
                <PaquetesPage />
                <Footer />
                <WhatsAppFloat />
              </>
            } />
            <Route path="/experiencias" element={
              <>
                <Navbar />
                <ExperienciasPage />
                <Footer />
                <WhatsAppFloat />
              </>
            } />
            <Route path="/contactanos" element={
              <>
                <Navbar />
                <ContactanosPage />
                <Footer />
                <WhatsAppFloat />
              </>
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
