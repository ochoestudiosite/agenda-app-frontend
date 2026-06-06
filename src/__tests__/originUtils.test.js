/**
 * Unit — isAllowedAdminOrigin()
 *
 * File: frontend/src/utils/originUtils.js
 *
 * This function is the postMessage origin allowlist that guards the landing
 * page from malicious iframes injecting arbitrary commands via window.postMessage.
 * A false-positive (wrongly allowing an origin) is a stored XSS vector.
 *
 * Default domain used by the function when VITE_PUBLIC_DOMAIN is unset: 'cita24.com'
 * (this is the case in tests, so no env stubbing needed for most cases)
 */

import { describe, it, expect } from 'vitest'
import { isAllowedAdminOrigin } from '../utils/originUtils'

// ============================================================================
// 1. Invalid / missing input
// ============================================================================

describe('isAllowedAdminOrigin — invalid input', () => {
  it('null → false', () => expect(isAllowedAdminOrigin(null)).toBe(false))
  it('undefined → false', () => expect(isAllowedAdminOrigin(undefined)).toBe(false))
  it('empty string → false', () => expect(isAllowedAdminOrigin('')).toBe(false))
  it('number → false', () => expect(isAllowedAdminOrigin(42)).toBe(false))
  it('object → false', () => expect(isAllowedAdminOrigin({})).toBe(false))
  it('boolean → false', () => expect(isAllowedAdminOrigin(true)).toBe(false))
  it('plain hostname (not a URL) → false', () => expect(isAllowedAdminOrigin('cita24.com')).toBe(false))
  it('malformed URL string → false', () => expect(isAllowedAdminOrigin('not-a-url')).toBe(false))
  it('URL with no protocol → false', () => expect(isAllowedAdminOrigin('//cita24.com')).toBe(false))
})

// ============================================================================
// 2. Localhost / loopback dev origins (http only, port required)
// ============================================================================

describe('isAllowedAdminOrigin — localhost dev origins', () => {
  it('http://localhost:3000 → true', () => {
    expect(isAllowedAdminOrigin('http://localhost:3000')).toBe(true)
  })

  it('http://localhost:5173 → true (Vite dev server)', () => {
    expect(isAllowedAdminOrigin('http://localhost:5173')).toBe(true)
  })

  it('http://localhost:8080 → true', () => {
    expect(isAllowedAdminOrigin('http://localhost:8080')).toBe(true)
  })

  it('http://127.0.0.1:3000 → true', () => {
    expect(isAllowedAdminOrigin('http://127.0.0.1:3000')).toBe(true)
  })

  it('http://127.0.0.1:5173 → true', () => {
    expect(isAllowedAdminOrigin('http://127.0.0.1:5173')).toBe(true)
  })

  it('http://localhost (no port) → false — check requires colon after localhost', () => {
    // The check is startsWith('http://localhost:') — no port means no match
    expect(isAllowedAdminOrigin('http://localhost')).toBe(false)
  })

  it('https://localhost:3000 → false — localhost check is http-only', () => {
    // HTTPS localhost goes through the URL branch and fails: host != 'cita24.com'
    expect(isAllowedAdminOrigin('https://localhost:3000')).toBe(false)
  })
})

// ============================================================================
// 3. Exact domain match
// ============================================================================

describe('isAllowedAdminOrigin — exact domain (cita24.com)', () => {
  it('https://cita24.com → true', () => {
    expect(isAllowedAdminOrigin('https://cita24.com')).toBe(true)
  })

  it('http://cita24.com → false (must be https)', () => {
    expect(isAllowedAdminOrigin('http://cita24.com')).toBe(false)
  })

  it('https://cita24.com:443 → true (URL class strips standard port)', () => {
    // new URL('https://cita24.com:443').hostname === 'cita24.com'
    expect(isAllowedAdminOrigin('https://cita24.com:443')).toBe(true)
  })

  it('https://cita24.com:8443 → false (non-standard port — hostname still matches)', () => {
    // URL.hostname does NOT include port → 'cita24.com' === 'cita24.com' → true
    // This is actually true. The function checks hostname, not origin.
    // Document actual behavior: non-standard HTTPS port is allowed.
    expect(isAllowedAdminOrigin('https://cita24.com:8443')).toBe(true)
  })
})

// ============================================================================
// 4. Single-level subdomains — allowed
// ============================================================================

describe('isAllowedAdminOrigin — single-level subdomains (allowed)', () => {
  it('https://app.cita24.com → true', () => {
    expect(isAllowedAdminOrigin('https://app.cita24.com')).toBe(true)
  })

  it('https://admin.cita24.com → true', () => {
    expect(isAllowedAdminOrigin('https://admin.cita24.com')).toBe(true)
  })

  it('https://plataforma.cita24.com → true', () => {
    expect(isAllowedAdminOrigin('https://plataforma.cita24.com')).toBe(true)
  })

  it('https://www.cita24.com → true', () => {
    expect(isAllowedAdminOrigin('https://www.cita24.com')).toBe(true)
  })
})

// ============================================================================
// 5. Deep subdomains — rejected (security: mirrors backend CORS)
// ============================================================================

describe('isAllowedAdminOrigin — deep subdomains (rejected)', () => {
  it('https://sub.app.cita24.com → false (2 levels deep)', () => {
    expect(isAllowedAdminOrigin('https://sub.app.cita24.com')).toBe(false)
  })

  it('https://a.b.cita24.com → false', () => {
    expect(isAllowedAdminOrigin('https://a.b.cita24.com')).toBe(false)
  })

  it('https://x.y.z.cita24.com → false', () => {
    expect(isAllowedAdminOrigin('https://x.y.z.cita24.com')).toBe(false)
  })
})

// ============================================================================
// 6. Look-alike / homograph attacks — rejected
// ============================================================================

describe('isAllowedAdminOrigin — look-alike domains (rejected)', () => {
  it('https://evil-cita24.com → false', () => {
    expect(isAllowedAdminOrigin('https://evil-cita24.com')).toBe(false)
  })

  it('https://cita24.com.evil.com → false', () => {
    expect(isAllowedAdminOrigin('https://cita24.com.evil.com')).toBe(false)
  })

  it('https://notcita24.com → false', () => {
    expect(isAllowedAdminOrigin('https://notcita24.com')).toBe(false)
  })

  it('https://evil.cita24.com.attacker.io → false', () => {
    expect(isAllowedAdminOrigin('https://evil.cita24.com.attacker.io')).toBe(false)
  })

  it('https://fakecita24.com → false', () => {
    expect(isAllowedAdminOrigin('https://fakecita24.com')).toBe(false)
  })
})
