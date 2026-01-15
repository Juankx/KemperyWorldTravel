-- Crear la base de datos
CREATE DATABASE kempery_travel;

-- Conectar a la nueva base de datos
\c kempery_travel;

-- Crear usuario si no existe
CREATE USER kempery_user WITH PASSWORD 'Princonserkids2025+';

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE kempery_travel TO kempery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kempery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kempery_user;

-- Crear schema
CREATE SCHEMA IF NOT EXISTS public;
GRANT ALL ON SCHEMA public TO kempery_user;

-- Crear tablas de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuarios de prueba
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@kempery.com', '\\\.Nj3kQwPvEGn8WQle1uJ5V5m5Q5Q5Q5Q5Q5Q', 'Admin', 'User', 'admin'),
('paola@kempery.com', '\\.Nj3kQwPvEGn8WQle1uJ5V5m5Q5Q5Q5Q5Q5Q', 'Paola', 'Usuario', 'employee'),
('cobranzas@kempery.com', '\\\.Nj3kQwPvEGn8WQle1uJ5V5m5Q5Q5Q5Q5Q5Q', 'Cobranzas', 'User', 'cobranza');

-- Dar permisos finales
GRANT ALL ON ALL TABLES IN SCHEMA public TO kempery_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO kempery_user;

