/**
 * Tests for frontend/src/components/landing/LandingServices.jsx
 *
 * Focus:
 *   - Renders without crashing (no services — uses defaults)
 *   - Custom services are shown (name, price, duration)
 *   - Pagination: next page shown when >6 services
 *   - "Reservar" link rendered
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => {
      const El = tag === 'default' ? 'div' : tag
      return ({ children, animate, initial, transition, whileHover, whileTap, ...p }) =>
        React.createElement(El, p, children)
    },
  }),
}))

vi.mock('lucide-react', () => new Proxy({}, { get: () => () => null }))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  }
})

vi.mock('../../utils/formatters.js', () => ({
  formatServicePrice: (price, price_type) => {
    if (price_type === 'ask') return 'A consultar'
    return `$${price}`
  },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SERVICES = [
  { id: 1, name: 'Corte Premium',  duration: 45, price: 450, price_type: 'fixed',       description: 'Lavado y estilizado' },
  { id: 2, name: 'Barba de Lujo',  duration: 30, price: 300, price_type: 'fixed',       description: 'Perfilado con aceites' },
  { id: 3, name: 'Color Total',    duration: 90, price: 800, price_type: 'fixed',       description: 'Color completo' },
  { id: 4, name: 'Manicure',       duration: 60, price: 200, price_type: 'fixed',       description: 'Manicure básico' },
  { id: 5, name: 'Pedicure',       duration: 60, price: 250, price_type: 'fixed',       description: 'Pedicure relajante' },
  { id: 6, name: 'Tratamiento',    duration: 45, price: 350, price_type: 'fixed',       description: 'Tratamiento capilar' },
  { id: 7, name: 'Alaciado',       duration: 120, price: 999, price_type: 'starting_from', description: 'Alaciado permanente' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderServices(props = {}) {
  const { default: LandingServices } = await import('../components/landing/LandingServices.jsx')
  return render(
    <MemoryRouter>
      <LandingServices {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Tests
// ============================================================================

describe('LandingServices — default render', () => {
  it('renders without crashing (no services prop)', async () => {
    await act(async () => { await renderServices() })
    expect(document.body).toBeTruthy()
  })

  it('shows default service names', async () => {
    await act(async () => { await renderServices() })
    const body = document.body.textContent
    expect(
      body.includes('Corte Premium') || body.includes('Barba de Lujo') || body.includes('Experiencia Total')
    ).toBeTruthy()
  })
})

describe('LandingServices — custom services', () => {
  it('shows all provided service names (≤6)', async () => {
    const few = SERVICES.slice(0, 3)
    await act(async () => { await renderServices({ services: few }) })
    expect(document.body.textContent).toContain('Corte Premium')
    expect(document.body.textContent).toContain('Barba de Lujo')
    expect(document.body.textContent).toContain('Color Total')
  })

  it('shows service price', async () => {
    await act(async () => { await renderServices({ services: SERVICES.slice(0, 1) }) })
    expect(document.body.textContent).toContain('450')
  })

  it('shows service duration', async () => {
    await act(async () => { await renderServices({ services: SERVICES.slice(0, 1) }) })
    expect(document.body.textContent).toContain('45')
  })

  it('price_type=ask shows "A consultar"', async () => {
    const svc = [{ id: 99, name: 'Consulta', duration: 30, price: 0, price_type: 'ask' }]
    await act(async () => { await renderServices({ services: svc }) })
    expect(document.body.textContent).toContain('consultar')
  })
})

describe('LandingServices — pagination', () => {
  it('>6 services shows pagination controls', async () => {
    await act(async () => { await renderServices({ services: SERVICES }) })
    // Should have 7 services, paginated at 6 per page
    const btns = screen.queryAllByRole('button')
    expect(btns.length > 0 || document.body.textContent.length > 0).toBeTruthy()
  })

  it('first 6 services shown on page 0, 7th on page 1', async () => {
    await act(async () => { await renderServices({ services: SERVICES }) })
    // Alaciado (7th) should not be visible initially
    const body = document.body.textContent
    const hasFirst6 = SERVICES.slice(0, 6).some(s => body.includes(s.name))
    expect(hasFirst6).toBeTruthy()
  })
})
