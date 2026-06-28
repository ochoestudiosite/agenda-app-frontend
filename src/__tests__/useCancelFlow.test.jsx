// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCancelFlow } from '../hooks/useCancelFlow.js'

// ============================================================================
// Helpers de fábrica
// ============================================================================

function makeProps(overrides = {}) {
  return {
    phoneVerificationRequired: false,
    cancelMutation: { mutateAsync: vi.fn() },
    requestOtpFn: vi.fn(),
    onSuccess: vi.fn(),
    onOtpReady: vi.fn(),
    toastFn: vi.fn(),
    successMessage: 'Cita cancelada.',
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ============================================================================
// 1. Flujo directo (sin OTP)
// ============================================================================

describe('useCancelFlow — flujo directo (sin OTP)', () => {
  it('initiateCancel llama a cancelMutation.mutateAsync con los datos', async () => {
    const props = makeProps()
    props.cancelMutation.mutateAsync.mockResolvedValue({ id: 1 })

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    expect(props.cancelMutation.mutateAsync).toHaveBeenCalledWith({ code: 'CITA001' })
  })

  it('en éxito llama toastFn(successMessage, "info") y onSuccess(result)', async () => {
    const props = makeProps()
    const mockResult = { id: 99 }
    props.cancelMutation.mutateAsync.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    expect(props.toastFn).toHaveBeenCalledWith('Cita cancelada.', 'info')
    expect(props.onSuccess).toHaveBeenCalledWith(mockResult)
  })

  it('en rechazo llama toastFn(err.message, "error")', async () => {
    const props = makeProps()
    props.cancelMutation.mutateAsync.mockRejectedValue(new Error('Fallo de red'))

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    expect(props.toastFn).toHaveBeenCalledWith('Fallo de red', 'error')
    expect(props.onSuccess).not.toHaveBeenCalled()
  })

  it('isPending es true durante la mutación y false al finalizar', async () => {
    const props = makeProps()
    let resolveIt
    props.cancelMutation.mutateAsync.mockImplementation(
      () => new Promise(res => { resolveIt = res })
    )

    const { result } = renderHook(() => useCancelFlow(props))

    expect(result.current.isPending).toBe(false)

    let flushPromise
    act(() => {
      flushPromise = result.current.initiateCancel({ code: 'CITA001' })
    })

    expect(result.current.isPending).toBe(true)

    await act(async () => {
      resolveIt({ id: 1 })
      await flushPromise
    })

    expect(result.current.isPending).toBe(false)
  })
})

// ============================================================================
// 2. Flujo con OTP
// ============================================================================

describe('useCancelFlow — flujo con OTP', () => {
  it('initiateCancel llama requestOtpFn cuando phoneVerificationRequired=true', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    expect(props.requestOtpFn).toHaveBeenCalledTimes(1)
    expect(props.cancelMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('tras requestOtpFn exitoso, otpPending=true y otpPhone===maskedPhone', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    expect(result.current.otpPending).toBe(true)
    expect(result.current.otpPhone).toBe('55****1234')
  })

  it('llama onOtpReady() tras OTP enviado correctamente', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    expect(props.onOtpReady).toHaveBeenCalledTimes(1)
  })

  it('handleOtpVerify llama mutateAsync con cancelData + pendingId + otpCode', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid42', maskedPhone: '55****1234' })
    props.cancelMutation.mutateAsync.mockResolvedValue({ id: 1 })

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    await act(async () => {
      await result.current.handleOtpVerify('123456', { code: 'CITA001', reason: 'personal' })
    })

    expect(props.cancelMutation.mutateAsync).toHaveBeenCalledWith({
      code: 'CITA001',
      reason: 'personal',
      pendingId: 'pid42',
      otpCode: '123456',
    })
  })

  it('verificación correcta → otpPending=false y onSuccess llamado', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })
    const mockResult = { id: 1 }
    props.cancelMutation.mutateAsync.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    await act(async () => {
      await result.current.handleOtpVerify('123456', { code: 'CITA001' })
    })

    expect(result.current.otpPending).toBe(false)
    expect(props.onSuccess).toHaveBeenCalledWith(mockResult)
  })

  it('código incorrecto → otpError contiene el mensaje de error', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })
    props.cancelMutation.mutateAsync.mockRejectedValue(new Error('Código incorrecto'))

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    await act(async () => {
      await result.current.handleOtpVerify('000000', { code: 'CITA001' })
    })

    expect(result.current.otpError).toBe('Código incorrecto')
  })
})

// ============================================================================
// 3. Guard de double-submit (submitInFlightRef)
// ============================================================================

describe('useCancelFlow — guard double-submit', () => {
  it('llamar initiateCancel dos veces simultáneamente → mutateAsync solo se llama una vez', async () => {
    const props = makeProps()
    let resolveFirst
    props.cancelMutation.mutateAsync.mockImplementation(
      () => new Promise(res => { resolveFirst = res })
    )

    const { result } = renderHook(() => useCancelFlow(props))

    let p1, p2
    act(() => {
      p1 = result.current.initiateCancel({ code: 'CITA001' })
      p2 = result.current.initiateCancel({ code: 'CITA001' })
    })

    await act(async () => {
      resolveFirst({ id: 1 })
      await Promise.all([p1, p2])
    })

    expect(props.cancelMutation.mutateAsync).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// 4. Resend cooldown
// ============================================================================

describe('useCancelFlow — resend cooldown', () => {
  it('tras envío OTP, resendCooldown comienza en 60', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'p1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    expect(result.current.resendCooldown).toBe(60)
  })

  it('handleResend cuando resendCooldown > 0 → no llama requestOtpFn de nuevo', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'p1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    props.requestOtpFn.mockClear()

    await act(async () => {
      await result.current.handleResend()
    })

    expect(props.requestOtpFn).not.toHaveBeenCalled()
  })
})

// ============================================================================
// 5. resetOtp
// ============================================================================

describe('useCancelFlow — resetOtp', () => {
  it('resetOtp pone otpPending=false y otpError=null', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'p1', maskedPhone: '55****1234' })
    props.cancelMutation.mutateAsync.mockRejectedValue(new Error('Código malo'))

    const { result } = renderHook(() => useCancelFlow(props))

    await act(async () => {
      await result.current.initiateCancel({ code: 'CITA001' })
    })

    await act(async () => {
      await result.current.handleOtpVerify('000000', { code: 'CITA001' })
    })

    expect(result.current.otpPending).toBe(true)
    expect(result.current.otpError).toBe('Código malo')

    act(() => {
      result.current.resetOtp()
    })

    expect(result.current.otpPending).toBe(false)
    expect(result.current.otpError).toBeNull()
  })
})
