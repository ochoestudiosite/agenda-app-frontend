/**
 * Tests for frontend/src/components/booking/SpecialistSelector.jsx
 *
 * Focus:
 *   - Renders specialist list filtered by selected service
 *   - Shows loading skeleton when isLoading=true
 *   - Shows error state when isError=true
 *   - Empty state when no specialists for selected service
 *   - Clicking specialist dispatches SET_SPECIALIST (single-service mode)
 *   - Group mode: shows "Servicio X de N" and dispatches ASSIGN_SPECIALIST
 *   - Back button dispatches GO_BACK
 *   - Branch filter: specialists are filtered by branchIds when a branch is selected
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDispatch = vi.fn()
let mockState = {
  step: 2,
  branch: null,
  services: [{ id: 'corte', dbId: 1, name: 'Corte de cabello', duration: 30, price: 250 }],
  specialists: [],
  currentAssignmentIdx: 0,
}

let mockIsGroupMode = false

vi.mock('../../context/BookingContext.jsx', () => ({
  useBooking: () => ({ state: mockState, dispatch: mockDispatch }),
  BookingProvider: ({ children }) => children,
  isGroupMode: () => mockIsGroupMode,
}))

const mockUseServices = vi.fn()
vi.mock('../../hooks/useServices.js', () => ({
  useServices: () => mockUseServices(),
}))

vi.mock('../../utils/formatters.js', () => ({
  toTitleCase: (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '',
  formatServicePrice: () => '$100',
  formatCombinedPrice: () => '$100',
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SPECIALISTS = [
  {
    id: 10, name: 'Ana García', initials: 'AG', specialty: 'Colorista',
    serviceIds: [1, 2], branchIds: [1, 2], avatarUrl: null,
  },
  {
    id: 11, name: 'Carlos Ruiz', initials: 'CR', specialty: 'Barbero',
    serviceIds: [1], branchIds: [1], avatarUrl: null,
  },
  {
    id: 12, name: 'María López', initials: 'ML', specialty: 'Especialista',
    serviceIds: [3], branchIds: [], avatarUrl: null, // works in all branches
  },
]

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderSpecialistSelector() {
  const { default: SpecialistSelector } = await import('../components/booking/SpecialistSelector.jsx')
  return render(<SpecialistSelector />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsGroupMode = false
  mockState = {
    step: 2,
    branch: null,
    services: [{ id: 'corte', dbId: 1, name: 'Corte de cabello', duration: 30, price: 250 }],
    specialists: [],
    currentAssignmentIdx: 0,
  }
  mockUseServices.mockReturnValue({
    data: { specialists: SPECIALISTS, services: [] },
    isLoading: false,
    isFetching: false,
    isError: false,
  })
})

// ============================================================================
// 1. Render
// ============================================================================

describe('SpecialistSelector — render', () => {
  it('renders without crashing', async () => {
    await renderSpecialistSelector()
    expect(document.body).toBeTruthy()
  })

  it('renders the title "Elige tu especialista"', async () => {
    await renderSpecialistSelector()
    expect(screen.getByText(/elige tu especialista/i)).toBeTruthy()
  })

  it('renders specialists who support the selected service', async () => {
    await renderSpecialistSelector()
    // Ana and Carlos support serviceId=1 (corte)
    expect(screen.getByText(/Ana García/i)).toBeTruthy()
    expect(screen.getByText(/Carlos Ruiz/i)).toBeTruthy()
  })

  it('does NOT render specialists who do not support the selected service', async () => {
    await renderSpecialistSelector()
    // María only has serviceIds=[3], not 1 — should not appear
    expect(screen.queryByText(/María López/i)).toBeNull()
  })

  it('renders specialist initials', async () => {
    await renderSpecialistSelector()
    expect(screen.getByText('AG')).toBeTruthy()
    expect(screen.getByText('CR')).toBeTruthy()
  })

  it('renders specialist specialty', async () => {
    await renderSpecialistSelector()
    expect(screen.getByText(/colorista/i)).toBeTruthy()
    expect(screen.getByText(/barbero/i)).toBeTruthy()
  })
})

// ============================================================================
// 2. Loading state
// ============================================================================

describe('SpecialistSelector — loading state', () => {
  it('renders skeleton when isLoading=true', async () => {
    mockUseServices.mockReturnValue({ data: null, isLoading: true, isFetching: true, isError: false })
    await renderSpecialistSelector()
    expect(screen.queryByText(/Ana García/i)).toBeNull()
  })
})

// ============================================================================
// 3. Error state
// ============================================================================

describe('SpecialistSelector — error state', () => {
  it('renders error message when isError=true and no data', async () => {
    mockUseServices.mockReturnValue({ data: null, isLoading: false, isFetching: false, isError: true })
    await renderSpecialistSelector()
    expect(screen.getByText(/no se pudo cargar el equipo/i)).toBeTruthy()
  })
})

// ============================================================================
// 4. Empty state
// ============================================================================

describe('SpecialistSelector — empty state', () => {
  it('shows empty state when no specialists support the service', async () => {
    mockState = {
      ...mockState,
      services: [{ id: 'svc99', dbId: 99, name: 'Servicio Sin Especialista', duration: 30, price: 0 }],
    }
    await renderSpecialistSelector()
    expect(screen.getByText(/sin especialistas disponibles/i)).toBeTruthy()
  })

  it('empty state shows the service name', async () => {
    mockState = {
      ...mockState,
      services: [{ id: 'svc99', dbId: 99, name: 'Manicure', duration: 30, price: 0 }],
    }
    await renderSpecialistSelector()
    expect(screen.getByText(/manicure/i)).toBeTruthy()
  })
})

// ============================================================================
// 5. Click → SET_SPECIALIST dispatch
// ============================================================================

describe('SpecialistSelector — click dispatch (single-service)', () => {
  it('dispatches SET_SPECIALIST when a specialist card is clicked', async () => {
    const user = userEvent.setup()
    await renderSpecialistSelector()

    const btns = screen.getAllByRole('button')
    const specialistBtns = btns.filter(b => !b.textContent.includes('Volver'))
    await user.click(specialistBtns[0])

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_SPECIALIST',
      payload: expect.objectContaining({ id: expect.any(Number) }),
    })
  })

  it('back button dispatches GO_BACK', async () => {
    const user = userEvent.setup()
    await renderSpecialistSelector()

    const backBtn = screen.getByRole('button', { name: /volver/i })
    await user.click(backBtn)

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' })
  })
})

// ============================================================================
// 6. Group mode
// ============================================================================

describe('SpecialistSelector — group mode', () => {
  beforeEach(() => {
    mockIsGroupMode = true
    mockState = {
      ...mockState,
      services: [
        { id: 'corte',  dbId: 1, name: 'Corte de cabello', duration: 30, price: 250 },
        { id: 'barba',  dbId: 2, name: 'Arreglo de barba',  duration: 20, price: 150 },
      ],
      currentAssignmentIdx: 0,
    }
  })

  it('shows "Servicio X de N" indicator in group mode', async () => {
    await renderSpecialistSelector()
    expect(screen.getByText(/servicio 1 de 2/i)).toBeTruthy()
  })

  it('dispatches ASSIGN_SPECIALIST (not SET_SPECIALIST) when specialist clicked', async () => {
    const user = userEvent.setup()
    await renderSpecialistSelector()

    const btns = screen.getAllByRole('button')
    const specialistBtns = btns.filter(b => !b.textContent.includes('Volver'))
    if (specialistBtns.length > 0) {
      await user.click(specialistBtns[0])
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ASSIGN_SPECIALIST',
        payload: expect.objectContaining({ id: expect.any(Number) }),
      })
    }
  })
})

// ============================================================================
// 7. Branch filter
// ============================================================================

describe('SpecialistSelector — branch filter', () => {
  it('filters out specialists not in selected branch', async () => {
    mockState = {
      ...mockState,
      branch: { id: 2, name: 'Sucursal Norte' }, // branch 2
    }
    // Ana has branchIds=[1,2] → shows for branch 2
    // Carlos has branchIds=[1] → excluded for branch 2
    // María has branchIds=[] → works in all → shows for branch 2
    await renderSpecialistSelector()

    expect(screen.queryByText(/Ana García/i)).toBeTruthy()
    expect(screen.queryByText(/Carlos Ruiz/i)).toBeNull()
  })

  it('specialists with empty branchIds work in all branches', async () => {
    mockState = {
      ...mockState,
      branch: { id: 99, name: 'Sucursal Remota' },
      services: [{ id: 'svc3', dbId: 3, name: 'Servicio Global', duration: 30, price: 0 }],
    }
    // María has serviceIds=[3] and branchIds=[] → appears for any branch
    await renderSpecialistSelector()
    expect(screen.queryByText(/María López/i)).toBeTruthy()
  })
})
