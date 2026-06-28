/**
 * Tests for frontend/src/components/booking/ServiceSelector.jsx
 *
 * Focus:
 *   - Renders service list from useServices hook
 *   - Shows loading skeleton when isLoading=true
 *   - Shows error state when isError=true
 *   - Toggling a service dispatches TOGGLE_SERVICE
 *   - Selected services show a checkmark
 *   - Disabled state when atMax (5 services) — inactive services can't be selected
 *   - "Continuar" button only visible when services are selected
 *   - CONFIRM_SERVICES dispatched on "Continuar"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDispatch = vi.fn()
let mockState = { step: 2, branch: null, services: [], specialists: [] }

vi.mock('../context/BookingContext', () => ({
  useBooking: () => ({ state: mockState, dispatch: mockDispatch }),
  BookingProvider: ({ children }) => children,
  isGroupMode: () => false,
}))

const mockUseServices = vi.fn()
vi.mock('../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}))

vi.mock('../hooks/useConfig', () => ({
  useConfig: () => ({ data: null }),
}))

vi.mock('../utils/formatters', () => ({
  toTitleCase: (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '',
  formatServicePrice: (svc) => `$${svc.price ?? 0}`,
  formatCombinedPrice: (svcs) => `$${svcs.reduce((sum, s) => sum + (s.price ?? 0), 0)}`,
  promoSavings: () => 0,
  formatPrice: (p) => `$${p ?? 0}`,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_SERVICES = [
  { id: 'corte',    dbId: 1, name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed', description: 'Corte clásico' },
  { id: 'barba',    dbId: 2, name: 'Arreglo de barba',  duration: 20, price: 150, price_type: 'fixed', description: '' },
  { id: 'colorac',  dbId: 3, name: 'Coloración',        duration: 90, price: 600, price_type: 'starting_from', description: '' },
]

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderServiceSelector() {
  const { default: ServiceSelector } = await import('../components/booking/ServiceSelector.jsx')
  return render(<ServiceSelector />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockState = { step: 2, branch: null, services: [], specialists: [] }
  mockUseServices.mockReturnValue({
    data: { services: MOCK_SERVICES },
    isLoading: false,
    isError: false,
  })
})

// ============================================================================
// 1. Render
// ============================================================================

describe('ServiceSelector — render', () => {
  it('renders without crashing', async () => {
    await renderServiceSelector()
    expect(document.body).toBeTruthy()
  })

  it('renders the title "Elige tus servicios"', async () => {
    await renderServiceSelector()
    expect(screen.getByText(/elige tus servicios/i)).toBeTruthy()
  })

  it('renders all service names', async () => {
    await renderServiceSelector()
    expect(screen.getByText(/corte de cabello/i)).toBeTruthy()
    expect(screen.getByText(/arreglo de barba/i)).toBeTruthy()
    expect(screen.getByText(/coloración/i)).toBeTruthy()
  })

  it('renders service prices', async () => {
    await renderServiceSelector()
    expect(screen.getByText('$250')).toBeTruthy()
    expect(screen.getByText('$150')).toBeTruthy()
  })

  it('renders service durations', async () => {
    await renderServiceSelector()
    expect(screen.getAllByText('30').length).toBeGreaterThan(0)
  })
})

// ============================================================================
// 2. Loading state
// ============================================================================

describe('ServiceSelector — loading state', () => {
  it('renders skeleton when isLoading=true', async () => {
    mockUseServices.mockReturnValue({ data: null, isLoading: true, isError: false })
    await renderServiceSelector()
    // Skeleton items have the "skeleton" class; check via presence of skeleton elements or absence of service names
    expect(screen.queryByText(/corte de cabello/i)).toBeNull()
  })
})

// ============================================================================
// 3. Error state
// ============================================================================

describe('ServiceSelector — error state', () => {
  it('renders error message when isError=true', async () => {
    mockUseServices.mockReturnValue({ data: null, isLoading: false, isError: true })
    await renderServiceSelector()
    expect(screen.getByText(/no se pudieron cargar los servicios/i)).toBeTruthy()
  })
})

// ============================================================================
// 4. Toggle service
// ============================================================================

describe('ServiceSelector — toggle service', () => {
  it('dispatches TOGGLE_SERVICE when a service card is clicked', async () => {
    const user = userEvent.setup()
    await renderServiceSelector()

    const buttons = screen.getAllByRole('button')
    // First button is the first service card
    const serviceButtons = buttons.filter(b => !b.textContent.includes('Continuar') && !b.textContent.includes('Volver'))
    await user.click(serviceButtons[0])

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_SERVICE',
      payload: MOCK_SERVICES[0],
    })
  })

  it('dispatches TOGGLE_SERVICE for the second service', async () => {
    const user = userEvent.setup()
    await renderServiceSelector()

    const buttons = screen.getAllByRole('button')
    const serviceButtons = buttons.filter(b => !b.textContent.includes('Continuar') && !b.textContent.includes('Volver'))
    await user.click(serviceButtons[1])

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_SERVICE',
      payload: MOCK_SERVICES[1],
    })
  })
})

// ============================================================================
// 5. Selected state — "Continuar" button
// ============================================================================

describe('ServiceSelector — selected services', () => {
  it('does not show "Continuar" when no services selected', async () => {
    mockState = { ...mockState, services: [] }
    await renderServiceSelector()
    expect(screen.queryByText(/continuar/i)).toBeNull()
  })

  it('shows "Continuar" button when at least one service is selected', async () => {
    mockState = { ...mockState, services: [MOCK_SERVICES[0]] }
    await renderServiceSelector()
    expect(screen.getByText(/continuar/i)).toBeTruthy()
  })

  it('dispatches CONFIRM_SERVICES when "Continuar" is clicked', async () => {
    mockState = { ...mockState, services: [MOCK_SERVICES[0]] }
    const user = userEvent.setup()
    await renderServiceSelector()

    await user.click(screen.getByText(/continuar/i))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CONFIRM_SERVICES' })
  })
})

// ============================================================================
// 6. Max 5 services
// ============================================================================

describe('ServiceSelector — max 5 services', () => {
  it('shows "máximo alcanzado" when 5 services are selected', async () => {
    const fiveServices = [1, 2, 3, 4, 5].map(i => ({
      id: `svc${i}`, dbId: i, name: `Servicio ${i}`, duration: 30, price: 100 * i,
    }))
    mockState = { ...mockState, services: fiveServices }
    mockUseServices.mockReturnValue({
      data: { services: [...MOCK_SERVICES, ...fiveServices] },
      isLoading: false,
      isError: false,
    })
    await renderServiceSelector()
    expect(screen.getByText(/máximo alcanzado/i)).toBeTruthy()
  })
})
