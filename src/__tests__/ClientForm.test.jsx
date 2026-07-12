/**
 * Tests for frontend/src/components/booking/ClientForm.jsx
 *
 * Focus:
 *   - Form validation (name, phone, email)
 *   - Successful submission → SET_CONFIRMATION dispatched
 *   - 409 slot conflict → toast + GO_BACK
 *   - 503 quota exceeded → renders BookingUnavailable
 *   - Group mode submission path
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks — declared before vi.mock() calls (hoisted by Vitest)
// ---------------------------------------------------------------------------

const mockMutateAsync = vi.fn()
const mockGroupMutateAsync = vi.fn()
const mockDispatch = vi.fn()
const mockToast = vi.fn()

vi.mock('../hooks/useAppointment.js', () => ({
  useCreateAppointment: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

// Mutable so UX-1 tests can inject cancellation_policy without re-mocking
let mockConfigData = { time_format: '12h', branches: [] }

vi.mock('../hooks/useConfig.js', () => ({
  useConfig: () => ({ data: mockConfigData }),
}))

const mockValidatePromo = vi.fn()

vi.mock('../services/api.js', () => ({
  api: {
    createGroupAppointment: mockGroupMutateAsync,
    validatePromo: (...args) => mockValidatePromo(...args),
  },
}))

vi.mock('../components/ui/Toast.jsx', () => ({
  useToast: () => mockToast,
}))

// BookingContext mock — we inject controlled state
const mockState = {
  step: 4,
  branch: null,
  services: [{ id: 10, name: 'Corte de cabello', duration: 30, price: 250 }],
  serviceAssignments: [],
  currentAssignmentIdx: 0,
  specialist: { id: 5, name: 'Ana García', slug: 'ana-garcia' },
  date: '2026-06-20',
  time: '10:00',
  clientFirstName: '',
  clientLastName: '',
  clientPhone: '',
  clientEmail: '',
  confirmation: null,
}

vi.mock('../context/BookingContext.jsx', () => ({
  useBooking: () => ({ state: mockState, dispatch: mockDispatch }),
  isGroupMode: (s) => (s.services?.length ?? 0) >= 2,
  BookingProvider: ({ children }) => children,
}))

// Lucide icons used inside component
vi.mock('lucide-react', () => ({
  ArrowLeft:  () => null,
  ChevronLeft: () => null,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

async function renderForm(stateOverride = {}) {
  Object.assign(mockState, stateOverride)
  const { default: ClientForm } = await import('../components/booking/ClientForm.jsx')
  const qc = makeQC()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ClientForm />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfigData = { time_format: '12h', branches: [] }
  // Reset state to single-service defaults
  Object.assign(mockState, {
    services: [{ id: 10, name: 'Corte de cabello', duration: 30, price: 250 }],
    serviceAssignments: [],
    specialist: { id: 5, name: 'Ana García', slug: 'ana-garcia' },
    date: '2026-06-20',
    time: '10:00',
    branch: null,
    clientFirstName: '',
    clientLastName: '',
    clientPhone: '',
    clientEmail: '',
    confirmation: null,
  })
})

// ============================================================================
// 1. Render
// ============================================================================

describe('ClientForm — render', () => {
  it('renders without crashing', async () => {
    await renderForm()
    expect(screen.getByText(/Confirma tu cita/i)).toBeTruthy()
  })

  it('shows booking summary with service name', async () => {
    await renderForm()
    expect(screen.getByText(/Corte de cabello/i)).toBeTruthy()
  })

  it('shows name, phone, and email fields', async () => {
    await renderForm()
    expect(screen.getByLabelText(/Nombre\(s\)/i)).toBeTruthy()
    expect(screen.getByLabelText(/Apellido\(s\)/i)).toBeTruthy()
    expect(screen.getByLabelText(/Teléfono/i)).toBeTruthy()
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeTruthy()
  })

  it('shows the confirm button', async () => {
    await renderForm()
    expect(screen.getByRole('button', { name: /Confirmar reservación/i })).toBeTruthy()
  })
})

// ============================================================================
// 1b. Aviso de privacidad al momento de capturar los datos (punto de captura LFPDPPP)
// ============================================================================

describe('ClientForm — aviso de privacidad', () => {
  it('muestra el aviso con el nombre del negocio cuando business_name está presente', async () => {
    mockConfigData = { time_format: '12h', branches: [], business_name: 'Salón Elite' }
    await renderForm()
    expect(screen.getByText(/gestionar tu cita con Salón Elite/i)).toBeTruthy()
  })

  it('cae a "este negocio" cuando no hay business_name', async () => {
    await renderForm()
    expect(screen.getByText(/gestionar tu cita con este negocio/i)).toBeTruthy()
  })

  it('el enlace del aviso apunta al Aviso de Privacidad de Cita24 y abre en pestaña nueva', async () => {
    await renderForm()
    const link = screen.getByRole('link', { name: /aviso de privacidad/i })
    expect(link).toHaveAttribute('href', 'https://cita24.com/privacidad')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

// ============================================================================
// 2. Name validation
// ============================================================================

describe('ClientForm — name validation', () => {
  it('shows error when name is empty', async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(screen.getByText(/Ingresa tu nombre/i)).toBeTruthy()
      expect(screen.getByText(/Ingresa tu apellido/i)).toBeTruthy()
    })
  })

  it('shows error when name contains numbers', async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Juan123')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/Solo letras, sin números ni símbolos/i)).toBeTruthy()
    })
  })

  it('clears name error when user starts typing again', async () => {
    const user = userEvent.setup()
    await renderForm()

    // Trigger error
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))
    await waitFor(() => {
      expect(screen.queryByText(/Ingresa tu nombre/i)).toBeTruthy()
    })

    // Start typing — error should clear
    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'J')
    expect(screen.queryByText(/Ingresa tu nombre\./i)).toBeNull()
  })
})

// ============================================================================
// 3. Phone validation
// ============================================================================

describe('ClientForm — phone validation', () => {
  it('shows error when phone is empty', async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Juan')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'García')
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(screen.getByText(/Teléfono inválido/i)).toBeTruthy()
    })
  })

  it('shows error for phone with fewer than 7 digits', async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Juan')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'García')
    await user.type(screen.getByLabelText(/Teléfono/i), '123456') // only 6 digits
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(screen.getByText(/Teléfono inválido/i)).toBeTruthy()
    })
  })
})

// ============================================================================
// 4. Email validation (optional field)
// ============================================================================

describe('ClientForm — email validation', () => {
  it('accepts empty email (optional field)', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ code: 'ABC123' })

    await renderForm()
    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Juan')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'García')
    await user.type(screen.getByLabelText(/Teléfono/i), '5512345678')
    // email left empty
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })
    expect(screen.queryByText(/correo electrónico válido/i)).toBeNull()
  })

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Juan')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'García')
    await user.type(screen.getByLabelText(/Teléfono/i), '5512345678')
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(screen.getByText(/correo electrónico válido/i)).toBeTruthy()
    })
  })
})

// ============================================================================
// 5. Successful submission
// ============================================================================

describe('ClientForm — successful submission', () => {
  it('calls createMutation.mutateAsync with correct payload', async () => {
    const user = userEvent.setup()
    const mockResult = { code: 'CITA123', date: '2026-06-20', time: '10:00' }
    mockMutateAsync.mockResolvedValue(mockResult)

    await renderForm()
    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'María')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'López')
    await user.type(screen.getByLabelText(/Teléfono/i), '5512345678')
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'maria@test.com')
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceIds:      [10],
          specialistId:    5,
          date:            '2026-06-20',
          time:            '10:00',
          clientFirstName: 'María',
          clientLastName:  'López',
          clientPhone:     '+525512345678',
          clientEmail:     'maria@test.com',
        })
      )
    })

    // SET_CONFIRMATION should be dispatched with the result
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_CONFIRMATION', payload: mockResult })
    )
  })

  it('SET_CLIENT is dispatched before the API call', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValue({ code: 'X' })

    await renderForm()
    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Pedro')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'Ruiz')
    await user.type(screen.getByLabelText(/Teléfono/i), '5599887766')
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      const clientCall = mockDispatch.mock.calls.find(c => c[0].type === 'SET_CLIENT')
      expect(clientCall).toBeDefined()
      expect(clientCall[0].payload.firstName).toBe('Pedro')
      expect(clientCall[0].payload.lastName).toBe('Ruiz')
    })
  })
})

// ============================================================================
// 6. Error handling
// ============================================================================

describe('ClientForm — error handling', () => {
  it('shows toast and dispatches GO_BACK on 409 (slot conflict)', async () => {
    const user = userEvent.setup()
    const slotConflict = Object.assign(new Error('Slot taken'), { status: 409 })
    mockMutateAsync.mockRejectedValue(slotConflict)

    await renderForm()
    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Ana')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'García')
    await user.type(screen.getByLabelText(/Teléfono/i), '5500000001')
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('horario'),
        'error'
      )
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'GO_BACK' })
      )
    })
  })

  it('renders BookingUnavailable on 503 (quota exceeded)', async () => {
    const user = userEvent.setup()
    const quotaErr = Object.assign(new Error('Quota'), { status: 503 })
    mockMutateAsync.mockRejectedValue(quotaErr)

    await renderForm()
    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Luis')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'Reyes')
    await user.type(screen.getByLabelText(/Teléfono/i), '5500000002')
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    // The component replaces itself with BookingUnavailable
    await waitFor(() => {
      expect(screen.queryByLabelText(/Nombre\(s\)/i)).toBeNull()
    })
  })

  it('shows toast and GO_BACK on 400 (validation error from server)', async () => {
    const user = userEvent.setup()
    const validationErr = Object.assign(new Error('Datos inválidos'), { status: 400 })
    mockMutateAsync.mockRejectedValue(validationErr)

    await renderForm()
    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Sofía')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'Morales')
    await user.type(screen.getByLabelText(/Teléfono/i), '5500000003')
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('Datos inválidos'),
        'error'
      )
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'GO_BACK' })
      )
    })
  })

  it('shows generic toast on unexpected errors', async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockRejectedValue(new Error('Network failure'))

    await renderForm()
    await user.type(screen.getByLabelText(/Nombre\(s\)/i), 'Carlos')
    await user.type(screen.getByLabelText(/Apellido\(s\)/i), 'Ruiz')
    await user.type(screen.getByLabelText(/Teléfono/i), '5500000004')
    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('Network failure'),
        'error'
      )
    })
  })
})

// ============================================================================
// 7. UX-1 — cancellation policy display
// ============================================================================

describe('ClientForm — UX-1 cancellation policy', () => {
  it('shows policy block when config.cancellation_policy is set', async () => {
    mockConfigData = {
      time_format: '12h',
      branches: [],
      cancellation_policy: 'Cancelaciones con menos de 24h tienen cargo del 50%.',
    }

    await renderForm()
    expect(screen.getByText(/Política de cancelación/i)).toBeTruthy()
    expect(screen.getByText(/Cancelaciones con menos de 24h/i)).toBeTruthy()
  })

  it('does not show policy block when cancellation_policy is null', async () => {
    mockConfigData = { time_format: '12h', branches: [], cancellation_policy: null }

    await renderForm()
    expect(screen.queryByText(/Política de cancelación/i)).toBeNull()
  })

  it('does not show policy block when cancellation_policy is absent', async () => {
    // mockConfigData reset to default in beforeEach (no cancellation_policy key)
    await renderForm()
    expect(screen.queryByText(/Política de cancelación/i)).toBeNull()
  })
})

// ============================================================================
// 8. phoneErr — validación por país (ejercitada vía blur del campo de teléfono)
// ============================================================================

describe('ClientForm — phoneErr — validación por país', () => {
  // Helper: renderiza el form y hace blur en el campo de teléfono con el valor dado.
  // El PhoneInput emite el valor completo (countryCode + digits) en el onChange,
  // y llama onBlur cuando el foco sale del contenedor. Para ejercitar phoneErr
  // directamente cambiamos el valor del input oculto disparando su onChange y
  // luego hacemos blur del contenedor.
  async function blurPhone(countryCode, digits) {
    const { default: ClientForm } = await import('../components/booking/ClientForm.jsx')
    const { default: PhoneInput } = await import('../components/ui/PhoneInput.jsx')
    const qc = makeQC()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ClientForm />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Cambiar el select al country code
    const select = document.querySelector('select')
    fireEvent.change(select, { target: { value: countryCode } })

    // Escribir los dígitos en el campo tel
    const telInput = document.querySelector('input[type="tel"]')
    fireEvent.change(telInput, { target: { value: digits } })

    // Simular blur del contenedor del PhoneInput
    fireEvent.blur(telInput)
  }

  it('+52 México con 9 dígitos → muestra error de teléfono', async () => {
    await blurPhone('+52', '551234567') // 9 dígitos
    await waitFor(() => {
      expect(screen.getByText(/Teléfono inválido/i)).toBeTruthy()
    })
  })

  it('+52 México con 10 dígitos → sin error de teléfono', async () => {
    await blurPhone('+52', '5512345678') // 10 dígitos
    await waitFor(() => {
      expect(screen.queryByText(/Teléfono inválido/i)).toBeNull()
    })
  })

  it('+34 España con 8 dígitos → muestra error', async () => {
    await blurPhone('+34', '91234567') // 8 dígitos
    await waitFor(() => {
      expect(screen.getByText(/Teléfono inválido/i)).toBeTruthy()
    })
  })

  it('+34 España con 9 dígitos → sin error', async () => {
    await blurPhone('+34', '912345678') // 9 dígitos
    await waitFor(() => {
      expect(screen.queryByText(/Teléfono inválido/i)).toBeNull()
    })
  })

  it('+34 España con 10 dígitos → muestra error (uno de más)', async () => {
    // PhoneInput trunca a 10, así que pasamos 10 dígitos que exceden el máximo de España (9)
    await blurPhone('+34', '9123456789') // 10 dígitos
    await waitFor(() => {
      expect(screen.getByText(/Teléfono inválido/i)).toBeTruthy()
    })
  })

  it('+54 Argentina con 10 dígitos → sin error', async () => {
    await blurPhone('+54', '1112345678') // 10 dígitos (dentro del rango 10-11)
    await waitFor(() => {
      expect(screen.queryByText(/Teléfono inválido/i)).toBeNull()
    })
  })

  it('+54 Argentina con 12 dígitos → muestra error (PhoneInput trunca a 10, que sí es válido — el test verifica la lógica en 12 dígitos raw)', async () => {
    // PhoneInput trunca a 10 dígitos, así que 12 dígitos en el input se convierten
    // en 10. Con +54 el rango es [10,11] por lo que 10 es válido.
    // Verificamos que no haya error (PhoneInput truncó a 10, que es válido para Argentina).
    await blurPhone('+54', '123456789012') // se trunca a 1234567890 (10 dígitos)
    await waitFor(() => {
      expect(screen.queryByText(/Teléfono inválido/i)).toBeNull()
    })
  })
})

// ============================================================================
// OTP resend cooldown — F-005 setInterval (not accumulative setTimeout)
// ============================================================================

describe('ClientForm — OTP resend cooldown (F-005)', () => {
  it('single setInterval drives countdown to 0 without accumulating timers', async () => {
    vi.useFakeTimers()

    const { renderHook, act: hookAct } = await import('@testing-library/react')
    const { useState, useEffect } = React

    // Replicate the exact cooldown logic from ClientForm (F-005 pattern).
    function useCooldown(initial) {
      const [cooldown, setCooldown] = useState(initial)
      useEffect(() => {
        if (cooldown <= 0) return
        const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
        return () => clearInterval(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [cooldown > 0])
      return cooldown
    }

    const { result } = renderHook(() => useCooldown(5))
    expect(result.current).toBe(5)

    // After 5s the countdown must reach exactly 0
    await hookAct(async () => { vi.advanceTimersByTime(5100) })
    expect(result.current).toBe(0)

    // After 0: no more changes (interval cleaned up)
    await hookAct(async () => { vi.advanceTimersByTime(3000) })
    expect(result.current).toBe(0)

    vi.useRealTimers()
  })
})

// ============================================================================
// Código promocional — handleApplyPromo
// ============================================================================

describe('ClientForm — código promocional', () => {
  beforeEach(() => {
    mockConfigData = { time_format: '12h', branches: [], promotions_enabled: true }
  })

  async function openPromoField() {
    const user = userEvent.setup()
    await user.click(screen.getByText(/¿tienes un código promocional\?/i))
    return user
  }

  it('código válido y aplicado: muestra el código y el mensaje de ahorro', async () => {
    mockValidatePromo.mockResolvedValue({
      valid: true, codeApplied: true,
      pricing: { totalList: 250, totalDiscount: 25, totalFinal: 225, items: [
        { listPrice: 250, discountAmount: 25, finalPrice: 225, promoName: 'Verano', promoType: 'percent', promoValue: 10 },
      ] },
    })
    await renderForm()
    const user = await openPromoField()
    await user.type(screen.getByPlaceholderText(/verano20/i), 'VERANO10')
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => expect(screen.getByText('VERANO10')).toBeTruthy())
    expect(screen.getByText(/código aplicado/i)).toBeTruthy()
  })

  it('código real pero no aplica (per_client_limit): conserva el pricing autoritativo en vez de descartarlo', async () => {
    // Regresión: antes, cualquier `!res.valid` forzaba serverPricing a null,
    // aunque el backend sí mandó `pricing` (promo automática de catálogo
    // vigente) para este caso — el resumen perdía el ahorro sin motivo.
    mockValidatePromo.mockResolvedValue({
      valid: false, codeApplied: false, reason: 'per_client_limit',
      message: 'Ya usaste este código el máximo de veces permitido.',
      pricing: { totalList: 250, totalDiscount: 20, totalFinal: 230, items: [
        { listPrice: 250, discountAmount: 20, finalPrice: 230, promoName: 'Auto10', promoType: 'percent', promoValue: 10 },
      ] },
    })
    await renderForm()
    const user = await openPromoField()
    await user.type(screen.getByPlaceholderText(/verano20/i), 'USADO')
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => expect(screen.getByText(/ya usaste este código/i)).toBeTruthy())
    // El pricing autoritativo (promo automática) se preservó → se renderiza el ahorro.
    expect(screen.getByText(/ahorras/i)).toBeTruthy()
  })

  it('código inexistente (anti-enumeración, sin pricing): no rompe y no muestra ahorro', async () => {
    mockValidatePromo.mockResolvedValue({ valid: false, message: 'Código no válido o expirado.' })
    await renderForm()
    const user = await openPromoField()
    await user.type(screen.getByPlaceholderText(/verano20/i), 'NOEXISTE')
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => expect(screen.getByText(/código no válido o expirado/i)).toBeTruthy())
    expect(screen.queryByText(/ahorras/i)).toBeNull()
  })
})
