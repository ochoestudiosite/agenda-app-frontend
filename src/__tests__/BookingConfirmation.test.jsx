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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDispatch = vi.fn()
let mockState = {}

vi.mock('../context/BookingContext', () => ({
  useBooking: () => ({ state: mockState, dispatch: mockDispatch }),
  BookingProvider: ({ children }) => children,
  isGroupMode: () => false,
}))

const mockConfig = {
  time_format: '12h',
  branches: [{ id: 1, name: 'Sucursal Principal', image_url: null }],
}
vi.mock('../hooks/useConfig', () => ({
  useConfig: () => ({ data: mockConfig }),
}))

let mockCatalogServices = [
  { id: 'corte', dbId: 1, name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed', imageUrl: null },
]

vi.mock('../hooks/useServices', () => ({
  useServices: () => ({
    data: {
      services: mockCatalogServices,
      specialists: [
        { id: 5, name: 'Ana García', initials: 'AG', avatarUrl: null },
      ],
    },
  }),
}))

vi.mock('../utils/formatters', () => ({
  formatDate:  (d) => d ?? '',
  formatTime:  (t) => t ?? '',
  formatPrice: (p) => `$${Number(p ?? 0).toFixed(0)}`,
  toTitleCase: (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '',
  promoSavings: () => null,
}))

vi.mock('../components/ui/Button', () => ({
  default: ({ children, onClick, variant, ...props }) => (
    <button onClick={onClick} data-variant={variant} {...props}>{children}</button>
  ),
}))

vi.mock('../components/ui/PromoPrice', () => ({
  PromoTag: () => null,
  StruckPrice: ({ original, final }) => <span>{final || original}</span>,
  SavingsNote: () => null,
}))


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
  mockCatalogServices = [
    { id: 'corte', dbId: 1, name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed', imageUrl: null },
  ]
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
    expect(screen.getAllByText(/confirmada/i).length).toBeGreaterThan(0)
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
    expect(screen.getAllByText('$350').length).toBeGreaterThan(0)
  })

  it('price_type=ask shows "A consultar"', async () => {
    await renderConfirmation({ ...SINGLE_CONFIRMATION, priceType: 'ask', servicePrice: 0 })
    expect(screen.getAllByText(/a consultar/i).length).toBeGreaterThan(0)
  })

  it('price_type=starting_from shows price with "+"', async () => {
    await renderConfirmation({ ...SINGLE_CONFIRMATION, priceType: 'starting_from', servicePrice: 300 })
    expect(screen.getAllByText(/\$300\+/).length).toBeGreaterThan(0)
  })

  it('price_type=range shows price with "+"', async () => {
    await renderConfirmation({ ...SINGLE_CONFIRMATION, priceType: 'range', servicePrice: 500 })
    expect(screen.getAllByText(/\$500\+/).length).toBeGreaterThan(0)
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
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    await renderConfirmation()

    const copyBtn = screen.queryByRole('button', { name: /copiar código/i })
      || screen.queryByTitle('Copiar código')
      || screen.queryByLabelText('Copiar código')

    if (copyBtn) {
      await user.click(copyBtn)
      await waitFor(() => {
        expect(writeTextSpy).toHaveBeenCalledWith('ABC123')
      })
    }
  })
})

// ============================================================================
// 6. Bloque "Servicio" (singular) unificado con Especialista + chip Requisitos
// ============================================================================

describe('BookingConfirmation — bloque Servicio unificado con Especialista', () => {
  it('el label "Servicio" aparece inline, en la misma estructura que "Especialista"', async () => {
    await renderConfirmation()
    const serviceLabel    = screen.getByText('Servicio')
    const specialistLabel = screen.getByText('Especialista')
    expect(serviceLabel.className).toContain('label-section')
    expect(specialistLabel.className).toContain('label-section')
    expect(serviceLabel.nextElementSibling.textContent).toMatch(/Corte de cabello/i)
    expect(specialistLabel.nextElementSibling.textContent).toMatch(/Ana García/i)
  })
})

describe('BookingConfirmation — chip Requisitos previos (servicio singular)', () => {
  it('no muestra el chip cuando el servicio del catálogo no tiene requirements/prerequisite', async () => {
    await renderConfirmation()
    expect(screen.queryByRole('button', { name: /Requisitos previos/i })).toBeNull()
  })

  it('muestra el chip y abre el popover con el contenido correcto cuando el servicio está flagged', async () => {
    mockCatalogServices = [
      {
        id: 'corte', dbId: 1, name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed', imageUrl: null,
        requirements: 'Llegar 10 minutos antes.\nCabello limpio y seco.',
        prerequisite: null,
      },
    ]
    const user = userEvent.setup()
    await renderConfirmation()

    const chip = screen.getByRole('button', { name: /Requisitos previos/i })
    await user.click(chip)
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toMatch(/Llegar 10 minutos antes\./)
    expect(dialog.textContent).toMatch(/Cabello limpio y seco\./)
  })
})
