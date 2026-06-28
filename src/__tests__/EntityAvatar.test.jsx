// @vitest-environment jsdom
/**
 * Unit — frontend/src/components/ui/EntityAvatar.jsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import EntityAvatar from '../components/ui/EntityAvatar.jsx'

describe('EntityAvatar — iniciales (sin imageUrl)', () => {
  it('"Juan Pérez" → muestra "JP"', () => {
    render(<EntityAvatar name="Juan Pérez" />)
    expect(screen.getByText('JP')).toBeTruthy()
  })

  it('"Maria Garcia Lopez" → "MG" (primeras 2 palabras)', () => {
    render(<EntityAvatar name="Maria Garcia Lopez" />)
    expect(screen.getByText('MG')).toBeTruthy()
  })

  it('"corte" → "C" (una palabra)', () => {
    render(<EntityAvatar name="corte" />)
    expect(screen.getByText('C')).toBeTruthy()
  })

  it('name undefined → "?"', () => {
    render(<EntityAvatar />)
    expect(screen.getByText('?')).toBeTruthy()
  })

  it('name="" → "?"', () => {
    render(<EntityAvatar name="" />)
    expect(screen.getByText('?')).toBeTruthy()
  })
})

describe('EntityAvatar — con imageUrl', () => {
  it('renderiza <img> con src correcto', () => {
    render(<EntityAvatar name="Juan" imageUrl="https://example.com/avatar.jpg" />)
    const img = document.querySelector('img')
    expect(img).toBeTruthy()
    expect(img.src).toBe('https://example.com/avatar.jpg')
  })

  it('img tiene alt igual a name', () => {
    render(<EntityAvatar name="Elena Vargas" imageUrl="https://example.com/e.jpg" />)
    expect(document.querySelector('img').alt).toBe('Elena Vargas')
  })

  it('sin imageUrl → no hay <img>', () => {
    render(<EntityAvatar name="Pedro" />)
    expect(document.querySelector('img')).toBeNull()
  })
})

describe('EntityAvatar — lazyLoad', () => {
  it('lazyLoad=false → img sin opacity inicial', () => {
    render(<EntityAvatar name="X" imageUrl="https://example.com/x.jpg" lazyLoad={false} />)
    const img = document.querySelector('img')
    expect(img.style.opacity).toBe('')
  })

  it('lazyLoad=true → img con opacity:0 (fade-in por onLoad)', () => {
    render(<EntityAvatar name="X" imageUrl="https://example.com/x.jpg" lazyLoad />)
    const img = document.querySelector('img')
    expect(img.style.opacity).toBe('0')
  })
})

describe('EntityAvatar — tamaños', () => {
  it('size=summary → w-9 h-9', () => {
    const { container } = render(<EntityAvatar name="X" size="summary" />)
    const cls = container.firstChild.className
    expect(cls).toMatch(/w-9/)
    expect(cls).toMatch(/h-9/)
  })

  it('size=confirm → w-10 h-10', () => {
    const { container } = render(<EntityAvatar name="X" size="confirm" />)
    const cls = container.firstChild.className
    expect(cls).toMatch(/w-10/)
    expect(cls).toMatch(/h-10/)
  })

  it('size=summary-mini → w-5 h-5', () => {
    const { container } = render(<EntityAvatar name="X" size="summary-mini" />)
    const cls = container.firstChild.className
    expect(cls).toMatch(/w-5/)
    expect(cls).toMatch(/h-5/)
  })
})

describe('EntityAvatar — selected', () => {
  it('selected=true → border-gold/60', () => {
    const { container } = render(<EntityAvatar name="X" selected />)
    expect(container.firstChild.className).toMatch(/border-gold\/60/)
  })

  it('selected=false → border-gold/20', () => {
    const { container } = render(<EntityAvatar name="X" />)
    expect(container.firstChild.className).toMatch(/border-gold\/20/)
  })
})

describe('EntityAvatar — children override', () => {
  it('children reemplaza el span de iniciales', () => {
    render(<EntityAvatar name="Pedro"><span data-testid="custom">★</span></EntityAvatar>)
    expect(screen.getByTestId('custom')).toBeTruthy()
    expect(screen.queryByText('P')).toBeNull()
  })
})
