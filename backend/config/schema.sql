-- Kempery World Travel Database Schema
-- PostgreSQL Database Schema

-- Enable UUID extension
-- PostgreSQL 13+ tiene gen_random_uuid() nativo, pero intentamos instalar uuid-ossp para compatibilidad
-- Si falla, el schema usará gen_random_uuid() que es nativo

-- Users table (Administrative users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ecuador',
    birth_date DATE,
    document_type VARCHAR(20) DEFAULT 'cedula',
    document_number VARCHAR(20),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Travel packages table
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    destination VARCHAR(200) NOT NULL,
    duration_days INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    max_participants INTEGER,
    min_participants INTEGER DEFAULT 1,
    includes TEXT[],
    excludes TEXT[],
    highlights TEXT[],
    difficulty_level VARCHAR(20) DEFAULT 'easy',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    travel_date DATE NOT NULL,
    return_date DATE NOT NULL,
    participants INTEGER NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    special_requests TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_travel_date ON bookings(travel_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: Kempery2025+)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
    'ventas.kempery@gmail.com', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Kempery2025+
    'Admin',
    'Kempery',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample packages
INSERT INTO packages (name, description, destination, duration_days, price, max_participants, includes, excludes, highlights, difficulty_level) VALUES
(
    'Galápagos Aventura',
    'Descubre las Islas Galápagos con esta aventura única de 5 días. Observa la fauna única y disfruta de las aguas cristalinas.',
    'Islas Galápagos, Ecuador',
    5,
    1200.00,
    16,
    ARRAY['Transporte aéreo', 'Hospedaje 4 noches', 'Todas las comidas', 'Guía naturalista', 'Snorkeling', 'Tours terrestres'],
    ARRAY['Bebidas alcohólicas', 'Propinas', 'Seguro de viaje'],
    ARRAY['Fauna única', 'Aguas cristalinas', 'Guías expertos'],
    'medium'
),
(
    'Amazonía Ecuatoriana',
    'Sumérgete en la selva amazónica con esta experiencia de 4 días en lodges de lujo.',
    'Amazonía, Ecuador',
    4,
    800.00,
    12,
    ARRAY['Transporte terrestre', 'Hospedaje en lodge', 'Todas las comidas', 'Guía bilingüe', 'Excursiones', 'Equipos de seguridad'],
    ARRAY['Bebidas alcohólicas', 'Propinas', 'Seguro de viaje'],
    ARRAY['Biodiversidad', 'Lodges de lujo', 'Cultura local'],
    'easy'
),
(
    'Quito Colonial',
    'Explora la historia y arquitectura del Quito Colonial en este tour de 2 días.',
    'Quito, Ecuador',
    2,
    300.00,
    20,
    ARRAY['Transporte', 'Hospedaje 1 noche', 'Desayuno', 'Guía turístico', 'Entradas a museos'],
    ARRAY['Almuerzos y cenas', 'Propinas', 'Seguro de viaje'],
    ARRAY['Historia', 'Arquitectura', 'Gastronomía'],
    'easy'
),
(
    'Avenida de los Volcanes',
    'Recorre la majestuosa Avenida de los Volcanes en esta aventura de 3 días.',
    'Avenida de los Volcanes, Ecuador',
    3,
    450.00,
    15,
    ARRAY['Transporte', 'Hospedaje 2 noches', 'Todas las comidas', 'Guía especializado', 'Equipos de montaña'],
    ARRAY['Bebidas alcohólicas', 'Propinas', 'Seguro de viaje'],
    ARRAY['Paisajes', 'Naturaleza', 'Aventura'],
    'medium'
),
(
    'Costa del Pacífico',
    'Disfruta de un relajante viaje de 3 días en la costa ecuatoriana.',
    'Costa del Pacífico, Ecuador',
    3,
    350.00,
    25,
    ARRAY['Transporte', 'Hospedaje 2 noches', 'Desayunos', 'Tours costeros', 'Actividades acuáticas'],
    ARRAY['Almuerzos y cenas', 'Propinas', 'Seguro de viaje'],
    ARRAY['Playas', 'Relax', 'Actividades acuáticas'],
    'easy'
),
(
    'Vilcabamba - Valle de la Longevidad',
    'Descansa en el Valle de la Longevidad con esta experiencia de bienestar de 2 días.',
    'Vilcabamba, Ecuador',
    2,
    250.00,
    18,
    ARRAY['Transporte', 'Hospedaje 1 noche', 'Desayuno', 'Tours de bienestar', 'Actividades de relajación'],
    ARRAY['Almuerzos y cenas', 'Propinas', 'Seguro de viaje'],
    ARRAY['Tranquilidad', 'Naturaleza', 'Bienestar'],
    'easy'
) ON CONFLICT DO NOTHING;
