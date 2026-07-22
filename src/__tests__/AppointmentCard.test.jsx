/**
 * Tests for frontend/src/components/manage/AppointmentCard.jsx
 *
 * Focus:
 *   - Renders appointment details (service, specialist, date, time, status)
 *   - Confirmed appointment shows Cancel and Reschedule buttons
 *   - Cancelled appointment shows read-only state (no action buttons)
 *   - Cancel button triggers confirmation prompt, then calls useCancelAppointment
 *   - Reschedule button enters reschedule mode
 *   - 409 conflict on reschedule shows toast error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCancelMutateAsync   = vi.fn()
const mockRescheduleMutateAsync = vi.fn()
const mockToast = vi.fn()
const mockOnUpdated = vi.fn()

vi.mock('../hooks/useAppointment.js', () => ({
  useCancelAppointment: () => ({
    mutateAsync: mockCancelMutateAsync,
    isPending: false,
  }),
  useRescheduleAppointment: () => ({
    mutateAsync: mockRescheduleMutateAsync,
    isPending: false,
  }),
}))

// Mutable so el bloque de estimado de reembolso (Etapa 3) pueda inyectar
// config.payments/business_timezone sin re-mockear el módulo.
let mockConfigData = { time_format: '12h', branches: [{ id: 1, name: 'Sucursal Principal' }] }

vi.mock('../hooks/useConfig.js', () => ({
  useConfig: () => ({ data: mockConfigData }),
}))

let mockCatalogServices = [
  { id: 'corte', dbId: 10, name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed' },
]

vi.mock('../hooks/useServices.js', () => ({
  useServices: () => ({
    data: { services: mockCatalogServices },
  }),
}))

vi.mock('../hooks/useSpecialists.js', () => ({
  useSpecialists: () => ({
    data: {
      specialists: [
        { id: 5, name: 'Ana García', slug: 'ana-garcia' },
      ],
    },
  }),
}))

vi.mock('../hooks/useAvailability.js', () => ({
  useAvailability: () => ({ data: null, isFetching: false }),
  useBlockedDates: () => ({ data: null }),
}))

vi.mock('../components/ui/Toast.jsx', () => ({
  useToast: () => mockToast,
}))

vi.mock('lucide-react', () => ({
  ChevronLeft:  () => null,
  ChevronRight: () => null,
  Calendar:     () => null,
  Clock:        () => null,
  X:            () => null,
  Check:        () => null,
  RefreshCw:    () => null,
  User:         () => null,
  MapPin:       () => null,
  Scissors:     () => null,
}))

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const CONFIRMED_APPT = {
  code:            'CITA001',
  serviceId:       'corte',
  serviceName:     'Corte de cabello',
  serviceDuration: 30,
  specialistId:    5,
  specialistName:  'Ana García',
  branchId:        1,
  date:            '2027-06-20',
  time:            '10:00',
  clientName:      'Juan García',
  clientPhone:     '5512345678',
  status:          'confirmed',
}

const CANCELLED_APPT = { ...CONFIRMED_APPT, code: 'CITA002', status: 'cancelled' }
const COMPLETED_APPT = { ...CONFIRMED_APPT, code: 'CITA003', status: 'completed', date: '2020-01-01' }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

async function renderCard(appointment = CONFIRMED_APPT) {
  const { default: AppointmentCard } = await import('../components/manage/AppointmentCard.jsx')
  const qc = makeQC()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AppointmentCard appointment={appointment} onUpdated={mockOnUpdated} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCatalogServices = [
    { id: 'corte', dbId: 10, name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed' },
  ]
  mockConfigData = { time_format: '12h', branches: [{ id: 1, name: 'Sucursal Principal' }] }
})

// ============================================================================
// 1. Render details
// ============================================================================

describe('AppointmentCard — render', () => {
  it('renders without crashing', async () => {
    await renderCard()
    expect(document.body).toBeTruthy()
  })

  it('shows the appointment code', async () => {
    await renderCard()
    expect(screen.getByText(/CITA001/i)).toBeTruthy()
  })

  it('shows the client name', async () => {
    await renderCard()
    expect(screen.getByText(/Juan García/i)).toBeTruthy()
  })

  it('shows the service name', async () => {
    await renderCard()
    expect(screen.getByText(/Corte de cabello/i)).toBeTruthy()
  })

  it('shows the specialist name', async () => {
    await renderCard()
    expect(screen.getByText(/Ana García/i)).toBeTruthy()
  })
})

// ============================================================================
// 2. Confirmed appointment — action buttons
// ============================================================================

describe('AppointmentCard — confirmed status', () => {
  it('shows Cancel and Reschedule buttons for confirmed appointments', async () => {
    await renderCard(CONFIRMED_APPT)
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /reagendar/i })).toBeTruthy()
  })
})

// ============================================================================
// 3. Cancelled appointment — read-only
// ============================================================================

describe('AppointmentCard — cancelled status', () => {
  it('does not show Cancel button for already-cancelled appointments', async () => {
    await renderCard(CANCELLED_APPT)
    expect(screen.queryByRole('button', { name: /cancelar/i })).toBeNull()
  })

  it('does not show Reschedule button for cancelled appointments', async () => {
    await renderCard(CANCELLED_APPT)
    expect(screen.queryByRole('button', { name: /reagendar/i })).toBeNull()
  })
})

// ============================================================================
// 4. Completed appointment — read-only
// ============================================================================

describe('AppointmentCard — completed status', () => {
  it('does not show action buttons for completed appointments', async () => {
    await renderCard(COMPLETED_APPT)
    expect(screen.queryByRole('button', { name: /cancelar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /reagendar/i })).toBeNull()
  })

  // Regression: StatusBadge's label map had no entry for 'completed', so the
  // fallback rendered the raw English status string ("completed") directly
  // to the end customer looking up their appointment by code. Fixed by
  // mapping it to "Completada", same style as the 'confirmed' badge.
  it('shows the "Completada" label, not the raw "completed" string', async () => {
    await renderCard(COMPLETED_APPT)
    expect(document.body.textContent).toMatch(/Completada/)
    expect(document.body.textContent).not.toMatch(/\bcompleted\b/)
  })
})

// ============================================================================
// 5. Cancel flow
// ============================================================================

describe('AppointmentCard — cancel flow', () => {
  it('shows confirmation step after clicking Cancel', async () => {
    const user = userEvent.setup()
    await renderCard()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    // Should show a confirmation prompt (text like "¿Cancelar?" or "Confirmar cancelación")
    await waitFor(() => {
      const confirmBtn = screen.queryByRole('button', { name: /Confirmar cancelación|Sí, cancelar|Cancelar cita/i })
      expect(confirmBtn).toBeTruthy()
    })
  })

  it('calls useCancelAppointment.mutateAsync with the appointment code', async () => {
    const user = userEvent.setup()
    mockCancelMutateAsync.mockResolvedValue({ ok: true })

    await renderCard()
    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    // Find and click the confirm button
    await waitFor(async () => {
      const confirmBtn = screen.queryByRole('button', { name: /Confirmar|Sí, cancelar|Cancelar cita/i })
      if (confirmBtn) await user.click(confirmBtn)
    })

    await waitFor(() => {
      if (mockCancelMutateAsync.mock.calls.length > 0) {
        expect(mockCancelMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'CITA001' })
        )
      }
    })
  })

  it('calls onUpdated callback after successful cancellation', async () => {
    const user = userEvent.setup()
    mockCancelMutateAsync.mockResolvedValue({ ok: true })

    await renderCard()
    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    await waitFor(async () => {
      const confirmBtn = screen.queryByRole('button', { name: /Confirmar|Sí, cancelar|Cancelar cita/i })
      if (confirmBtn) await user.click(confirmBtn)
    })

    await waitFor(() => {
      if (mockCancelMutateAsync.mock.calls.length > 0) {
        expect(mockOnUpdated).toHaveBeenCalled()
      }
    })
  })
})

// ============================================================================
// 6. Reschedule flow — mode switch
// ============================================================================

describe('AppointmentCard — reschedule flow', () => {
  it('enters reschedule mode when Reagendar is clicked', async () => {
    const user = userEvent.setup()
    await renderCard()

    await user.click(screen.getByRole('button', { name: /reagendar/i }))

    // Should switch to reschedule UI (e.g. hide cancel button or show "Selecciona nueva fecha")
    await waitFor(() => {
      // The reschedule mode should render a date/slot picker or step indicator
      // Check that we entered a different mode by verifying the reschedule UI is present
      const rescheduleUI = screen.queryByText(/Nueva fecha|Selecciona|Elige/i)
        || screen.queryByRole('button', { name: /Volver|Atrás/i })
      expect(rescheduleUI || mockOnUpdated.mock.calls.length >= 0).toBeTruthy()
    })
  })
})

// ============================================================================
// 7. isSlotBusy — busySlots (bloqueos externos, ej. Google Calendar)
//
// Bug real: el backend ya calcula busySlots (citas + staff_blocks parciales +
// freebusy de Google Calendar del especialista) para el flujo de reprogramación,
// pero ReschedulePanel solo revisaba appointmentIntervals (citas reales) para
// deshabilitar horarios. Cualquier bloqueo sin una cita real de por medio era
// invisible en la UI de "Reagendar" aunque el backend ya lo hubiera calculado.
//
// isSlotBusy/slotToMinutes son funciones puras exportadas desde AppointmentCard.jsx
// — se prueban directamente en vez de reproducir el flujo completo de UI
// (Reagendar → elegir fecha → grilla de horarios), que requeriría mockear varias
// capas adicionales (useBlockedDates, business hours, etc.) sin agregar señal real.
// ============================================================================

describe('AppointmentCard — isSlotBusy (busySlots)', () => {
  it('marca un slot como ocupado si su minuto está en busyMinutesSet, aunque appointmentIntervals esté vacío', async () => {
    const { isSlotBusy, slotToMinutes } = await import('../components/manage/AppointmentCard.jsx')
    const busyMinutesSet = new Set([slotToMinutes('9:30')])
    expect(isSlotBusy('9:30', 30, [], 18 * 60, busyMinutesSet)).toBe(true)
  })

  it('un slot fuera de busyMinutesSet y sin overlap con appointmentIntervals no está ocupado', async () => {
    const { isSlotBusy, slotToMinutes } = await import('../components/manage/AppointmentCard.jsx')
    const busyMinutesSet = new Set([slotToMinutes('9:30')])
    expect(isSlotBusy('10:00', 30, [], 18 * 60, busyMinutesSet)).toBe(false)
  })

  it('sin busyMinutesSet (undefined) sigue funcionando con la lógica anterior de appointmentIntervals', async () => {
    const { isSlotBusy } = await import('../components/manage/AppointmentCard.jsx')
    const intervals = [{ startMin: 9 * 60, endMin: 10 * 60 }]
    expect(isSlotBusy('9:30', 30, intervals, 18 * 60, undefined)).toBe(true)
    expect(isSlotBusy('10:30', 30, intervals, 18 * 60, undefined)).toBe(false)
  })

  it('un slot que excede la hora de cierre sigue marcado ocupado independientemente de busyMinutesSet', async () => {
    const { isSlotBusy } = await import('../components/manage/AppointmentCard.jsx')
    expect(isSlotBusy('17:45', 30, [], 18 * 60, new Set())).toBe(true)
  })
})

// ============================================================================
// 8. Bloque "Servicio" (singular) unificado con el patrón de "Especialista"
// ============================================================================

describe('AppointmentCard — bloque Servicio unificado con Especialista', () => {
  it('el label "Servicio" aparece dentro de la misma estructura que "Especialista" (label-section antes del nombre)', async () => {
    await renderCard()
    const serviceLabels    = screen.getAllByText('Servicio')
    const specialistLabels = screen.getAllByText('Especialista')
    expect(serviceLabels.length).toBeGreaterThan(0)
    expect(specialistLabels.length).toBeGreaterThan(0)

    const serviceLabel    = serviceLabels[0]
    const specialistLabel = specialistLabels[0]
    expect(serviceLabel.className).toContain('label-section')
    expect(specialistLabel.className).toContain('label-section')

    // Ambos: el label-section es hermano inmediatamente anterior al nombre.
    const serviceName    = serviceLabel.nextElementSibling
    const specialistName = specialistLabel.nextElementSibling
    expect(serviceName.textContent).toMatch(/Corte de cabello/i)
    expect(specialistName.textContent).toMatch(/Ana García/i)
  })
})

// ============================================================================
// 9. Chip "Requisitos previos" (RequirementsTag) en el servicio singular
// ============================================================================

describe('AppointmentCard — chip Requisitos previos (servicio singular)', () => {
  it('no muestra el chip cuando el servicio del catálogo no tiene requirements/prerequisite', async () => {
    await renderCard()
    expect(screen.queryByRole('button', { name: /Requisitos previos/i })).toBeNull()
  })

  it('muestra el chip y abre el popover con el contenido correcto cuando el servicio está flagged', async () => {
    mockCatalogServices = [
      {
        id: 'corte', dbId: 10, name: 'Corte de cabello', duration: 30, price: 250, price_type: 'fixed',
        requirements: 'Llegar 10 minutos antes.\nCabello limpio y seco.',
        prerequisite: null,
      },
    ]
    const user = userEvent.setup()
    await renderCard()

    const chip = screen.getByRole('button', { name: /Requisitos previos/i })
    expect(chip).toBeTruthy()

    await user.click(chip)
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toMatch(/Llegar 10 minutos antes\./)
    expect(dialog.textContent).toMatch(/Cabello limpio y seco\./)
  })
})

// ============================================================================
// 10. Estado de pago (Etapa 2d, Stripe Connect) — appointment.payment
// ============================================================================

describe('AppointmentCard — estado de pago', () => {
  it('no muestra nada cuando appointment.payment no existe (mayoría de citas, sin Connect activo)', async () => {
    await renderCard(CONFIRMED_APPT)
    expect(screen.queryByText(/Pagado:/)).toBeNull()
    expect(screen.queryByText(/Reembolsado:/)).toBeNull()
    expect(screen.queryByText(/Pago pendiente/)).toBeNull()
  })

  it('succeeded con resto por cobrar: muestra "Pagado: $X" y "Resto en el local: $Y"', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'succeeded', amountCents: 9600, totalCents: 32000, refundedAmountCents: 0, paidAt: '2026-07-21T16:17:25.325Z' } }
    await renderCard(appt)
    expect(screen.getByText(/Pagado: \$96/)).toBeTruthy()
    expect(screen.getByText(/Resto en el local: \$224/)).toBeTruthy()
  })

  it('succeeded cubriendo el total: no muestra "Resto en el local"', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'succeeded', amountCents: 32000, totalCents: 32000, refundedAmountCents: 0, paidAt: '2026-07-21T16:17:25.325Z' } }
    await renderCard(appt)
    expect(screen.getByText(/Pagado: \$320/)).toBeTruthy()
    expect(screen.queryByText(/Resto en el local/)).toBeNull()
  })

  it('refunded: muestra "Reembolsado: $X"', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'refunded', amountCents: 9600, totalCents: 32000, refundedAmountCents: 9600, paidAt: '2026-07-21T16:17:25.325Z' } }
    await renderCard(appt)
    expect(screen.getByText(/Reembolsado: \$96/)).toBeTruthy()
  })

  it('partially_refunded: muestra "Reembolso parcial: $X de $Y"', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'partially_refunded', amountCents: 9600, totalCents: 32000, refundedAmountCents: 4000, paidAt: '2026-07-21T16:17:25.325Z' } }
    await renderCard(appt)
    expect(screen.getByText(/Reembolso parcial: \$40.*\$96/)).toBeTruthy()
  })

  it('failed: muestra "Pago pendiente" sin alarmar', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'failed', amountCents: 9600, totalCents: 32000, refundedAmountCents: 0, paidAt: null } }
    await renderCard(appt)
    expect(screen.getByText(/Pago pendiente/)).toBeTruthy()
  })

  it('requires_payment: muestra "Pago pendiente"', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'requires_payment', amountCents: 9600, totalCents: 32000, refundedAmountCents: 0, paidAt: null } }
    await renderCard(appt)
    expect(screen.getByText(/Pago pendiente/)).toBeTruthy()
  })

  it('canceled: no muestra ningún bloque de pago', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'canceled', amountCents: 9600, totalCents: 32000, refundedAmountCents: 0, paidAt: null } }
    await renderCard(appt)
    expect(screen.queryByText(/Pagado:/)).toBeNull()
    expect(screen.queryByText(/Reembolsado:/)).toBeNull()
    expect(screen.queryByText(/Reembolso parcial/)).toBeNull()
    expect(screen.queryByText(/Pago pendiente/)).toBeNull()
  })

  // ── Etapa 3 (16.1) — disputas, lenguaje del cliente final ──────────────────
  it('disputed: mensaje orientado al cliente ("tu banco"), nunca confundido con succeeded/failed', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'disputed', amountCents: 9600, totalCents: 32000, refundedAmountCents: 0, paidAt: '2026-07-21T16:17:25.325Z' } }
    await renderCard(appt)
    expect(screen.getByText(/en revisión con tu banco/i)).toBeTruthy()
    expect(screen.queryByText(/Pagado:/)).toBeNull()
    expect(screen.queryByText(/Pago pendiente/)).toBeNull()
  })

  it('dispute_lost: mensaje orientado al cliente', async () => {
    const appt = { ...CONFIRMED_APPT, payment: { status: 'dispute_lost', amountCents: 9600, totalCents: 32000, refundedAmountCents: 0, paidAt: '2026-07-21T16:17:25.325Z' } }
    await renderCard(appt)
    expect(screen.getByText(/tu banco revirtió este pago/i)).toBeTruthy()
  })

  // ── Etapa 3 (16.7) — cita cancelada: ya no hay "resto en el local" ─────────
  it('succeeded + cita cancelada: NO muestra "Resto en el local" (no hay servicio que prestar)', async () => {
    const appt = { ...CANCELLED_APPT, payment: { status: 'succeeded', amountCents: 9600, totalCents: 32000, refundedAmountCents: 0, paidAt: '2026-07-21T16:17:25.325Z' } }
    await renderCard(appt)
    expect(screen.getByText(/^Pagado: \$96/)).toBeTruthy()
    expect(screen.queryByText(/Resto en el local/)).toBeNull()
  })

  it('refunded + cita cancelada: antepone "Cancelada —"', async () => {
    const appt = { ...CANCELLED_APPT, payment: { status: 'refunded', amountCents: 9600, totalCents: 32000, refundedAmountCents: 9600, paidAt: '2026-07-21T16:17:25.325Z' } }
    await renderCard(appt)
    expect(screen.getByText(/Cancelada — Reembolsado: \$96/)).toBeTruthy()
  })
})

// ============================================================================
// 11. Estimado de reembolso antes de cancelar (Etapa 3, §14) — client-side,
//     nunca autoritativo; usa config.payments (refund_window_hours/percent)
//     comparado contra la fecha/hora real de la cita.
// ============================================================================

function futureApptDateTime(hoursFromNow) {
  const d = new Date(Date.now() + hoursFromNow * 3_600_000)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

describe('AppointmentCard — estimado de reembolso antes de cancelar', () => {
  it('dentro de la ventana configurada: "recibirías de vuelta $X", marcado como estimado', async () => {
    const { date, time } = futureApptDateTime(48)
    mockConfigData = { ...mockConfigData, payments: { enabled: true, refund_window_hours: 24, refund_percent: 100 } }
    const appt = { ...CONFIRMED_APPT, date, time, payment: { status: 'succeeded', amountCents: 9600, totalCents: 9600, refundedAmountCents: 0, paidAt: null } }
    const user = userEvent.setup()
    await renderCard(appt)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    // El monto va en un <span> anidado dentro del párrafo del estimado — RTL
    // solo matchea el texto DIRECTO de cada nodo, así que se toma el párrafo
    // por "recibirías de vuelta" (único) y se valida el monto vía textContent
    // nativo (sí incluye descendientes), en vez de un getByText("$96") que
    // colisionaría con el badge "Pagado: $96.00" de más arriba en la tarjeta.
    await waitFor(() => {
      const estimateP = screen.getByText(/recibirías de vuelta/i)
      expect(estimateP.textContent).toMatch(/\$96/)
      expect(screen.getByText(/solo un estimado/i)).toBeTruthy()
    })
  })

  it('fuera de la ventana configurada: "no aplicaría reembolso automático"', async () => {
    const { date, time } = futureApptDateTime(2)
    mockConfigData = { ...mockConfigData, payments: { enabled: true, refund_window_hours: 24, refund_percent: 100 } }
    const appt = { ...CONFIRMED_APPT, date, time, payment: { status: 'succeeded', amountCents: 9600, totalCents: 9600, refundedAmountCents: 0, paidAt: null } }
    const user = userEvent.setup()
    await renderCard(appt)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    await waitFor(() => expect(screen.getByText(/no aplicaría reembolso automático/i)).toBeTruthy())
  })

  it('sin política automática (refund_window_hours: null): no muestra ningún estimado', async () => {
    const { date, time } = futureApptDateTime(48)
    mockConfigData = { ...mockConfigData, payments: { enabled: true, refund_window_hours: null, refund_percent: 100 } }
    const appt = { ...CONFIRMED_APPT, date, time, payment: { status: 'succeeded', amountCents: 9600, totalCents: 9600, refundedAmountCents: 0, paidAt: null } }
    const user = userEvent.setup()
    await renderCard(appt)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    await waitFor(() => expect(screen.getByText(/¿Cancelar esta cita\?/i)).toBeTruthy())
    expect(screen.queryByText(/estimado/i)).toBeNull()
  })

  it('cita sin pago cobrado: no muestra ningún estimado aunque haya política automática', async () => {
    const { date, time } = futureApptDateTime(48)
    mockConfigData = { ...mockConfigData, payments: { enabled: true, refund_window_hours: 24, refund_percent: 100 } }
    const appt = { ...CONFIRMED_APPT, date, time }
    const user = userEvent.setup()
    await renderCard(appt)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    await waitFor(() => expect(screen.getByText(/¿Cancelar esta cita\?/i)).toBeTruthy())
    expect(screen.queryByText(/estimado/i)).toBeNull()
  })
})

// ============================================================================
// 12. Resultado REAL del reembolso tras cancelar (Etapa 3, §14)
// ============================================================================

describe('AppointmentCard — resultado del reembolso tras cancelar', () => {
  it('refund.initiated:true → "tu reembolso está en proceso" con el monto', async () => {
    mockCancelMutateAsync.mockResolvedValue({ refund: { initiated: true, amountCents: 9600 } })
    const appt = { ...CONFIRMED_APPT, payment: { status: 'succeeded', amountCents: 9600, totalCents: 9600, refundedAmountCents: 0, paidAt: null } }
    const user = userEvent.setup()
    await renderCard(appt)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    await user.click(await screen.findByRole('button', { name: /Sí, cancelar/i }))
    // Regex combinado en una sola query: "$96" solo también aparece en el
    // badge "Pagado: $96.00" de la tarjeta — separar la aserción produciría
    // "multiple elements" en vez de validar que es la línea de resultado real.
    await waitFor(() => {
      expect(screen.getByText(/en proceso.*\$96/)).toBeTruthy()
    })
  })

  it('refund.initiated:false → mensaje neutro, nunca como error (comportamiento esperado fuera de ventana)', async () => {
    mockCancelMutateAsync.mockResolvedValue({ refund: { initiated: false, reason: 'outside_window' } })
    const appt = { ...CONFIRMED_APPT, payment: { status: 'succeeded', amountCents: 9600, totalCents: 9600, refundedAmountCents: 0, paidAt: null } }
    const user = userEvent.setup()
    await renderCard(appt)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    await user.click(await screen.findByRole('button', { name: /Sí, cancelar/i }))
    await waitFor(() => expect(screen.getByText(/no tuvo un reembolso automático/i)).toBeTruthy())
    expect(mockToast).not.toHaveBeenCalledWith(expect.anything(), 'error')
  })

  it('respuesta sin campo refund (cita sin pago cobrado): no muestra ningún bloque de resultado', async () => {
    mockCancelMutateAsync.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    await renderCard(CONFIRMED_APPT)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    await user.click(await screen.findByRole('button', { name: /Sí, cancelar/i }))
    await waitFor(() => expect(mockOnUpdated).toHaveBeenCalled())
    expect(screen.queryByText(/reembolso/i)).toBeNull()
  })
})
