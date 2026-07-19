/**
 * Tests for frontend/src/components/ui/RequirementsModal.jsx
 *
 * Focus:
 *   - Renders requirements text (whitespace-pre-line)
 *   - Prerequisite card: bookable → "Puedes reservarlo en línea" note
 *   - Botonera condicional:
 *       a) prerequisite bookable + no seleccionado + no atMax → 2 botones
 *       b) resto de casos → solo "Entendido, continuar"
 *   - Escape / backdrop click → onClose
 *   - Botón "Cancelar" / X → onClose, no llama onContinue ni onBookPrerequisite
 *   - a11y: role="dialog", aria-modal="true", aria-labelledby
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../utils/formatters', () => ({
  toTitleCase: (s) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '',
}))

import RequirementsModal from '../components/ui/RequirementsModal.jsx'

const SERVICE_TEXT_ONLY = {
  id: 'valoracion', dbId: 1, name: 'depilación láser',
  requirements: 'No exponerse al sol 48 h antes.\nLlegar sin cremas en la piel.',
  prerequisite: null,
}

const PREREQ_BOOKABLE = { id: 'valoracion', dbId: 2, name: 'valoración previa', bookable: true }
const PREREQ_NOT_BOOKABLE = { id: 'consulta', dbId: 3, name: 'consulta médica', bookable: false }

const SERVICE_WITH_PREREQ = {
  id: 'botox', dbId: 4, name: 'aplicación de botox',
  requirements: null,
  prerequisite: PREREQ_BOOKABLE,
}

function noop() {}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RequirementsModal — render', () => {
  it('returns null when no service is passed', () => {
    const { container } = render(
      <RequirementsModal service={null} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the service name in the header', () => {
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(screen.getByText('Depilación Láser')).toBeTruthy()
    expect(screen.getByText('Antes de reservar')).toBeTruthy()
  })

  it('renders each requirements line as its own checklist item', () => {
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(screen.getByText('No exponerse al sol 48 h antes.')).toBeTruthy()
    expect(screen.getByText('Llegar sin cremas en la piel.')).toBeTruthy()
    expect(screen.getByText('Indicaciones')).toBeTruthy()
  })

  it('ignores blank lines in requirements text', () => {
    render(
      <RequirementsModal
        service={{ ...SERVICE_TEXT_ONLY, requirements: 'Línea uno.\n\n  \nLínea dos.' }}
        onContinue={noop} onBookPrerequisite={noop} onClose={noop}
      />
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('no requirements block when service.requirements is empty', () => {
    render(<RequirementsModal service={SERVICE_WITH_PREREQ} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(screen.queryByText('Indicaciones')).toBeNull()
  })
})

describe('RequirementsModal — prerequisite card', () => {
  it('shows the prerequisite name and "Puedes reservarlo en línea" when bookable', () => {
    render(<RequirementsModal service={SERVICE_WITH_PREREQ} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(screen.getByText(/Este servicio requiere haber tomado/i)).toBeTruthy()
    expect(screen.getByText('Valoración Previa')).toBeTruthy()
    expect(screen.getByText('Puedes reservarlo en línea')).toBeTruthy()
  })

  it('does not show "Puedes reservarlo en línea" when prerequisite is not bookable', () => {
    render(
      <RequirementsModal
        service={{ ...SERVICE_WITH_PREREQ, prerequisite: PREREQ_NOT_BOOKABLE }}
        onContinue={noop}
        onBookPrerequisite={noop}
        onClose={noop}
      />
    )
    expect(screen.queryByText('Puedes reservarlo en línea')).toBeNull()
  })
})

describe('RequirementsModal — botonera condicional', () => {
  it('prerequisite bookable + no seleccionado + no atMax → muestra ambos botones', () => {
    render(<RequirementsModal service={SERVICE_WITH_PREREQ} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(screen.getByRole('button', { name: /Reservar Valoración Previa primero/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ya cumplo el requisito — continuar/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Entendido, continuar$/i })).toBeNull()
  })

  it('sin prerequisite → solo "Entendido, continuar"', () => {
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(screen.getByRole('button', { name: 'Entendido, continuar' })).toBeTruthy()
    expect(screen.queryByText(/primero/i)).toBeNull()
  })

  it('prerequisite no bookable → solo "Entendido, continuar"', () => {
    render(
      <RequirementsModal
        service={{ ...SERVICE_WITH_PREREQ, prerequisite: PREREQ_NOT_BOOKABLE }}
        onContinue={noop}
        onBookPrerequisite={noop}
        onClose={noop}
      />
    )
    expect(screen.getByRole('button', { name: 'Entendido, continuar' })).toBeTruthy()
  })

  it('prerequisite ya seleccionado → solo "Entendido, continuar"', () => {
    render(
      <RequirementsModal
        service={SERVICE_WITH_PREREQ}
        prerequisiteAlreadySelected
        onContinue={noop}
        onBookPrerequisite={noop}
        onClose={noop}
      />
    )
    expect(screen.getByRole('button', { name: 'Entendido, continuar' })).toBeTruthy()
    expect(screen.queryByText(/primero/i)).toBeNull()
  })

  it('canBookPrerequisite=false (máximo alcanzado) → solo "Entendido, continuar"', () => {
    render(
      <RequirementsModal
        service={SERVICE_WITH_PREREQ}
        canBookPrerequisite={false}
        onContinue={noop}
        onBookPrerequisite={noop}
        onClose={noop}
      />
    )
    expect(screen.getByRole('button', { name: 'Entendido, continuar' })).toBeTruthy()
    expect(screen.queryByText(/primero/i)).toBeNull()
  })

  it('clicking "Reservar X primero" calls onBookPrerequisite', async () => {
    const user = userEvent.setup()
    const onBookPrerequisite = vi.fn()
    render(<RequirementsModal service={SERVICE_WITH_PREREQ} onContinue={noop} onBookPrerequisite={onBookPrerequisite} onClose={noop} />)
    await user.click(screen.getByRole('button', { name: /Reservar Valoración Previa primero/i }))
    expect(onBookPrerequisite).toHaveBeenCalledTimes(1)
  })

  it('clicking "Ya cumplo el requisito — continuar" calls onContinue', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<RequirementsModal service={SERVICE_WITH_PREREQ} onContinue={onContinue} onBookPrerequisite={noop} onClose={noop} />)
    await user.click(screen.getByRole('button', { name: /Ya cumplo el requisito — continuar/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('clicking "Entendido, continuar" calls onContinue', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={onContinue} onBookPrerequisite={noop} onClose={noop} />)
    await user.click(screen.getByRole('button', { name: 'Entendido, continuar' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})

describe('RequirementsModal — cierre', () => {
  it('Escape calls onClose', () => {
    const onClose = vi.fn()
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('backdrop click calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={onClose} />)
    // The backdrop is the outer fixed inset-0 div — dialog click is stopped from propagating.
    await user.click(screen.getByRole('dialog').parentElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the dialog does not call onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={onClose} />)
    await user.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('"Cancelar" button calls onClose and not onContinue/onBookPrerequisite', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onContinue = vi.fn()
    const onBookPrerequisite = vi.fn()
    render(<RequirementsModal service={SERVICE_WITH_PREREQ} onContinue={onContinue} onBookPrerequisite={onBookPrerequisite} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onContinue).not.toHaveBeenCalled()
    expect(onBookPrerequisite).not.toHaveBeenCalled()
  })

  it('X button (aria-label "Cerrar") calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={onClose} />)
    await user.click(screen.getByLabelText('Cerrar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('RequirementsModal — accessibility', () => {
  it('has role="dialog", aria-modal="true" and aria-labelledby', () => {
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'requirements-modal-title')
    expect(document.getElementById('requirements-modal-title')).toBeTruthy()
  })

  it('focuses the primary button on mount', () => {
    render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Entendido, continuar' }))
  })

  it('locks body scroll while mounted', () => {
    const { unmount } = render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('returns focus to the previously focused element on unmount', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { unmount } = render(<RequirementsModal service={SERVICE_TEXT_ONLY} onContinue={noop} onBookPrerequisite={noop} onClose={noop} />)
    expect(document.activeElement).not.toBe(trigger)

    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
