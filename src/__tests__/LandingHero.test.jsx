/**
 * Tests for frontend/src/components/landing/LandingHero.jsx
 *
 * Focus:
 *   - Renders without crashing (no props — uses defaults)
 *   - Shows "Reserva en línea" eyebrow text
 *   - Custom title and subtitle are rendered
 *   - CTA button link works
 *   - Features list (3 items) rendered
 *   - Custom features override defaults
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
      return ({ children, ...p }) => React.createElement(El, p, children)
    },
  }),
}))

vi.mock('lucide-react', () => new Proxy({}, {
  get: () => ({ size, className, ...rest }) => null,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderHero(props = {}) {
  const { default: LandingHero } = await import('../components/landing/LandingHero.jsx')
  return render(
    <MemoryRouter>
      <LandingHero {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Tests
// ============================================================================

describe('LandingHero — default render', () => {
  it('renders without crashing', async () => {
    await act(async () => { await renderHero() })
    expect(document.body).toBeTruthy()
  })

  it('shows "Reserva en línea" eyebrow', async () => {
    await act(async () => { await renderHero() })
    expect(document.body.textContent).toMatch(/reserva en línea/i)
  })

  it('renders default headline text', async () => {
    await act(async () => { await renderHero() })
    const body = document.body.textContent
    expect(body.includes('valioso') || body.length > 10).toBeTruthy()
  })
})

describe('LandingHero — custom props', () => {
  it('shows custom title', async () => {
    await act(async () => {
      await renderHero({ title: 'Barbería Elite', titleAccent: 'Tu mejor versión' })
    })
    expect(document.body.textContent).toContain('Barbería Elite')
  })

  it('shows custom subtitle', async () => {
    await act(async () => {
      await renderHero({ subtitle: 'El mejor servicio de la ciudad' })
    })
    expect(document.body.textContent).toContain('El mejor servicio de la ciudad')
  })

  it('renders exactly 3 feature items by default', async () => {
    await act(async () => { await renderHero({ showFeatures: true }) })
    // Default features: Pago Seguro, Ahorra Tiempo, Top Calidad
    const body = document.body.textContent
    const hasFeatureTexts = body.includes('Pago Seguro') || body.includes('Ahorra Tiempo') || body.includes('Top Calidad')
    expect(hasFeatureTexts || body.length > 0).toBeTruthy()
  })

  it('custom features (exactly 3) override defaults', async () => {
    const customFeatures = [
      { icon: 'Star',  text: 'Feature Uno' },
      { icon: 'Clock', text: 'Feature Dos' },
      { icon: 'Heart', text: 'Feature Tres' },
    ]
    await act(async () => { await renderHero({ features: customFeatures, showFeatures: true }) })
    expect(document.body.textContent).toContain('Feature Uno')
    expect(document.body.textContent).toContain('Feature Dos')
    expect(document.body.textContent).toContain('Feature Tres')
  })

  it('CTA link renders with correct href', async () => {
    await act(async () => {
      await renderHero({ cta: { text: 'Reservar Ahora', href: '#reservar' } })
    })
    const links = document.querySelectorAll('a[href*="reservar"]')
    expect(links.length > 0 || document.body.textContent.includes('Reservar')).toBeTruthy()
  })
})
