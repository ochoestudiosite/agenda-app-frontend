# agenda-app-frontend

Página de booking público de Cita24. Es la interfaz que usa el cliente final para agendar citas en cualquier negocio de la plataforma.

**URL producción**: `{negocio}.cita24.com` (multitenant por subdominio)  
**Usuarios**: clientes finales de cada negocio

## Stack

- **Framework**: React + Vite
- **Routing**: React Router v6
- **Estado servidor**: TanStack Query
- **Animaciones**: Framer Motion
- **Error monitoring**: Sentry (`cita24-frontend`)
- **Deploy**: Vercel — rama `main`, wildcard `*.cita24.com`

## Setup local

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

### `.env` mínimo

```
VITE_API_URL=http://localhost:3001
```

Para probar un tenant específico en local, el backend usa el header `X-Tenant-Slug` (configurado en el proxy de `vite.config.js`).

## Comandos

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run preview  # preview del build
```

## Estructura

```
src/
├── pages/
│   ├── Home.jsx          # landing del negocio (configurable)
│   ├── Booking.jsx       # flujo de agendamiento
│   ├── Manage.jsx        # gestión de cita por el cliente (cancelar/reagendar)
│   └── NotFound.jsx
├── components/
│   ├── landing/          # secciones de la landing del negocio
│   ├── booking/          # pasos del flujo de reserva
│   └── ui/               # componentes base
├── context/
│   ├── BookingContext.jsx # estado global del flujo de reserva
│   └── ThemeContext.jsx   # tema del negocio (colores del tenant)
├── utils/
│   ├── errorReporter.js  # error tracking → platform-admin
│   └── sentry.js         # Sentry init
└── services/
    └── api.js            # llamados al backend (disponibilidad, booking)
```

## Flujo de booking

```
Home (landing del negocio)
  → Booking
      1. Selección de servicio
      2. Selección de especialista
      3. Selección de fecha y hora
      4. Datos del cliente
      5. Confirmación
  → Manage (gestión post-booking con código de cita)
```

## Multi-tenant

El tenant se resuelve desde el subdominio (`barberpro.cita24.com` → `barberpro`). La landing y el tema visual se cargan dinámicamente según la configuración del negocio en la API.
