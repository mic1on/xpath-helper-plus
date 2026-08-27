import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

// useTheme persists a 'dark' | 'light' choice to localStorage and mirrors it
// onto <html> (dataset.theme + style.colorScheme) so the CSS theme applies
// before Vue mounts. The module reads localStorage at import time, so each test
// resets modules and re-imports to get a fresh module-level ref.

async function loadUseTheme() {
  vi.resetModules()
  const mod = await import('@/composables/useTheme')
  return mod.useTheme
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.colorScheme = ''
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTheme', () => {
  it('defaults to dark when nothing is stored', async () => {
    const useTheme = await loadUseTheme()
    const { theme } = useTheme()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('restores a stored light theme on import', async () => {
    localStorage.setItem('xpathTheme', 'light')
    const useTheme = await loadUseTheme()
    const { theme } = useTheme()
    expect(theme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('treats any non-light stored value as dark', async () => {
    localStorage.setItem('xpathTheme', 'garbage')
    const useTheme = await loadUseTheme()
    expect(useTheme().theme.value).toBe('dark')
  })

  it('toggles between dark and light and persists the choice', async () => {
    const useTheme = await loadUseTheme()
    const { theme, toggleTheme } = useTheme()

    toggleTheme()
    await nextTick()
    expect(theme.value).toBe('light')
    expect(localStorage.getItem('xpathTheme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    toggleTheme()
    await nextTick()
    expect(theme.value).toBe('dark')
    expect(localStorage.getItem('xpathTheme')).toBe('dark')
  })

  it('shares one theme ref across multiple useTheme() callers', async () => {
    const useTheme = await loadUseTheme()
    const first = useTheme()
    const second = useTheme()

    first.toggleTheme()
    await nextTick()
    expect(second.theme.value).toBe('light')
  })

  it('exposes a readonly theme ref that cannot be mutated directly', async () => {
    const useTheme = await loadUseTheme()
    const { theme } = useTheme()
    // readonly() makes writes a no-op (and warns); the value must stay put.
    ;(theme as unknown as { value: string }).value = 'light'
    expect(theme.value).toBe('dark')
  })
})
