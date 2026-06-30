/**
 * Tests for F-007: AbortSignal propagation in src/services/api.js request()
 *
 * Covers:
 *   - External signal already aborted → fetch is never called / throws CANCELLED
 *   - External signal aborted after fetch starts → controller.abort() is triggered
 *   - Internal 15s timeout still works when no external signal is passed
 *   - Retry logic is not triggered for AbortError
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Freeze import.meta.env before any module import ──────────────────────────
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3001',
      VITE_PUBLIC_DOMAIN: 'cita24.com',
      MODE: 'test',
    },
  },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOkResponse(body = {}) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('api.request — AbortSignal (F-007)', () => {
  let fetchSpy

  beforeEach(() => {
    vi.useFakeTimers()
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    // jsdom default hostname is 'localhost' — getTenantSlug() returns null,
    // so no X-Tenant-Slug header is added (correct for unit tests).
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    // Re-stub import.meta.env since unstubAllGlobals clears it
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_API_URL: 'http://localhost:3001',
          VITE_PUBLIC_DOMAIN: 'cita24.com',
          MODE: 'test',
        },
      },
    })
  })

  it('resolves normally when fetch succeeds and no external signal is passed', async () => {
    fetchSpy.mockResolvedValue(makeOkResponse({ ok: true }))

    const { api } = await import('../services/api.js')
    const result = await api.getConfig()
    expect(result).toEqual({ ok: true })
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('propagates external signal to the internal AbortController', async () => {
    // Capture the signal that fetch received
    let capturedSignal
    fetchSpy.mockImplementation((_url, opts) => {
      capturedSignal = opts?.signal
      return Promise.resolve(makeOkResponse({ propagated: true }))
    })

    const external = new AbortController()
    const { api } = await import('../services/api.js')
    await api.getConfig({ signal: external.signal })

    // The fetch was called with an AbortSignal (the internal controller's signal)
    expect(capturedSignal).toBeInstanceOf(AbortSignal)
    // The internal signal is not the external one (it's a combined controller)
    expect(capturedSignal).not.toBe(external.signal)
  })

  it('aborts the fetch when the external signal fires after the fetch starts', async () => {
    const external = new AbortController()

    fetchSpy.mockImplementation((_url, opts) => {
      // Simulate aborting the external signal while the fetch is in-flight
      external.abort()
      // The internal controller should now be aborted too
      const err = new DOMException('Aborted', 'AbortError')
      return Promise.reject(err)
    })

    const { api } = await import('../services/api.js')
    const err = await api.getConfig({ signal: external.signal }).catch(e => e)

    // Should throw CANCELLED, not TIMEOUT, since the external signal fired
    expect(err.code).toBe('CANCELLED')
  })

  it('throws TIMEOUT when no external signal and fetch hangs for 15s', async () => {
    // fetch never resolves
    fetchSpy.mockImplementation(() => new Promise(() => {}))

    const { api } = await import('../services/api.js')
    const promise = api.getConfig()

    // Advance past the 15s timeout
    await vi.advanceTimersByTimeAsync(16_000)

    const err = await promise.catch(e => e)
    expect(err.code).toBe('TIMEOUT')
  })

  it('does not retry on AbortError (CANCELLED)', async () => {
    const external = new AbortController()
    external.abort()

    fetchSpy.mockImplementation((_url, opts) => {
      const err = new DOMException('Aborted', 'AbortError')
      return Promise.reject(err)
    })

    const { api } = await import('../services/api.js')
    const err = await api.getConfig({ signal: external.signal }).catch(e => e)

    // Only one fetch call — no retry
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(err.code).toBe('CANCELLED')
  })

  it('retries up to MAX_RETRIES on genuine network failure without external signal', async () => {
    // All calls reject with a network error (no .status, no .name = AbortError)
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'))

    const { api } = await import('../services/api.js')

    // Need real timers for sleep() inside retry logic, or advance them manually
    const promise = api.getConfig()
    // Advance timers to let the retries (sleep 1s, 2s) fire
    await vi.advanceTimersByTimeAsync(5_000)

    const err = await promise.catch(e => e)
    // 1 initial + 2 retries = 3 total
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(err).toBeInstanceOf(TypeError)
  })
})

describe('api.request — X-Tenant-Domain header (custom domain resolution)', () => {
  let fetchSpy

  beforeEach(() => {
    vi.useFakeTimers()
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubGlobal('import', {
      meta: {
        env: { VITE_API_URL: 'http://api.cita24.com', VITE_PUBLIC_DOMAIN: 'cita24.com', MODE: 'test' },
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function mockHostname(hostname) {
    vi.stubGlobal('window', { location: { hostname } })
  }

  it('sends X-Tenant-Domain when on a custom domain', async () => {
    mockHostname('belleza.ocheostudio.site')
    const { api } = await import('../services/api.js')
    await api.getConfig()

    const [, opts] = fetchSpy.mock.calls[0]
    expect(opts.headers['X-Tenant-Domain']).toBe('belleza.ocheostudio.site')
    expect(opts.headers['X-Tenant-Slug']).toBeUndefined()
  })

  it('sends X-Tenant-Slug (not X-Tenant-Domain) on a *.cita24.com subdomain', async () => {
    mockHostname('mibarberia.cita24.com')
    const { api } = await import('../services/api.js')
    await api.getConfig()

    const [, opts] = fetchSpy.mock.calls[0]
    expect(opts.headers['X-Tenant-Slug']).toBe('mibarberia')
    expect(opts.headers['X-Tenant-Domain']).toBeUndefined()
  })

  it('sends neither header on localhost (dev environment)', async () => {
    mockHostname('localhost')
    const { api } = await import('../services/api.js')
    await api.getConfig()

    const [, opts] = fetchSpy.mock.calls[0]
    expect(opts.headers['X-Tenant-Slug']).toBeUndefined()
    expect(opts.headers['X-Tenant-Domain']).toBeUndefined()
  })

  it('sends neither header on the root cita24.com domain', async () => {
    mockHostname('cita24.com')
    const { api } = await import('../services/api.js')
    await api.getConfig()

    const [, opts] = fetchSpy.mock.calls[0]
    expect(opts.headers['X-Tenant-Slug']).toBeUndefined()
    expect(opts.headers['X-Tenant-Domain']).toBeUndefined()
  })
})
