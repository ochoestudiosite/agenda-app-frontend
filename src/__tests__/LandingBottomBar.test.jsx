/**
 * Tests for frontend/src/components/landing/LandingBottomBar.jsx
 *
 * Focus:
 *   - Privacidad/Términos apuntan al sitio corporativo (antes eran href="#" muertos)
 *   - Ambos abren en pestaña nueva con rel="noopener noreferrer"
 *   - "Impulsado por Cita24" sigue apuntando a https://cita24.com
 *   - copyright con businessName por default / socials.copyright_text
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandingBottomBar from '../components/landing/LandingBottomBar'

describe('LandingBottomBar — enlaces legales', () => {
  it('Privacidad apunta a https://cita24.com/privacidad', () => {
    render(<LandingBottomBar businessName="Salón Elite" />)
    const link = screen.getByRole('link', { name: 'Privacidad' })
    expect(link).toHaveAttribute('href', 'https://cita24.com/privacidad')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('Términos apunta a https://cita24.com/terminos', () => {
    render(<LandingBottomBar businessName="Salón Elite" />)
    const link = screen.getByRole('link', { name: 'Términos' })
    expect(link).toHaveAttribute('href', 'https://cita24.com/terminos')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('"Impulsado por Cita24" sigue apuntando a https://cita24.com', () => {
    render(<LandingBottomBar businessName="Salón Elite" />)
    const link = screen.getByRole('link', { name: /desarrollado con cita24/i })
    expect(link).toHaveAttribute('href', 'https://cita24.com')
  })
})

describe('LandingBottomBar — copyright', () => {
  it('usa businessName cuando no hay copyright_text personalizado', () => {
    render(<LandingBottomBar businessName="Salón Elite" />)
    expect(document.body.textContent).toContain('Salón Elite')
  })

  it('usa socials.copyright_text cuando está presente', () => {
    render(<LandingBottomBar businessName="Salón Elite" socials={{ copyright_text: 'Texto legal personalizado' }} />)
    expect(document.body.textContent).toContain('Texto legal personalizado')
  })

  it('cae a "Cita24" cuando no hay businessName ni socials', () => {
    render(<LandingBottomBar />)
    expect(document.body.textContent).toContain('Cita24')
  })
})
