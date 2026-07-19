// @vitest-environment jsdom
/**
 * Unit — BookingSummary component
 *
 * File: frontend/src/components/booking/BookingSummary.jsx
 *
 * Logic under test (not covered elsewhere):
 *
 *   shortDate(dateStr) — private, tested indirectly:
 *     - '2026-06-15' → formats with es-MX locale (weekday, day, month)
 *     - null/undefined/''/falsy → returns ''
 *
 *   nameInitials(name) — private, tested indirectly:
 *     - 'Juan Pérez' → 'JP'
 *     - 'Juan' → 'J' (single word)
 *     - 'juan pérez' → 'JP' (toUpperCase)
 *     - '' / null / whitespace-only → '?' (fallback)
 *     - 'Ana María García' → 'AM' (only first 2 words)
 *
 *   items assembly (component renders SummaryStrip with computed items):
 *     - No state → empty items list
 *     - branch in state → branch item with nameInitials applied
 *     - single service → label = service name; category = 'servicio'
 *     - multi-service → label = 'Name +N más'; category = 'servicios'
 *     - single specialist (non-group) → specialist item with specialty
 *     - group mode → specialists item using serviceAssignments
 *     - date + time → datetime item appears
 *     - partial state (branch only, no date) → only branch item built
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseBooking   = vi.fn()
const mockIsGroupMode  = vi.fn(() => false)
const mockUseConfig    = vi.fn()

vi.mock('../context/BookingContext', () => ({
  useBooking:  () => mockUseBooking(),
  isGroupMode: (state) => mockIsGroupMode(state),
}))

vi.mock('../hooks/useConfig', () => ({
  useConfig: () => mockUseConfig(),
}))

vi.mock('../utils/formatters', () => ({
  toTitleCase:           (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '',
  formatTime:            (t, _fmt) => t || '',
  formatCombinedPrice:   (_services) => '$100',
  formatPrice:           (p) => `$${Number(p ?? 0).toFixed(0)}`,
  promoSavings:          (services) => (services ?? []).reduce((s, x) => s + (x.promo?.discountAmount || 0), 0),
}))

// SummaryStrip stub: renders each item's data as accessible text so tests can
// inspect the assembled items without depending on SummaryStrip's own rendering.
let capturedItems = []
vi.mock('../components/ui/SummaryStrip', () => ({
  default: ({ items }) => {
    capturedItems = items
    return (
      <ul data-testid="summary-strip">
        {items.map(item => (
          <li key={item.id} data-id={item.id} data-category={item.category}>
            <span data-testid={`label-${item.id}`}>{item.label}</span>
            {item.sub && <span data-testid={`sub-${item.id}`}>{item.sub}</span>}
            {item.avatars?.map((av, i) => (
              <span key={i} data-testid={`initials-${item.id}-${i}`}>{av.initials}</span>
            ))}
          </li>
        ))}
      </ul>
    )
  },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EMPTY_STATE = {
  branch: null, services: [], specialist: null,
  serviceAssignments: [], date: null, time: null, step: 0,
}

function makeState(overrides = {}) {
  return { ...EMPTY_STATE, ...overrides }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderSummary(state, configData = { time_format: '12h' }) {
  mockUseBooking.mockReturnValue({ state })
  mockUseConfig.mockReturnValue({ data: configData })
  capturedItems = []

  const { default: BookingSummary } = await import('../components/booking/BookingSummary.jsx')
  return render(<BookingSummary />)
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedItems = []
  mockIsGroupMode.mockReturnValue(false)
})

// ============================================================================
// 1. Empty state — no items
// ============================================================================

describe('BookingSummary — empty state', () => {
  it('renders SummaryStrip with no items when state is empty', async () => {
    await renderSummary(makeState())
    expect(capturedItems).toHaveLength(0)
  })

  it('renders the summary strip element even when empty', async () => {
    await renderSummary(makeState())
    expect(screen.getByTestId('summary-strip')).toBeTruthy()
  })
})

// ============================================================================
// 2. nameInitials() — tested indirectly via branch/specialist avatar initials
// ============================================================================

describe('BookingSummary — nameInitials() via branch avatar', () => {
  it('"Juan Pérez" → initials "JP"', async () => {
    await renderSummary(makeState({
      branch: { name: 'Juan Pérez', image_url: null },
    }))
    expect(screen.getByTestId('initials-branch-0').textContent).toBe('JP')
  })

  it('"juan pérez" → "JP" (toUpperCase applied)', async () => {
    await renderSummary(makeState({
      branch: { name: 'juan pérez', image_url: null },
    }))
    expect(screen.getByTestId('initials-branch-0').textContent).toBe('JP')
  })

  it('"María" single word → "M"', async () => {
    await renderSummary(makeState({
      branch: { name: 'María', image_url: null },
    }))
    expect(screen.getByTestId('initials-branch-0').textContent).toBe('M')
  })

  it('"Ana María García" → "AM" (only first 2 words)', async () => {
    await renderSummary(makeState({
      branch: { name: 'Ana María García', image_url: null },
    }))
    expect(screen.getByTestId('initials-branch-0').textContent).toBe('AM')
  })

  it('empty name "" → fallback "?"', async () => {
    await renderSummary(makeState({
      branch: { name: '', image_url: null },
    }))
    expect(screen.getByTestId('initials-branch-0').textContent).toBe('?')
  })

  it('null name → fallback "?"', async () => {
    await renderSummary(makeState({
      branch: { name: null, image_url: null },
    }))
    expect(screen.getByTestId('initials-branch-0').textContent).toBe('?')
  })

  it('whitespace-only name "   " → fallback "?"', async () => {
    await renderSummary(makeState({
      branch: { name: '   ', image_url: null },
    }))
    expect(screen.getByTestId('initials-branch-0').textContent).toBe('?')
  })
})

// ============================================================================
// 3. Branch item assembly
// ============================================================================

describe('BookingSummary — branch item', () => {
  it('produces a branch item with category "sucursal"', async () => {
    await renderSummary(makeState({
      branch: { name: 'Sucursal Norte', image_url: null },
    }))
    const item = capturedItems.find(i => i.id === 'branch')
    expect(item).toBeTruthy()
    expect(item.category).toBe('sucursal')
  })

  it('uses image_url as src when provided', async () => {
    await renderSummary(makeState({
      branch: { name: 'Norte', image_url: 'https://example.com/img.jpg' },
    }))
    const item = capturedItems.find(i => i.id === 'branch')
    expect(item.avatars[0].src).toBe('https://example.com/img.jpg')
  })

  it('src is null when image_url is falsy', async () => {
    await renderSummary(makeState({
      branch: { name: 'Norte', image_url: '' },
    }))
    const item = capturedItems.find(i => i.id === 'branch')
    expect(item.avatars[0].src).toBeNull()
  })

  it('no branch in state → no branch item in list', async () => {
    await renderSummary(makeState())
    expect(capturedItems.find(i => i.id === 'branch')).toBeUndefined()
  })
})

// ============================================================================
// 4. Service item — single vs multi
// ============================================================================

describe('BookingSummary — service item', () => {
  const SERVICE_A = { name: 'corte', duration: 30, imageUrl: null }
  const SERVICE_B = { name: 'barba', duration: 20, imageUrl: null }

  it('single service → category "servicio", label = service name', async () => {
    await renderSummary(makeState({ services: [SERVICE_A] }))
    const item = capturedItems.find(i => i.id === 'service')
    expect(item.category).toBe('servicio')
    expect(item.label).toMatch(/corte/i)
  })

  it('single service → sub includes total duration', async () => {
    await renderSummary(makeState({ services: [SERVICE_A] }))
    const item = capturedItems.find(i => i.id === 'service')
    expect(item.sub).toMatch(/30 min/)
  })

  it('two services → category "servicios"', async () => {
    await renderSummary(makeState({ services: [SERVICE_A, SERVICE_B] }))
    const item = capturedItems.find(i => i.id === 'service')
    expect(item.category).toBe('servicios')
  })

  it('two services → label = "FirstName +1 más"', async () => {
    await renderSummary(makeState({ services: [SERVICE_A, SERVICE_B] }))
    const item = capturedItems.find(i => i.id === 'service')
    expect(item.label).toMatch(/\+1 más/)
  })

  it('three services → label = "FirstName +2 más"', async () => {
    const svcC = { name: 'tinte', duration: 60, imageUrl: null }
    await renderSummary(makeState({ services: [SERVICE_A, SERVICE_B, svcC] }))
    const item = capturedItems.find(i => i.id === 'service')
    expect(item.label).toMatch(/\+2 más/)
  })

  it('multi-service → sub includes combined duration', async () => {
    await renderSummary(makeState({ services: [SERVICE_A, SERVICE_B] }))
    const item = capturedItems.find(i => i.id === 'service')
    // 30 + 20 = 50 min
    expect(item.sub).toMatch(/50 min/)
  })

  it('multi-service → one avatar per service', async () => {
    await renderSummary(makeState({ services: [SERVICE_A, SERVICE_B] }))
    const item = capturedItems.find(i => i.id === 'service')
    expect(item.avatars).toHaveLength(2)
  })

  it('no services → no service item', async () => {
    await renderSummary(makeState({ services: [] }))
    expect(capturedItems.find(i => i.id === 'service')).toBeUndefined()
  })
})

// ============================================================================
// 5. Specialist item (single, non-group mode)
// ============================================================================

describe('BookingSummary — specialist item', () => {
  const SPECIALIST = {
    name: 'pedro ruiz', avatarUrl: null, initials: null, specialty: 'Barbero',
  }

  it('produces a specialist item with category "especialista"', async () => {
    await renderSummary(makeState({ specialist: SPECIALIST }))
    const item = capturedItems.find(i => i.id === 'specialist')
    expect(item).toBeTruthy()
    expect(item.category).toBe('especialista')
  })

  it('specialist sub = specialty when provided', async () => {
    await renderSummary(makeState({ specialist: SPECIALIST }))
    const item = capturedItems.find(i => i.id === 'specialist')
    expect(item.sub).toBe('Barbero')
  })

  it('specialist sub = null when specialty is falsy', async () => {
    await renderSummary(makeState({
      specialist: { ...SPECIALIST, specialty: null },
    }))
    const item = capturedItems.find(i => i.id === 'specialist')
    expect(item.sub).toBeNull()
  })

  it('uses pre-computed initials when specialist.initials is set', async () => {
    await renderSummary(makeState({
      specialist: { ...SPECIALIST, initials: 'PR' },
    }))
    const item = capturedItems.find(i => i.id === 'specialist')
    expect(item.avatars[0].initials).toBe('PR')
  })

  it('falls back to nameInitials() when specialist.initials is null', async () => {
    await renderSummary(makeState({
      specialist: { ...SPECIALIST, name: 'Pedro Ruiz', initials: null },
    }))
    const item = capturedItems.find(i => i.id === 'specialist')
    expect(item.avatars[0].initials).toBe('PR')
  })
})

// ============================================================================
// 6. Group mode — serviceAssignments
// ============================================================================

describe('BookingSummary — group mode specialists', () => {
  const SERVICE_A = { name: 'corte', duration: 30, imageUrl: null }
  const ASSIGNMENT_A = {
    specialist: { name: 'María López', avatarUrl: null, initials: null },
    service: SERVICE_A,
  }
  const ASSIGNMENT_B = {
    specialist: { name: 'Carlos Díaz', avatarUrl: null, initials: 'CD' },
    service: SERVICE_A,
  }

  beforeEach(() => mockIsGroupMode.mockReturnValue(true))

  it('group mode → produces "specialists" item (plural)', async () => {
    await renderSummary(makeState({
      services:           [SERVICE_A, SERVICE_A],
      serviceAssignments: [ASSIGNMENT_A],
    }))
    const item = capturedItems.find(i => i.id === 'specialists')
    expect(item).toBeTruthy()
    expect(item.category).toBe('especialistas')
  })

  it('single assignment → label = specialist name', async () => {
    await renderSummary(makeState({
      services:           [SERVICE_A],
      serviceAssignments: [ASSIGNMENT_A],
    }))
    const item = capturedItems.find(i => i.id === 'specialists')
    expect(item.label).toMatch(/María/i)
  })

  it('two assignments → label = "First y 1 más"', async () => {
    await renderSummary(makeState({
      services:           [SERVICE_A, SERVICE_A],
      serviceAssignments: [ASSIGNMENT_A, ASSIGNMENT_B],
    }))
    const item = capturedItems.find(i => i.id === 'specialists')
    expect(item.label).toMatch(/y 1 más/)
  })

  it('sub shows "N de total" format', async () => {
    await renderSummary(makeState({
      services:           [SERVICE_A, SERVICE_A],
      serviceAssignments: [ASSIGNMENT_A],
    }))
    const item = capturedItems.find(i => i.id === 'specialists')
    expect(item.sub).toMatch(/1 de 2/)
  })

  it('group mode → does NOT produce single "specialist" item', async () => {
    await renderSummary(makeState({
      services:           [SERVICE_A],
      serviceAssignments: [ASSIGNMENT_A],
      specialist:         { name: 'Fallback', avatarUrl: null, initials: null },
    }))
    expect(capturedItems.find(i => i.id === 'specialist')).toBeUndefined()
  })
})

// ============================================================================
// 7. shortDate() — tested via datetime item label
// ============================================================================

describe('BookingSummary — shortDate() via datetime item', () => {
  it('date + time in state → datetime item exists', async () => {
    await renderSummary(makeState({ date: '2026-06-15', time: '10:00' }))
    const item = capturedItems.find(i => i.id === 'datetime')
    expect(item).toBeTruthy()
  })

  it('datetime item category is "horario"', async () => {
    await renderSummary(makeState({ date: '2026-06-15', time: '10:00' }))
    const item = capturedItems.find(i => i.id === 'datetime')
    expect(item.category).toBe('horario')
  })

  it('datetime label is a non-empty string (shortDate returns formatted date)', async () => {
    await renderSummary(makeState({ date: '2026-06-15', time: '10:00' }))
    const item = capturedItems.find(i => i.id === 'datetime')
    expect(typeof item.label).toBe('string')
    expect(item.label.length).toBeGreaterThan(0)
  })

  it('no date in state → no datetime item', async () => {
    await renderSummary(makeState({ date: null, time: '10:00' }))
    expect(capturedItems.find(i => i.id === 'datetime')).toBeUndefined()
  })

  it('no time in state → no datetime item', async () => {
    await renderSummary(makeState({ date: '2026-06-15', time: null }))
    expect(capturedItems.find(i => i.id === 'datetime')).toBeUndefined()
  })

  it('shortDate with null → empty string (no datetime item produced)', async () => {
    // Verified via: no date → guard `if (state.date && state.time)` fails → no item
    await renderSummary(makeState())
    expect(capturedItems.find(i => i.id === 'datetime')).toBeUndefined()
  })
})

// ============================================================================
// 8. Partial state — mixed combinations
// ============================================================================

describe('BookingSummary — partial state combinations', () => {
  it('branch only → only 1 item (branch)', async () => {
    await renderSummary(makeState({
      branch: { name: 'Norte', image_url: null },
    }))
    expect(capturedItems).toHaveLength(1)
    expect(capturedItems[0].id).toBe('branch')
  })

  it('branch + service + date/time → 3 items in correct order', async () => {
    await renderSummary(makeState({
      branch:   { name: 'Norte', image_url: null },
      services: [{ name: 'corte', duration: 30, imageUrl: null }],
      date:     '2026-06-15',
      time:     '09:00',
    }))
    const ids = capturedItems.map(i => i.id)
    expect(ids).toEqual(['branch', 'service', 'datetime'])
  })

  it('service + specialist → service and specialist items, no branch or datetime', async () => {
    await renderSummary(makeState({
      services:   [{ name: 'barba', duration: 20, imageUrl: null }],
      specialist: { name: 'Luis', avatarUrl: null, initials: 'L', specialty: null },
    }))
    const ids = capturedItems.map(i => i.id)
    expect(ids).toContain('service')
    expect(ids).toContain('specialist')
    expect(ids).not.toContain('branch')
    expect(ids).not.toContain('datetime')
  })
})

// ============================================================================
// 9. "Indicaciones previas" popover — requirements / prerequisite
// ============================================================================

describe('BookingSummary — indicaciones previas', () => {
  const PLAIN_SERVICE = { id: 'corte', name: 'corte', duration: 30, imageUrl: null }
  const TEXT_ONLY_SERVICE = {
    id: 'laser', name: 'depilación láser', duration: 45, imageUrl: null,
    requirements: 'No exponerse al sol 48 h antes.\nLlegar sin cremas.',
    prerequisite: null,
  }
  const PREREQ_SERVICE = {
    id: 'botox', name: 'botox', duration: 30, imageUrl: null,
    requirements: null,
    prerequisite: { id: 'valoracion', dbId: 10, name: 'valoración previa', bookable: true },
  }

  function openPopover() {
    fireEvent.click(screen.getByRole('button', { name: /Indicaciones previas/ }))
  }

  it('no pill when no selected service has requirements/prerequisite', async () => {
    await renderSummary(makeState({ services: [PLAIN_SERVICE] }))
    expect(screen.queryByRole('button', { name: /Indicaciones previas/ })).toBeNull()
  })

  it('no pill when there are no services at all', async () => {
    await renderSummary(makeState())
    expect(screen.queryByRole('button', { name: /Indicaciones previas/ })).toBeNull()
  })

  it('shows a collapsed pill (not the content) by default when a service is flagged', async () => {
    await renderSummary(makeState({ services: [PLAIN_SERVICE, TEXT_ONLY_SERVICE] }))
    expect(screen.getByRole('button', { name: /Indicaciones previas/ })).toBeTruthy()
    expect(screen.queryByText('Depilación láser')).toBeNull()
    expect(screen.queryByRole('dialog', { name: /Indicaciones previas/ })).toBeNull()
  })

  it('clicking the pill opens the popover with requirements text', async () => {
    await renderSummary(makeState({ services: [PLAIN_SERVICE, TEXT_ONLY_SERVICE] }))
    openPopover()
    expect(screen.getByRole('dialog', { name: /Indicaciones previas/ })).toBeTruthy()
    expect(screen.getByText('Depilación láser')).toBeTruthy()
    const reqText = screen.getByText(/No exponerse al sol 48 h antes\./)
    expect(reqText.className).toContain('whitespace-pre-line')
  })

  it('clicking the pill opens the popover with prerequisite text', async () => {
    await renderSummary(makeState({ services: [PREREQ_SERVICE] }))
    openPopover()
    expect(screen.getByText(/Requiere haber tomado: Valoración previa/)).toBeTruthy()
  })

  it('does not include plain (non-flagged) services in the popover listing', async () => {
    await renderSummary(makeState({ services: [PLAIN_SERVICE, TEXT_ONLY_SERVICE] }))
    openPopover()
    // "corte" appears in the SummaryStrip service item, but not as its own
    // entry inside the popover (only Depilación Láser is flagged).
    const box = screen.getByRole('dialog', { name: /Indicaciones previas/ })
    expect(box.textContent).not.toMatch(/Corte/)
  })

  it('clicking the pill again closes the popover', async () => {
    await renderSummary(makeState({ services: [TEXT_ONLY_SERVICE] }))
    openPopover()
    expect(screen.getByRole('dialog', { name: /Indicaciones previas/ })).toBeTruthy()
    openPopover()
    expect(screen.queryByRole('dialog', { name: /Indicaciones previas/ })).toBeNull()
  })

  it('pressing Escape closes the popover', async () => {
    await renderSummary(makeState({ services: [TEXT_ONLY_SERVICE] }))
    openPopover()
    expect(screen.getByRole('dialog', { name: /Indicaciones previas/ })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /Indicaciones previas/ })).toBeNull()
  })

  it('clicking outside the popover closes it', async () => {
    await renderSummary(makeState({ services: [TEXT_ONLY_SERVICE] }))
    openPopover()
    expect(screen.getByRole('dialog', { name: /Indicaciones previas/ })).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog', { name: /Indicaciones previas/ })).toBeNull()
  })
})
