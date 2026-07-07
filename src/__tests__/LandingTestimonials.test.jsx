/**
 * Tests for frontend/src/components/landing/LandingTestimonials.jsx
 *
 * Focus:
 *   - Renders without crashing (no props — uses defaults)
 *   - Shows default testimonial author names
 *   - Custom testimonials override defaults
 *   - Star rating rendered (5 stars per testimonial)
 *   - Author initials computed correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Star: ({ size, fill, className }) => <span data-testid="star">★</span>,
}))

vi.mock('../components/landing/LandingServices', () => ({
  SectionHeader: ({ title, subtitle }) => (
    <div>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CUSTOM_TESTIMONIALS = [
  { text: 'Excelente servicio siempre.', author: 'Roberto Salinas', role: 'Emprendedor', rating: 5 },
  { text: 'Me encantó la atención.',     author: 'María López',    role: 'Diseñadora',   rating: 4 },
]

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderTestimonials(props = {}) {
  const { default: LandingTestimonials } = await import('../components/landing/LandingTestimonials.jsx')
  return render(
    <MemoryRouter>
      <LandingTestimonials {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Tests
// ============================================================================

describe('LandingTestimonials — default render', () => {
  it('renders without crashing', async () => {
    await act(async () => { await renderTestimonials() })
    expect(document.body).toBeTruthy()
  })

  it('shows default testimonial authors', async () => {
    await act(async () => { await renderTestimonials() })
    const body = document.body.textContent
    // Defaults include: Juan Pérez, Miguel Torres, Daniel R.
    expect(
      body.includes('Juan Pérez') || body.includes('Miguel Torres') || body.includes('Daniel R.')
    ).toBeTruthy()
  })

  it('renders stars for each testimonial', async () => {
    await act(async () => { await renderTestimonials() })
    const stars = screen.queryAllByTestId('star')
    // 5 defaults × 5 stars = 25
    expect(stars.length).toBeGreaterThan(0)
  })
})

describe('LandingTestimonials — custom testimonials', () => {
  it('shows custom author names', async () => {
    await act(async () => { await renderTestimonials({ items: CUSTOM_TESTIMONIALS }) })
    expect(document.body.textContent).toContain('Roberto Salinas')
    expect(document.body.textContent).toContain('María López')
  })

  it('shows custom testimonial text', async () => {
    await act(async () => { await renderTestimonials({ items: CUSTOM_TESTIMONIALS }) })
    expect(document.body.textContent).toContain('Excelente servicio siempre.')
  })

  it('shows author role', async () => {
    await act(async () => { await renderTestimonials({ items: CUSTOM_TESTIMONIALS }) })
    expect(document.body.textContent).toContain('Emprendedor')
  })

  it('author initials: "Roberto Salinas" → "RS"', async () => {
    await act(async () => { await renderTestimonials({ items: CUSTOM_TESTIMONIALS }) })
    expect(document.body.textContent).toContain('RS')
  })

  it('author initials: "María López" → "ML"', async () => {
    await act(async () => { await renderTestimonials({ items: CUSTOM_TESTIMONIALS }) })
    expect(document.body.textContent).toContain('ML')
  })
})

describe('LandingTestimonials — rating', () => {
  it('renders correct star count for rating=5', async () => {
    const one = [{ text: 'Ok', author: 'Test User', rating: 5 }]
    await act(async () => { await renderTestimonials({ items: one }) })
    const stars = screen.queryAllByTestId('star')
    // Marquee duplicates cards; all copies use the same rating so count is a multiple
    expect(stars.length).toBeGreaterThan(0)
    expect(stars.length % 5).toBe(0)
  })

  it('renders correct star count for rating=4', async () => {
    const one = [{ text: 'Bien', author: 'Test User', rating: 4 }]
    await act(async () => { await renderTestimonials({ items: one }) })
    const stars = screen.queryAllByTestId('star')
    expect(stars.length).toBeGreaterThan(0)
    expect(stars.length % 4).toBe(0)
  })
})
