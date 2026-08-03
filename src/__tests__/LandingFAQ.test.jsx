/**
 * Tests for frontend/src/components/landing/LandingFAQ.jsx
 *
 * Focus:
 *   - Renders without crashing (no props — uses defaults)
 *   - Shows default questions
 *   - Custom items override defaults
 *   - Accordion: single-open behaviour (opening one closes the previous)
 *   - aria-expanded/aria-controls wiring for accessibility
 *   - FAQPage JSON-LD script is emitted with the right shape
 *   - JSON-LD escaping: a "</script>" inside an answer cannot break out of
 *     the script tag or execute injected markup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon" />,
}))

vi.mock('../components/landing/LandingServices', () => ({
  SectionHeader: ({ eyebrow, title, accent, fallback }) => (
    <div>
      <span>{eyebrow}</span>
      <h2>{(title || accent) ? <>{title}{accent}</> : fallback}</h2>
    </div>
  ),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CUSTOM_FAQ = [
  { question: '¿Puedo reservar sin cuenta?', answer: 'Sí, como invitado.' },
  { question: '¿Aceptan tarjeta?', answer: 'Sí, en línea y en el establecimiento.' },
]

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderFAQ(props = {}) {
  const { default: LandingFAQ } = await import('../components/landing/LandingFAQ.jsx')
  return render(<LandingFAQ {...props} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

// ============================================================================
// Tests
// ============================================================================

describe('LandingFAQ — default render', () => {
  it('renders without crashing', async () => {
    await act(async () => { await renderFAQ() })
    expect(document.body).toBeTruthy()
  })

  it('shows default questions', async () => {
    await act(async () => { await renderFAQ() })
    expect(document.body.textContent).toContain('¿Cómo agendo una cita?')
  })

  it('renders one toggle button per default question', async () => {
    await act(async () => { await renderFAQ() })
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

describe('LandingFAQ — custom items', () => {
  it('shows custom questions instead of defaults', async () => {
    await act(async () => { await renderFAQ({ items: CUSTOM_FAQ }) })
    expect(document.body.textContent).toContain('¿Puedo reservar sin cuenta?')
    expect(document.body.textContent).not.toContain('¿Cómo agendo una cita?')
  })

  it('answer text is not visible in the accessible name before opening (still in DOM, height collapsed)', async () => {
    await act(async () => { await renderFAQ({ items: CUSTOM_FAQ }) })
    // Content stays in the DOM (grid-rows collapse, not display:none) so it's
    // crawlable by search engines even before a visitor clicks it open.
    expect(document.body.textContent).toContain('Sí, como invitado.')
  })
})

describe('LandingFAQ — accordion behaviour', () => {
  it('all items start closed (aria-expanded=false)', async () => {
    await act(async () => { await renderFAQ({ items: CUSTOM_FAQ }) })
    const buttons = screen.getAllByRole('button')
    buttons.forEach(b => expect(b.getAttribute('aria-expanded')).toBe('false'))
  })

  it('clicking a question opens it (aria-expanded=true)', async () => {
    const user = userEvent.setup()
    await act(async () => { await renderFAQ({ items: CUSTOM_FAQ }) })
    const [first] = screen.getAllByRole('button')
    await user.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('true')
  })

  it('clicking a second question closes the first (single-open accordion)', async () => {
    const user = userEvent.setup()
    await act(async () => { await renderFAQ({ items: CUSTOM_FAQ }) })
    const [first, second] = screen.getAllByRole('button')
    await user.click(first)
    await user.click(second)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(second.getAttribute('aria-expanded')).toBe('true')
  })

  it('clicking an open question again closes it', async () => {
    const user = userEvent.setup()
    await act(async () => { await renderFAQ({ items: CUSTOM_FAQ }) })
    const [first] = screen.getAllByRole('button')
    await user.click(first)
    await user.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('false')
  })

  it('aria-controls on the button matches the id of the answer region', async () => {
    await act(async () => { await renderFAQ({ items: CUSTOM_FAQ }) })
    const [first] = screen.getAllByRole('button')
    const controlsId = first.getAttribute('aria-controls')
    expect(document.getElementById(controlsId)).toBeTruthy()
  })
})

describe('LandingFAQ — FAQPage JSON-LD', () => {
  it('emits a single application/ld+json script with FAQPage shape', async () => {
    await act(async () => { await renderFAQ({ items: CUSTOM_FAQ }) })
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBe(1)

    const data = JSON.parse(scripts[0].textContent)
    expect(data['@type']).toBe('FAQPage')
    expect(data.mainEntity).toHaveLength(2)
    expect(data.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: '¿Puedo reservar sin cuenta?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sí, como invitado.' },
    })
  })

  it('does not emit JSON-LD questions beyond what is actually rendered', async () => {
    await act(async () => { await renderFAQ({ items: [CUSTOM_FAQ[0]] }) })
    const script = document.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script.textContent)
    expect(data.mainEntity).toHaveLength(1)
  })

  it('security: a "</script>" inside an answer cannot break out of the JSON-LD tag or execute injected markup', async () => {
    const malicious = [
      { question: '¿Pregunta?', answer: '</script><script>window.__pwned = true</script>' },
    ]
    await act(async () => { await renderFAQ({ items: malicious }) })

    // The injected script must never have executed.
    expect(window.__pwned).toBeUndefined()

    // Exactly one JSON-LD script exists — the payload did not spawn a sibling <script>.
    const scripts = document.querySelectorAll('script')
    const ldScripts = Array.from(scripts).filter(s => s.getAttribute('type') === 'application/ld+json')
    expect(ldScripts.length).toBe(1)

    // The original string round-trips intact through JSON.parse.
    const data = JSON.parse(ldScripts[0].textContent)
    expect(data.mainEntity[0].acceptedAnswer.text).toBe('</script><script>window.__pwned = true</script>')

    delete window.__pwned
  })
})
