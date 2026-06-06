// @vitest-environment jsdom
/**
 * Tests for frontend/src/pages/Manage.jsx
 *
 * Key behaviors:
 *   - CODE_RE = /^[A-Z0-9]{6,12}$/ — URL param ?code is sanitized and validated
 *     before triggering a lookup; invalid codes produce activeCode = ''
 *   - AppointmentLookup always renders (shows search input regardless of code)
 *   - When a valid individual appointment is found → AppointmentCard shown
 *   - When individual lookup 404s and group found → GroupAppointmentCard shown
 *   - When error (non-404) → error message shown
 *   - handleSearch() updates URL search params and clears local state
 *
 * Child components (AppointmentLookup, AppointmentCard, GroupAppointmentCard)
 * are individually tested in their own files — mocked here as lightweight stubs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseAppointmentLookup      = vi.fn()
const mockUseGroupAppointmentLookup = vi.fn()
const mockToast                     = vi.fn()

vi.mock('../hooks/useAppointment', () => ({
  useAppointmentLookup:      (...a) => mockUseAppointmentLookup(...a),
  useGroupAppointmentLookup: (...a) => mockUseGroupAppointmentLookup(...a),
}))

vi.mock('../components/ui/Toast', () => ({
  useToast: () => mockToast,
}))

// Stub child components — each is individually tested elsewhere
vi.mock('../components/manage/AppointmentLookup', () => ({
  default: ({ initialCode, onSearch, loading }) => (
    <div data-testid="appointment-lookup" data-initial-code={initialCode}>
      <button onClick={() => onSearch('NEWCO1')}>Search</button>
      {loading && <span data-testid="lookup-loading" />}
    </div>
  ),
}))

vi.mock('../components/manage/AppointmentCard', () => ({
  default: ({ appointment }) => (
    <div data-testid="appointment-card">{appointment?.code}</div>
  ),
}))

vi.mock('../components/manage/GroupAppointmentCard', () => ({
  default: ({ group }) => (
    <div data-testid="group-appointment-card">{group?.group_code}</div>
  ),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_APPOINTMENT = {
  code: 'ABC123',
  client_name: 'María López',
  status: 'confirmed',
  service_name: 'Corte',
}

const MOCK_GROUP = {
  group_code: 'GRP001',
  appointments: [MOCK_APPOINTMENT],
}

// Default query states — no code in URL, no data
const IDLE_QUERY      = { data: null, isLoading: false, isError: false, error: null }
const LOADING_QUERY   = { data: null, isLoading: true,  isError: false, error: null }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderManage(search = '') {
  const { default: Manage } = await import('../pages/Manage.jsx')
  return render(
    <MemoryRouter initialEntries={[`/manage${search}`]}>
      <Routes>
        <Route path="/manage" element={<Manage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAppointmentLookup.mockReturnValue(IDLE_QUERY)
  mockUseGroupAppointmentLookup.mockReturnValue(IDLE_QUERY)
})

// ============================================================================
// 1. Always renders AppointmentLookup
// ============================================================================

describe('Manage — AppointmentLookup always present', () => {
  it('renders AppointmentLookup regardless of URL code', async () => {
    await renderManage()
    await waitFor(() => {
      expect(screen.getByTestId('appointment-lookup')).toBeTruthy()
    })
  })

  it('page heading visible', async () => {
    await renderManage()
    await waitFor(() => {
      expect(screen.getByText(/Encuentra tu cita/i)).toBeTruthy()
    })
  })
})

// ============================================================================
// 2. CODE_RE filtering — URL param ?code sanitization
// ============================================================================

describe('Manage — CODE_RE validation of ?code URL param', () => {
  it('valid 6-char uppercase code → passed as initialCode', async () => {
    await renderManage('?code=ABC123')
    await waitFor(() => {
      const el = screen.getByTestId('appointment-lookup')
      expect(el.dataset.initialCode).toBe('ABC123')
    })
  })

  it('valid 12-char code → passed as initialCode', async () => {
    await renderManage('?code=ABCDEF123456')
    await waitFor(() => {
      const el = screen.getByTestId('appointment-lookup')
      expect(el.dataset.initialCode).toBe('ABCDEF123456')
    })
  })

  it('lowercase code → toUpperCase() applied → stripped to empty (if not valid after uppercase)', async () => {
    // 'abc123' → uppercase → 'ABC123' (6 chars, valid regex) → activeCode = 'ABC123'
    await renderManage('?code=abc123')
    await waitFor(() => {
      const el = screen.getByTestId('appointment-lookup')
      // After toUpperCase and stripping non-[A-Z0-9], 'ABC123' passes CODE_RE
      expect(el.dataset.initialCode).toBe('ABC123')
    })
  })

  it('code with special chars → stripped → if remaining < 6 chars → empty initialCode', async () => {
    // '!@#$%^' → strip non-[A-Z0-9] → '' → '' doesn't match CODE_RE → activeCode = ''
    await renderManage('?code=!@#$%25^')
    await waitFor(() => {
      const el = screen.getByTestId('appointment-lookup')
      expect(el.dataset.initialCode).toBe('')
    })
  })

  it('code of 5 chars → does not match CODE_RE (min 6) → empty initialCode', async () => {
    await renderManage('?code=ABCDE')
    await waitFor(() => {
      const el = screen.getByTestId('appointment-lookup')
      expect(el.dataset.initialCode).toBe('')
    })
  })

  it('code of 13 chars → does not match CODE_RE (max 12) → empty initialCode', async () => {
    await renderManage('?code=ABCDEFGHIJKLM')
    await waitFor(() => {
      const el = screen.getByTestId('appointment-lookup')
      expect(el.dataset.initialCode).toBe('')
    })
  })

  it('no code in URL → initialCode is empty string', async () => {
    await renderManage()
    await waitFor(() => {
      const el = screen.getByTestId('appointment-lookup')
      expect(el.dataset.initialCode).toBe('')
    })
  })
})

// ============================================================================
// 3. Individual appointment found → AppointmentCard
// ============================================================================

describe('Manage — individual appointment found', () => {
  it('shows AppointmentCard when single lookup returns data', async () => {
    mockUseAppointmentLookup.mockReturnValue({
      data: MOCK_APPOINTMENT, isLoading: false, isError: false, error: null,
    })
    mockUseGroupAppointmentLookup.mockReturnValue(IDLE_QUERY)

    await renderManage('?code=ABC123')
    await waitFor(() => {
      expect(screen.getByTestId('appointment-card')).toBeTruthy()
    })
  })

  it('does NOT show GroupAppointmentCard when individual data found', async () => {
    mockUseAppointmentLookup.mockReturnValue({
      data: MOCK_APPOINTMENT, isLoading: false, isError: false, error: null,
    })

    await renderManage('?code=ABC123')
    await waitFor(() => expect(screen.getByTestId('appointment-card')).toBeTruthy())
    expect(screen.queryByTestId('group-appointment-card')).toBeNull()
  })
})

// ============================================================================
// 4. Individual 404 + group lookup fallback → GroupAppointmentCard
// ============================================================================

describe('Manage — group appointment fallback', () => {
  it('shows GroupAppointmentCard when individual 404s but group found', async () => {
    mockUseAppointmentLookup.mockReturnValue({
      data: null, isLoading: false, isError: true,
      error: { status: 404 },
    })
    mockUseGroupAppointmentLookup.mockReturnValue({
      data: MOCK_GROUP, isLoading: false, isError: false, error: null,
    })

    await renderManage('?code=GRP001')
    await waitFor(() => {
      expect(screen.getByTestId('group-appointment-card')).toBeTruthy()
    })
  })

  it('does NOT show AppointmentCard when group found', async () => {
    mockUseAppointmentLookup.mockReturnValue({
      data: null, isLoading: false, isError: true,
      error: { status: 404 },
    })
    mockUseGroupAppointmentLookup.mockReturnValue({
      data: MOCK_GROUP, isLoading: false, isError: false, error: null,
    })

    await renderManage('?code=GRP001')
    await waitFor(() => expect(screen.getByTestId('group-appointment-card')).toBeTruthy())
    expect(screen.queryByTestId('appointment-card')).toBeNull()
  })
})

// ============================================================================
// 5. Error state — non-404 error
// ============================================================================

describe('Manage — error state', () => {
  it('shows error message when single lookup fails with non-404', async () => {
    mockUseAppointmentLookup.mockReturnValue({
      data: null, isLoading: false, isError: true,
      error: { status: 500, message: 'Server error' },
    })
    mockUseGroupAppointmentLookup.mockReturnValue(IDLE_QUERY)

    await renderManage('?code=ERR001')
    await waitFor(() => {
      expect(screen.getByText(/Error al buscar la cita/i)).toBeTruthy()
    })
  })

  it('shows 404 message when both single and group lookups fail', async () => {
    mockUseAppointmentLookup.mockReturnValue({
      data: null, isLoading: false, isError: true,
      error: { status: 404 },
    })
    mockUseGroupAppointmentLookup.mockReturnValue({
      data: null, isLoading: false, isError: true,
      error: { status: 404 },
    })

    await renderManage('?code=NOTFND')
    await waitFor(() => {
      expect(screen.getByText(/No se encontró/i)).toBeTruthy()
    })
  })
})

// ============================================================================
// 6. handleSearch — triggered from AppointmentLookup
// ============================================================================

describe('Manage — handleSearch()', () => {
  it('clicking search button in stub triggers re-render without crash', async () => {
    const user = userEvent.setup()
    await renderManage()

    await waitFor(() => screen.getByTestId('appointment-lookup'))
    await user.click(screen.getByText('Search'))

    // After search, component should still be mounted
    expect(screen.getByTestId('appointment-lookup')).toBeTruthy()
  })
})
