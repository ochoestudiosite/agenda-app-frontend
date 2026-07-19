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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
  useServices: (...args) => mockUseServices(...args),
}))

vi.mock('../hooks/useConfig', () => ({
  useConfig: () => ({ data: null }),
}))

vi.mock('../utils/formatters', () => ({
  toTitleCase: (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '',
  formatServicePrice: (svc) => `$${svc.price ?? 0}`,
  formatCombinedPrice: (svcs) => `$${svcs.reduce((sum, s) => sum + (s.price ?? 0), 0)}`,
  promoSavings: () => 0,
  promoEndsLabel: () => null,
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
// Fixtures — Requisitos previos (requirements / prerequisite)
// ---------------------------------------------------------------------------

const PREREQ_SERVICE = {
  id: 'valoracion', dbId: 10, name: 'Valoración', duration: 15, price: 0, price_type: 'fixed', description: '',
  requirements: null, prerequisite: null,
}

const FLAGGED_WITH_PREREQ = {
  id: 'botox', dbId: 11, name: 'Botox', duration: 30, price: 1200, price_type: 'fixed', description: '',
  requirements: null,
  prerequisite: { id: 'valoracion', dbId: 10, name: 'Valoración', bookable: true },
}

const FLAGGED_TEXT_ONLY = {
  id: 'laser', dbId: 12, name: 'Depilación láser', duration: 45, price: 800, price_type: 'fixed', description: '',
  requirements: 'No exponerse al sol 48 horas antes.',
  prerequisite: null,
}

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
// 4b. ARIA state — aria-pressed (selected) / aria-disabled (max reached)
// ============================================================================

describe('ServiceSelector — ARIA state', () => {
  it('marks the selected service card with aria-pressed="true" and others "false"', async () => {
    mockState = { ...mockState, services: [MOCK_SERVICES[0]] }
    await renderServiceSelector()

    const selectedCard = screen.getByText(/corte de cabello/i).closest('[role="button"]')
    const otherCard = screen.getByText(/arreglo de barba/i).closest('[role="button"]')
    expect(selectedCard).toHaveAttribute('aria-pressed', 'true')
    expect(otherCard).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks unselected cards as aria-disabled once the 5-service max is reached', async () => {
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

    const untouchedCard = screen.getByText(/corte de cabello/i).closest('[role="button"]')
    const selectedCard = screen.getByText(/^Servicio 1$/).closest('[role="button"]')
    expect(untouchedCard).toHaveAttribute('aria-disabled', 'true')
    expect(selectedCard).toHaveAttribute('aria-disabled', 'false')
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

// ============================================================================
// 7. Promo badge — regression: fixed_amount must show the discounted amount,
// not a bare "Promo" label (was reimplemented inline instead of reusing
// PromoBadge from ui/PromoPrice, and diverged for the fixed_amount branch).
// ============================================================================

// ============================================================================
// 8. Sucursal scoping — useServices is called with the context's branch id
// ============================================================================

describe('ServiceSelector — sucursal scoping', () => {
  it('calls useServices() with no branchId when no sucursal is selected', async () => {
    mockState = { ...mockState, branch: null }
    await renderServiceSelector()
    expect(mockUseServices).toHaveBeenCalledWith(undefined)
  })

  it('calls useServices(branch.id) when a sucursal is selected', async () => {
    mockState = { ...mockState, branch: { id: 20, name: 'Sucursal Norte' } }
    await renderServiceSelector()
    expect(mockUseServices).toHaveBeenCalledWith(20)
  })
})

describe('ServiceSelector — promo badge', () => {
  it('percent promo shows "−X%"', async () => {
    mockUseServices.mockReturnValue({
      data: { services: [{ ...MOCK_SERVICES[0], promo: { discountType: 'percent', discountValue: 20, discountAmount: 50, finalPrice: 200 } }] },
      isLoading: false,
      isError: false,
    })
    await renderServiceSelector()
    expect(screen.getByText('−20%')).toBeTruthy()
  })

  it('fixed_amount promo shows the discounted amount, not a bare "Promo" label', async () => {
    mockUseServices.mockReturnValue({
      data: { services: [{ ...MOCK_SERVICES[0], promo: { discountType: 'fixed_amount', discountValue: 100, discountAmount: 100, finalPrice: 150 } }] },
      isLoading: false,
      isError: false,
    })
    await renderServiceSelector()
    expect(screen.getByText('−$100')).toBeTruthy()
    expect(screen.queryByText(/^Promo$/)).toBeNull()
  })

  it('no promo: no badge rendered', async () => {
    await renderServiceSelector()
    expect(screen.queryByText(/^−/)).toBeNull()
  })
})

// ============================================================================
// 9. Requisitos previos — chip + RequirementsModal interception
// ============================================================================

describe('ServiceSelector — chip "Requisitos previos"', () => {
  beforeEach(() => {
    mockUseServices.mockReturnValue({
      data: { services: [...MOCK_SERVICES, PREREQ_SERVICE, FLAGGED_WITH_PREREQ, FLAGGED_TEXT_ONLY] },
      isLoading: false,
      isError: false,
    })
  })

  it('shows the chip on a flagged service card', async () => {
    await renderServiceSelector()
    const card = screen.getByText(/depilación láser/i).closest('[role="button"]')
    expect(card.textContent).toMatch(/Requisitos previos/)
  })

  it('does not show the chip on a service without requirements/prerequisite', async () => {
    await renderServiceSelector()
    const card = screen.getByText(/corte de cabello/i).closest('[role="button"]')
    expect(card.textContent).not.toMatch(/Requisitos previos/)
  })
})

describe('ServiceSelector — RequirementsModal interception (add only)', () => {
  beforeEach(() => {
    mockUseServices.mockReturnValue({
      data: { services: [...MOCK_SERVICES, PREREQ_SERVICE, FLAGGED_WITH_PREREQ, FLAGGED_TEXT_ONLY] },
      isLoading: false,
      isError: false,
    })
  })

  it('selecting a flagged service opens the modal without dispatching yet', async () => {
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/depilación láser/i).closest('[role="button"]')
    await user.click(card)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('"Entendido, continuar" adds a text-only flagged service', async () => {
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/depilación láser/i).closest('[role="button"]')
    await user.click(card)
    await user.click(screen.getByRole('button', { name: 'Entendido, continuar' }))
    expect(mockDispatch).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SERVICE', payload: FLAGGED_TEXT_ONLY })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('"Ya cumplo el requisito — continuar" adds the original service (has prerequisite)', async () => {
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/^Botox$/i).closest('[role="button"]')
    await user.click(card)
    await user.click(screen.getByRole('button', { name: /Ya cumplo el requisito — continuar/i }))
    expect(mockDispatch).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SERVICE', payload: FLAGGED_WITH_PREREQ })
  })

  it('"Reservar X primero" adds the prerequisite object, not the original service', async () => {
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/^Botox$/i).closest('[role="button"]')
    await user.click(card)
    await user.click(screen.getByRole('button', { name: /Reservar Valoración primero/i }))
    expect(mockDispatch).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SERVICE', payload: PREREQ_SERVICE })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not chain into the prerequisite\'s own modal, even if it is also flagged', async () => {
    const flaggedPrereq = { ...PREREQ_SERVICE, requirements: 'Debe llegar 10 min antes.' }
    mockUseServices.mockReturnValue({
      data: {
        services: [
          ...MOCK_SERVICES,
          flaggedPrereq,
          { ...FLAGGED_WITH_PREREQ, prerequisite: { id: flaggedPrereq.id, dbId: flaggedPrereq.dbId, name: flaggedPrereq.name, bookable: true } },
        ],
      },
      isLoading: false,
      isError: false,
    })
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/^Botox$/i).closest('[role="button"]')
    await user.click(card)
    await user.click(screen.getByRole('button', { name: /Reservar Valoración primero/i }))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SERVICE', payload: flaggedPrereq })
    // No modal chained for flaggedPrereq's own requirements text.
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('canceling the modal does not dispatch anything', async () => {
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/depilación láser/i).closest('[role="button"]')
    await user.click(card)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('selecting a service without requirements adds it directly, no modal', async () => {
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/corte de cabello/i).closest('[role="button"]')
    await user.click(card)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICES[0] })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('removing an already-selected flagged service never opens the modal', async () => {
    mockState = { ...mockState, services: [FLAGGED_TEXT_ONLY] }
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/depilación láser/i).closest('[role="button"]')
    await user.click(card)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SERVICE', payload: FLAGGED_TEXT_ONLY })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hides "Reservar X primero" once 5 services are already selected (would no-op)', async () => {
    const fiveServices = [1, 2, 3, 4, 5].map(i => ({ id: `svc${i}`, dbId: 100 + i, name: `Servicio ${i}`, duration: 30, price: 100 }))
    mockState = { ...mockState, services: fiveServices }
    mockUseServices.mockReturnValue({
      data: { services: [...fiveServices, FLAGGED_WITH_PREREQ, PREREQ_SERVICE] },
      isLoading: false,
      isError: false,
    })
    const user = userEvent.setup()
    await renderServiceSelector()
    const card = screen.getByText(/^Botox$/i).closest('[role="button"]')
    await user.click(card)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Entendido, continuar' })).toBeTruthy()
    expect(screen.queryByText(/primero/i)).toBeNull()
  })
})
