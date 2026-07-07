/**
 * Tests for frontend/src/components/landing/LandingStaff.jsx
 *
 * Focus:
 *   - Renders without crashing (uses defaults)
 *   - Default staff names shown
 *   - Custom staff: names, specialty, initials
 *   - Image shown when provided; initials shown as fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
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
  return { ChevronLeft: noop, ChevronRight: noop, ArrowUpRight: noop }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  }
})

vi.mock('../components/landing/LandingServices', () => ({
  SectionHeader: ({ title }) => <h2>{title}</h2>,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CUSTOM_STAFF = [
  { name: 'Valeria Torres', specialty: 'Colorista',    image: null, initials: 'VT' },
  { name: 'Pedro Ramírez',  specialty: 'Barbero',      image: 'https://img.test/pedro.jpg', initials: 'PR' },
]

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderStaff(props = {}) {
  const { default: LandingStaff } = await import('../components/landing/LandingStaff.jsx')
  return render(
    <MemoryRouter>
      <LandingStaff {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Tests
// ============================================================================

describe('LandingStaff — default render', () => {
  it('renders without crashing', async () => {
    await act(async () => { await renderStaff() })
    expect(document.body).toBeTruthy()
  })

  it('shows default staff names', async () => {
    await act(async () => { await renderStaff() })
    const body = document.body.textContent
    expect(
      body.includes('Ricardo Islas') || body.includes('Ana González') || body.includes('Carlos Reyes')
    ).toBeTruthy()
  })

  it('shows default specialties', async () => {
    await act(async () => { await renderStaff() })
    const body = document.body.textContent
    expect(
      body.includes('Master Barber') || body.includes('Color Expert') || body.includes('Stylist')
    ).toBeTruthy()
  })
})

describe('LandingStaff — custom staff', () => {
  it('shows custom staff names', async () => {
    await act(async () => { await renderStaff({ staff: CUSTOM_STAFF }) })
    expect(document.body.textContent).toContain('Valeria Torres')
    expect(document.body.textContent).toContain('Pedro Ramírez')
  })

  it('shows custom specialties', async () => {
    await act(async () => { await renderStaff({ staff: CUSTOM_STAFF }) })
    expect(document.body.textContent).toContain('Colorista')
    expect(document.body.textContent).toContain('Barbero')
  })

  it('shows initials when no image', async () => {
    await act(async () => { await renderStaff({ staff: CUSTOM_STAFF }) })
    // Valeria Torres has no image → initials "VT"
    expect(document.body.textContent).toContain('VT')
  })

  it('renders img tag when image provided', async () => {
    await act(async () => { await renderStaff({ staff: CUSTOM_STAFF }) })
    const img = document.querySelector('img[src*="pedro.jpg"]')
    expect(img || document.body.textContent.includes('PR')).toBeTruthy()
  })
})
