/**
 * Tests for frontend/src/context/BookingContext.jsx
 *
 * Covers:
 *   - Initial state
 *   - SET_BRANCH, SET_SERVICE, TOGGLE_SERVICE, CONFIRM_SERVICES
 *   - SET_SPECIALIST (single-service flow)
 *   - ASSIGN_SPECIALIST (multi-service flow)
 *   - SET_DATETIME, SET_CLIENT, SET_CONFIRMATION
 *   - GO_BACK, GO_TO_STEP, RESET
 *   - Session persistence in sessionStorage
 *   - useBooking guard (throws outside provider)
 *   - isGroupMode helper
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { BookingProvider, useBooking, isGroupMode } from '../context/BookingContext.jsx'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Spy({ onCapture }) {
  const ctx = useBooking()
  onCapture(ctx)
  return null
}

function renderWithBooking(onCapture) {
  render(
    <BookingProvider>
      <Spy onCapture={onCapture} />
    </BookingProvider>
  )
}

const MOCK_BRANCH    = { id: 1, name: 'Sucursal Centro' }
const MOCK_SERVICE_A = { id: 10, name: 'Corte de cabello', duration: 30 }
const MOCK_SERVICE_B = { id: 11, name: 'Manicure', duration: 45 }
const MOCK_SPECIALIST = { id: 5, name: 'Ana García', slug: 'ana-garcia' }
const MOCK_SPECIALIST_B = { id: 6, name: 'Carlos López', slug: 'carlos-lopez' }

// ============================================================================
// 1. Initial state
// ============================================================================

describe('BookingContext — initial state', () => {
  it('starts at step 1 with no selections', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    expect(ctx.state.step).toBe(1)
    expect(ctx.state.branch).toBeNull()
    expect(ctx.state.services).toHaveLength(0)
    expect(ctx.state.specialist).toBeNull()
    expect(ctx.state.date).toBeNull()
    expect(ctx.state.time).toBeNull()
    expect(ctx.state.confirmation).toBeNull()
    expect(ctx.state.serviceAssignments).toHaveLength(0)
    expect(ctx.state.currentAssignmentIdx).toBe(0)
  })
})

// ============================================================================
// 2. Branch selection
// ============================================================================

describe('SET_BRANCH', () => {
  it('sets branch in state', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'SET_BRANCH', payload: MOCK_BRANCH }) })
    expect(ctx.state.branch).toEqual(MOCK_BRANCH)
    expect(ctx.state.step).toBe(1) // step doesn't advance from SET_BRANCH alone
  })
})

// ============================================================================
// 3. Service selection — single service
// ============================================================================

describe('SET_SERVICE (single-service fast path)', () => {
  it('sets service, clears downstream state, advances to step 2', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A }) })

    expect(ctx.state.services).toHaveLength(1)
    expect(ctx.state.services[0]).toEqual(MOCK_SERVICE_A)
    expect(ctx.state.step).toBe(2)
    expect(ctx.state.specialist).toBeNull()
    expect(ctx.state.date).toBeNull()
    expect(ctx.state.serviceAssignments).toHaveLength(0)
  })
})

// ============================================================================
// 4. Service selection — multi-service (TOGGLE_SERVICE)
// ============================================================================

describe('TOGGLE_SERVICE (multi-service)', () => {
  it('adds a service to the selection', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_A }) })
    expect(ctx.state.services).toHaveLength(1)
    expect(ctx.state.services[0].id).toBe(MOCK_SERVICE_A.id)
  })

  it('removes a service if toggled twice', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_A }) })
    act(() => { ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_A }) })
    expect(ctx.state.services).toHaveLength(0)
  })

  it('caps at 5 services', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    const services = [1, 2, 3, 4, 5, 6].map(id => ({ id, name: `Svc ${id}`, duration: 30 }))
    services.forEach(svc => {
      act(() => { ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: svc }) })
    })
    expect(ctx.state.services).toHaveLength(5) // capped at 5
  })

  it('clears downstream state (specialist, date, assignments) on toggle', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    // First set some downstream state via SET_SPECIALIST path
    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST })
    })
    expect(ctx.state.specialist).toEqual(MOCK_SPECIALIST)

    // Now toggle a different service — specialist should clear
    act(() => { ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_B }) })
    expect(ctx.state.specialist).toBeNull()
    expect(ctx.state.date).toBeNull()
  })
})

describe('CONFIRM_SERVICES', () => {
  it('advances to step 2 when services are selected', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_A }) })
    act(() => { ctx.dispatch({ type: 'CONFIRM_SERVICES' }) })
    expect(ctx.state.step).toBe(2)
  })

  it('stays at current step when no services selected', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'CONFIRM_SERVICES' }) })
    expect(ctx.state.step).toBe(1) // no change — services array empty
  })
})

// ============================================================================
// 5. Specialist selection — single-service
// ============================================================================

describe('SET_SPECIALIST (single-service)', () => {
  it('sets specialist and advances to step 3', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A }) })
    act(() => { ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST }) })

    expect(ctx.state.specialist).toEqual(MOCK_SPECIALIST)
    expect(ctx.state.step).toBe(3)
    expect(ctx.state.date).toBeNull()
  })

  it('clears date and time when specialist changes', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST })
      ctx.dispatch({ type: 'SET_DATETIME', payload: { date: '2026-06-10', time: '10:00' } })
    })
    expect(ctx.state.date).toBe('2026-06-10')

    act(() => { ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST_B }) })
    expect(ctx.state.date).toBeNull()
    expect(ctx.state.time).toBeNull()
  })
})

// ============================================================================
// 6. Specialist assignment — multi-service
// ============================================================================

describe('ASSIGN_SPECIALIST (multi-service group mode)', () => {
  it('assigns specialist to first service, increments index', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_B })
      ctx.dispatch({ type: 'CONFIRM_SERVICES' })
    })

    act(() => {
      ctx.dispatch({ type: 'ASSIGN_SPECIALIST', payload: MOCK_SPECIALIST })
    })

    expect(ctx.state.serviceAssignments).toHaveLength(1)
    expect(ctx.state.serviceAssignments[0].service.id).toBe(MOCK_SERVICE_A.id)
    expect(ctx.state.serviceAssignments[0].specialist.id).toBe(MOCK_SPECIALIST.id)
    expect(ctx.state.currentAssignmentIdx).toBe(1)
    expect(ctx.state.step).toBe(2) // still on step 2 (more services to assign)
  })

  it('advances to step 3 when all services have specialists', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_B })
      ctx.dispatch({ type: 'CONFIRM_SERVICES' })
    })

    act(() => { ctx.dispatch({ type: 'ASSIGN_SPECIALIST', payload: MOCK_SPECIALIST }) })
    act(() => { ctx.dispatch({ type: 'ASSIGN_SPECIALIST', payload: MOCK_SPECIALIST_B }) })

    expect(ctx.state.step).toBe(3)
    expect(ctx.state.serviceAssignments).toHaveLength(2)
  })
})

// ============================================================================
// 7. Date / time selection
// ============================================================================

describe('SET_DATETIME', () => {
  it('sets date and time, advances to step 4', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST })
      ctx.dispatch({ type: 'SET_DATETIME', payload: { date: '2026-06-15', time: '11:30' } })
    })

    expect(ctx.state.date).toBe('2026-06-15')
    expect(ctx.state.time).toBe('11:30')
    expect(ctx.state.step).toBe(4)
  })
})

// ============================================================================
// 8. Client info
// ============================================================================

describe('SET_CLIENT', () => {
  it('stores client name, phone, and optional email', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_CLIENT', payload: { firstName: 'María', lastName: 'Pérez', phone: '5512345678', email: 'maria@test.com' } })
    })

    expect(ctx.state.clientFirstName).toBe('María')
    expect(ctx.state.clientLastName).toBe('Pérez')
    expect(ctx.state.clientPhone).toBe('5512345678')
    expect(ctx.state.clientEmail).toBe('maria@test.com')
  })

  it('email defaults to empty string when not provided', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_CLIENT', payload: { firstName: 'Carlos', lastName: '', phone: '5500000001' } })
    })

    expect(ctx.state.clientEmail).toBe('')
  })
})

// ============================================================================
// 9. Confirmation
// ============================================================================

describe('SET_CONFIRMATION', () => {
  function setupSingleBooking(ctx) {
    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST })
      ctx.dispatch({ type: 'SET_DATETIME', payload: { date: '2026-06-15', time: '10:00' } })
    })
  }

  it('sets confirmation and advances to step 5', () => {
    let ctx
    renderWithBooking(c => { ctx = c })
    setupSingleBooking(ctx)

    const booking = { code: 'ABC123', date: '2026-06-15', time: '10:00' }
    act(() => { ctx.dispatch({ type: 'SET_CONFIRMATION', payload: booking }) })

    expect(ctx.state.confirmation).toEqual(booking)
    expect(ctx.state.step).toBe(5)
  })

  it('ignores SET_CONFIRMATION without complete single-service state', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      // Missing: specialist + datetime
      ctx.dispatch({ type: 'SET_CONFIRMATION', payload: { code: 'X' } })
    })

    expect(ctx.state.confirmation).toBeNull() // guard prevented it
    expect(ctx.state.step).toBe(2) // stayed at specialist selection
  })

  it('ignores SET_CONFIRMATION without date/time in group mode', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_B })
      ctx.dispatch({ type: 'CONFIRM_SERVICES' })
      ctx.dispatch({ type: 'ASSIGN_SPECIALIST', payload: MOCK_SPECIALIST })
      ctx.dispatch({ type: 'ASSIGN_SPECIALIST', payload: MOCK_SPECIALIST_B })
      // Missing: datetime
      ctx.dispatch({ type: 'SET_CONFIRMATION', payload: { code: 'G1' } })
    })

    expect(ctx.state.confirmation).toBeNull() // guard: no date/time
  })
})

// ============================================================================
// 10. Navigation — GO_BACK
// ============================================================================

describe('GO_BACK', () => {
  it('decrements step from 4 → 3', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST })
      ctx.dispatch({ type: 'SET_DATETIME', payload: { date: '2026-06-15', time: '10:00' } })
    })
    expect(ctx.state.step).toBe(4)

    act(() => { ctx.dispatch({ type: 'GO_BACK' }) })
    expect(ctx.state.step).toBe(3)
  })

  it('clears branch when going back from step 1 with branch selected', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'SET_BRANCH', payload: MOCK_BRANCH }) })
    act(() => { ctx.dispatch({ type: 'GO_BACK' }) })

    expect(ctx.state.branch).toBeNull()
    expect(ctx.state.step).toBe(1)
  })

  it('in multi-service step 2: goes back to previous specialist', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'TOGGLE_SERVICE', payload: MOCK_SERVICE_B })
      ctx.dispatch({ type: 'CONFIRM_SERVICES' })
      ctx.dispatch({ type: 'ASSIGN_SPECIALIST', payload: MOCK_SPECIALIST }) // assigns idx 0
    })
    expect(ctx.state.currentAssignmentIdx).toBe(1)

    act(() => { ctx.dispatch({ type: 'GO_BACK' }) })
    expect(ctx.state.currentAssignmentIdx).toBe(0)
    expect(ctx.state.serviceAssignments).toHaveLength(0)
  })
})

// ============================================================================
// 11. Navigation — GO_TO_STEP
// ============================================================================

describe('GO_TO_STEP', () => {
  it('cannot jump forward (target >= current step is a no-op)', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'GO_TO_STEP', payload: 3 }) })
    expect(ctx.state.step).toBe(1) // still at 1 — can't jump forward
  })

  it('clears downstream state when jumping to step 1', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST })
    })
    expect(ctx.state.step).toBe(3)

    act(() => { ctx.dispatch({ type: 'GO_TO_STEP', payload: 1 }) })
    expect(ctx.state.step).toBe(1)
    expect(ctx.state.specialist).toBeNull()
    expect(ctx.state.date).toBeNull()
  })

  it('jump to step 0 clears branch', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'SET_BRANCH', payload: MOCK_BRANCH }) })
    act(() => { ctx.dispatch({ type: 'GO_TO_STEP', payload: 0 }) })

    expect(ctx.state.branch).toBeNull()
  })
})

// ============================================================================
// 12. RESET
// ============================================================================

describe('RESET', () => {
  it('returns to initial state', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST })
    })
    expect(ctx.state.step).toBe(3)

    act(() => { ctx.dispatch({ type: 'RESET' }) })

    expect(ctx.state.step).toBe(1)
    expect(ctx.state.services).toHaveLength(0)
    expect(ctx.state.specialist).toBeNull()
    expect(ctx.state.confirmation).toBeNull()
  })
})

// ============================================================================
// 13. Session persistence
// ============================================================================

describe('Session persistence (sessionStorage)', () => {
  it('saves state to sessionStorage after each dispatch', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => { ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A }) })

    const saved = JSON.parse(sessionStorage.getItem('cita24_booking'))
    expect(saved).toBeDefined()
    expect(saved.services[0].id).toBe(MOCK_SERVICE_A.id)
  })

  it('clears sessionStorage when reaching step 5 (confirmation)', () => {
    let ctx
    renderWithBooking(c => { ctx = c })

    act(() => {
      ctx.dispatch({ type: 'SET_SERVICE', payload: MOCK_SERVICE_A })
      ctx.dispatch({ type: 'SET_SPECIALIST', payload: MOCK_SPECIALIST })
      ctx.dispatch({ type: 'SET_DATETIME', payload: { date: '2026-06-15', time: '10:00' } })
      ctx.dispatch({ type: 'SET_CONFIRMATION', payload: { code: 'C1' } })
    })

    expect(sessionStorage.getItem('cita24_booking')).toBeNull()
  })

  it('restores state from sessionStorage on mount', () => {
    // Pre-populate sessionStorage
    const savedState = {
      step: 2,
      branch: MOCK_BRANCH,
      services: [MOCK_SERVICE_A],
      serviceAssignments: [],
      currentAssignmentIdx: 0,
      specialist: null,
      date: null,
      time: null,
      clientFirstName: '',
      clientLastName: '',
      clientPhone: '',
      clientEmail: '',
      confirmation: null,
    }
    sessionStorage.setItem('cita24_booking', JSON.stringify(savedState))

    let ctx
    renderWithBooking(c => { ctx = c })

    expect(ctx.state.step).toBe(2)
    expect(ctx.state.services[0].id).toBe(MOCK_SERVICE_A.id)
    expect(ctx.state.branch.id).toBe(MOCK_BRANCH.id)
  })

  it('ignores invalid sessionStorage JSON', () => {
    sessionStorage.setItem('cita24_booking', '{invalid json}')

    let ctx
    renderWithBooking(c => { ctx = c })

    expect(ctx.state.step).toBe(1) // falls back to initial state
  })

  it('does not restore step 5 state (clears to start)', () => {
    const savedState = { step: 5, confirmation: { code: 'C1' } }
    sessionStorage.setItem('cita24_booking', JSON.stringify(savedState))

    let ctx
    renderWithBooking(c => { ctx = c })

    expect(ctx.state.step).toBe(1) // step 5 is discarded
    expect(ctx.state.confirmation).toBeNull()
  })
})

// ============================================================================
// 14. isGroupMode helper
// ============================================================================

describe('isGroupMode helper', () => {
  it('returns false for 0 or 1 service', () => {
    expect(isGroupMode({ services: [] })).toBe(false)
    expect(isGroupMode({ services: [MOCK_SERVICE_A] })).toBe(false)
  })

  it('returns true for 2+ services', () => {
    expect(isGroupMode({ services: [MOCK_SERVICE_A, MOCK_SERVICE_B] })).toBe(true)
    expect(isGroupMode({ services: [MOCK_SERVICE_A, MOCK_SERVICE_B, { id: 3 }] })).toBe(true)
  })
})

// ============================================================================
// 15. useBooking guard
// ============================================================================

describe('useBooking hook guard', () => {
  it('throws when used outside BookingProvider', () => {
    function Broken() {
      useBooking()
      return null
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Broken />)).toThrow('useBooking must be used inside BookingProvider')
    consoleSpy.mockRestore()
  })
})
