/**
 * Tests for frontend/src/components/manage/GroupAppointmentCard.jsx
 *
 * Focus:
 *   - Renders group code, client name, services list
 *   - Confirmed group: shows Reagendar + Cancelar buttons
 *   - Cancelled group: no action buttons, shows cancelled notice
 *   - Cancel confirm step: shows after clicking "Cancelar visita"
 *   - Cancel flow: calls useCancelGroupAppointment.mutateAsync with groupCode
 *   - onUpdated callback fired after successful cancel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCancelMutateAsync    = vi.fn()
const mockRescheduleMutateAsync = vi.fn()
const mockToast = vi.fn()
const mockOnUpdated = vi.fn()

vi.mock('../hooks/useAppointment.js', () => ({
  useCancelGroupAppointment: () => ({
    mutateAsync: mockCancelMutateAsync,
    isPending: false,
  }),
  useRescheduleGroupAppointment: () => ({
    mutateAsync: mockRescheduleMutateAsync,
    isPending: false,
  }),
}))

// Controlled per-test: true = Pro+OTP (default), false = Starter (no OTP)
let mockPhoneVerificationRequired = true

vi.mock('../hooks/useConfig.js', () => ({
  useConfig: () => ({
    data: {
      time_format: '12h',
      branches: [{ id: 1, name: 'Sucursal Principal' }],
      hours: {},
      max_advance_days: 30,
      phone_verification_required: mockPhoneVerificationRequired,
    },
  }),
}))

vi.mock('../hooks/useServices.js', () => ({
  useServices: () => ({
    data: {
      services: [
        { id: 'corte', name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed' },
        { id: 'tinte', name: 'Tinte',            duration: 60, price: 500, price_type: 'fixed' },
      ],
    },
  }),
}))

vi.mock('../hooks/useSpecialists.js', () => ({
  useSpecialists: () => ({
    data: {
      specialists: [
        { id: 5, name: 'Ana García',  slug: 'ana-garcia' },
        { id: 6, name: 'Carlos Ruiz', slug: 'carlos-ruiz' },
      ],
    },
  }),
}))

vi.mock('../hooks/useAvailability.js', () => ({
  useGroupAvailability: () => ({ data: null, isFetching: false }),
  useBlockedDates:      () => ({ data: null }),
}))

vi.mock('../components/ui/Toast.jsx', () => ({
  useToast: () => mockToast,
}))

vi.mock('../components/ui/Button.jsx', () => ({
  default: ({ children, onClick, variant, loading }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      disabled={loading}
    >
      {loading ? 'Cargando...' : children}
    </button>
  ),
}))

vi.mock('../components/ui/Spinner.jsx', () => ({
  default: () => <span data-testid="spinner" />,
}))

const mockRequestManageOTP = vi.fn()
vi.mock('../services/api.js', () => ({
  api: {
    requestManageOTP: (...args) => mockRequestManageOTP(...args),
  },
}))

vi.mock('../components/booking/OTPPanel.jsx', () => ({
  default: ({ onVerify, error }) => (
    <div>
      {error && <p data-testid="otp-error">{error}</p>}
      <button data-testid="otp-verify" onClick={() => onVerify('123456')}>Verificar OTP</button>
    </div>
  ),
}))

vi.mock('../utils/formatters.js', () => ({
  formatDate: (d) => d,
  formatTime: (t) => t,
  formatPrice: (p) => `$${p}`,
  toTitleCase: (s) => s,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Fecha futura dinámica (+7 días, en hora local) — una fecha fija se vuelve
// "pasada" con el tiempo y oculta los botones Reagendar/Cancelar (date-rot).
const FUTURE_DATE = (() => {
  const d = new Date(Date.now() + 7 * 86400000)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})()

const CONFIRMED_GROUP = {
  groupCode: 'GRP-001',
  clientName: 'Juan García',
  clientPhone: '5512345678',
  clientEmail: 'juan@test.com',
  date: FUTURE_DATE,
  totalDuration: 90,
  totalPrice: 750,
  status: 'confirmed',
  previousDate: null,
  previousTime: null,
  appointments: [
    {
      code: 'CITA-A',
      serviceId: 'corte',
      serviceName: 'Corte de cabello',
      specialistId: 5,
      specialistName: 'Ana García',
      time: '10:00',
      serviceDuration: 30,
      priceType: 'fixed',
      servicePrice: 250,
      status: 'confirmed',
    },
    {
      code: 'CITA-B',
      serviceId: 'tinte',
      serviceName: 'Tinte',
      specialistId: 6,
      specialistName: 'Carlos Ruiz',
      time: '10:30',
      serviceDuration: 60,
      priceType: 'fixed',
      servicePrice: 500,
      status: 'confirmed',
    },
  ],
}

const CANCELLED_GROUP = {
  ...CONFIRMED_GROUP,
  groupCode: 'GRP-002',
  status: 'cancelled',
  appointments: CONFIRMED_GROUP.appointments.map(a => ({ ...a, status: 'cancelled' })),
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

async function renderCard(group = CONFIRMED_GROUP) {
  const { default: GroupAppointmentCard } = await import('../components/manage/GroupAppointmentCard.jsx')
  const qc = makeQC()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GroupAppointmentCard group={group} onUpdated={mockOnUpdated} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPhoneVerificationRequired = true // default: Pro+OTP enabled
})

// ============================================================================
// 1. Render — basic content
// ============================================================================

describe('GroupAppointmentCard — render', () => {
  it('renders without crashing', async () => {
    await renderCard()
    expect(document.body).toBeTruthy()
  })

  it('shows group code', async () => {
    await renderCard()
    expect(screen.getByText(/GRP-001/i)).toBeTruthy()
  })

  it('shows client name', async () => {
    await renderCard()
    expect(screen.getByText(/Juan García/i)).toBeTruthy()
  })

  it('shows client phone', async () => {
    await renderCard()
    expect(screen.getByText(/5512345678/i)).toBeTruthy()
  })

  it('shows all service names from appointments', async () => {
    await renderCard()
    expect(screen.getByText(/Corte de cabello/i)).toBeTruthy()
    expect(screen.getByText(/Tinte/i)).toBeTruthy()
  })

  it('shows specialist names', async () => {
    await renderCard()
    expect(screen.getByText(/Ana García/i)).toBeTruthy()
    expect(screen.getByText(/Carlos Ruiz/i)).toBeTruthy()
  })

  it('shows appointments count (2 servicios)', async () => {
    await renderCard()
    expect(screen.getByText(/2 servicios/i)).toBeTruthy()
  })

  it('shows total duration', async () => {
    await renderCard()
    expect(screen.getByText(/90 min/i)).toBeTruthy()
  })
})

// ============================================================================
// 2. Confirmed group — action buttons
// ============================================================================

describe('GroupAppointmentCard — confirmed status', () => {
  it('shows Reagendar button', async () => {
    await renderCard(CONFIRMED_GROUP)
    expect(screen.getByRole('button', { name: /Reagendar/i })).toBeTruthy()
  })

  it('shows Cancelar visita button', async () => {
    await renderCard(CONFIRMED_GROUP)
    expect(screen.getByRole('button', { name: /Cancelar visita/i })).toBeTruthy()
  })
})

// ============================================================================
// 3. Cancelled group — read-only
// ============================================================================

describe('GroupAppointmentCard — cancelled status', () => {
  it('shows cancelled notice text', async () => {
    await renderCard(CANCELLED_GROUP)
    expect(screen.getByText(/Esta visita fue cancelada/i)).toBeTruthy()
  })

  it('does not show action buttons for cancelled group', async () => {
    await renderCard(CANCELLED_GROUP)
    expect(screen.queryByRole('button', { name: /Cancelar visita/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Reagendar/i })).toBeNull()
  })
})

// ============================================================================
// 4. Cancel confirm flow
// ============================================================================

describe('GroupAppointmentCard — cancel confirm flow', () => {
  it('shows cancel confirmation step after clicking Cancelar visita', async () => {
    const user = userEvent.setup()
    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))

    await waitFor(() => {
      expect(screen.getByText(/¿Cancelar esta visita\?/i)).toBeTruthy()
    })
  })

  it('shows "Sí, cancelar" confirm button in confirm step', async () => {
    const user = userEvent.setup()
    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sí, cancelar/i })).toBeTruthy()
    })
  })

  it('shows "Volver" button in confirm step', async () => {
    const user = userEvent.setup()
    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Volver/i })).toBeTruthy()
    })
  })

  it('Volver button returns to view mode', async () => {
    const user = userEvent.setup()
    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))
    await waitFor(() => screen.getByRole('button', { name: /Volver/i }))
    await user.click(screen.getByRole('button', { name: /Volver/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancelar visita/i })).toBeTruthy()
    })
  })

  it('calls useCancelGroupAppointment.mutateAsync with groupCode', async () => {
    const user = userEvent.setup()
    mockRequestManageOTP.mockResolvedValue({ pendingId: 'pend-1', maskedPhone: '***5678' })
    mockCancelMutateAsync.mockResolvedValue({ status: 'cancelled' })

    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))
    await waitFor(() => screen.getByRole('button', { name: /Sí, cancelar/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))

    await waitFor(() => screen.getByTestId('otp-verify'))
    await user.click(screen.getByTestId('otp-verify'))

    await waitFor(() => {
      expect(mockCancelMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'GRP-001', pendingId: 'pend-1', otpCode: '123456' })
      )
    })
  })

  it('calls onUpdated after successful cancellation', async () => {
    const user = userEvent.setup()
    mockRequestManageOTP.mockResolvedValue({ pendingId: 'pend-1', maskedPhone: '***5678' })
    mockCancelMutateAsync.mockResolvedValue({ status: 'cancelled' })

    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))
    await waitFor(() => screen.getByRole('button', { name: /Sí, cancelar/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))

    await waitFor(() => screen.getByTestId('otp-verify'))
    await user.click(screen.getByTestId('otp-verify'))

    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalled()
    })
  })

  it('shows error in the OTP panel on cancel failure', async () => {
    const user = userEvent.setup()
    mockRequestManageOTP.mockResolvedValue({ pendingId: 'pend-1', maskedPhone: '***5678' })
    mockCancelMutateAsync.mockRejectedValue(new Error('Error al cancelar'))

    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))
    await waitFor(() => screen.getByRole('button', { name: /Sí, cancelar/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))

    await waitFor(() => screen.getByTestId('otp-verify'))
    await user.click(screen.getByTestId('otp-verify'))

    await waitFor(() => {
      expect(screen.getByTestId('otp-error').textContent).toBe('Error al cancelar')
    })
  })
})

// ============================================================================
// 5. Cancel flow — Starter plan (phone_verification_required = false)
// ============================================================================

describe('GroupAppointmentCard — cancel flow (Starter, no OTP)', () => {
  beforeEach(() => {
    mockPhoneVerificationRequired = false
  })

  it('calls cancelMutation directly after confirm — no OTP panel shown', async () => {
    const user = userEvent.setup()
    mockCancelMutateAsync.mockResolvedValue({ status: 'cancelled' })

    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))
    await waitFor(() => screen.getByRole('button', { name: /Sí, cancelar/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))

    await waitFor(() => {
      expect(mockCancelMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'GRP-001' })
      )
      expect(mockCancelMutateAsync).toHaveBeenCalledWith(
        expect.not.objectContaining({ pendingId: expect.anything() })
      )
    })
    expect(screen.queryByTestId('otp-verify')).toBeNull()
  })

  it('calls onUpdated after successful cancel without OTP', async () => {
    const user = userEvent.setup()
    mockCancelMutateAsync.mockResolvedValue({ status: 'cancelled' })

    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))
    await waitFor(() => screen.getByRole('button', { name: /Sí, cancelar/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))

    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalled()
    })
  })

  it('shows toast error on cancel failure without OTP', async () => {
    const user = userEvent.setup()
    mockCancelMutateAsync.mockRejectedValue(new Error('Error al cancelar'))

    await renderCard()

    await user.click(screen.getByRole('button', { name: /Cancelar visita/i }))
    await waitFor(() => screen.getByRole('button', { name: /Sí, cancelar/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Error al cancelar', 'error')
    })
  })
})

// ============================================================================
// 6. Price display
// ============================================================================

describe('GroupAppointmentCard — price display', () => {
  it('shows total price', async () => {
    await renderCard()
    expect(screen.getByText(/\$750/i)).toBeTruthy()
  })

  it('shows "A consultar" when all services have price_type=ask', async () => {
    const askGroup = {
      ...CONFIRMED_GROUP,
      appointments: CONFIRMED_GROUP.appointments.map(a => ({ ...a, priceType: 'ask' })),
    }
    await renderCard(askGroup)
    expect(screen.queryAllByText(/A consultar/i).length).toBeGreaterThan(0)
  })
})

// ============================================================================
// 7. Completed group status badge (regression)
//
// StatusBadge's label map had no entry for 'completed', so a group visit
// whose backend status is 'completed' (the normal terminal state once the
// visit has happened) showed the raw English string "completed" to the end
// customer. Fixed by mapping it to "Completada", same style as 'confirmed'.
// ============================================================================

describe('GroupAppointmentCard — completed status badge label (regression)', () => {
  const COMPLETED_GROUP = {
    ...CONFIRMED_GROUP,
    groupCode: 'GRP-003',
    status: 'completed',
    appointments: CONFIRMED_GROUP.appointments.map(a => ({ ...a, status: 'completed' })),
  }

  it('shows the "Completada" label, not the raw "completed" string', async () => {
    await renderCard(COMPLETED_GROUP)
    expect(document.body.textContent).toMatch(/Completada/)
    expect(document.body.textContent).not.toMatch(/\bcompleted\b/)
  })

  // NOTE: action-button gating (`isCancelled`) only checks status==='cancelled',
  // not 'completed' — so Reagendar/Cancelar visita currently still render for an
  // already-completed group. That's a pre-existing behavior independent of the
  // label-mapping fix this test file covers; documented here, not silently
  // "fixed" as part of an unrelated change. Flagged separately for product review.
  it('action buttons still render for a completed group today (pre-existing gap, documented not fixed here)', async () => {
    await renderCard(COMPLETED_GROUP)
    expect(screen.queryByRole('button', { name: /Cancelar visita/i })).toBeTruthy()
  })
})
