/**
 * Tests for frontend/src/hooks/useAppointment.js
 * Verifies AbortSignal is passed to api.getAppointment and api.getGroupAppointment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { mockGetAppointment, mockGetGroupAppointment } = vi.hoisted(() => ({
  mockGetAppointment:      vi.fn(),
  mockGetGroupAppointment: vi.fn(),
}))

vi.mock('../services/api.js', () => ({
  api: {
    getAppointment:      mockGetAppointment,
    getGroupAppointment: mockGetGroupAppointment,
  },
}))

function wrapper(qc) {
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAppointmentLookup — AbortSignal propagation', () => {
  it('passes signal to api.getAppointment', async () => {
    mockGetAppointment.mockResolvedValue({ code: 'ABC123' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useAppointmentLookup } = await import('../hooks/useAppointment.js')

    renderHook(() => useAppointmentLookup('ABC123'), { wrapper: wrapper(qc) })

    await waitFor(() => expect(mockGetAppointment).toHaveBeenCalled())

    const [, opts] = mockGetAppointment.mock.calls[0]
    expect(opts?.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('useGroupAppointmentLookup — AbortSignal propagation', () => {
  it('passes signal to api.getGroupAppointment', async () => {
    mockGetGroupAppointment.mockResolvedValue({ groupCode: 'GRP123' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useGroupAppointmentLookup } = await import('../hooks/useAppointment.js')

    renderHook(() => useGroupAppointmentLookup('GRP123'), { wrapper: wrapper(qc) })

    await waitFor(() => expect(mockGetGroupAppointment).toHaveBeenCalled())

    const [, opts] = mockGetGroupAppointment.mock.calls[0]
    expect(opts?.signal).toBeInstanceOf(AbortSignal)
  })
})
