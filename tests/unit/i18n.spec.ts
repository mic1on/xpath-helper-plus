import { describe, expect, it } from 'vitest'
import { normalizeLocale, translate, useI18n } from '@/i18n'

describe('i18n', () => {
  it('detects Chinese Chrome UI language variants', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh')
    expect(normalizeLocale('zh_TW')).toBe('zh')
  })

  it('defaults unsupported and missing languages to English', () => {
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('fr')).toBe('en')
    expect(normalizeLocale()).toBe('en')
  })

  it('translates labels in both supported locales', () => {
    expect(translate('zh', 'matchedResults')).toBe('匹配结果')
    expect(translate('en', 'matchedResults')).toBe('Matches')
  })

  it('interpolates translation parameters', () => {
    expect(translate('en', 'minutesAgo', { count: 3 })).toBe('3m ago')
    expect(translate('zh', 'appendExtractionTitle', { suffix: '@href' }))
      .toBe('在当前 XPath 末尾追加 /@href')
  })

  it('shares and persists manual locale changes', () => {
    const first = useI18n()
    const second = useI18n()

    first.setLocale('zh')
    expect(second.locale.value).toBe('zh')
    expect(second.t('copy')).toBe('复制')
    expect(localStorage.getItem('xpathLocale')).toBe('zh')

    first.setLocale('en')
  })
})
