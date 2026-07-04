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
import React from 'react'

vi.mock('../hooks/useConfig', () => ({
  useConfig: vi.fn(),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({ isDark: false })),
}))

function styleTagContent() {
  return document.getElementById('tenant-style-overrides')?.textContent || ''
}

async function renderApplier(landingDesign) {
  const { useConfig } = await import('../hooks/useConfig')
  useConfig.mockReturnValue({
    data: { landing_config: { design: landingDesign }, primary_color: null },
  })
  const { default: BrandTokensApplier } = await import('../components/BrandTokensApplier.jsx')
  return render(<BrandTokensApplier />)
}

beforeEach(() => {
  vi.clearAllMocks()
  document.getElementById('tenant-style-overrides')?.remove()
  document.documentElement.style.removeProperty('--radius')
})

afterEach(() => {
  document.getElementById('tenant-style-overrides')?.remove()
  document.documentElement.style.removeProperty('--radius')
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
