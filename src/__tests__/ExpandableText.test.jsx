/**
 * Tests for frontend/src/components/ui/ExpandableText.jsx
 *
 * Focus:
 *   - No "Ver más" button when text does not overflow the clamp
 *   - "Ver más" button appears when text overflows the clamp
 *   - Clicking toggles between "Ver más" / "Ver menos" and removes the clamp class
 *   - Click and Enter/Space on the toggle do not bubble to an ancestor's handlers
 *     (needed because the booking cards nest this real <button> inside a
 *     role="button" card — see ServiceSelector/BranchSelector)
 *   - Re-measures on resize while collapsed, but does not re-measure while
 *     expanded (a resize while the clamp is lifted reports scrollHeight ===
 *     clientHeight, which must not hide the "Ver menos" toggle)
 *   - Re-measures once document.fonts.ready resolves (fallback-font metrics
 *     at mount can under/over-report overflow before the real font swaps in)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpandableText from '../components/ui/ExpandableText.jsx'

// ---------------------------------------------------------------------------
// Helpers — jsdom reports scrollHeight/clientHeight as 0 by default, so we
// override the prototype getters to simulate real layout measurements.
// ---------------------------------------------------------------------------

function mockOverflow(scrollHeight, clientHeight) {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: clientHeight })
}

let originalScrollHeight
let originalClientHeight

beforeEach(() => {
  originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')
  originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
})

afterEach(() => {
  if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight)
  if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight)
  delete global.ResizeObserver
})

describe('ExpandableText — no overflow', () => {
  it('does not render a toggle button when text fits within the clamp', () => {
    mockOverflow(40, 40)
    render(<ExpandableText text="Corte clásico" className="text-xs" />)
    expect(screen.getByText('Corte clásico')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('ExpandableText — overflow', () => {
  it('renders "Ver más" when text overflows the clamp', () => {
    mockOverflow(120, 40)
    render(<ExpandableText text="Descripción muy larga que no cabe en dos líneas" />)
    expect(screen.getByRole('button', { name: 'Ver más' })).toBeTruthy()
  })

  it('toggles to "Ver menos" and removes the clamp class on click', async () => {
    mockOverflow(120, 40)
    const user = userEvent.setup()
    render(<ExpandableText text="Texto largo" className="leading-snug" clampClassName="line-clamp-2" />)

    const p = screen.getByText('Texto largo')
    expect(p.className).toContain('line-clamp-2')

    await user.click(screen.getByRole('button', { name: 'Ver más' }))

    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeTruthy()
    expect(p.className).not.toContain('line-clamp-2')
  })

  it('clicking the toggle does not bubble to an ancestor onClick', async () => {
    mockOverflow(120, 40)
    const parentClick = vi.fn()
    const user = userEvent.setup()
    render(
      <div onClick={parentClick}>
        <ExpandableText text="Texto largo" />
      </div>
    )
    await user.click(screen.getByRole('button', { name: 'Ver más' }))
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('Enter/Space on the toggle does not bubble to an ancestor onKeyDown', () => {
    mockOverflow(120, 40)
    const parentKeyDown = vi.fn()
    render(
      <div onKeyDown={parentKeyDown}>
        <ExpandableText text="Texto largo" />
      </div>
    )
    const btn = screen.getByRole('button', { name: 'Ver más' })
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(parentKeyDown).not.toHaveBeenCalled()
  })
})

describe('ExpandableText — resize re-measurement', () => {
  it('re-measures on resize while collapsed and hides the button if it no longer overflows', () => {
    let resizeCallback
    global.ResizeObserver = class {
      constructor(cb) { resizeCallback = cb }
      observe() {}
      disconnect() {}
    }

    mockOverflow(120, 40)
    render(<ExpandableText text="Texto largo" />)
    expect(screen.getByRole('button', { name: 'Ver más' })).toBeTruthy()

    // Simulate a viewport widening: the text now fits without clamping.
    mockOverflow(40, 40)
    act(() => { resizeCallback() })

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('disconnects the resize observer while expanded instead of re-measuring', async () => {
    let constructCount = 0
    const disconnectSpy = vi.fn()
    global.ResizeObserver = class {
      constructor() { constructCount += 1 }
      observe() {}
      disconnect = disconnectSpy
    }

    mockOverflow(120, 40)
    const user = userEvent.setup()
    render(<ExpandableText text="Texto largo" />)
    expect(constructCount).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Ver más' }))

    // Expanding disconnects the collapsed-state observer and must not create
    // a new one — otherwise a resize while expanded (scrollHeight ===
    // clientHeight, since the clamp is lifted) would incorrectly hide the toggle.
    expect(disconnectSpy).toHaveBeenCalled()
    expect(constructCount).toBe(1)
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeTruthy()
  })
})

describe('ExpandableText — web font swap re-measurement', () => {
  afterEach(() => {
    delete document.fonts
  })

  it('re-measures once document.fonts.ready resolves', async () => {
    let resolveReady
    const readyPromise = new Promise(resolve => { resolveReady = resolve })
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: readyPromise } })

    // Fallback-font metrics at mount: no overflow yet.
    mockOverflow(40, 40)
    render(<ExpandableText text="Texto largo" />)
    expect(screen.queryByRole('button')).toBeNull()

    // Real font swaps in and now the text overflows the clamp.
    mockOverflow(120, 40)
    await act(async () => {
      resolveReady()
      await readyPromise
    })

    expect(screen.getByRole('button', { name: 'Ver más' })).toBeTruthy()
  })
})
