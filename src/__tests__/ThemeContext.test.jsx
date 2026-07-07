/**
 * Tests for frontend/src/context/ThemeContext.jsx
 *
 * Behavior:
 *   - getInitialTheme reads from localStorage ('cita24-theme') or matchMedia
 *   - ThemeProvider applies .dark class to <html> when theme=dark
 *   - toggle() switches between dark/light
 *   - localStorage.setItem called with new theme on toggle
 *   - useTheme() throws when used outside ThemeProvider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const store = {}
vi.stubGlobal('localStorage', {
  getItem:    (k) => store[k] ?? null,
  setItem:    (k, v) => { store[k] = v },
  removeItem: (k) => { delete store[k] },
})

// matchMedia mock
vi.stubGlobal('matchMedia', (query) => ({
  matches: query === '(prefers-color-scheme: dark)' ? false : false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
async function loadTheme() {
  const { ThemeProvider, useTheme } = await import('../context/ThemeContext.jsx')
  return { ThemeProvider, useTheme }
}

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  document.documentElement.classList.remove('dark')
  vi.resetModules()
})

// ============================================================================
// Initial theme
// ============================================================================
describe('ThemeContext — initial theme', () => {
  it('defaults to light when no localStorage entry and no system preference', async () => {
    const { ThemeProvider, useTheme } = await loadTheme()
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })
    expect(result.current.theme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('reads stored theme from localStorage', async () => {
    store['cita24-theme'] = 'dark'
    const { ThemeProvider, useTheme } = await loadTheme()
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })
    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })
})

// ============================================================================
// DOM class
// ============================================================================
describe('ThemeContext — DOM class', () => {
  it('adds .dark class to <html> when theme is dark', async () => {
    store['cita24-theme'] = 'dark'
    const { ThemeProvider, useTheme } = await loadTheme()
    renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })
    await act(async () => {})
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes .dark class when theme is light', async () => {
    store['cita24-theme'] = 'light'
    document.documentElement.classList.add('dark') // simulate stale class
    const { ThemeProvider, useTheme } = await loadTheme()
    renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })
    await act(async () => {})
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

// ============================================================================
// toggle()
// ============================================================================
describe('ThemeContext — toggle', () => {
  it('toggles from light to dark', async () => {
    const { ThemeProvider, useTheme } = await loadTheme()
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })
    expect(result.current.theme).toBe('light')
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('toggles from dark to light', async () => {
    store['cita24-theme'] = 'dark'
    const { ThemeProvider, useTheme } = await loadTheme()
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('persists new theme in localStorage on toggle', async () => {
    const { ThemeProvider, useTheme } = await loadTheme()
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })
    act(() => result.current.toggle())
    await act(async () => {})
    expect(store['cita24-theme']).toBe('dark')
  })
})

// ============================================================================
// useTheme outside provider
// ============================================================================
describe('ThemeContext — error boundary', () => {
  it('useTheme throws when used outside ThemeProvider', async () => {
    const { useTheme } = await loadTheme()
    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be inside ThemeProvider')
  })
})
