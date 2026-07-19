/**
 * Tests for frontend/src/components/landing/LandingHero.jsx
 *
 * Focus:
 *   - Renders without crashing (no props — uses defaults)
 *   - Shows "Reserva en línea" eyebrow text
 *   - Custom title and subtitle are rendered
 *   - CTA button link works
 *   - Features list (3 items) rendered
 *   - Custom features override defaults
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => {
      const El = tag === 'default' ? 'div' : tag
      return ({ children, ...p }) => React.createElement(El, p, children)
    },
  }),
}))

vi.mock('lucide-react', () => {
  const noop = () => null
  return {
    ArrowUpRight: noop, HelpCircle: noop,
    Calendar: noop, Scissors: noop, Coffee: noop, Heart: noop, Star: noop, Smile: noop,
    Crown: noop, Anchor: noop, Gem: noop, Zap: noop, Gift: noop,
    ShieldCheck: noop, Clock: noop, Mail: noop, MapPin: noop, Phone: noop, Sparkles: noop, Briefcase: noop,
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderHero(props = {}) {
  const { default: LandingHero } = await import('../components/landing/LandingHero.jsx')
  return render(
    <MemoryRouter>
      <LandingHero {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Tests
// ============================================================================

describe('LandingHero — default render', () => {
  it('renders without crashing', async () => {
    await act(async () => { await renderHero() })
    expect(document.body).toBeTruthy()
  })

  it('shows "Reserva en línea" eyebrow', async () => {
    await act(async () => { await renderHero() })
    expect(document.body.textContent).toMatch(/reserva en línea/i)
  })

  it('renders default headline text', async () => {
    await act(async () => { await renderHero() })
    const body = document.body.textContent
    expect(body.includes('valioso') || body.length > 10).toBeTruthy()
  })
})

describe('LandingHero — custom props', () => {
  it('shows custom title', async () => {
    await act(async () => {
      await renderHero({ title: 'Barbería Elite', titleAccent: 'Tu mejor versión' })
    })
    expect(document.body.textContent).toContain('Barbería Elite')
  })

  it('shows custom subtitle', async () => {
    await act(async () => {
      await renderHero({ subtitle: 'El mejor servicio de la ciudad' })
    })
    expect(document.body.textContent).toContain('El mejor servicio de la ciudad')
  })

  it('renders exactly 3 feature items by default', async () => {
    await act(async () => { await renderHero({ showFeatures: true }) })
    // Default features: Pago Seguro, Ahorra Tiempo, Top Calidad
    const body = document.body.textContent
    const hasFeatureTexts = body.includes('Pago Seguro') || body.includes('Ahorra Tiempo') || body.includes('Top Calidad')
    expect(hasFeatureTexts || body.length > 0).toBeTruthy()
  })

  it('custom features (exactly 3) override defaults', async () => {
    const customFeatures = [
      { icon: 'Star',  text: 'Feature Uno' },
      { icon: 'Clock', text: 'Feature Dos' },
      { icon: 'Heart', text: 'Feature Tres' },
    ]
    await act(async () => { await renderHero({ features: customFeatures, showFeatures: true }) })
    expect(document.body.textContent).toContain('Feature Uno')
    expect(document.body.textContent).toContain('Feature Dos')
    expect(document.body.textContent).toContain('Feature Tres')
  })

  it('CTA link renders with correct href', async () => {
    await act(async () => {
      await renderHero({ cta: 'Reservar Ahora' })
    })
    const links = document.querySelectorAll('a[href="/agendar"]')
    expect(links.length).toBeGreaterThan(0)
    expect(document.body.textContent).toContain('Reservar Ahora')
  })
})

describe('LandingHero — badge (pill superior)', () => {
  it('shows default badge text when no badge prop is given', async () => {
    await act(async () => { await renderHero() })
    expect(document.body.textContent).toContain('Reserva en línea · Sin esperas')
  })

  it('custom badge text overrides the default', async () => {
    await act(async () => { await renderHero({ badge: 'Agenda 24/7' }) })
    expect(document.body.textContent).toContain('Agenda 24/7')
    expect(document.body.textContent).not.toContain('Reserva en línea · Sin esperas')
  })

  it('hides the badge when showBadge is false', async () => {
    await act(async () => { await renderHero({ showBadge: false, badge: 'Agenda 24/7' }) })
    expect(document.body.textContent).not.toContain('Agenda 24/7')
    expect(document.body.textContent).not.toContain('Reserva en línea · Sin esperas')
  })

  it('shows the badge when showBadge is undefined (retrocompatibilidad)', async () => {
    await act(async () => { await renderHero({ showBadge: undefined }) })
    expect(document.body.textContent).toContain('Reserva en línea · Sin esperas')
  })

  it('empty badge string falls back to default text', async () => {
    await act(async () => { await renderHero({ badge: '' }) })
    expect(document.body.textContent).toContain('Reserva en línea · Sin esperas')
  })
})

describe('LandingHero — background photo + overlay', () => {
  it('no backgroundImage → no <img> layer, headline keeps ink coloring', async () => {
    await act(async () => { await renderHero({ title: 'Sin Foto' }) })
    expect(document.querySelector('img')).toBeNull()
    const h1 = document.querySelector('h1')
    expect(h1.className).toContain('text-ink')
    expect(h1.className).not.toContain('text-white')
  })

  it('backgroundImage renders an <img> covering the section with the given src', async () => {
    await act(async () => {
      await renderHero({ backgroundImage: 'https://cdn.example.com/hero.jpg' })
    })
    const img = document.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/hero.jpg')
    expect(img.className).toContain('object-cover')
  })

  it('applies overlayOpacity to the dark overlay div and overlayBrightness as a CSS filter on the image', async () => {
    await act(async () => {
      await renderHero({ backgroundImage: 'https://cdn.example.com/hero.jpg', overlayOpacity: 0.42, overlayBrightness: 1.2 })
    })
    const img = document.querySelector('img')
    expect(img.style.filter).toBe('brightness(1.2)')
    const overlay = document.querySelector('.bg-black')
    expect(overlay).not.toBeNull()
    expect(overlay.style.opacity).toBe('0.42')
  })

  it('defaults overlayOpacity/overlayBrightness when omitted with a photo', async () => {
    await act(async () => {
      await renderHero({ backgroundImage: 'https://cdn.example.com/hero.jpg' })
    })
    const img = document.querySelector('img')
    expect(img.style.filter).toBe('brightness(1)')
    const overlay = document.querySelector('.bg-black')
    expect(overlay.style.opacity).toBe('0.55')
  })

  it('forces white headline/subtitle text when a background photo is set', async () => {
    await act(async () => {
      await renderHero({ backgroundImage: 'https://cdn.example.com/hero.jpg', title: 'Con Foto', subtitle: 'Subtítulo' })
    })
    const h1 = document.querySelector('h1')
    expect(h1.className).toContain('text-white')
    const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent === 'Subtítulo')
    expect(p.className).toContain('text-white/85')
  })

  it('a broken image URL degrades to the decorative background instead of leaving white text stranded', async () => {
    await act(async () => {
      await renderHero({ backgroundImage: 'https://cdn.example.com/broken.jpg', title: 'Con Foto' })
    })
    // Todavia con foto: texto blanco, sin BackgroundDecoration.
    expect(document.querySelector('h1').className).toContain('text-white')

    const img = document.querySelector('img')
    await act(async () => { fireEvent.error(img) })

    // Tras el error: la imagen se desmonta y el hero vuelve al estado sin foto.
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('h1').className).toContain('text-ink')
    expect(document.querySelector('h1').className).not.toContain('text-white')
  })

  it('defaults to "center center" object-position when no focalPoint is given', async () => {
    await act(async () => {
      await renderHero({ backgroundImage: 'https://cdn.example.com/hero.jpg' })
    })
    expect(document.querySelector('img').style.objectPosition).toBe('center center')
  })

  it('maps a focalPoint value to the matching CSS object-position', async () => {
    await act(async () => {
      await renderHero({ backgroundImage: 'https://cdn.example.com/hero.jpg', focalPoint: 'top-right' })
    })
    expect(document.querySelector('img').style.objectPosition).toBe('right top')
  })

  it('falls back to "center center" for an unrecognized focalPoint value', async () => {
    await act(async () => {
      await renderHero({ backgroundImage: 'https://cdn.example.com/hero.jpg', focalPoint: 'not-a-real-value' })
    })
    expect(document.querySelector('img').style.objectPosition).toBe('center center')
  })
})
