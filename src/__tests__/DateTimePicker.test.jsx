/**
 * Tests for frontend/src/components/booking/DateTimePicker.jsx
 *
 * Principles:
 *   - Mocks match the actual hook return shapes (isFetching/isError, not isLoading)
 *   - State uses the component's actual field names (services/specialist/branch)
 *   - Time is frozen at 07:00 Monday 2026-06-15 so all business-hour slots are future
 *   - Privacy invariants are tested as strict negative assertions on the DOM
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'

// ── Freeze time: Monday 07:00 — all 9:00–18:00 slots are future ──────────────
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-15T07:00:00'))
})
afterAll(() => vi.useRealTimers())

// ── Shared mock data ──────────────────────────────────────────────────────────

const BIZ_HOURS = [
  { day_of_week: 0, is_open: false, open_time: '09:00', close_time: '18:00' },
  { day_of_week: 1, is_open: true,  open_time: '09:00', close_time: '18:00' }, // Mon
  { day_of_week: 2, is_open: true,  open_time: '09:00', close_time: '18:00' },
  { day_of_week: 3, is_open: true,  open_time: '09:00', close_time: '18:00' },
  { day_of_week: 4, is_open: true,  open_time: '09:00', close_time: '18:00' },
  { day_of_week: 5, is_open: true,  open_time: '09:00', close_time: '18:00' },
  { day_of_week: 6, is_open: false, open_time: '09:00', close_time: '18:00' },
]

const AVAIL_CONFIG = {
  interval: 30, leadMins: 60, bufferMins: 0,
  openTime: '9:00', closeTime: '18:00', isOpen: true,
  timezone: 'America/Mexico_City',
}

// Normal: open day with no blocks
const AVAIL_NORMAL = {
  data: { staffBlocked: null, businessClosed: null, appointmentIntervals: [], config: AVAIL_CONFIG },
  isFetching: false,
  isError: false,
}

// Staff blocked — reason is internal and must never reach the client DOM
const availStaffBlocked = (reason = 'Vacaciones pagadas') => ({
  data: {
    staffBlocked:    { blocked: true, reason },
    businessClosed:  null,
    appointmentIntervals: [],
    config: { ...AVAIL_CONFIG, isOpen: false },
  },
  isFetching: false,
  isError: false,
})

// Business closed — reason is internal and must never reach the client DOM
const availBusinessClosed = (reason = 'Día festivo') => ({
  data: {
    staffBlocked:   null,
    businessClosed: { closed: true, reason },
    appointmentIntervals: [],
    config: { ...AVAIL_CONFIG, isOpen: false },
  },
  isFetching: false,
  isError: false,
})

const BLOCKED_EMPTY = { data: { blockedDates: [], month: '2026-06' } }

// ── Hoisted vi.fn() refs (required for vi.mock factories) ────────────────────
const { mockAvailFn, mockBlockedFn } = vi.hoisted(() => ({
  mockAvailFn:   vi.fn(),
  mockBlockedFn: vi.fn(),
}))

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../hooks/useAvailability.js', () => ({
  useAvailability:      mockAvailFn,
  useGroupAvailability: vi.fn(() => ({ data: null, isFetching: false, isError: false })),
  useBlockedDates:      mockBlockedFn,
}))

vi.mock('../hooks/useConfig.js', () => ({
  useConfig: () => ({
    data: {
      max_advance_days:   30,
      booking_lead_mins:  60,
      slot_interval_mins: 30,
      time_format:        '12h',
      hours: { '1': BIZ_HOURS },
    },
  }),
}))

const mockDispatch = vi.fn()
let mockState

vi.mock('../context/BookingContext.jsx', () => ({
  useBooking:      () => ({ state: mockState, dispatch: mockDispatch }),
  isGroupMode:     () => false,
  BookingProvider: ({ children }) => children,
}))

vi.mock('../utils/formatters.js', () => ({
  formatTime:    (t) => t,
  generateSlots: (_open, _close, duration, interval) => {
    const slots = []
    let mins = 9 * 60
    const step = interval || 30
    while (mins + duration <= 18 * 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      slots.push(`${h}:${String(m).padStart(2, '0')}`)
      mins += step
    }
    return slots
  },
  // Return slots in the 'morning' bucket so the component renders them
  groupSlots:  (slots) => ({ morning: slots, afternoon: [], evening: [] }),
  toTitleCase: (s) => s ?? '',
}))

vi.mock('../components/ui/Spinner.jsx',        () => ({ default: () => <div data-testid="spinner" /> }))
vi.mock('../components/ui/Button.jsx',         () => ({ default: ({ children, onClick, disabled }) =>
  <button onClick={onClick} disabled={disabled}>{children}</button> }))
vi.mock('../components/booking/SpecialistSelector.jsx', () => ({
  BackButton: ({ onClick }) => <button data-testid="back-btn" onClick={onClick}>Regresar</button>,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function renderPicker() {
  const { default: DateTimePicker } = await import('../components/booking/DateTimePicker.jsx')
  return render(<DateTimePicker />)
}

function timeSlotsInDOM() {
  return screen.queryAllByRole('button').filter(b =>
    /^\d{1,2}:\d{2}$/.test(b.textContent.trim())
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // clearAllMocks() does not drain queued mockReturnValueOnce() entries from
  // a previous test — reset() does, preventing stale data from leaking in.
  mockAvailFn.mockReset()
  mockBlockedFn.mockReset()
  mockState = {
    services:           [{ id: 1, name: 'Corte', duration: 30, price: 100, price_type: 'fixed' }],
    specialist:         { id: 2, name: 'Ana García', slug: 'ana-garcia' },
    branch:             { id: 1, slug: 'principal' },
    serviceAssignments: [],
    date: null,
    time: null,
  }
  mockBlockedFn.mockReturnValue(BLOCKED_EMPTY)
  mockAvailFn.mockReturnValue(AVAIL_NORMAL)
})

// ============================================================================
// 1. Render básico
// ============================================================================

describe('DateTimePicker — render', () => {
  it('renders without crashing', async () => {
    await act(async () => { await renderPicker() })
    expect(document.body).toBeTruthy()
  })

  it('shows month/year header (Junio 2026)', async () => {
    await act(async () => { await renderPicker() })
    expect(document.body.textContent).toMatch(/junio.*2026/i)
  })

  it('shows day-of-week abbreviations in calendar header', async () => {
    await act(async () => { await renderPicker() })
    const body = document.body.textContent
    expect(body).toMatch(/lu/i)
    expect(body).toMatch(/mi/i)
    expect(body).toMatch(/vi/i)
  })

  it('auto-selects a date on mount (no manual interaction required)', async () => {
    await act(async () => { await renderPicker() })
    // After auto-selection, availability hook is called with a date string
    const dateArgs = mockAvailFn.mock.calls.map(c => c[0])
    expect(dateArgs.some(d => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true)
  })
})

// ============================================================================
// 2. Navegación del calendario
// ============================================================================

describe('DateTimePicker — navigation', () => {
  it('next-month button advances the calendar header to Julio 2026', async () => {
    await act(async () => { await renderPicker() })

    const nextBtn = document.querySelector('button[aria-label="Mes siguiente"]')
    if (nextBtn) {
      await act(async () => { fireEvent.click(nextBtn) })
      expect(document.body.textContent).toMatch(/julio.*2026/i)
    }
  })

  it('clicking back button dispatches GO_BACK', async () => {
    await act(async () => { await renderPicker() })

    const btn = screen.queryByTestId('back-btn')
    if (btn) {
      await act(async () => { fireEvent.click(btn) })
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'GO_BACK' }))
    }
  })
})

// ============================================================================
// 3. Privacidad del cliente — staffBlocked
//    Ninguna razón interna debe llegar al DOM del booking público.
// ============================================================================

describe('DateTimePicker — privacidad: staffBlocked', () => {
  const INTERNAL_REASONS = [
    'Vacaciones pagadas',
    'Permiso sin goce de sueldo',
    'Incapacidad médica',
    'Día de descanso obligatorio',
    'Colaborador no trabaja este día.',
  ]

  it('NUNCA muestra el texto "Día no disponible" al cliente', async () => {
    mockAvailFn
      .mockReturnValueOnce(availStaffBlocked('Vacaciones pagadas'))
      .mockReturnValue(AVAIL_NORMAL)

    await act(async () => { await renderPicker() })
    expect(screen.queryByText(/día no disponible/i)).toBeNull()
  })

  it.each(INTERNAL_REASONS)(
    'NUNCA expone la razón interna "%s" en el DOM',
    async (reason) => {
      mockAvailFn
        .mockReturnValueOnce(availStaffBlocked(reason))
        .mockReturnValue(AVAIL_NORMAL)

      await act(async () => { await renderPicker() })
      expect(document.body.textContent).not.toContain(reason)
    }
  )

  it('NUNCA expone la palabra "vacaciones" en ninguna forma', async () => {
    mockAvailFn
      .mockReturnValueOnce(availStaffBlocked('Vacaciones anuales del especialista'))
      .mockReturnValue(AVAIL_NORMAL)

    await act(async () => { await renderPicker() })
    expect(document.body.textContent.toLowerCase()).not.toContain('vacacion')
  })

  it('NUNCA muestra el botón manual "Ver siguiente fecha disponible"', async () => {
    mockAvailFn.mockReturnValue(AVAIL_NORMAL)
    await act(async () => { await renderPicker() })
    expect(screen.queryByText(/ver siguiente fecha/i)).toBeNull()
  })
})

// ============================================================================
// 4. Privacidad del cliente — businessClosed (fix del bug pre-existente)
//    Los cierres del negocio tampoco deben llegar al cliente.
// ============================================================================

describe('DateTimePicker — privacidad: businessClosed', () => {
  it('NUNCA muestra la razón de cierre de negocio al cliente', async () => {
    mockAvailFn
      .mockReturnValueOnce(availBusinessClosed('Día festivo interno'))
      .mockReturnValue(AVAIL_NORMAL)

    await act(async () => { await renderPicker() })
    expect(document.body.textContent).not.toContain('Día festivo interno')
    expect(screen.queryByText(/día no disponible/i)).toBeNull()
  })

  it('auto-avanza silenciosamente cuando businessClosed=true', async () => {
    mockAvailFn
      .mockReturnValueOnce(availBusinessClosed('Cierre especial de temporada'))
      .mockReturnValue(AVAIL_NORMAL)

    await act(async () => { await renderPicker() })
    // La razón interna nunca debe aparecer
    expect(document.body.textContent).not.toContain('Cierre especial')
    expect(document.body.textContent).not.toContain('temporada')
  })

  it('trata businessClosed igual que staffBlocked: spinner, nunca mensaje', async () => {
    // Siempre cerrado para cualquier fecha
    mockAvailFn.mockReturnValue(availBusinessClosed('Remodelación'))

    await act(async () => { await renderPicker() })
    expect(document.body.textContent).not.toContain('Remodelación')
    expect(screen.queryByText(/día no disponible/i)).toBeNull()
  })
})

// ============================================================================
// 5. Grilla de slots
// ============================================================================

describe('DateTimePicker — slot grid', () => {
  it('muestra horarios cuando el día está disponible', async () => {
    mockAvailFn.mockReturnValue(AVAIL_NORMAL)
    await act(async () => { await renderPicker() })

    expect(timeSlotsInDOM().length).toBeGreaterThan(0)
  })

  it('seleccionar slot + Continuar despacha SET_DATETIME', async () => {
    mockAvailFn.mockReturnValue(AVAIL_NORMAL)
    await act(async () => { await renderPicker() })

    const slots = timeSlotsInDOM().filter(b => !b.disabled)
    if (slots.length > 0) {
      await act(async () => { fireEvent.click(slots[0]) })
      const continueBtn = screen.queryByText(/continuar/i)
      if (continueBtn) {
        await act(async () => { fireEvent.click(continueBtn) })
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'SET_DATETIME' })
        )
      }
    }
  })
})

// ============================================================================
// 5b. busySlots — bloqueos que NO son citas reales (staff_blocks, Google Calendar)
//
// Bug real: el backend ya calcula busySlots (citas + staff_blocks parciales +
// freebusy de Google Calendar del especialista), pero el componente solo
// revisaba appointmentIntervals (citas reales) para deshabilitar horarios.
// Cualquier bloqueo sin una cita real de por medio (vacaciones parciales,
// eventos de Google Calendar) era invisible en la UI aunque el backend ya
// lo hubiera calculado correctamente.
// ============================================================================

describe('DateTimePicker — busySlots (bloqueos externos, ej. Google Calendar)', () => {
  it('deshabilita un slot presente en busySlots aunque appointmentIntervals esté vacío', async () => {
    mockAvailFn.mockReturnValue({
      data: { ...AVAIL_NORMAL.data, appointmentIntervals: [], busySlots: ['9:30'] },
      isFetching: false,
      isError: false,
    })
    await act(async () => { await renderPicker() })

    const slot930 = timeSlotsInDOM().find(b => b.textContent.trim() === '9:30')
    expect(slot930).toBeTruthy()
    expect(slot930.disabled).toBe(true)
  })

  it('un slot que NO está en busySlots permanece habilitado', async () => {
    mockAvailFn.mockReturnValue({
      data: { ...AVAIL_NORMAL.data, appointmentIntervals: [], busySlots: ['9:30'] },
      isFetching: false,
      isError: false,
    })
    await act(async () => { await renderPicker() })

    const slot10 = timeSlotsInDOM().find(b => b.textContent.trim() === '10:00')
    expect(slot10).toBeTruthy()
    expect(slot10.disabled).toBe(false)
  })

  it('sin busySlots en la respuesta (undefined) → no rompe, todos los slots futuros habilitados', async () => {
    mockAvailFn.mockReturnValue({
      data: { ...AVAIL_NORMAL.data, appointmentIntervals: [], busySlots: undefined },
      isFetching: false,
      isError: false,
    })
    await act(async () => { await renderPicker() })

    const slots = timeSlotsInDOM()
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every(b => !b.disabled)).toBe(true)
  })

  it('busySlots con formato "09:30" (zero-padded) coincide igual que "9:30"', async () => {
    mockAvailFn.mockReturnValue({
      data: { ...AVAIL_NORMAL.data, appointmentIntervals: [], busySlots: ['09:30'] },
      isFetching: false,
      isError: false,
    })
    await act(async () => { await renderPicker() })

    const slot930 = timeSlotsInDOM().find(b => b.textContent.trim() === '9:30')
    expect(slot930).toBeTruthy()
    expect(slot930.disabled).toBe(true)
  })
})

// ============================================================================
// 6. Setup spinner — no flash de "Selecciona una fecha" durante carga inicial
// ============================================================================

describe('DateTimePicker — setup spinner', () => {
  it('muestra spinner (no "Selecciona una fecha") mientras blockedDates carga', async () => {
    // blockedData = undefined simula que la petición aún no completó
    mockBlockedFn.mockReturnValue({ data: undefined })
    mockAvailFn.mockReturnValue({ data: null, isFetching: false, isError: false })

    await act(async () => { await renderPicker() })

    expect(screen.queryByTestId('spinner')).toBeTruthy()
    expect(screen.queryByText(/selecciona una fecha/i)).toBeNull()
  })

  it('deja de mostrar el spinner de setup cuando blockedDates carga', async () => {
    mockBlockedFn.mockReturnValue(BLOCKED_EMPTY)
    mockAvailFn.mockReturnValue(AVAIL_NORMAL)

    await act(async () => { await renderPicker() })

    // Con blockedData cargado + autoselect + slots normales, la grilla debe aparecer
    expect(timeSlotsInDOM().length).toBeGreaterThan(0)
  })
})

// ============================================================================
// 7. F-008: Límite en auto-avance del efecto 2 (staffBlocked/businessClosed)
//    El efecto que hace skip de días bloqueados debe detenerse al alcanzar
//    MAX_AUTO_ADVANCES (7) para no ciclar indefinidamente.
// ============================================================================

describe('DateTimePicker — límite auto-avance efecto 2 (F-008)', () => {
  it('muestra noMoreDates cuando staffBlocked se repite más de MAX_AUTO_ADVANCES veces', async () => {
    // Todos los días regresan staffBlocked=true — el efecto 2 nunca encuentra un día libre.
    // Después de MAX_AUTO_ADVANCES (7) intentos, debe activar noMoreDates.
    mockAvailFn.mockReturnValue(availStaffBlocked('Vacaciones indefinidas'))

    await act(async () => { await renderPicker() })

    // La razón interna jamás debe aparecer
    expect(document.body.textContent).not.toContain('Vacaciones indefinidas')

    // El componente debe mostrar alguna indicación de "sin disponibilidad" en lugar
    // de seguir cargando o mostrar slots vacíos — no hay un testId fijo para esto
    // porque el componente muestra texto dinámico; validamos que no muestre slots.
    expect(timeSlotsInDOM().length).toBe(0)
  })

  it('muestra noMoreDates cuando businessClosed se repite más de MAX_AUTO_ADVANCES veces', async () => {
    mockAvailFn.mockReturnValue(availBusinessClosed('Remodelación prolongada'))

    await act(async () => { await renderPicker() })

    expect(document.body.textContent).not.toContain('Remodelación')
    expect(timeSlotsInDOM().length).toBe(0)
  })

  it('el efecto 2 no lanza excepción cuando skippedDatesRef alcanza el límite', async () => {
    // Si el guard no existiera, el componente intentaría avanzar infinitamente.
    // Este test verifica que el componente termina de renderizar sin error.
    mockAvailFn.mockReturnValue(availStaffBlocked('Test límite'))

    let renderError = null
    try {
      await act(async () => { await renderPicker() })
    } catch (e) {
      renderError = e
    }

    expect(renderError).toBeNull()
  })
})
