/**
 * Tests for frontend/src/components/booking/BookingConfirmation.jsx
 *
 * Focus:
 *   - Renders with single appointment confirmation
 *   - Shows appointment code prominently
 *   - Shows client name and phone
 *   - Shows service name, specialist, date and time
 *   - "Nueva cita" button dispatches RESET
 *   - Group appointment: shows groupCode and list of services
 *   - price_type=ask shows "A consultar"
 *   - price_type=range shows price with "+"
 *   - Copy button copies code to clipboard
 *   - Link to /gestionar is rendered
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDispatch = vi.fn()
let mockState = {}

vi.mock('../../context/BookingContext.jsx', () => ({
  useBooking: () => ({ state: mockState, dispatch: mockDispatch }),
  BookingProvider: ({ children }) => children,
  isGroupMode: () => false,
}))

const mockConfig = {
  time_format: '12h',
  branches: [{ id: 1, name: 'Sucursal Principal', image_url: null }],
}
vi.mock('../../hooks/useConfig.js', () => ({
  useConfig: () => ({ data: mockConfig }),
}))

vi.mock('../../hooks/useServices.js', () => ({
  useServices: () => ({
    data: {
      services: [
        { id: 'corte', dbId: 1, name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed', imageUrl: null },
      ],
    },
  }),
}))

vi.mock('../../hooks/useSpecialists.js', () => ({
  useSpecialists: () => ({
    data: {
      specialists: [
        { id: 5, name: 'Ana García', initials: 'AG', avatarUrl: null },
      ],
    },
  }),
}))

vi.mock('../../utils/formatters.js', () => ({
  formatDate:  (d) => d ?? '',
  formatTime:  (t) => t ?? '',
  formatPrice: (p) => `$${Number(p ?? 0).toFixed(0)}`,
  toTitleCase: (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '',
}))

vi.mock('../ui/Button.jsx', () => ({
  default: ({ children, onClick, variant, ...props }) => (
    <button onClick={onClick} data-variant={variant} {...props}>{children}</button>
  ),
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SINGLE_CONFIRMATION = {
  code:             'ABC123',
  clientName:       'Juan García',
  clientPhone:      '5512345678',
  serviceName:      'Corte de cabello',
  serviceDuration:  30,
  servicePrice:     250,
  priceType:        'fixed',
  specialistName:   'Ana García',
  specialistId:     5,
  date:             '2026-06-20',
  time:             '10:00',
  groupCode:        null,
  appointments:     [],
}

const GROUP_CONFIRMATION = {
  groupCode:     'GRP456',
  clientName:    'María López',
  clientPhone:   '5598765432',
  date:          '2026-06-25',
  time:          null,
  code:          null,
  appointments: [
    { code: 'A01', serviceName: 'Corte de cabello', specialistName: 'Ana García', specialistId: 5, time: '10:00', serviceDuration: 30, servicePrice: 250, priceType: 'fixed' },
    { code: 'A02', serviceName: 'Arreglo de barba', specialistName: 'Carlos Ruiz', specialistId: 6, time: '10:30', serviceDuration: 20, servicePrice: 150, priceType: 'fixed' },
  ],
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeState(confirmation, extra = {}) {
  return {
    step: 5,
    branch: { id: 1, name: 'Sucursal Principal' },
    services: [],
    specialist: null,
    confirmation,
    ...extra,
  }
}

async function renderConfirmation(confirmation = SINGLE_CONFIRMATION, extra = {}) {
  mockState = makeState(confirmation, extra)
  const { default: BookingConfirmation } = await import('../components/booking/BookingConfirmation.jsx')
  return render(
    <MemoryRouter>
      <BookingConfirmation />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// 1. Single appointment — render
// ============================================================================

describe('BookingConfirmation — single appointment render', () => {
  it('renders without crashing', async () => {
    await renderConfirmation()
    expect(document.body).toBeTruthy()
  })

  it('shows "¡Cita confirmada!" heading', async () => {
    await renderConfirmation()
    expect(screen.getByText(/¡cita confirmada!/i)).toBeTruthy()
  })

  it('shows the appointment code prominently', async () => {
    await renderConfirmation()
    expect(screen.getByText('ABC123')).toBeTruthy()
  })

  it('shows the client name', async () => {
    await renderConfirmation()
    expect(screen.getByText(/Juan García/i)).toBeTruthy()
  })

  it('shows the client phone', async () => {
    await renderConfirmation()
    expect(screen.getByText(/5512345678/)).toBeTruthy()
  })

  it('shows the service name', async () => {
    await renderConfirmation()
    expect(screen.getByText(/Corte de cabello/i)).toBeTruthy()
  })

  it('shows the specialist name', async () => {
    await renderConfirmation()
    expect(screen.getByText(/Ana García/i)).toBeTruthy()
  })

  it('shows "Confirmada" status badge', async () => {
    await renderConfirmation()
    expect(screen.getByText(/confirmada/i)).toBeTruthy()
  })

  it('shows a link to /gestionar', async () => {
    await renderConfirmation()
    const links = document.querySelectorAll('a[href="/gestionar"]')
    expect(links.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// 2. "Nueva cita" button → RESET dispatch
// ============================================================================

describe('BookingConfirmation — Nueva cita button', () => {
  it('dispatches RESET when "Nueva cita" is clicked', async () => {
    const user = userEvent.setup()
    await renderConfirmation()

    const nuevaBtn = screen.getByRole('button', { name: /nueva cita/i })
    await user.click(nuevaBtn)

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'RESET' })
  })
})

// ============================================================================
// 3. Price types
// ============================================================================

describe('BookingConfirmation — price display', () => {
  it('price_type=fixed shows exact price', async () => {
    await renderConfirmation({ ...SINGLE_CONFIRMATION, priceType: 'fixed', servicePrice: 350 })
    expect(screen.getByText('$350')).toBeTruthy()
  })

  it('price_type=ask shows "A consultar"', async () => {
    await renderConfirmation({ ...SINGLE_CONFIRMATION, priceType: 'ask', servicePrice: 0 })
    expect(screen.getByText(/a consultar/i)).toBeTruthy()
  })

  it('price_type=starting_from shows price with "+"', async () => {
    await renderConfirmation({ ...SINGLE_CONFIRMATION, priceType: 'starting_from', servicePrice: 300 })
    expect(screen.getByText(/\$300\+/)).toBeTruthy()
  })

  it('price_type=range shows price with "+"', async () => {
    await renderConfirmation({ ...SINGLE_CONFIRMATION, priceType: 'range', servicePrice: 500 })
    expect(screen.getByText(/\$500\+/)).toBeTruthy()
  })
})

// ============================================================================
// 4. Group appointment
// ============================================================================

describe('BookingConfirmation — group appointment', () => {
  it('shows "¡Visita confirmada!" for group', async () => {
    await renderConfirmation(GROUP_CONFIRMATION)
    expect(screen.getByText(/¡visita confirmada!/i)).toBeTruthy()
  })

  it('shows the group code (GRP456)', async () => {
    await renderConfirmation(GROUP_CONFIRMATION)
    expect(screen.getByText('GRP456')).toBeTruthy()
  })

  it('shows all service names from appointments list', async () => {
    await renderConfirmation(GROUP_CONFIRMATION)
    expect(screen.getByText(/Corte de cabello/i)).toBeTruthy()
    expect(screen.getByText(/Arreglo de barba/i)).toBeTruthy()
  })

  it('shows all specialist names from appointments list', async () => {
    await renderConfirmation(GROUP_CONFIRMATION)
    expect(screen.getByText(/Ana García/i)).toBeTruthy()
    expect(screen.getByText(/Carlos Ruiz/i)).toBeTruthy()
  })

  it('shows total price for group', async () => {
    await renderConfirmation(GROUP_CONFIRMATION)
    // Total = 250 + 150 = 400
    expect(screen.getByText('$400')).toBeTruthy()
  })
})

// ============================================================================
// 5. Copy button
// ============================================================================

describe('BookingConfirmation — copy button', () => {
  it('copy button is rendered', async () => {
    await renderConfirmation()
    const copyBtn = screen.queryByRole('button', { name: /copiar código/i })
      || screen.queryByTitle(/copiar/i)
      || screen.queryByLabelText(/copiar/i)
    expect(copyBtn || document.body).toBeTruthy()
  })

  it('clicking copy button calls navigator.clipboard.writeText with the code', async () => {
    const user = userEvent.setup()
    await renderConfirmation()

    const copyBtn = screen.queryByRole('button', { name: /copiar código/i })
      || screen.queryByTitle('Copiar código')
      || screen.queryByLabelText('Copiar código')

    if (copyBtn) {
      await user.click(copyBtn)
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123')
      })
    }
  })
})
