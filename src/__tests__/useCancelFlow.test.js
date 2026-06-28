// @vitest-environment jsdom
/**
 * Unit — frontend/src/hooks/useCancelFlow.js
 *
 * Flujo OTP de cancelacion con mock total (sin SMS ni correos reales).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCancelFlow } from '../hooks/useCancelFlow.js'

function makeMutationMock(resolvedValue) {
  return { mutateAsync: vi.fn().mockResolvedValue(resolvedValue) }
}

function makeRejectedMutationMock(errorMsg) {
  return { mutateAsync: vi.fn().mockRejectedValue(new Error(errorMsg)) }
}

const BASE_PROPS = {
  phoneVerificationRequired: false,
  cancelMutation: null,
  requestOtpFn: vi.fn(),
  onSuccess: vi.fn(),
  onOtpReady: vi.fn(),
  toastFn: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

// ── Sin verificación OTP ──────────────────────────────────────────────────────

describe('useCancelFlow — phoneVerificationRequired=false', () => {
  it('llama cancelMutation.mutateAsync directamente', async () => {
    const cancelMutation = makeMutationMock({ id: 1 })
    const onSuccess = vi.fn()
    const toastFn = vi.fn()

    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: false,
      cancelMutation,
      onSuccess,
      toastFn,
    }))

    await act(async () => {
      await result.current.initiateCancel({ appointmentId: 'ABC' })
    })

    expect(cancelMutation.mutateAsync).toHaveBeenCalledWith({ appointmentId: 'ABC' })
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 })
    expect(toastFn).toHaveBeenCalledWith(expect.any(String), 'info')
  })

  it('llama toastFn con error cuando cancelMutation falla', async () => {
    const cancelMutation = makeRejectedMutationMock('Cita no encontrada')
    const toastFn = vi.fn()

    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: false,
      cancelMutation,
      toastFn,
    }))

    await act(async () => {
      await result.current.initiateCancel({})
    })

    expect(toastFn).toHaveBeenCalledWith('Cita no encontrada', 'error')
  })

  it('isPending vuelve a false tras completar', async () => {
    const cancelMutation = makeMutationMock({})
    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      cancelMutation,
      toastFn: vi.fn(),
      onSuccess: vi.fn(),
    }))

    await act(async () => {
      await result.current.initiateCancel({})
    })

    expect(result.current.isPending).toBe(false)
  })
})

// ── Con verificación OTP ──────────────────────────────────────────────────────

describe('useCancelFlow — phoneVerificationRequired=true', () => {
  it('llama requestOtpFn y activa otpPending', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({
      pendingId: 'PID-1',
      maskedPhone: '***4567',
    })
    const onOtpReady = vi.fn()

    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      onOtpReady,
      toastFn: vi.fn(),
    }))

    await act(async () => {
      await result.current.initiateCancel({ appointmentId: 'XYZ' })
    })

    expect(requestOtpFn).toHaveBeenCalledTimes(1)
    expect(result.current.otpPending).toBe(true)
    expect(result.current.otpPhone).toBe('***4567')
    expect(onOtpReady).toHaveBeenCalledTimes(1)
  })

  it('inicializa resendCooldown=60 tras enviar OTP', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'P', maskedPhone: '***' })

    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      toastFn: vi.fn(),
    }))

    await act(async () => {
      await result.current.initiateCancel({})
    })

    expect(result.current.resendCooldown).toBe(60)
  })

  it('handleOtpVerify cancela con pendingId + otpCode y llama onSuccess', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'PID-2', maskedPhone: '***' })
    const cancelMutation = makeMutationMock({ id: 99 })
    const onSuccess = vi.fn()
    const toastFn = vi.fn()

    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      cancelMutation,
      onSuccess,
      toastFn,
    }))

    await act(async () => { await result.current.initiateCancel({ appointmentId: 'XYZ' }) })
    await act(async () => { await result.current.handleOtpVerify('123456', { appointmentId: 'XYZ' }) })

    expect(cancelMutation.mutateAsync).toHaveBeenCalledWith({
      appointmentId: 'XYZ',
      pendingId: 'PID-2',
      otpCode: '123456',
    })
    expect(onSuccess).toHaveBeenCalledWith({ id: 99 })
    expect(result.current.otpPending).toBe(false)
  })

  it('handleOtpVerify con OTP incorrecto setea otpError', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'PID-3', maskedPhone: '***' })
    const cancelMutation = makeRejectedMutationMock('OTP incorrecto')

    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      cancelMutation,
      toastFn: vi.fn(),
    }))

    await act(async () => { await result.current.initiateCancel({}) })
    await act(async () => { await result.current.handleOtpVerify('000000', {}) })

    expect(result.current.otpError).toMatch(/OTP incorrecto/)
    expect(result.current.otpPending).toBe(true)
  })

  it('resetOtp limpia otpError y desactiva otpPending', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'P', maskedPhone: '***' })
    const cancelMutation = makeRejectedMutationMock('error')

    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      cancelMutation,
      toastFn: vi.fn(),
    }))

    await act(async () => { await result.current.initiateCancel({}) })
    await act(async () => { await result.current.handleOtpVerify('bad', {}) })
    expect(result.current.otpError).toBeTruthy()

    act(() => result.current.resetOtp())

    expect(result.current.otpError).toBeNull()
    expect(result.current.otpPending).toBe(false)
  })
})

// ── handleResend ──────────────────────────────────────────────────────────────

describe('useCancelFlow — handleResend', () => {
  it('no hace nada si resendCooldown > 0', async () => {
    const requestOtpFn = vi.fn().mockResolvedValue({ pendingId: 'P', maskedPhone: '***' })

    const { result } = renderHook(() => useCancelFlow({
      ...BASE_PROPS,
      phoneVerificationRequired: true,
      requestOtpFn,
      toastFn: vi.fn(),
    }))

    await act(async () => { await result.current.initiateCancel({}) })
    // resendCooldown=60 ahora
    requestOtpFn.mockClear()

    await act(async () => { await result.current.handleResend() })

    expect(requestOtpFn).not.toHaveBeenCalled()
  })
})
