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
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => {
  const icon = () => <span data-testid="icon" />
  return { Send: icon, MessageSquare: icon, ArrowUpRight: icon, Check: icon }
})

const mockSubscribeNewsletter = vi.fn()
vi.mock('../services/api.js', () => ({
  api: { subscribeNewsletter: (...args) => mockSubscribeNewsletter(...args) },
}))

const mockToast = vi.fn()
vi.mock('../components/ui/Toast.jsx', () => ({
  useToast: () => mockToast,
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

describe('LandingContact — footer "Explorar" links (config-driven visibility)', () => {
  it('shows Servicios/Equipo/Ubicación links by default (config = {})', async () => {
    await act(async () => { await renderContact({ socials: FULL_SOCIALS, config: {} }) })
    const body = document.body.textContent
    expect(body).toContain('Servicios')
    expect(body).toContain('Equipo')
    expect(body).toContain('Ubicación')
  })

  it('hides the Testimoniales link by default (config = {}) — section is opt-in and not rendered on the page', async () => {
    await act(async () => { await renderContact({ socials: FULL_SOCIALS, config: {} }) })
    expect(document.body.textContent).not.toContain('Testimoniales')
  })

  it('shows the Testimoniales link once explicitly enabled (visible: true)', async () => {
    await act(async () => {
      await renderContact({ socials: FULL_SOCIALS, config: { testimonials_section: { visible: true } } })
    })
    expect(document.body.textContent).toContain('Testimoniales')
  })

  it('hides Servicios link when explicitly disabled (visible: false)', async () => {
    await act(async () => {
      await renderContact({ socials: FULL_SOCIALS, config: { services_section: { visible: false } } })
    })
    expect(document.body.textContent).not.toContain('Servicios')
  })
})

describe('LandingContact — newsletter signup (real backend wiring)', () => {
  beforeEach(() => {
    mockSubscribeNewsletter.mockReset()
    mockToast.mockReset()
  })

  it('submitting a valid email calls api.subscribeNewsletter with that email', async () => {
    mockSubscribeNewsletter.mockResolvedValue({ success: true })
    const user = userEvent.setup({ delay: null })
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })

    const input = screen.getByPlaceholderText('tu@email.com')
    fireEvent.change(input, { target: { value: 'cliente@example.com' } })
    await user.click(screen.getByRole('button', { name: /suscribirme/i }))

    await waitFor(() => {
      expect(mockSubscribeNewsletter).toHaveBeenCalledWith('cliente@example.com')
    })
  })

  it('shows a confirmation message and hides the form after a successful subscribe', async () => {
    mockSubscribeNewsletter.mockResolvedValue({ success: true })
    const user = userEvent.setup({ delay: null })
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })

    const input = screen.getByPlaceholderText('tu@email.com')
    fireEvent.change(input, { target: { value: 'cliente@example.com' } })
    await user.click(screen.getByRole('button', { name: /suscribirme/i }))

    await waitFor(() => {
      expect(document.body.textContent).toContain('¡Listo!')
    })
    expect(screen.queryByPlaceholderText('tu@email.com')).toBeNull()
  })

  it('shows a consent notice with the business name next to the form', async () => {
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })
    expect(document.body.textContent).toContain('Al suscribirte aceptas recibir comunicaciones de Salón Elite.')
  })

  it('hides the consent notice after a successful subscription (form is replaced by the confirmation)', async () => {
    mockSubscribeNewsletter.mockResolvedValue({ success: true })
    const user = userEvent.setup({ delay: null })
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })

    const input = screen.getByPlaceholderText('tu@email.com')
    fireEvent.change(input, { target: { value: 'cliente@example.com' } })
    await user.click(screen.getByRole('button', { name: /suscribirme/i }))

    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Al suscribirte aceptas')
    })
  })

  it('shows an error toast when the API call fails, and keeps the form visible', async () => {
    // Value must be a syntactically valid email — otherwise the native
    // type="email" + required constraint blocks submission before onSubmit
    // ever fires, which would test the browser, not our error handling.
    mockSubscribeNewsletter.mockRejectedValue(new Error('Correo inválido'))
    const user = userEvent.setup({ delay: null })
    await act(async () => { await renderContact({ socials: FULL_SOCIALS }) })

    const input = screen.getByPlaceholderText('tu@email.com')
    fireEvent.change(input, { target: { value: 'cliente@example.com' } })
    await user.click(screen.getByRole('button', { name: /suscribirme/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Correo inválido', 'error')
    })
    expect(screen.getByPlaceholderText('tu@email.com')).toBeTruthy()
  })
})
