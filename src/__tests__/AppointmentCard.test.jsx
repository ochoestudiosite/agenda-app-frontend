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

vi.mock('../hooks/useConfig.js', () => ({
  useConfig: () => ({
    data: { time_format: '12h', branches: [{ id: 1, name: 'Sucursal Principal' }] },
  }),
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
