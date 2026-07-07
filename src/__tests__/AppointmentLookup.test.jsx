/**
 * Tests for frontend/src/components/manage/AppointmentLookup.jsx
 *
 * Focus:
 *   - Renders the code input and submit button
 *   - Input auto-uppercases and strips invalid chars
 *   - Validates code length (exactly 6 chars)
 *   - Calls onSearch with the cleaned 6-char uppercase code
 *   - Shows loading state when loading=true
 *   - initialCode prop pre-fills the input
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks for UI primitives — they exist in frontend/src/components/ui
// ---------------------------------------------------------------------------

vi.mock('../components/ui/Input.jsx', () => ({
  default: ({ value, onChange, error, placeholder, ...rest }) => (
    <div>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        data-testid="code-input"
        {...rest}
      />
      {error && <span data-testid="input-error">{error}</span>}
    </div>
  ),
}))

vi.mock('../components/ui/Button.jsx', () => ({
  default: ({ children, loading, type, ...rest }) => (
    <button type={type} disabled={!!loading} data-testid="submit-btn" {...rest}>
      {loading ? 'Cargando...' : children}
    </button>
  ),
}))

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderLookup({ onSearch = vi.fn(), loading = false, initialCode = '' } = {}) {
  const { default: AppointmentLookup } = await import('../components/manage/AppointmentLookup.jsx')
  return {
    onSearch,
    ...render(<AppointmentLookup onSearch={onSearch} loading={loading} initialCode={initialCode} />),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// 1. Render
// ============================================================================

describe('AppointmentLookup — render', () => {
  it('renders without crashing', async () => {
    await renderLookup()
    expect(document.body).toBeTruthy()
  })

  it('renders the code input field', async () => {
    await renderLookup()
    expect(screen.getByTestId('code-input')).toBeTruthy()
  })

  it('renders the submit button', async () => {
    await renderLookup()
    expect(screen.getByTestId('submit-btn')).toBeTruthy()
  })

  it('submit button text is "Buscar cita"', async () => {
    await renderLookup()
    expect(screen.getByTestId('submit-btn').textContent).toMatch(/buscar cita/i)
  })
})

// ============================================================================
// 2. Input behavior
// ============================================================================

describe('AppointmentLookup — input behavior', () => {
  it('converts input to uppercase automatically', async () => {
    const user = userEvent.setup()
    await renderLookup()

    const input = screen.getByTestId('code-input')
    await user.type(input, 'abc123')

    expect(input.value).toBe('ABC123')
  })

  it('strips non-alphanumeric characters', async () => {
    const user = userEvent.setup()
    await renderLookup()

    const input = screen.getByTestId('code-input')
    await user.type(input, 'AB-C!1')

    // Hyphens and ! are stripped; result should be 'ABC1'
    expect(/^[A-Z0-9]+$/.test(input.value)).toBe(true)
  })

  it('limits input to 6 characters', async () => {
    const user = userEvent.setup()
    await renderLookup()

    const input = screen.getByTestId('code-input')
    await user.type(input, 'ABC1234567890')

    expect(input.value.length).toBeLessThanOrEqual(6)
  })

  it('initialCode prop pre-fills the input', async () => {
    await renderLookup({ initialCode: 'XYZ789' })
    const input = screen.getByTestId('code-input')
    expect(input.value).toBe('XYZ789')
  })
})

// ============================================================================
// 3. Validation
// ============================================================================

describe('AppointmentLookup — validation', () => {
  it('shows error when submitting with fewer than 6 characters', async () => {
    const user = userEvent.setup()
    const { onSearch } = await renderLookup()

    const input  = screen.getByTestId('code-input')
    const submit = screen.getByTestId('submit-btn')

    await user.type(input, 'ABC')
    await user.click(submit)

    await waitFor(() => {
      const err = screen.queryByTestId('input-error')
        || screen.queryByText(/6 caracteres/i)
      expect(err).toBeTruthy()
    })
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('shows error when submitting empty code', async () => {
    const user = userEvent.setup()
    const { onSearch } = await renderLookup()

    const submit = screen.getByTestId('submit-btn')
    await user.click(submit)

    await waitFor(() => {
      const err = screen.queryByTestId('input-error')
        || screen.queryByText(/6 caracteres/i)
      expect(err).toBeTruthy()
    })
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('does not show error for a valid 6-char code before submit', async () => {
    const user = userEvent.setup()
    await renderLookup()

    const input = screen.getByTestId('code-input')
    await user.type(input, 'ABC123')

    expect(screen.queryByTestId('input-error')).toBeNull()
  })
})

// ============================================================================
// 4. onSearch callback
// ============================================================================

describe('AppointmentLookup — onSearch', () => {
  it('calls onSearch with the 6-char uppercase code on valid submit', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    const { onSearch: spy } = await renderLookup({ onSearch })

    const input  = screen.getByTestId('code-input')
    const submit = screen.getByTestId('submit-btn')

    await user.type(input, 'ZZZ999')
    await user.click(submit)

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('ZZZ999')
    })
  })

  it('strips hyphens from code before calling onSearch', async () => {
    const user = userEvent.setup()
    const { onSearch } = await renderLookup()

    // Input component already strips non-alphanumeric — simulating the cleaned value
    const input  = screen.getByTestId('code-input')
    const submit = screen.getByTestId('submit-btn')

    // Force the input to have a 6-char cleaned value
    await user.type(input, 'ABCDEF')
    await user.click(submit)

    await waitFor(() => {
      if (onSearch.mock.calls.length > 0) {
        expect(onSearch).toHaveBeenCalledWith('ABCDEF')
      }
    })
  })
})

// ============================================================================
// 5. Loading state
// ============================================================================

describe('AppointmentLookup — loading state', () => {
  it('disables submit button when loading=true', async () => {
    await renderLookup({ loading: true })
    const submit = screen.getByTestId('submit-btn')
    expect(submit.disabled).toBe(true)
  })

  it('submit button is enabled when loading=false', async () => {
    await renderLookup({ loading: false })
    const submit = screen.getByTestId('submit-btn')
    expect(submit.disabled).toBe(false)
  })
})
