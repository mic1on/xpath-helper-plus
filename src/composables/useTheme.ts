import { readonly, ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'xpathTheme'

function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

const currentTheme = ref<Theme>(getStoredTheme())

function syncDocumentTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }
}

syncDocumentTheme(currentTheme.value)

watch(currentTheme, (theme) => {
  syncDocumentTheme(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {}
})

export function useTheme() {
  const toggleTheme = (): void => {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  }

  return {
    theme: readonly(currentTheme),
    toggleTheme,
  }
}
