/**
 * Tests for frontend/src/components/landing/LandingNavbar.jsx
 *
 * Focus — nav link visibility driven by `config`:
 *   - Servicios/Equipo/Ubicación links show by default (config = {})
 *   - Testimoniales link is hidden by default (section itself is opt-in and
 *     is not rendered on the page unless explicitly enabled — a visible nav
 *     link pointing to a non-existent #testimoniales anchor would be a dead link)
 *   - Testimoniales link appears once explicitly enabled (visible: true)
 *   - A section explicitly disabled (visible: false) is hidden from the nav
 *   - Business name / CTA button basics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => {
      const El = tag === 'default' ? 'div' : tag
      return ({ children, ...p }) => React.createElement(El, p, children)
    },
  }),
  AnimatePresence: ({ children }) => children,
}))

vi.mock('lucide-react', () => {
  const noop = () => null
  return {
    Menu: noop, X: noop, Calendar: noop, ArrowUpRight: noop, Sun: noop, Moon: noop,
    Scissors: noop, Coffee: noop, Heart: noop, Star: noop, Smile: noop,
    Crown: noop, Anchor: noop, Gem: noop, Zap: noop, Gift: noop,
    ShieldCheck: noop, Clock: noop, Mail: noop, MapPin: noop, Phone: noop, Sparkles: noop, Briefcase: noop,
  }
})

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggle: vi.fn() }),
}))

async function renderNavbar(props = {}) {
  const { default: LandingNavbar } = await import('../components/landing/LandingNavbar.jsx')
  return render(
    <MemoryRouter>
      <LandingNavbar {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LandingNavbar — nav link visibility (config-driven)', () => {
  it('shows Servicios/Equipo/Ubicación links by default (config = {})', async () => {
    await act(async () => { await renderNavbar({ config: {} }) })
    const body = document.body.textContent
    expect(body).toContain('Servicios')
    expect(body).toContain('Equipo')
    expect(body).toContain('Ubicación')
  })

  it('hides the Testimoniales link by default — matches the section itself being hidden on the page', async () => {
    await act(async () => { await renderNavbar({ config: {} }) })
    expect(document.body.textContent).not.toContain('Testimoniales')
  })

  it('shows the Testimoniales link once explicitly enabled (visible: true)', async () => {
    await act(async () => {
      await renderNavbar({ config: { testimonials_section: { visible: true } } })
    })
    expect(document.body.textContent).toContain('Testimoniales')
  })

  it('hides Testimoniales link when explicitly set to visible: false', async () => {
    await act(async () => {
      await renderNavbar({ config: { testimonials_section: { visible: false } } })
    })
    expect(document.body.textContent).not.toContain('Testimoniales')
  })

  it('hides Servicios link when explicitly disabled (visible: false)', async () => {
    await act(async () => {
      await renderNavbar({ config: { services_section: { visible: false } } })
    })
    expect(document.body.textContent).not.toContain('Servicios')
  })
})

describe('LandingNavbar — business name and CTA', () => {
  it('shows businessName fallback', async () => {
    await act(async () => { await renderNavbar({ businessName: 'Barbería del Sol', config: {} }) })
    expect(document.body.textContent).toContain('Barbería del Sol')
  })

  it('config.navbar.business_name overrides businessName prop', async () => {
    await act(async () => {
      await renderNavbar({ businessName: 'Empresa Inc.', config: { navbar: { business_name: 'Mi Salón' } } })
    })
    expect(document.body.textContent).toContain('Mi Salón')
  })

  it('shows CTA button text by default', async () => {
    await act(async () => { await renderNavbar({ config: {} }) })
    expect(document.body.textContent).toContain('Reservar')
  })

  it('hides CTA when show_cta is false', async () => {
    await act(async () => {
      await renderNavbar({ config: { navbar: { show_cta: false } } })
    })
    expect(document.body.textContent).not.toContain('Reservar')
  })
})
