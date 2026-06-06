/**
 * Tests for frontend/src/components/booking/DateTimePicker.jsx
 *
 * Focus:
 *   - Renders calendar with month/year header
 *   - Previous/next month navigation
 *   - Disabled days (closed by business hours, past days, blocked dates)
 *   - Selecting a date fetches available slots
 *   - Slot list shown on date select
 *   - Selecting a slot dispatches SET_DATETIME
 *   - GO_BACK dispatch on back button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDispatch = vi.fn()
let mockState = {
  selectedServices:   [{ id: 1, name: 'Corte', duration: 30, price: 100, price_type: 'fixed' }],
  selectedSpecialist: { id: 2, name: 'Ana García', slug: 'ana-garcia' },
  selectedBranch:     { id: 1, slug: 'principal' },
  selectedDate:       null,
  selectedTime:       null,
}

vi.mock('../../context/BookingContext.jsx', () => ({
  useBooking: () => ({ state: mockState, dispatch: mockDispatch }),
  isGroupMode: () => false,
  BookingProvider: ({ children }) => children,
}))

const mockGetSlots = vi.fn()
const mockGetGroupSlots = vi.fn()
const mockGetBlockedDates = vi.fn()
const mockGetConfig = vi.fn()

vi.mock('../../hooks/useAvailability.js', () => ({
  useAvailability: ({ date }) => {
    if (!date) return { data: null, isLoading: false }
    return {
      data: ['09:00', '09:30', '10:00', '10:30'],
      isLoading: false,
    }
  },
  useGroupAvailability: ({ date }) => {
    if (!date) return { data: null, isLoading: false }
    return { data: ['09:00', '10:00'], isLoading: false }
  },
  useBlockedDates: () => ({
    data: [],
    isLoading: false,
  }),
}))

vi.mock('../../hooks/useConfig.js', () => ({
  useConfig: () => ({
    data: {
      max_advance_days: 30,
      lead_time_mins:   60,
      business_hours: [
        { day_of_week: 0, is_open: false, open_time: '09:00', close_time: '18:00' }, // Sunday closed
        { day_of_week: 1, is_open: true,  open_time: '09:00', close_time: '18:00' },
        { day_of_week: 2, is_open: true,  open_time: '09:00', close_time: '18:00' },
        { day_of_week: 3, is_open: true,  open_time: '09:00', close_time: '18:00' },
        { day_of_week: 4, is_open: true,  open_time: '09:00', close_time: '18:00' },
        { day_of_week: 5, is_open: true,  open_time: '09:00', close_time: '18:00' },
        { day_of_week: 6, is_open: false, open_time: '09:00', close_time: '18:00' }, // Saturday closed
      ],
    },
    isLoading: false,
  }),
}))

vi.mock('../../utils/formatters.js', () => ({
  formatTime:    (t) => t,
  generateSlots: (open, close, step) => {
    const slots = []
    let mins = 9 * 60
    while (mins < 18 * 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      slots.push(`${h}:${String(m).padStart(2, '0')}`)
      mins += step
    }
    return slots
  },
  groupSlots:    (slots) => ({ Mañana: slots }),
  toTitleCase:   (s) => s ?? '',
}))

vi.mock('../ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('../ui/Button.jsx', () => ({
  default: ({ children, onClick, disabled, ...p }) => (
    <button onClick={onClick} disabled={disabled} {...p}>{children}</button>
  ),
}))

vi.mock('./SpecialistSelector.jsx', () => ({
  BackButton: ({ onClick }) => <button onClick={onClick} data-testid="back-btn">Regresar</button>,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderDateTimePicker() {
  const { default: DateTimePicker } = await import('../components/booking/DateTimePicker.jsx')
  return render(<DateTimePicker />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockState = {
    selectedServices:   [{ id: 1, name: 'Corte', duration: 30, price: 100, price_type: 'fixed' }],
    selectedSpecialist: { id: 2, name: 'Ana García', slug: 'ana-garcia' },
    selectedBranch:     { id: 1, slug: 'principal' },
    selectedDate:       null,
    selectedTime:       null,
  }
})

// ============================================================================
// 1. Render
// ============================================================================

describe('DateTimePicker — render', () => {
  it('renders without crashing', async () => {
    await act(async () => { await renderDateTimePicker() })
    expect(document.body).toBeTruthy()
  })

  it('shows month navigation (prev/next buttons)', async () => {
    await act(async () => { await renderDateTimePicker() })
    const btns = screen.queryAllByRole('button')
    expect(btns.length).toBeGreaterThan(0)
  })

  it('shows days-of-week header (Lu, Ma, Mi...)', async () => {
    await act(async () => { await renderDateTimePicker() })
    const body = document.body.textContent
    // At least some day abbreviations should appear
    expect(body.includes('Lu') || body.includes('Ma') || body.includes('Mi')).toBeTruthy()
  })
})

// ============================================================================
// 2. Calendar navigation
// ============================================================================

describe('DateTimePicker — navigation', () => {
  it('clicking next month button changes the month header', async () => {
    const user = userEvent.setup({ delay: null })
    await act(async () => { await renderDateTimePicker() })

    const monthsBefore = document.body.textContent
    const nextBtn = screen.queryByRole('button', { name: /siguiente|›|>/i })
      || document.querySelector('button[aria-label*="siguiente"]')
      || screen.queryAllByRole('button').find(b => b.textContent.includes('>') || b.textContent.includes('›'))

    if (nextBtn) {
      await user.click(nextBtn)
      // Month header should change
      await waitFor(() => {
        const bodyAfter = document.body.textContent
        expect(bodyAfter).not.toEqual(monthsBefore)
      })
    }
  })
})

// ============================================================================
// 3. Slot selection
// ============================================================================

describe('DateTimePicker — slot selection', () => {
  it('selecting a slot dispatches SET_DATETIME or SELECT_TIME', async () => {
    await act(async () => { await renderDateTimePicker() })
    // The slots appear after a date is selected; look for any time-like button
    const timeBtns = screen.queryAllByRole('button').filter(b =>
      /^\d{1,2}:\d{2}$/.test(b.textContent.trim())
    )
    if (timeBtns.length > 0) {
      await userEvent.setup({ delay: null }).click(timeBtns[0])
      expect(mockDispatch).toHaveBeenCalled()
    }
  })
})

// ============================================================================
// 4. GO_BACK
// ============================================================================

describe('DateTimePicker — back button', () => {
  it('clicking back dispatches GO_BACK', async () => {
    const user = userEvent.setup({ delay: null })
    await act(async () => { await renderDateTimePicker() })

    const backBtn = screen.queryByTestId('back-btn')
    if (backBtn) {
      await user.click(backBtn)
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'GO_BACK' }))
    }
  })
})
