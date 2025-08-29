import React from 'react'
import { Star, MapPin, Calendar, Users, ArrowRight } from 'lucide-react'

const Packages = () => {
  const packages = [
    {
      id: 1,
      name: "Galápagos - Aventura Marina",
      description: "Explora las islas encantadas con tours guiados, buceo y encuentros únicos con la fauna marina.",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      price: "$1,299",
      duration: "5 días / 4 noches",
      group: "2-8 personas",
      rating: 4.9,
      type: "Nacional"
    },
    {
      id: 2,
      name: "Amazonas Ecuatoriano",
      description: "Sumérgete en la selva más biodiversa del planeta con lodges de lujo y guías expertos.",
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80",
      price: "$899",
      duration: "4 días / 3 noches",
      group: "2-6 personas",
      rating: 4.8,
      type: "Nacional"
    },
    {
      id: 3,
      name: "Machu Picchu - Perú",
      description: "Descubre la ciudad perdida de los incas con tours exclusivos y alojamiento premium.",
      image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      price: "$1,599",
      duration: "6 días / 5 noches",
      group: "2-10 personas",
      rating: 4.9,
      type: "Internacional"
    },
    {
      id: 4,
      name: "Caribe Mexicano",
      description: "Relájate en las playas más hermosas del Caribe con todo incluido y actividades acuáticas.",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      price: "$1,199",
      duration: "7 días / 6 noches",
      group: "2-12 personas",
      rating: 4.7,
      type: "Internacional"
    },
    {
      id: 5,
      name: "Montañas de Ecuador",
      description: "Aventúrate por los Andes ecuatorianos con trekking, termas y cultura indígena.",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      price: "$699",
      duration: "3 días / 2 noches",
      group: "2-8 personas",
      rating: 4.6,
      type: "Nacional"
    },
    {
      id: 6,
      name: "Europa Clásica",
      description: "Recorre las capitales más importantes de Europa con guías expertos y alojamientos céntricos.",
      image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      price: "$2,999",
      duration: "12 días / 11 noches",
      group: "2-15 personas",
      rating: 4.9,
      type: "Internacional"
    }
  ]

  const openWhatsApp = (packageName) => {
    const message = `Hola! Me interesa el paquete "${packageName}". ¿Podrían darme más información?`
    window.open(`https://wa.me/593999222210?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <section id="paquetes" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mb-6">
            Paquetes Turísticos Activos
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Descubre nuestras ofertas más populares y planifica tu próxima aventura 
            con paquetes personalizados para todos los gustos y presupuestos.
          </p>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <div 
              key={pkg.id} 
              className="card overflow-hidden animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Package Image */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={pkg.image} 
                  alt={pkg.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    pkg.type === 'Nacional' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-blue-500 text-white'
                  }`}>
                    {pkg.type}
                  </span>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full">
                  <Star size={14} className="text-yellow-500 fill-current" />
                  <span className="text-sm font-semibold text-gray-800">{pkg.rating}</span>
                </div>
              </div>

              {/* Package Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-navy mb-3">{pkg.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{pkg.description}</p>
                
                {/* Package Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>{pkg.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users size={16} />
                    <span>{pkg.group}</span>
                  </div>
                </div>

                {/* Price and CTA */}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-navy">{pkg.price}</div>
                  <button
                    onClick={() => openWhatsApp(pkg.name)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    Ver más
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => openWhatsApp("todos los paquetes")}
            className="btn-primary text-lg px-8 py-4"
          >
            Ver todos los paquetes
          </button>
        </div>
      </div>
    </section>
  )
}

export default Packages
