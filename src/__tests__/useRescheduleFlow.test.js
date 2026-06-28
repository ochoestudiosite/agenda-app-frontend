// @vitest-environment jsdom
/**
 * Unit — frontend/src/hooks/useRescheduleFlow.js
 *
 * Flujo OTP de reagendamiento con mock total (sin SMS ni correos reales).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRescheduleFlow } from '../hooks/useRescheduleFlow.js'

function makeMutationMock(resolvedValue) {
  return { mutateAsync: vi.fn().mockResolvedValue(resolvedValue) }
}
function makeRejectedMutationMock(errorMsg) {
  return { mutateAsync: vi.fn().mockRejectedValue(new Error(errorMsg)) }
}

const BASE_PROPS = {
  phoneVerificationRequired: false,
  rescheduleMutation: null,
  requestOtpFn: vi.fn(),
  onSuccess: vi.fn(),
  toastFn: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

// ── Sin verificacion OTP ──────────────────────────────────────────────────────

describe('useRescheduleFlow — phoneVerificationRequired=false', () => {
  it('llama rescheduleMutation.mutateAsync directamente', async () => {
    const rescheduleMutation = makeMutationMock({ id: 1 })
    const onSuccess = vi.fn()
    const toastFn = vi.fn()

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      rescheduleMutation,
      onSuccess,
      toastFn,
    }))

    await act(async () => {
      await result.current.initiateReschedule({ date: '2026-08-01', time: '10:00' })
    })

    expect(rescheduleMutation.mutateAsync).toHaveBeenCalledWith({ date: '2026-08-01', time: '10:00' })
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 })
    expect(toastFn).toHaveBeenCalledWith(expect.any(String), 'success')
  })

  it('muestra toast adicional cuando promoRemovedOnReschedule=true', async () => {
    const rescheduleMutation = makeMutationMock({ promoRemovedOnReschedule: true })
    const toastFn = vi.fn()

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      rescheduleMutation,
      onSuccess: vi.fn(),
      toastFn,
    }))

    await act(async () => { await result.current.initiateReschedule({}) })

    expect(toastFn).toHaveBeenCalledTimes(2)
    const calls = toastFn.mock.calls
    expect(calls.some(c => c[1] === 'success')).toBe(true)
    expect(calls.some(c => c[1] === 'info')).toBe(true)
  })

  it('toastFn con error cuando rescheduleMutation falla', async () => {
    const rescheduleMutation = makeRejectedMutationMock('Slot ocupado')
    const toastFn = vi.fn()

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      rescheduleMutation,
      toastFn,
    }))

    await act(async () => { await result.current.initiateReschedule({}) })

    expect(toastFn).toHaveBeenCalledWith('Slot ocupado', 'error')
  })

  it('isPending vuelve a false tras completar', async () => {
    const rescheduleMutation = makeMutationMock({})

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      rescheduleMutation,
      toastFn: vi.fn(),
      onSuccess: vi.fn(),
    }))

    await act(async () => { await result.current.initiateReschedule({}) })

    expect(result.current.isPending).toBe(false)
  })
})

// ── Con verificacion OTP ──────────────────────────────────────────────────────

describe('useRescheduleFlow — phoneVerificationRequired=true', () => {
  it('llama requestOtpFn y activa otpPending', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'P1', maskedPhone: '***7890' })

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      toastFn: vi.fn(),
    }))

    await act(async () => { await result.current.initiateReschedule({ date: '2026-09-01' }) })

    expect(requestOtpFn).toHaveBeenCalledTimes(1)
    expect(result.current.otpPending).toBe(true)
    expect(result.current.otpPhone).toBe('***7890')
    expect(result.current.resendCooldown).toBe(60)
  })

  it('handleOtpVerify reagenda con pendingId + otpCode + datos originales', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'P2', maskedPhone: '***' })
    const rescheduleMutation = makeMutationMock({ id: 77 })
    const onSuccess = vi.fn()
    const toastFn = vi.fn()

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      rescheduleMutation,
      onSuccess,
      toastFn,
    }))

    await act(async () => { await result.current.initiateReschedule({ date: '2026-09-01', time: '11:00' }) })
    await act(async () => { await result.current.handleOtpVerify('654321') })

    expect(rescheduleMutation.mutateAsync).toHaveBeenCalledWith({
      date: '2026-09-01',
      time: '11:00',
      pendingId: 'P2',
      otpCode: '654321',
    })
    expect(onSuccess).toHaveBeenCalledWith({ id: 77 })
    expect(result.current.otpPending).toBe(false)
  })

  it('handleOtpVerify con OTP incorrecto setea otpError, mantiene otpPending', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'P3', maskedPhone: '***' })
    const rescheduleMutation = makeRejectedMutationMock('Codigo invalido')

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      rescheduleMutation,
      toastFn: vi.fn(),
    }))

    await act(async () => { await result.current.initiateReschedule({}) })
    await act(async () => { await result.current.handleOtpVerify('bad') })

    expect(result.current.otpError).toMatch(/Codigo invalido/)
    expect(result.current.otpPending).toBe(true)
  })

  it('handleOtpVerify no hace nada si no hay datos pendientes', async () => {
    const rescheduleMutation = makeMutationMock({})

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      rescheduleMutation,
      toastFn: vi.fn(),
    }))

    await act(async () => { await result.current.handleOtpVerify('123456') })

    expect(rescheduleMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('resetOtp limpia error y desactiva otpPending', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'P', maskedPhone: '***' })
    const rescheduleMutation = makeRejectedMutationMock('error')

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      rescheduleMutation,
      toastFn: vi.fn(),
    }))

    await act(async () => { await result.current.initiateReschedule({}) })
    await act(async () => { await result.current.handleOtpVerify('bad') })
    expect(result.current.otpError).toBeTruthy()

    act(() => result.current.resetOtp())

    expect(result.current.otpError).toBeNull()
    expect(result.current.otpPending).toBe(false)
  })
})

// ── handleResend ──────────────────────────────────────────────────────────────

describe('useRescheduleFlow — handleResend', () => {
  it('no hace nada si resendCooldown > 0', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'P', maskedPhone: '***' })

    const { result } = renderHook(() => useRescheduleFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      toastFn: vi.fn(),
    }))

    await act(async () => { await result.current.initiateReschedule({}) })
    requestOtpFn.mockClear()

    await act(async () => { await result.current.handleResend() })

    expect(requestOtpFn).not.toHaveBeenCalled()
  })
})
