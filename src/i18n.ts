import { readonly, ref } from 'vue'

export type Locale = 'en' | 'zh'

const en = {
  language: 'Language',
  chinese: 'Chinese',
  english: 'English',
  switchLanguage: 'Switch language',
  theme: 'Theme',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
  xpathEditor: 'XPath editor',
  xpathRule: 'XPath rule',
  listMode: 'List mode',
  setContext: 'Set context',
  clearContext: 'Clear context',
  setContextTitle: 'Shift-hover a container, then set it as the context for relative XPath generation',
  clearContextTitle: 'Context is pinned. Shift-hover generates relative XPath; click to clear',
  copy: 'Copy',
  copyCss: 'Copy CSS',
  copyCssTitle: 'Convert the XPath to a CSS selector and copy it',
  historyTitle: 'Query history (up to 20)',
  queryHistory: 'Query history',
  clearHistoryTitle: 'Clear query history',
  clear: 'Clear',
  historyList: 'Previous XPath queries',
  pin: 'Pin',
  unpin: 'Unpin',
  noHistory: 'No query history',
  justNow: 'Just now',
  minutesAgo: '{count}m ago',
  hoursAgo: '{count}h ago',
  daysAgo: '{count}d ago',
  matchedResults: 'Matches',
  frameContext: 'Current XPath is relative to iframe: {url}',
  pageConnected: 'Page connected',
  pageConnecting: 'Connecting',
  pageUnavailable: 'Unavailable',
  pageUnavailableTitle: 'This page cannot be inspected',
  pageUnavailableDescription: 'Open a regular web page or finish the current navigation, then return to the panel.',
  pageUnavailableResult: 'XPath results are unavailable for this page.',
  noMatches: 'No matching nodes.',
  appendExtraction: 'Extract',
  appendExtractionTitle: 'Append /{suffix} to the current XPath',
  xpathResult: 'XPath result',
} as const

export type TranslationKey = keyof typeof en

const zh: Record<TranslationKey, string> = {
  language: '语言',
  chinese: '中文',
  english: '英文',
  switchLanguage: '切换语言',
  theme: '主题',
  switchToLight: '切换到浅色模式',
  switchToDark: '切换到深色模式',
  xpathEditor: 'XPath 编辑器',
  xpathRule: 'XPath 规则',
  listMode: '列表模式',
  setContext: '设为上下文',
  clearContext: '清除上下文',
  setContextTitle: 'Shift 悬停某容器元素后点击此处设为上下文，生成相对 XPath',
  clearContextTitle: '已固定上下文节点，Shift 悬停元素生成相对 XPath；点击清除',
  copy: '复制',
  copyCss: '复制 CSS',
  copyCssTitle: '将 XPath 转为 CSS 选择器并复制',
  historyTitle: '查询历史（最多 20 条）',
  queryHistory: '查询历史',
  clearHistoryTitle: '清空查询历史',
  clear: '清空',
  historyList: '历史 XPath 查询列表',
  pin: '置顶',
  unpin: '取消置顶',
  noHistory: '暂无历史记录',
  justNow: '刚刚',
  minutesAgo: '{count} 分钟前',
  hoursAgo: '{count} 小时前',
  daysAgo: '{count} 天前',
  matchedResults: '匹配结果',
  frameContext: '当前 XPath 相对于 iframe：{url}',
  pageConnected: '页面已连接',
  pageConnecting: '正在连接',
  pageUnavailable: '当前不可用',
  pageUnavailableTitle: '无法检查当前页面',
  pageUnavailableDescription: '请打开普通网页或等待页面导航完成，然后返回侧边栏。',
  pageUnavailableResult: '当前页面无法显示 XPath 结果。',
  noMatches: '没有匹配节点。',
  appendExtraction: '追加提取',
  appendExtractionTitle: '在当前 XPath 末尾追加 /{suffix}',
  xpathResult: 'XPath 结果',
}

const messages: Record<Locale, Record<TranslationKey, string>> = { en, zh }
const STORAGE_KEY = 'xpathLocale'

export function normalizeLocale(language?: string | null): Locale {
  return /^zh(?:[-_]|$)/i.test(language ?? '') ? 'zh' : 'en'
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  params: Record<string, string | number> = {},
): string {
  return messages[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name]
    return value === undefined ? placeholder : String(value)
  })
}

function getStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'en' || stored === 'zh' ? stored : null
  } catch {
    return null
  }
}

function getUiLanguage(): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
      return chrome.i18n.getUILanguage()
    }
  } catch {}
  return typeof navigator === 'undefined' ? 'en' : navigator.language
}

const currentLocale = ref<Locale>(getStoredLocale() ?? normalizeLocale(getUiLanguage()))

function syncDocumentLanguage(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }
}

syncDocumentLanguage(currentLocale.value)

export function useI18n() {
  const setLocale = (locale: Locale): void => {
    currentLocale.value = locale
    syncDocumentLanguage(locale)
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {}
  }

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    return translate(currentLocale.value, key, params)
  }

  return {
    locale: readonly(currentLocale),
    setLocale,
    t,
  }
}
