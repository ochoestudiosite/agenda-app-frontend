// @vitest-environment jsdom
/**
 * Unit — PhoneInput component
 *
 * File: frontend/src/components/ui/PhoneInput.jsx
 *
 * Logic under test (non-trivial, distinct from pure render):
 *   handleNumberChange:
 *     - strips all non-digit characters (/\D/g)
 *     - enforces a maximum of 10 digits (.slice(0, 10))
 *     - calls onChange with { target: { value: countryCode + digits } }
 *   handleCodeChange:
 *     - calls onChange with { target: { value: newCode + existingNumber } }
 *   useEffect (controlled value):
 *     - parses incoming `value` prop to split country code from local number
 *     - falls back gracefully when no code matches (raw value as number)
 *     - clears number when value is empty/falsy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

async function renderPhone(props = {}) {
  const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
  return render(<PhoneInput onChange={vi.fn()} {...props} />)
}

beforeEach(() => vi.resetModules())

// ============================================================================
// 1. Default render
// ============================================================================

describe('PhoneInput — default render', () => {
  it('renders country code dropdown', async () => {
    await renderPhone()
    const select = document.querySelector('select')
    expect(select).toBeTruthy()
  })

  it('default country code is +52 (México)', async () => {
    await renderPhone()
    const select = document.querySelector('select')
    expect(select.value).toBe('+52')
  })

  it('renders phone number input field (type=tel)', async () => {
    await renderPhone()
    const input = document.querySelector('input[type="tel"]')
    expect(input).toBeTruthy()
  })

  it('country dropdown contains expected codes', async () => {
    await renderPhone()
    const options = Array.from(document.querySelectorAll('select option')).map(o => o.value)
    expect(options).toContain('+52')
    expect(options).toContain('+1')
    expect(options).toContain('+57')
    expect(options).toContain('+34')
  })
})

// ============================================================================
// 2. handleNumberChange — digit stripping and length limit
// ============================================================================

describe('PhoneInput — handleNumberChange digit rules', () => {
  it('typing digits emits countryCode + digits', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={onChange} />)

    const input = document.querySelector('input[type="tel"]')
    await user.type(input, '5512345678')

    // Last onChange call should have the full composed value
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall.target.value).toBe('+525512345678')
  })

  it('non-digit characters are stripped (letters, spaces, dashes)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={onChange} />)

    const input = document.querySelector('input[type="tel"]')
    await user.type(input, 'abc-55 1234')

    // Only digits reach onChange: '551234'
    const calls = onChange.mock.calls.map(c => c[0].target.value)
    const lastDigitsOnly = calls[calls.length - 1].replace(/^\+\d+/, '') // strip code
    expect(lastDigitsOnly).toMatch(/^\d+$/)
    expect(lastDigitsOnly).not.toMatch(/[a-zA-Z\s\-]/)
  })

  it('input is truncated to 10 digits maximum', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={onChange} />)

    const input = document.querySelector('input[type="tel"]')
    await user.type(input, '12345678901234') // 14 digits

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    const digits = lastCall.target.value.replace(/^\+\d+/, '')
    expect(digits.length).toBeLessThanOrEqual(10)
  })

  it('exactly 10 digits are accepted in full', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={onChange} />)

    const input = document.querySelector('input[type="tel"]')
    await user.type(input, '5512345678') // exactly 10

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    const digits = lastCall.target.value.replace(/^\+52/, '')
    expect(digits).toBe('5512345678')
  })

  it('symbols and special chars are stripped', async () => {
    const onChange = vi.fn()
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={onChange} />)

    const input = document.querySelector('input[type="tel"]')
    // Simulate paste of formatted number via fireEvent (avoids userEvent clipboard restrictions)
    fireEvent.change(input, { target: { value: '(55) 1234-5678' } })

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    const digits = lastCall.target.value.replace(/^\+52/, '')
    expect(digits).toMatch(/^\d+$/)
  })
})

// ============================================================================
// 3. handleCodeChange — country code swap
// ============================================================================

describe('PhoneInput — handleCodeChange', () => {
  it('changing country code to +1 emits +1 + existing number', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={onChange} />)

    // First type a number
    const input = document.querySelector('input[type="tel"]')
    await user.type(input, '5551234')

    onChange.mockClear()

    // Now change country code
    const select = document.querySelector('select')
    fireEvent.change(select, { target: { value: '+1' } })

    expect(onChange).toHaveBeenCalledTimes(1)
    const call = onChange.mock.calls[0][0]
    expect(call.target.value).toMatch(/^\+1\d+/)
  })

  it('changing country code without a number emits just the code', async () => {
    const onChange = vi.fn()
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={onChange} />)

    const select = document.querySelector('select')
    fireEvent.change(select, { target: { value: '+57' } })

    const call = onChange.mock.calls[0][0]
    expect(call.target.value).toBe('+57')
  })
})

// ============================================================================
// 4. Controlled value — useEffect parsing
// ============================================================================

describe('PhoneInput — controlled value prop parsing', () => {
  it('value "+525512345678" → sets code=+52, number=5512345678 in inputs', async () => {
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput value="+525512345678" onChange={vi.fn()} />)

    await waitFor(() => {
      const select = document.querySelector('select')
      const input  = document.querySelector('input[type="tel"]')
      expect(select.value).toBe('+52')
      expect(input.value).toBe('5512345678')
    })
  })

  it('value "+15551234567" → sets code=+1, number=5551234567', async () => {
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput value="+15551234567" onChange={vi.fn()} />)

    await waitFor(() => {
      const select = document.querySelector('select')
      const input  = document.querySelector('input[type="tel"]')
      expect(select.value).toBe('+1')
      expect(input.value).toBe('5551234567')
    })
  })

  it('value with no matching country code → raw value shown in number field', async () => {
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput value="9876543210" onChange={vi.fn()} />)

    await waitFor(() => {
      const input = document.querySelector('input[type="tel"]')
      expect(input.value).toBe('9876543210')
    })
  })

  it('empty value → clears number field', async () => {
    const { default: PhoneInput, rerender: _ } = await import('../components/ui/PhoneInput.jsx')
    const { rerender } = render(<PhoneInput value="+525512345678" onChange={vi.fn()} />)

    await waitFor(() => {
      expect(document.querySelector('input[type="tel"]').value).toBe('5512345678')
    })

    rerender(<PhoneInput value="" onChange={vi.fn()} />)

    await waitFor(() => {
      expect(document.querySelector('input[type="tel"]').value).toBe('')
    })
  })
})

// ============================================================================
// 5. Label, error, helper, required
// ============================================================================

describe('PhoneInput — label / error / helper / required props', () => {
  it('renders label text when label prop is provided', async () => {
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={vi.fn()} label="Teléfono" />)
    expect(screen.getByText('Teléfono')).toBeTruthy()
  })

  it('renders required asterisk when required=true', async () => {
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={vi.fn()} label="Teléfono" required />)
    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })

  it('renders error message with role="alert"', async () => {
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={vi.fn()} error="Número inválido" />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/Número inválido/)
  })

  it('renders helper text when no error', async () => {
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={vi.fn()} helper="Incluye tu lada" />)
    expect(screen.getByText(/Incluye tu lada/i)).toBeTruthy()
  })

  it('does NOT render helper text when error is also provided (error takes precedence)', async () => {
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    render(<PhoneInput onChange={vi.fn()} error="Error" helper="Helper text" />)
    expect(screen.queryByText('Helper text')).toBeNull()
  })
})
