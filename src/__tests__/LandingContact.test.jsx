/**
 * Tests for frontend/src/components/landing/LandingContact.jsx
 *
 * Focus:
 *   - Renders without crashing (no props — fallback to defaults)
 *   - businessName shown in brand column
 *   - Social links rendered only when provided in socials prop
 *   - Instagram, Facebook, WhatsApp links have correct hrefs
 *   - Footer navigation links appear
 *   - Missing socials are not rendered
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => new Proxy({}, {
  get: () => ({ size, className, ...rest }) => <span data-testid="icon" />,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FULL_SOCIALS = {
  instagram:      'salon.elite',
  facebook:       'salonelite',
  whatsapp:       '525512345678',
  brand_title:    'Salón Elite',
  tagline:        'Calidad y estilo en cada visita.',
  newsletter_text: 'Suscríbete y obtén 10% de descuento.',
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderContact(props = {}) {
  const { default: LandingContact } = await import('../components/landing/LandingContact.jsx')
  return render(<LandingContact {...props} />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Tests
// ============================================================================

describe('LandingContact — default render', () => {
  it('renders without crashing (no props)', async () => {
    await act(async () => { await renderContact() })
    expect(document.body).toBeTruthy()
  })

  it('shows fallback brand name "Cita24"', async () => {
    await act(async () => { await renderContact() })
    expect(document.body.textContent).toContain('Cita24')
  })
})

describe('LandingContact — businessName', () => {
  it('shows custom businessName', async () => {
    await act(async () => { await renderContact({ businessName: 'Barbería del Sol' }) })
    expect(document.body.textContent).toContain('Barbería del Sol')
  })

  it('brand_title from socials overrides businessName', async () => {
    await act(async () => {
      await renderContact({
        businessName: 'Empresa Inc.',
        socials: { brand_title: 'Mi Salón Especial' },
      })
    })
    expect(document.body.textContent).toContain('Mi Salón Especial')
  })
})

describe('LandingContact — social links', () => {
  it('renders Instagram link when provided', async () => {
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })
    const links = document.querySelectorAll('a[href*="instagram.com/salon.elite"]')
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders Facebook link when provided', async () => {
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })
    const links = document.querySelectorAll('a[href*="facebook.com/salonelite"]')
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders WhatsApp link when provided', async () => {
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })
    const links = document.querySelectorAll('a[href*="wa.me/525512345678"]')
    expect(links.length).toBeGreaterThan(0)
  })

  it('does not render social links when socials is empty', async () => {
    await act(async () => { await renderContact({ socials: {} }) })
    const instagramLinks = document.querySelectorAll('a[href*="instagram.com"]')
    const facebookLinks  = document.querySelectorAll('a[href*="facebook.com"]')
    expect(instagramLinks.length + facebookLinks.length).toBe(0)
  })

  it('missing keys not rendered (no tiktok when not provided)', async () => {
    await act(async () => { await renderContact({ socials: { instagram: 'only_insta' } }) })
    const tiktokLinks = document.querySelectorAll('a[href*="tiktok.com"]')
    expect(tiktokLinks.length).toBe(0)
  })
})

describe('LandingContact — tagline', () => {
  it('shows custom tagline from socials', async () => {
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })
    expect(document.body.textContent).toContain('Calidad y estilo en cada visita.')
  })
})
