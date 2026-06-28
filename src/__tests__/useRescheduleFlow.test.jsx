// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRescheduleFlow } from '../hooks/useRescheduleFlow.js'

// ============================================================================
// Helpers de fábrica
// ============================================================================

function makeProps(overrides = {}) {
  return {
    phoneVerificationRequired: false,
    rescheduleMutation: { mutateAsync: vi.fn() },
    requestOtpFn: vi.fn(),
    onSuccess: vi.fn(),
    onOtpReady: vi.fn(),
    toastFn: vi.fn(),
    successMessage: 'Cita reagendada correctamente.',
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

describe('useRescheduleFlow — flujo directo (sin OTP)', () => {
  it('initiateReschedule llama a rescheduleMutation.mutateAsync con los datos', async () => {
    const props = makeProps()
    props.rescheduleMutation.mutateAsync.mockResolvedValue({ id: 1 })

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    expect(props.rescheduleMutation.mutateAsync).toHaveBeenCalledWith({ date: '2027-01-01' })
  })

  it('en éxito llama toastFn(successMessage, "success") y onSuccess(result)', async () => {
    const props = makeProps()
    const mockResult = { id: 99 }
    props.rescheduleMutation.mutateAsync.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    expect(props.toastFn).toHaveBeenCalledWith('Cita reagendada correctamente.', 'success')
    expect(props.onSuccess).toHaveBeenCalledWith(mockResult)
  })

  it('si result.promoRemovedOnReschedule=true → llama toastFn dos veces (success + info)', async () => {
    const props = makeProps()
    props.rescheduleMutation.mutateAsync.mockResolvedValue({
      id: 1,
      promoRemovedOnReschedule: true,
    })

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    expect(props.toastFn).toHaveBeenCalledTimes(2)
    expect(props.toastFn).toHaveBeenNthCalledWith(1, 'Cita reagendada correctamente.', 'success')
    expect(props.toastFn).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('promoción'),
      'info'
    )
  })

  it('en rechazo llama toastFn(err.message, "error")', async () => {
    const props = makeProps()
    props.rescheduleMutation.mutateAsync.mockRejectedValue(new Error('Fallo de red'))

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    expect(props.toastFn).toHaveBeenCalledWith('Fallo de red', 'error')
    expect(props.onSuccess).not.toHaveBeenCalled()
  })

  it('isPending es true durante la mutación y false al finalizar', async () => {
    const props = makeProps()
    let resolveIt
    props.rescheduleMutation.mutateAsync.mockImplementation(
      () => new Promise(res => { resolveIt = res })
    )

    const { result } = renderHook(() => useRescheduleFlow(props))

    expect(result.current.isPending).toBe(false)

    let flushPromise
    act(() => {
      flushPromise = result.current.initiateReschedule({ date: '2027-01-01' })
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

describe('useRescheduleFlow — flujo con OTP', () => {
  it('initiateReschedule llama requestOtpFn cuando phoneVerificationRequired=true', async () => {
    const props = makeProps({
      phoneVerificationRequired: true,
    })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    expect(props.requestOtpFn).toHaveBeenCalledTimes(1)
    expect(props.rescheduleMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('tras requestOtpFn exitoso, otpPending=true y otpPhone===maskedPhone', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    expect(result.current.otpPending).toBe(true)
    expect(result.current.otpPhone).toBe('55****1234')
  })

  it('llama onOtpReady() tras OTP enviado correctamente', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    expect(props.onOtpReady).toHaveBeenCalledTimes(1)
  })

  it('handleOtpVerify llama mutateAsync con savedData + pendingId + otpCode', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid42', maskedPhone: '55****1234' })
    props.rescheduleMutation.mutateAsync.mockResolvedValue({ id: 1 })

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01', serviceId: 10 })
    })

    await act(async () => {
      await result.current.handleOtpVerify('123456')
    })

    expect(props.rescheduleMutation.mutateAsync).toHaveBeenCalledWith({
      date: '2027-01-01',
      serviceId: 10,
      pendingId: 'pid42',
      otpCode: '123456',
    })
  })

  it('verificación correcta → otpPending=false y onSuccess llamado', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })
    const mockResult = { id: 1 }
    props.rescheduleMutation.mutateAsync.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    await act(async () => {
      await result.current.handleOtpVerify('123456')
    })

    expect(result.current.otpPending).toBe(false)
    expect(props.onSuccess).toHaveBeenCalledWith(mockResult)
  })

  it('código incorrecto → otpError contiene el mensaje de error', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'pid1', maskedPhone: '55****1234' })
    props.rescheduleMutation.mutateAsync.mockRejectedValue(new Error('Código incorrecto'))

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    await act(async () => {
      await result.current.handleOtpVerify('000000')
    })

    expect(result.current.otpError).toBe('Código incorrecto')
  })
})

// ============================================================================
// 3. Guard de double-submit (submitInFlightRef)
// ============================================================================

describe('useRescheduleFlow — guard double-submit', () => {
  it('llamar initiateReschedule dos veces simultáneamente → mutateAsync solo se llama una vez', async () => {
    const props = makeProps()
    let resolveFirst
    props.rescheduleMutation.mutateAsync.mockImplementation(
      () => new Promise(res => { resolveFirst = res })
    )

    const { result } = renderHook(() => useRescheduleFlow(props))

    let p1, p2
    act(() => {
      p1 = result.current.initiateReschedule({ date: '2027-01-01' })
      p2 = result.current.initiateReschedule({ date: '2027-01-01' })
    })

    await act(async () => {
      resolveFirst({ id: 1 })
      await Promise.all([p1, p2])
    })

    expect(props.rescheduleMutation.mutateAsync).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// 4. Resend cooldown
// ============================================================================

describe('useRescheduleFlow — resend cooldown', () => {
  it('tras envío OTP, resendCooldown comienza en 60', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'p1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    expect(result.current.resendCooldown).toBe(60)
  })

  it('handleResend cuando resendCooldown > 0 → no llama requestOtpFn de nuevo', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'p1', maskedPhone: '55****1234' })

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
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

describe('useRescheduleFlow — resetOtp', () => {
  it('resetOtp pone otpPending=false y otpError=null', async () => {
    const props = makeProps({ phoneVerificationRequired: true })
    props.requestOtpFn.mockResolvedValue({ pendingId: 'p1', maskedPhone: '55****1234' })
    props.rescheduleMutation.mutateAsync.mockRejectedValue(new Error('Código malo'))

    const { result } = renderHook(() => useRescheduleFlow(props))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2027-01-01' })
    })

    await act(async () => {
      await result.current.handleOtpVerify('000000')
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
