/**
 * Tests for frontend/src/components/BrandTokensApplier.jsx
 *
 * Focus — "Forma" (shape) design tokens, the part that was reported broken:
 *   - border_radius sets --radius on documentElement AND is injected into the
 *     override <style> tag targeting .card/.rounded-2xl/.rounded-3xl/.landing-card-shape
 *     (the last one is the marker class added to the landing page's real card
 *     elements — Services/Staff/Testimonials/Location — which previously used
 *     hardcoded arbitrary-value classes like rounded-[28px] that the override
 *     never matched).
 *   - button_style 'sharp' / 'rounded' / 'pill' each produce a distinct,
 *     non-overlapping border-radius override for <button> elements.
 *   - Untouched tenants (no design.border_radius / button_style saved) get
 *     no override injected at all — no regression for existing tenants.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

vi.mock('../hooks/useConfig', () => ({
  useConfig: vi.fn(),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({ isDark: false })),
}))

function styleTagContent() {
  return document.getElementById('tenant-style-overrides')?.textContent || ''
}

async function renderApplier(landingDesign, { primary_color = null } = {}) {
  const { useConfig } = await import('../hooks/useConfig')
  useConfig.mockReturnValue({
    data: { landing_config: { design: landingDesign }, primary_color },
  })
  const { default: BrandTokensApplier } = await import('../components/BrandTokensApplier.jsx')
  return render(<BrandTokensApplier />)
}

// Simulates the admin Landing Editor's live-preview postMessage.
function postPreview(design, origin = 'http://localhost:5174') {
  window.dispatchEvent(new MessageEvent('message', {
    origin,
    data: { type: 'LANDING_PREVIEW', config: { design } },
  }))
}

const GOLD_VARS = ['--gold', '--gold-light', '--gold-muted', '--on-gold']

beforeEach(() => {
  vi.clearAllMocks()
  document.getElementById('tenant-style-overrides')?.remove()
  document.documentElement.style.removeProperty('--radius')
  GOLD_VARS.forEach(v => document.documentElement.style.removeProperty(v))
})

afterEach(() => {
  document.getElementById('tenant-style-overrides')?.remove()
  document.documentElement.style.removeProperty('--radius')
  GOLD_VARS.forEach(v => document.documentElement.style.removeProperty(v))
})

describe('BrandTokensApplier — border_radius (Esquinas)', () => {
  it('sets --radius on documentElement when border_radius is configured', async () => {
    await act(async () => { await renderApplier({ border_radius: 24 }) })
    expect(document.documentElement.style.getPropertyValue('--radius')).toBe('24px')
  })

  it('injects an override rule covering the landing page real card elements (landing-card-shape)', async () => {
    await act(async () => { await renderApplier({ border_radius: 24 }) })
    const css = styleTagContent()
    expect(css).toMatch(/\.landing-card-shape/)
    expect(css).toMatch(/\.rounded-2xl/)
    expect(css).toMatch(/\.rounded-3xl/)
    expect(css).toContain('var(--radius)')
  })

  it('applies --radius as soon as the tenant SPA mounts, regardless of route', async () => {
    await act(async () => { await renderApplier({ border_radius: 8 }) })
    expect(document.documentElement.style.getPropertyValue('--radius')).toBe('8px')
  })

  it('does NOT inject a radius override when border_radius was never configured (no regression for untouched tenants)', async () => {
    await act(async () => { await renderApplier({}) })
    const css = styleTagContent()
    expect(css).not.toMatch(/landing-card-shape/)
    expect(document.documentElement.style.getPropertyValue('--radius')).toBe('')
  })
})

describe('BrandTokensApplier — button_style (Botones)', () => {
  it('"sharp" (Recto) forces a small fixed radius on all buttons', async () => {
    await act(async () => { await renderApplier({ button_style: 'sharp' }) })
    expect(styleTagContent()).toMatch(/button\s*\{\s*border-radius:\s*6px\s*!important;?\s*\}/)
  })

  it('"rounded" (Suave) forces its own distinct radius — no longer identical to "pill"', async () => {
    await act(async () => { await renderApplier({ button_style: 'rounded' }) })
    const css = styleTagContent()
    expect(css).toMatch(/button\s*\{\s*border-radius:\s*14px\s*!important;?\s*\}/)
    expect(css).not.toContain('9999px')
    expect(css).not.toMatch(/border-radius:\s*6px/)
  })

  it('"pill" (Píldora) forces a full pill radius on all buttons', async () => {
    await act(async () => { await renderApplier({ button_style: 'pill' }) })
    expect(styleTagContent()).toMatch(/button\s*\{\s*border-radius:\s*9999px\s*!important;?\s*\}/)
  })

  it('the three button_style options are pairwise distinct', async () => {
    const cssFor = async (style) => {
      document.getElementById('tenant-style-overrides')?.remove()
      await act(async () => { await renderApplier({ button_style: style }) })
      return styleTagContent()
    }
    const sharp   = await cssFor('sharp')
    const rounded = await cssFor('rounded')
    const pill    = await cssFor('pill')
    expect(new Set([sharp, rounded, pill]).size).toBe(3)
  })

  it('does NOT inject any button override when button_style was never configured', async () => {
    await act(async () => { await renderApplier({}) })
    const css = styleTagContent()
    expect(css).not.toMatch(/button\s*\{\s*border-radius/)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Regression: the admin's "Restaurar predeterminados" publishes design.primary
// as an explicit null (never a fabricated color) to clear a tenant's brand
// color back to the neutral CSS default. --gold used to (a) never get cleared
// once set — it stuck at the old inline value forever — and (b) in the Landing
// Editor's live preview specifically, silently fall back to the *already
// published* primary_color column, making a reset look like it did nothing
// until the admin actually hit Publicar.
// ────────────────────────────────────────────────────────────────────────────

describe('BrandTokensApplier — brand colour (--gold)', () => {
  it('sets --gold from a valid primary_color column', async () => {
    await act(async () => { await renderApplier({}, { primary_color: '#1E90FF' }) })
    expect(document.documentElement.style.getPropertyValue('--gold')).toBe('30 144 255')
  })

  it('clears a previously-set --gold when there is no primary color anywhere (neutral CSS default applies)', async () => {
    document.documentElement.style.setProperty('--gold', '9 9 9') // simulate a stale leftover from an earlier render
    await act(async () => { await renderApplier({}, { primary_color: null }) })
    expect(document.documentElement.style.getPropertyValue('--gold')).toBe('')
  })

  it('falls back to the primary_color column when landing has no design.primary and there is no live preview (keeps non-landing-enabled tenants branded on /agendar, /gestionar)', async () => {
    await act(async () => { await renderApplier({ border_radius: 8 }, { primary_color: '#00AA00' }) })
    expect(document.documentElement.style.getPropertyValue('--gold')).toBe('0 170 0')
  })

  it('live preview with primary: null shows neutral gray immediately, even while the published column still holds a real color', async () => {
    await act(async () => { await renderApplier({}, { primary_color: '#1E90FF' }) })
    expect(document.documentElement.style.getPropertyValue('--gold')).toBe('30 144 255')

    await act(async () => { postPreview({ primary: null }) })
    expect(document.documentElement.style.getPropertyValue('--gold')).toBe('')
  })

  it('live preview with a real hex color overrides the published column', async () => {
    await act(async () => { await renderApplier({}, { primary_color: '#1E90FF' }) })
    await act(async () => { postPreview({ primary: '#FF0000' }) })
    expect(document.documentElement.style.getPropertyValue('--gold')).toBe('255 0 0')
  })

  it('ignores a postMessage from a disallowed origin (does not leak the draft to arbitrary embedders)', async () => {
    await act(async () => { await renderApplier({}, { primary_color: '#1E90FF' }) })
    await act(async () => { postPreview({ primary: '#FF0000' }, 'https://evil-example.com') })
    expect(document.documentElement.style.getPropertyValue('--gold')).toBe('30 144 255')
  })
})
