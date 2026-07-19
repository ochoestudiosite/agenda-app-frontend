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

import { describe, it, expect, vi } from 'vitest'
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
