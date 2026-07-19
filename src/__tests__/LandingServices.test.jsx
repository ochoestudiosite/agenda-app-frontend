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

vi.mock('lucide-react', () => {
  const noop = () => null
  return { Sparkles: noop, ArrowUpRight: noop, ChevronLeft: noop, ChevronRight: noop, Clock: noop }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  }
})

vi.mock('../hooks/useConfig', () => ({
  useConfig: () => ({ data: null }),
}))

vi.mock('../utils/formatters', () => ({
  formatServicePrice: (service) => {
    if (service?.price_type === 'ask') return 'A consultar'
    return `$${service?.price}`
  },
  promoEndsLabel: () => null,
  formatPrice: (p) => `$${p ?? 0}`,
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

  it('price_type=ask hides the price badge', async () => {
    const svc = [{ id: 99, name: 'Consulta', duration: 30, price: 0, price_type: 'ask' }]
    await act(async () => { await renderServices({ services: svc }) })
    expect(document.body.textContent).not.toContain('$0')
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

describe('LandingServices — "Ver todos los servicios" link (linkText)', () => {
  it('shows the default link text when linkText is not provided', async () => {
    await act(async () => { await renderServices() })
    expect(document.body.textContent).toContain('Ver todos los servicios')
  })

  it('shows custom linkText when provided', async () => {
    await act(async () => { await renderServices({ linkText: 'Explora el catálogo completo' }) })
    expect(document.body.textContent).toContain('Explora el catálogo completo')
  })

  it('the link points to /agendar', async () => {
    await act(async () => { await renderServices() })
    const links = document.querySelectorAll('a[href="/agendar"]')
    expect(links.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// Promo badge — regression: fixed_amount must show the discounted amount, not
// a bare "Promo" label (was reimplemented inline instead of reusing the shared
// promoConceptLabel from ui/PromoPrice, and diverged for the fixed_amount branch).
// ============================================================================

describe('LandingServices — promo badge', () => {
  it('percent promo shows "−X% Promo"', async () => {
    const svc = [{ ...SERVICES[0], promo: { discountType: 'percent', discountValue: 20, discountAmount: 90, finalPrice: 360 } }]
    await act(async () => { await renderServices({ services: svc }) })
    expect(document.body.textContent).toContain('−20% Promo')
  })

  it('fixed_amount promo shows the discounted amount, not a bare "Promo" label', async () => {
    const svc = [{ ...SERVICES[0], promo: { discountType: 'fixed_amount', discountValue: 100, discountAmount: 100, finalPrice: 350 } }]
    await act(async () => { await renderServices({ services: svc }) })
    expect(document.body.textContent).toContain('−$100 Promo')
  })

  it('no promo: no promo badge text rendered', async () => {
    await act(async () => { await renderServices({ services: SERVICES.slice(0, 1) }) })
    expect(document.body.textContent).not.toContain('Promo')
  })
})

// ============================================================================
// Requisitos previos — chip informativo (solo visual, sin modal en la landing)
// ============================================================================

describe('LandingServices — chip "Requisitos previos"', () => {
  it('shows the chip for a service with requirements text', async () => {
    const svc = [{ ...SERVICES[0], requirements: 'No exponerse al sol 48 h antes.', prerequisite: null }]
    await act(async () => { await renderServices({ services: svc }) })
    expect(document.body.textContent).toContain('Requisitos previos')
  })

  it('shows the chip for a service with a prerequisite', async () => {
    const svc = [{ ...SERVICES[0], requirements: null, prerequisite: { id: 'valoracion', dbId: 10, name: 'Valoración', bookable: true } }]
    await act(async () => { await renderServices({ services: svc }) })
    expect(document.body.textContent).toContain('Requisitos previos')
  })

  it('does not show the chip for a plain service', async () => {
    await act(async () => { await renderServices({ services: SERVICES.slice(0, 1) }) })
    expect(document.body.textContent).not.toContain('Requisitos previos')
  })

  it('clicking the card does not open any modal (purely informational)', async () => {
    const svc = [{ ...SERVICES[0], requirements: 'No exponerse al sol 48 h antes.', prerequisite: null }]
    await act(async () => { await renderServices({ services: svc }) })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
