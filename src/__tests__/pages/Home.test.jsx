/**
 * Tests for F-002/F-003/F-004: Home.jsx must use centralized hooks
 *
 * Verifies that:
 *   - Home renders data from useConfig(), useServices() (no manual useQuery)
 *   - Services list from useServices().data.services is rendered
 *   - Staff list from useServices().data.specialists is rendered
 *   - 403/404 config error shows "Este negocio no está disponible"
 *   - Generic network error shows the retry screen
 *   - Loading state shows LandingSkeleton
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

// ── Mocks must come before any component import ───────────────────────────────
// Paths are relative to THIS file (src/__tests__/pages/)

vi.mock('../../hooks/useConfig', () => ({
  useConfig: vi.fn(),
}))

vi.mock('../../hooks/useServices', () => ({
  useServices: vi.fn(),
}))

vi.mock('../../hooks/useSpecialists', () => ({
  useSpecialists: vi.fn(() => ({ data: null, isLoading: false })),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
    MemoryRouter: actual.MemoryRouter,
  }
})

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggle: vi.fn() }),
}))

vi.mock('../../components/landing/LandingNavbar',       () => ({ default: ({ businessName }) => <div data-testid="navbar">{businessName}</div> }))
vi.mock('../../components/landing/LandingHero',         () => ({ default: () => <div data-testid="hero" /> }))
vi.mock('../../components/landing/LandingServices',     () => ({ default: ({ services }) => <div data-testid="landing-services">{services?.map(s => <span key={s.id}>{s.name}</span>)}</div> }))
vi.mock('../../components/landing/LandingStaff',        () => ({ default: ({ staff }) => <div data-testid="landing-staff">{staff?.map(s => <span key={s.id}>{s.name}</span>)}</div> }))
vi.mock('../../components/landing/LandingTestimonials', () => ({ default: () => <div data-testid="testimonials" /> }))
vi.mock('../../components/landing/LandingLocation',     () => ({ default: () => <div data-testid="location" /> }))
vi.mock('../../components/landing/LandingContact',      () => ({ default: () => <div data-testid="contact" /> }))
vi.mock('../../components/landing/LandingSkeleton',     () => ({ default: () => <div data-testid="skeleton" /> }))
vi.mock('../../components/landing/LandingBottomBar',    () => ({ default: () => <div data-testid="bottombar" /> }))

vi.mock('../../utils/originUtils', () => ({
  isAllowedAdminOrigin: () => false,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SERVICES = [
  { id: 1, name: 'Corte', duration: 30, price: 100, price_type: 'fixed' },
  { id: 2, name: 'Tinte', duration: 60, price: 200, price_type: 'fixed' },
]
const SPECIALISTS = [
  { id: 10, name: 'Ana García' },
  { id: 11, name: 'Luis Pérez' },
]
const CONFIG = {
  business_name: 'Barber Test',
  features: { landing_enabled: true },
  hours: {},
  branches: [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function renderHome() {
  const { default: Home } = await import('../../pages/Home.jsx')
  return render(
    <React.StrictMode>
      <Home />
    </React.StrictMode>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Home — usa hooks centralizados (F-002/F-003/F-004)', () => {
  let useConfig, useServices

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ useConfig }   = await import('../../hooks/useConfig'))
    ;({ useServices } = await import('../../hooks/useServices'))
  })

  it('renderiza la página cuando useConfig y useServices retornan datos', async () => {
    useConfig.mockReturnValue({ data: CONFIG, isLoading: false, isError: false, error: null })
    useServices.mockReturnValue({ data: { services: SERVICES, specialists: SPECIALISTS }, isLoading: false })

    await act(async () => { await renderHome() })

    expect(screen.getByTestId('navbar')).toBeTruthy()
    expect(screen.getByTestId('hero')).toBeTruthy()
  })

  it('pasa los servicios de useServices().data.services a LandingServices', async () => {
    useConfig.mockReturnValue({ data: CONFIG, isLoading: false, isError: false, error: null })
    useServices.mockReturnValue({ data: { services: SERVICES, specialists: SPECIALISTS }, isLoading: false })

    await act(async () => { await renderHome() })

    const landingServices = screen.getByTestId('landing-services')
    expect(landingServices.textContent).toContain('Corte')
    expect(landingServices.textContent).toContain('Tinte')
  })

  it('pasa el staff de useServices().data.specialists a LandingStaff', async () => {
    useConfig.mockReturnValue({ data: CONFIG, isLoading: false, isError: false, error: null })
    useServices.mockReturnValue({ data: { services: SERVICES, specialists: SPECIALISTS }, isLoading: false })

    await act(async () => { await renderHome() })

    const landingStaff = screen.getByTestId('landing-staff')
    expect(landingStaff.textContent).toContain('Ana García')
    expect(landingStaff.textContent).toContain('Luis Pérez')
  })

  it('muestra LandingSkeleton mientras carga', async () => {
    useConfig.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null })
    useServices.mockReturnValue({ data: undefined, isLoading: true })

    await act(async () => { await renderHome() })

    expect(screen.getByTestId('skeleton')).toBeTruthy()
  })

  it('muestra pantalla de "negocio no disponible" en error 403', async () => {
    const err = new Error('Forbidden')
    err.status = 403
    useConfig.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: err })
    useServices.mockReturnValue({ data: undefined, isLoading: false })

    await act(async () => { await renderHome() })

    expect(document.body.textContent).toMatch(/negocio no está disponible/i)
    expect(screen.queryByTestId('skeleton')).toBeNull()
  })

  it('muestra pantalla de "negocio no disponible" en error 404', async () => {
    const err = new Error('Not Found')
    err.status = 404
    useConfig.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: err })
    useServices.mockReturnValue({ data: undefined, isLoading: false })

    await act(async () => { await renderHome() })

    expect(document.body.textContent).toMatch(/negocio no está disponible/i)
  })

  it('muestra pantalla de reintento en error genérico (sin código de status)', async () => {
    const err = new Error('Network Error')
    useConfig.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: err })
    useServices.mockReturnValue({ data: undefined, isLoading: false })

    await act(async () => { await renderHome() })

    expect(document.body.textContent).toMatch(/no se pudo cargar/i)
    expect(document.body.textContent).toMatch(/reintentar/i)
  })

  it('NO renderiza el botón de reintento cuando el error es 403', async () => {
    const err = new Error('Forbidden')
    err.status = 403
    useConfig.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: err })
    useServices.mockReturnValue({ data: undefined, isLoading: false })

    await act(async () => { await renderHome() })

    expect(screen.queryByText(/reintentar/i)).toBeNull()
  })

  it('redirige a /agendar cuando landing_enabled es false', async () => {
    const cfg = { ...CONFIG, features: { landing_enabled: false } }
    useConfig.mockReturnValue({ data: cfg, isLoading: false, isError: false, error: null })
    useServices.mockReturnValue({ data: { services: [], specialists: [] }, isLoading: false })

    await act(async () => { await renderHome() })

    const nav = screen.getByTestId('navigate')
    expect(nav.getAttribute('data-to')).toBe('/agendar')
  })

  it('muestra el businessName en el navbar', async () => {
    useConfig.mockReturnValue({ data: CONFIG, isLoading: false, isError: false, error: null })
    useServices.mockReturnValue({ data: { services: SERVICES, specialists: SPECIALISTS }, isLoading: false })

    await act(async () => { await renderHome() })

    expect(screen.getByTestId('navbar').textContent).toContain('Barber Test')
  })
})
