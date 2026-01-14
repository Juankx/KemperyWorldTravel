# Kempery World Travel - Sistema Completo

Sistema integral de gestión para agencias de viajes que incluye frontend web, backend API y aplicación de escritorio.

## 📁 Estructura del Proyecto

```
KemperyWorldTravel/
├── frontend/          # Aplicación web React + Vite
├── backend/           # API REST Node.js + Express + PostgreSQL
└── KemperySoft/       # Aplicación de escritorio Python + Tkinter
```

## 🚀 Componentes

### Frontend
Aplicación web moderna desarrollada con React 18, Vite y TailwindCSS. Incluye:
- Landing page responsiva
- Panel administrativo
- Gestión de clientes y reservas
- Sistema de autenticación

**Ver más detalles:** [frontend/README.md](frontend/README.md)

### Backend
API REST profesional con Node.js, Express y PostgreSQL. Incluye:
- Autenticación JWT
- CRUD completo para clientes y reservas
- Sistema de pagos
- Estadísticas y reportes

**Ver más detalles:** [backend/README.md](backend/README.md)

### KemperySoft
Aplicación de escritorio para gestión de clientes desarrollada en Python con Tkinter. Incluye:
- Gestión de clientes y contratos
- Generación de documentos Word
- Exportación a Excel y CSV
- Base de datos SQLite

**Ver más detalles:** [KemperySoft/README.md](KemperySoft/README.md)

## 🛠️ Instalación Rápida

### Prerrequisitos
- Node.js 16+ (para frontend y backend)
- Python 3.7+ (para KemperySoft)
- PostgreSQL 12+ (para backend)
- Git

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
# Configurar .env con credenciales de PostgreSQL
npm run dev
```

### KemperySoft
```bash
cd KemperySoft
pip install -r requirements.txt
python kempery_soft.py
```

## 📝 Notas Importantes

- Los archivos `.env` están excluidos del repositorio por seguridad
- Cada componente tiene su propio archivo `.env.example` o documentación de configuración
- Consulta los README individuales de cada componente para más detalles

## 👥 Colaboración

Este proyecto está configurado para trabajo colaborativo. Asegúrate de:
1. Crear una rama para tus cambios
2. Hacer commits descriptivos
3. Sincronizar regularmente con el repositorio remoto

## 📞 Contacto

Para más información sobre el proyecto, consulta la documentación en cada componente.
