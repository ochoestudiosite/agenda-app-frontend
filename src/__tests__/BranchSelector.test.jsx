/**
 * Tests for frontend/src/components/booking/BranchSelector.jsx
 *
 * Focus:
 *   - Renders list of branches
 *   - Clicking a branch dispatches SET_BRANCH
 *   - Shows branch name and address
 *   - Shows initials when no image_url
 *   - Renders empty state gracefully when branches is []
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDispatch = vi.fn()
const mockState = { step: 1, branch: null, services: [], specialists: [] }

vi.mock('../context/BookingContext', () => ({
  useBooking: () => ({ state: mockState, dispatch: mockDispatch }),
  BookingProvider: ({ children }) => children,
  isGroupMode: () => false,
}))

vi.mock('../utils/formatters', () => ({
  toTitleCase: (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '',
  formatServicePrice: () => '$100',
  formatCombinedPrice: () => '$100',
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BRANCHES = [
  { id: 1, name: 'Sucursal Centro', address: 'Av. Juárez 100', phone: '5512345678', image_url: null },
  { id: 2, name: 'Sucursal Norte',  address: null, phone: null, image_url: null },
  { id: 3, name: 'Sucursal Sur',    address: 'Calle 10 #5', phone: '5598765432', image_url: 'https://img.test/photo.jpg' },
]

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderBranchSelector(branches = BRANCHES) {
  const { default: BranchSelector } = await import('../components/booking/BranchSelector.jsx')
  return render(<BranchSelector branches={branches} />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// 1. Render
// ============================================================================

describe('BranchSelector — render', () => {
  it('renders without crashing', async () => {
    await renderBranchSelector()
    expect(document.body).toBeTruthy()
  })

  it('renders the title "Elige tu sucursal"', async () => {
    await renderBranchSelector()
    expect(screen.getByText(/elige tu sucursal/i)).toBeTruthy()
  })

  it('renders all branch names', async () => {
    await renderBranchSelector()
    expect(screen.getByText(/sucursal centro/i)).toBeTruthy()
    expect(screen.getByText(/sucursal norte/i)).toBeTruthy()
    expect(screen.getByText(/sucursal sur/i)).toBeTruthy()
  })

  it('renders address when present', async () => {
    await renderBranchSelector()
    expect(screen.getByText(/av\. juárez 100/i)).toBeTruthy()
  })

  it('does not render address cell when address is null', async () => {
    await renderBranchSelector([BRANCHES[1]]) // Sucursal Norte has no address
    expect(screen.queryByText(/av\. juárez/i)).toBeNull()
  })

  it('renders phone when present', async () => {
    await renderBranchSelector()
    expect(screen.getByText('5512345678')).toBeTruthy()
  })

  it('renders initials for branch without image', async () => {
    await renderBranchSelector([BRANCHES[0]])
    // "Sucursal Centro" → "SC"
    expect(screen.getByText(/^SC$/)).toBeTruthy()
  })

  it('renders empty gracefully when branches is []', async () => {
    await renderBranchSelector([])
    expect(document.body).toBeTruthy()
    // No branch buttons
    expect(screen.queryAllByRole('button').length).toBe(0)
  })
})

// ============================================================================
// 2. Click → SET_BRANCH dispatch
// ============================================================================

describe('BranchSelector — click dispatch', () => {
  it('dispatches SET_BRANCH when a branch is clicked', async () => {
    const user = userEvent.setup()
    await renderBranchSelector()

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_BRANCH',
      payload: BRANCHES[0],
    })
  })

  it('dispatches SET_BRANCH with the correct branch object for the second branch', async () => {
    const user = userEvent.setup()
    await renderBranchSelector()

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1])

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_BRANCH',
      payload: BRANCHES[1],
    })
  })

  it('each branch button is independently clickable', async () => {
    const user = userEvent.setup()
    await renderBranchSelector()

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(BRANCHES.length)

    await user.click(buttons[2])
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_BRANCH',
      payload: BRANCHES[2],
    })
  })
})

// ============================================================================
// 3. Single branch auto-select hint
// ============================================================================

describe('BranchSelector — single branch', () => {
  it('renders single branch without crashing', async () => {
    await renderBranchSelector([BRANCHES[0]])
    expect(screen.getByText(/sucursal centro/i)).toBeTruthy()
  })

  it('clicking single branch dispatches SET_BRANCH', async () => {
    const user = userEvent.setup()
    await renderBranchSelector([BRANCHES[0]])

    const btn = screen.getByRole('button')
    await user.click(btn)

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_BRANCH',
      payload: BRANCHES[0],
    })
  })
})
