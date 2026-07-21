/**
 * Tests for frontend/src/hooks/useServices.js
 *
 * Focus:
 *   - branchId is forwarded to api.getServices
 *   - no branchId (landing / branch-agnostic callers) → api.getServices(null, ...)
 *   - changing branchId (e.g. sucursal switched in BookingContext) re-triggers
 *     the query with the new branch — different query key → refetch, not cache reuse
 *   - invalid branchId (non-integer) is normalized to null, same as omitting it
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { mockGetServices, mockGetSpecialists } = vi.hoisted(() => ({
  mockGetServices:    vi.fn(),
  mockGetSpecialists: vi.fn(),
}))

vi.mock('../services/api.js', () => ({
  api: {
    getServices:    mockGetServices,
    getSpecialists: mockGetSpecialists,
  },
}))

function wrapper(qc) {
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServices.mockResolvedValue({ services: [{ id: 1, name: 'Corte' }] })
  mockGetSpecialists.mockResolvedValue({ specialists: [] })
})

describe('useServices — branch param wiring', () => {
  it('calls api.getServices(null, ...) when no branchId is given', async () => {
    const { useServices } = await import('../hooks/useServices.js')
    const qc = makeQC()
    renderHook(() => useServices(), { wrapper: wrapper(qc) })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalled())
    const [branchArg, opts] = mockGetServices.mock.calls[0]
    expect(branchArg).toBeNull()
    expect(opts?.signal).toBeInstanceOf(AbortSignal)
  })

  it('calls api.getServices(20, ...) when branchId=20 is given', async () => {
    const { useServices } = await import('../hooks/useServices.js')
    const qc = makeQC()
    renderHook(() => useServices(20), { wrapper: wrapper(qc) })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalled())
    const [branchArg] = mockGetServices.mock.calls[0]
    expect(branchArg).toBe(20)
  })

  it('normalizes a non-integer branchId to null (same as omitting it)', async () => {
    const { useServices } = await import('../hooks/useServices.js')
    const qc = makeQC()
    renderHook(() => useServices('20'), { wrapper: wrapper(qc) })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalled())
    const [branchArg] = mockGetServices.mock.calls[0]
    expect(branchArg).toBeNull()
  })

  it('re-fetches with the new branch when branchId changes (sucursal switched)', async () => {
    const { useServices } = await import('../hooks/useServices.js')
    const qc = makeQC()
    const { rerender } = renderHook(({ branchId }) => useServices(branchId), {
      wrapper: wrapper(qc),
      initialProps: { branchId: 10 },
    })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalledTimes(1))
    expect(mockGetServices.mock.calls[0][0]).toBe(10)

    rerender({ branchId: 20 })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalledTimes(2))
    expect(mockGetServices.mock.calls[1][0]).toBe(20)
  })

  it('does not re-fetch when branchId stays the same across rerenders (query key unchanged)', async () => {
    const { useServices } = await import('../hooks/useServices.js')
    const qc = makeQC()
    const { rerender } = renderHook(({ branchId }) => useServices(branchId), {
      wrapper: wrapper(qc),
      initialProps: { branchId: 10 },
    })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalledTimes(1))
    rerender({ branchId: 10 })

    // give react-query a tick — no second network call should be scheduled
    await new Promise(r => setTimeout(r, 0))
    expect(mockGetServices).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// staleTime override — per-caller freshness window
//
// The booking wizard (Home → Booking → SpecialistSelector) remounts this hook
// repeatedly within one session and relies on the 60s default to avoid
// redundant refetches. The public landing page mounts once per session and
// needs admin edits (services/staff) to show up quickly, so it passes a
// shorter window. Each caller must get its own staleTime — React Query
// tracks staleness per observer even when they share the same queryKey/cache
// entry, so this can't silently regress into a single shared value.
// ============================================================================

describe('useServices — staleTime override', () => {
  it('defaults to a 60s staleTime when no override is given (wizard dedupe)', async () => {
    const { useServices } = await import('../hooks/useServices.js')
    const qc = makeQC()
    renderHook(() => useServices(), { wrapper: wrapper(qc) })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalled())
    const query = qc.getQueryCache().find({ queryKey: ['services', null] })
    expect(query.observers[0].options.staleTime).toBe(60_000)
  })

  it('honors a custom staleTime override (e.g. the landing page freshness window)', async () => {
    const { useServices } = await import('../hooks/useServices.js')
    const qc = makeQC()
    renderHook(() => useServices(undefined, { staleTime: 10_000 }), { wrapper: wrapper(qc) })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalled())
    const query = qc.getQueryCache().find({ queryKey: ['services', null] })
    expect(query.observers[0].options.staleTime).toBe(10_000)
  })

  it('two observers on the same query key keep independent staleTime values', async () => {
    const { useServices } = await import('../hooks/useServices.js')
    const qc = makeQC()
    renderHook(() => useServices(undefined, { staleTime: 10_000 }), { wrapper: wrapper(qc) })
    renderHook(() => useServices(), { wrapper: wrapper(qc) })

    await waitFor(() => expect(mockGetServices).toHaveBeenCalled())
    const query = qc.getQueryCache().find({ queryKey: ['services', null] })
    const staleTimes = query.observers.map(o => o.options.staleTime).sort((a, b) => a - b)
    expect(staleTimes).toEqual([10_000, 60_000])
  })
})
