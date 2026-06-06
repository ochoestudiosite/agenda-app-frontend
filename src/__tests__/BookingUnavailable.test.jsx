/**
 * Tests for frontend/src/components/booking/BookingUnavailable.jsx
 *
 * Focus:
 *   - Renders heading and description
 *   - Shows business name from config (falls back to "Este negocio")
 *   - Shows phone and email contact rows when present
 *   - No contact section when neither phone nor email in config
 *   - "Verificar disponibilidad" retry button visible
 *   - Retry button triggers queryClient.invalidateQueries + refetch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRefetch     = vi.fn()
const mockInvalidate  = vi.fn()

// Default config — can be overridden per test
let mockConfigData = {
  business_name:  'Salón Ejemplo',
  business_phone: '+5215512345678',
  business_email: 'hola@salon.com',
}

vi.mock('../hooks/useConfig.js', () => ({
  useConfig: () => ({
    data: mockConfigData,
    isFetching: false,
    refetch: mockRefetch,
  }),
}))

// Stub QueryClient.invalidateQueries so we can track calls
const mockQC = {
  invalidateQueries: mockInvalidate,
}
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useQueryClient: () => mockQC,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderComponent() {
  const { default: BookingUnavailable } = await import('../components/booking/BookingUnavailable.jsx')
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BookingUnavailable />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  mockConfigData = {
    business_name:  'Salón Ejemplo',
    business_phone: '+5215512345678',
    business_email: 'hola@salon.com',
  }
})

// ============================================================================
// 1. Render — heading and copy
// ============================================================================

describe('BookingUnavailable — render', () => {
  it('renders without crashing', async () => {
    await renderComponent()
    expect(document.body).toBeTruthy()
  })

  it('shows "Sin disponibilidad por el momento" heading', async () => {
    await renderComponent()
    expect(screen.getByText(/Sin disponibilidad por el momento/i)).toBeTruthy()
  })

  it('shows business name in description', async () => {
    await renderComponent()
    expect(screen.getByText(/Salón Ejemplo/i)).toBeTruthy()
  })

  it('falls back to "Este negocio" when business_name is absent', async () => {
    mockConfigData = { business_phone: null, business_email: null }
    await renderComponent()
    expect(screen.getByText(/Este negocio/i)).toBeTruthy()
  })

  it('shows "ha alcanzado su capacidad" in description', async () => {
    await renderComponent()
    expect(screen.getByText(/ha alcanzado su capacidad/i)).toBeTruthy()
  })
})

// ============================================================================
// 2. Contact section
// ============================================================================

describe('BookingUnavailable — contact section', () => {
  it('shows phone contact row when business_phone is provided', async () => {
    await renderComponent()
    // Phone link with tel: href
    const phoneLink = document.querySelector('a[href^="tel:"]')
    expect(phoneLink).toBeTruthy()
    expect(phoneLink.textContent).toContain('+5215512345678')
  })

  it('shows email contact row when business_email is provided', async () => {
    await renderComponent()
    const emailLink = document.querySelector('a[href^="mailto:"]')
    expect(emailLink).toBeTruthy()
    expect(emailLink.textContent).toContain('hola@salon.com')
  })

  it('shows "Contacta al negocio" heading when contacts exist', async () => {
    await renderComponent()
    expect(screen.getByText(/Contacta al negocio/i)).toBeTruthy()
  })

  it('does not show contact section when no phone or email', async () => {
    mockConfigData = { business_name: 'Sin Contacto', business_phone: null, business_email: null }
    await renderComponent()
    expect(screen.queryByText(/Contacta al negocio/i)).toBeNull()
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
  })

  it('shows only phone when email is absent', async () => {
    mockConfigData = { business_name: 'Solo Tel', business_phone: '+5215599990000', business_email: null }
    await renderComponent()
    expect(document.querySelector('a[href^="tel:"]')).toBeTruthy()
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
  })

  it('shows only email when phone is absent', async () => {
    mockConfigData = { business_name: 'Solo Email', business_phone: null, business_email: 'solo@email.com' }
    await renderComponent()
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(document.querySelector('a[href^="mailto:"]')).toBeTruthy()
  })
})

// ============================================================================
// 3. Retry button
// ============================================================================

describe('BookingUnavailable — retry button', () => {
  it('shows "Verificar disponibilidad" button', async () => {
    await renderComponent()
    expect(screen.getByRole('button', { name: /Verificar disponibilidad/i })).toBeTruthy()
  })

  it('clicking retry button calls invalidateQueries and refetch', async () => {
    const user = userEvent.setup()
    await renderComponent()

    await user.click(screen.getByRole('button', { name: /Verificar disponibilidad/i }))

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['config'] })
      )
      expect(mockRefetch).toHaveBeenCalled()
    })
  })
})
