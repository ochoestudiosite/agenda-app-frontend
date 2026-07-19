/**
 * Tests for frontend/src/components/ui/RequirementsTag.jsx
 *
 * Focus:
 *   - Returns null when there's nothing to show
 *   - Renders the chip when requirements and/or prerequisite are present
 *   - Click opens the popover with the correct checklist (blank lines ignored)
 *   - Click again / Escape / outside click all close the popover
 *   - Clicking the chip never propagates to a parent container's onClick
 *   - Shows the prerequisite line when applicable
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RequirementsTag from '../components/ui/RequirementsTag.jsx'

function openPopover() {
  fireEvent.click(screen.getByRole('button', { name: /Requisitos previos/i }))
}

describe('RequirementsTag — render', () => {
  it('renders nothing when both requirements and prerequisite are null/undefined', () => {
    const { container } = render(<RequirementsTag requirements={null} prerequisite={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the chip when requirements is set', () => {
    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />)
    expect(screen.getByRole('button', { name: /Requisitos previos/i })).toBeTruthy()
  })

  it('renders the chip when prerequisite is set', () => {
    render(
      <RequirementsTag
        requirements={null}
        prerequisite={{ id: 'valoracion', dbId: 10, name: 'valoración previa', bookable: true }}
      />
    )
    expect(screen.getByRole('button', { name: /Requisitos previos/i })).toBeTruthy()
  })
})

describe('RequirementsTag — popover content', () => {
  it('opens the popover with a checklist line per non-blank requirements line', () => {
    render(
      <RequirementsTag
        requirements={'Ayunar 12 horas.\n\n  \nLlegar sin maquillaje.'}
        prerequisite={null}
      />
    )
    openPopover()
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toMatch(/Ayunar 12 horas\./)
    expect(dialog.textContent).toMatch(/Llegar sin maquillaje\./)
    expect(dialog.querySelectorAll('li')).toHaveLength(2)
  })

  it('shows the prerequisite line when applicable', () => {
    render(
      <RequirementsTag
        requirements={null}
        prerequisite={{ id: 'valoracion', dbId: 10, name: 'valoración previa', bookable: true }}
      />
    )
    openPopover()
    expect(screen.getByText(/Requiere haber tomado: Valoración Previa/)).toBeTruthy()
  })

  it('aria-label falls back to the generic label when no serviceName is passed', () => {
    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />)
    openPopover()
    expect(screen.getByRole('dialog', { name: 'Indicaciones previas' })).toBeTruthy()
  })

  it('aria-label includes the title-cased service name when serviceName is passed', () => {
    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} serviceName="botox" />)
    openPopover()
    expect(screen.getByRole('dialog', { name: 'Indicaciones previas de Botox' })).toBeTruthy()
  })
})

describe('RequirementsTag — open/close behavior', () => {
  it('clicking the chip again closes the popover', () => {
    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />)
    openPopover()
    expect(screen.getByRole('dialog')).toBeTruthy()
    openPopover()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Escape closes the popover', () => {
    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />)
    openPopover()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clicking outside closes the popover', () => {
    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />)
    openPopover()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('RequirementsTag — click propagation', () => {
  it('clicking the chip does not propagate to a parent container onClick', () => {
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />
      </div>
    )
    fireEvent.click(screen.getByRole('button', { name: /Requisitos previos/i }))
    expect(parentClick).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Posicionamiento dentro del viewport — regresión del bug real: el popover se
// salía de pantalla cuando el chip quedaba cerca del borde derecho o del
// fondo, y además quedaba recortado por el overflow-hidden de las tarjetas
// contenedoras (AppointmentCard/GroupAppointmentCard). Se porta a
// document.body con position:fixed y coordenadas calculadas/acotadas en JS.
// ============================================================================

describe('RequirementsTag — posicionamiento dentro del viewport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockRects({ triggerRect, popoverRect }) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const rect = this.getAttribute('role') === 'dialog' ? popoverRect : triggerRect
      return { x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height, toJSON() {}, ...rect }
    })
  }

  it('se renderiza vía portal en document.body, no como hijo del contenedor', () => {
    const { container } = render(
      <div className="overflow-hidden" style={{ width: 50, height: 50 }}>
        <RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />
      </div>
    )
    openPopover()
    const dialog = screen.getByRole('dialog')
    expect(container.contains(dialog)).toBe(false)
    expect(document.body.contains(dialog)).toBe(true)
  })

  it('chip cerca del borde derecho: el popover se pega al borde y nunca desborda el viewport', () => {
    Object.defineProperty(window, 'innerWidth',  { value: 400, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    mockRects({
      triggerRect: { top: 100, left: 350, width: 30, height: 20 },
      popoverRect: { top: 0, left: 0, width: 288, height: 200 },
    })

    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />)
    openPopover()

    const dialog = screen.getByRole('dialog')
    expect(dialog.style.visibility).toBe('visible')
    const left = parseFloat(dialog.style.left)
    expect(left).toBeGreaterThanOrEqual(12)
    expect(left + 288).toBeLessThanOrEqual(400 - 12)
  })

  it('chip cerca del fondo de la pantalla: el popover voltea arriba en vez de cortarse abajo', () => {
    Object.defineProperty(window, 'innerWidth',  { value: 400, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true })
    mockRects({
      triggerRect: { top: 250, left: 50, width: 50, height: 20 },
      popoverRect: { top: 0, left: 0, width: 288, height: 200 },
    })

    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />)
    openPopover()

    const dialog = screen.getByRole('dialog')
    const top = parseFloat(dialog.style.top)
    // Abajo del chip (270+8=278) no cabría en una pantalla de 300px de alto —
    // debe voltear arriba (250-200-8=42), nunca quedar por debajo del chip.
    expect(top).toBeLessThan(250)
  })

  it('scroll de la ventana cierra el popover en vez de dejarlo desalineado', () => {
    render(<RequirementsTag requirements="Ayunar 12 horas." prerequisite={null} />)
    openPopover()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.scroll(window)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
