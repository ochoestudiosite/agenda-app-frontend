/**
 * Tests for frontend/src/components/booking/PaymentPanel.jsx
 *
 * Focus:
 *   - Renders the amount to pay, formatted from cents (Intl.NumberFormat es-MX)
 *   - Countdown label + Elements/PaymentElement mount
 *   - TTL already expired at mount → expiry message, no payment form, "Elegir
 *     otro horario" → onBack()
 *   - stripe.confirmPayment succeeds → polls GET /api/appointments/:code →
 *     onConfirmed() once status flips to 'confirmed'
 *   - stripe.confirmPayment returns an error (card declined) → inline error,
 *     onConfirmed() never called, the pay button remains for a retry
 *   - "Cancelar y elegir otro horario" during the active countdown → onBack()
 *
 * @stripe/react-stripe-js and @stripe/stripe-js are mocked (standard pattern):
 * Elements is a passthrough, PaymentElement a stub, useStripe/useElements
 * return controllable fakes so no real Stripe.js ever loads in tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockConfirmPayment  = vi.fn()
const mockGetAppointment  = vi.fn()

vi.mock('../services/api.js', () => ({
  api: { getAppointment: (...args) => mockGetAppointment(...args) },
}))

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({ __fakeStripe: true })),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements:        ({ children }) => <div data-testid="elements">{children}</div>,
  PaymentElement:  () => <div data-testid="payment-element" />,
  useStripe:       () => ({ confirmPayment: (...args) => mockConfirmPayment(...args) }),
  useElements:     () => ({}),
}))

const PAYMENT_CONFIG = {
  enabled: true, charge_mode: 'deposit_percent', deposit_percent: 30,
  deposit_fixed_cents: null, stripe_account_id: 'acct_test123',
  publishable_key: 'pk_test_abc',
}

function isoFromNow(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString()
}

async function renderPanel(overrides = {}) {
  const { default: PaymentPanel } = await import('../components/booking/PaymentPanel.jsx')
  const props = {
    payment: { client_secret: 'pi_test_secret', amount_cents: 8400, expires_at: isoFromNow(15 * 60 * 1000) },
    paymentConfig: PAYMENT_CONFIG,
    code: 'ABC123',
    onConfirmed: vi.fn(),
    onBack: vi.fn(),
    onBusyChange: vi.fn(),
    ...overrides,
  }
  const view = render(<PaymentPanel {...props} />)
  return { ...view, props }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// 1. Render
// ============================================================================

describe('PaymentPanel — render', () => {
  it('shows the amount to pay formatted from cents (es-MX)', async () => {
    await renderPanel()
    expect(screen.getByRole('button', { name: /Pagar/i }).textContent).toMatch(/84\.00/)
  })

  it('shows the countdown label', async () => {
    await renderPanel()
    expect(screen.getByText(/Tu lugar está reservado por/i)).toBeTruthy()
  })

  it('mounts Stripe Elements + PaymentElement', async () => {
    await renderPanel()
    expect(screen.getByTestId('elements')).toBeTruthy()
    expect(screen.getByTestId('payment-element')).toBeTruthy()
  })

  it('formats a different amount correctly (full charge_mode, no cents remainder)', async () => {
    await renderPanel({ payment: { client_secret: 'pi_y', amount_cents: 28000, expires_at: isoFromNow(60_000) } })
    expect(screen.getByRole('button', { name: /Pagar/i }).textContent).toMatch(/280\.00/)
  })
})

// ============================================================================
// 2. TTL expirado
// ============================================================================

describe('PaymentPanel — TTL expirado', () => {
  it('muestra el mensaje de expiración y oculta el formulario de pago cuando expires_at ya pasó', async () => {
    await renderPanel({ payment: { client_secret: 'pi_x', amount_cents: 8400, expires_at: isoFromNow(-1000) } })
    expect(screen.getByText(/El tiempo para pagar expiró/i)).toBeTruthy()
    expect(screen.getByText(/tu lugar fue liberado/i)).toBeTruthy()
    expect(screen.queryByTestId('payment-element')).toBeNull()
    expect(screen.queryByRole('button', { name: /Pagar/i })).toBeNull()
  })

  it('"Elegir otro horario" llama a onBack', async () => {
    const user = userEvent.setup()
    const { props } = await renderPanel({ payment: { client_secret: 'pi_x', amount_cents: 8400, expires_at: isoFromNow(-1000) } })
    await user.click(screen.getByRole('button', { name: /Elegir otro horario/i }))
    expect(props.onBack).toHaveBeenCalled()
  })
})

// ============================================================================
// 3. Pago exitoso → polling → onConfirmed
// ============================================================================

describe('PaymentPanel — pago exitoso', () => {
  it('confirmPayment sin error + status ya confirmed → llama a onConfirmed', async () => {
    mockConfirmPayment.mockResolvedValue({ error: undefined })
    mockGetAppointment.mockResolvedValue({ status: 'confirmed' })
    const user = userEvent.setup()
    const { props } = await renderPanel()

    await user.click(screen.getByRole('button', { name: /Pagar/i }))

    await waitFor(() => expect(mockGetAppointment).toHaveBeenCalledWith('ABC123'))
    await waitFor(() => expect(props.onConfirmed).toHaveBeenCalled())
  })

  it('notifica onBusyChange(true) mientras se procesa/confirma', async () => {
    mockConfirmPayment.mockResolvedValue({ error: undefined })
    mockGetAppointment.mockResolvedValue({ status: 'confirmed' })
    const user = userEvent.setup()
    const { props } = await renderPanel()

    await user.click(screen.getByRole('button', { name: /Pagar/i }))
    await waitFor(() => expect(props.onBusyChange).toHaveBeenCalledWith(true))
  })
})

// ============================================================================
// 4. Pago rechazado
// ============================================================================

describe('PaymentPanel — pago rechazado', () => {
  it('muestra el mensaje de error inline, no llama onConfirmed, y deja el botón para reintentar con el mismo client_secret', async () => {
    mockConfirmPayment.mockResolvedValue({ error: { message: 'Tu tarjeta fue rechazada.' } })
    const user = userEvent.setup()
    const { props } = await renderPanel()

    await user.click(screen.getByRole('button', { name: /Pagar/i }))

    await waitFor(() => expect(screen.getByText(/Tu tarjeta fue rechazada\./i)).toBeTruthy())
    expect(props.onConfirmed).not.toHaveBeenCalled()
    expect(mockGetAppointment).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Pagar/i })).toBeTruthy()
  })
})

// ============================================================================
// 4b. confirmPayment LANZA en vez de resolver con {error} (red caída a mitad
// de la llamada) — el botón no debe quedarse en "Procesando…" para siempre.
// ============================================================================

describe('PaymentPanel — confirmPayment lanza (no resuelve con {error})', () => {
  it('muestra un error de conexión y reactiva el botón — nunca se queda colgado en "Procesando…"', async () => {
    mockConfirmPayment.mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()
    const { props } = await renderPanel()

    await user.click(screen.getByRole('button', { name: /Pagar/i }))

    await waitFor(() => expect(screen.getByText(/No se pudo conectar con Stripe/i)).toBeTruthy())
    expect(props.onConfirmed).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Pagar/i })).toBeTruthy()
    expect(screen.queryByText(/Procesando/i)).toBeNull()
  })
})

// ============================================================================
// 4c. PaymentIntent ya no confirmable server-side (expiró justo antes) —
// mensaje distinto al de tarjeta rechazada, con salida directa a otro horario.
// ============================================================================

describe('PaymentPanel — PaymentIntent expiró server-side (invalid_request_error)', () => {
  it('muestra mensaje específico + botón "Elegir otro horario" (nunca invita a reintentar)', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'invalid_request_error', code: 'payment_intent_unexpected_state', message: 'raw stripe message' },
    })
    const user = userEvent.setup()
    const { props } = await renderPanel()

    await user.click(screen.getByRole('button', { name: /Pagar/i }))

    await waitFor(() => expect(screen.getByText(/sesión de pago ya no es válida/i)).toBeTruthy())
    expect(screen.queryByTestId('payment-element')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Pagar/i })).toBeNull()
    await user.click(screen.getByRole('button', { name: /Elegir otro horario/i }))
    expect(props.onBack).toHaveBeenCalled()
  })

  it('un card_error normal (tarjeta rechazada) NO dispara la pantalla de "elegir otro horario"', async () => {
    mockConfirmPayment.mockResolvedValue({ error: { type: 'card_error', message: 'Tu tarjeta fue rechazada.' } })
    const user = userEvent.setup()
    await renderPanel()

    await user.click(screen.getByRole('button', { name: /Pagar/i }))

    await waitFor(() => expect(screen.getByText(/Tu tarjeta fue rechazada\./i)).toBeTruthy())
    expect(screen.getByTestId('payment-element')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Pagar/i })).toBeTruthy()
  })
})

// ============================================================================
// 4d. El countdown cruza 0 MIENTRAS hay una confirmación real en curso — no
// debe desmontar el formulario ni mostrar "expiró" a mitad de un pago exitoso.
// ============================================================================

describe('PaymentPanel — countdown expira durante una confirmación en curso', () => {
  it('no muestra la pantalla de expiración mientras submitting/confirming siguen activos, y confirma normalmente después', async () => {
    let resolveConfirm
    mockConfirmPayment.mockReturnValue(new Promise(r => { resolveConfirm = r }))
    mockGetAppointment.mockResolvedValue({ status: 'confirmed' })
    const user = userEvent.setup()
    const { props } = await renderPanel({
      payment: { client_secret: 'pi_x', amount_cents: 8400, expires_at: isoFromNow(300) },
    })

    await user.click(screen.getByRole('button', { name: /Pagar/i }))
    // El click ya disparó submitting=true (childBusy=true) antes de que
    // confirmPayment resuelva — dejamos pasar el countdown real de 300ms.
    await new Promise(r => setTimeout(r, 500))

    expect(screen.queryByText(/El tiempo para pagar expiró/i)).toBeNull()
    expect(screen.getByTestId('payment-element')).toBeTruthy()

    resolveConfirm({ error: undefined })
    await waitFor(() => expect(props.onConfirmed).toHaveBeenCalled())
  })
})

// ============================================================================
// 5. Cancelar durante el pago activo
// ============================================================================

describe('PaymentPanel — cancelar durante conteo activo', () => {
  it('"Cancelar y elegir otro horario" llama a onBack', async () => {
    const user = userEvent.setup()
    const { props } = await renderPanel()
    await user.click(screen.getByRole('button', { name: /Cancelar y elegir otro horario/i }))
    expect(props.onBack).toHaveBeenCalled()
  })
})
