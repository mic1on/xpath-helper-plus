import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useQueryHistory } from '@/composables/useQueryHistory'

// Mock useLocalStorage from @vueuse/core
vi.mock('@vueuse/core', () => ({
  useLocalStorage: (key: string, initialValue: any) => {
    let value = initialValue
    return {
      get value() { return value },
      set value(v) { value = v },
    }
  },
}))

describe('useQueryHistory', () => {
  let history: ReturnType<typeof useQueryHistory>

  beforeEach(() => {
    history = useQueryHistory()
    history.clear()
  })

  it('adds a query to history', () => {
    history.add('//div[@class="test"]')
    expect(history.history.value).toHaveLength(1)
    expect(history.history.value[0].query).toBe('//div[@class="test"]')
  })

  it('deduplicates queries by moving existing to top', () => {
    history.add('//div[1]')
    history.add('//span[2]')
    history.add('//div[1]') // duplicate

    expect(history.history.value).toHaveLength(2)
    expect(history.history.value[0].query).toBe('//div[1]') // moved to top
    expect(history.history.value[1].query).toBe('//span[2]')
  })

  it('trims history to MAX_HISTORY (20)', () => {
    for (let i = 0; i < 25; i++) {
      history.add(`//item[${i}]`)
    }

    expect(history.history.value).toHaveLength(20)
    // Most recent should be first
    expect(history.history.value[0].query).toBe('//item[24]')
    expect(history.history.value[19].query).toBe('//item[5]')
  })

  it('keeps pinned items when trimming', () => {
    for (let i = 0; i < 25; i++) {
      history.add(`//item[${i}]`)
    }
    // Pin the oldest item (which would be trimmed)
    const oldestQuery = history.history.value[19].query
    history.togglePin(oldestQuery)

    // Add one more to trigger trim
    history.add('//new-item')

    expect(history.history.value).toHaveLength(20)
    // Pinned item should still be there
    expect(history.history.value.some(item => item.query === oldestQuery && item.pinned)).toBe(true)
    // New item should be after pinned items (at index 1 since we have 1 pinned item)
    expect(history.history.value[1].query).toBe('//new-item')
  })

  it('clears history', () => {
    history.add('//div[1]')
    history.add('//span[2]')
    history.clear()

    expect(history.history.value).toHaveLength(0)
  })

  it('toggles pin status', () => {
    history.add('//div[1]')
    history.add('//span[2]')

    // Initially unpinned
    expect(history.history.value[0].pinned).toBeFalsy()
    expect(history.history.value[1].pinned).toBeFalsy()

    // Pin the second item
    history.togglePin('//span[2]')
    expect(history.history.value[0].query).toBe('//span[2]')
    expect(history.history.value[0].pinned).toBe(true)
    expect(history.history.value[1].query).toBe('//div[1]')

    // Unpin
    history.togglePin('//span[2]')
    expect(history.history.value[0].pinned).toBeFalsy()
    // Order should be by timestamp (most recent first) - //span[2] was added later
    expect(history.history.value[0].query).toBe('//span[2]')
    expect(history.history.value[1].query).toBe('//div[1]')
  })

  it('ignores empty/whitespace queries', () => {
    history.add('')
    history.add('   ')
    history.add('\t\n')

    expect(history.history.value).toHaveLength(0)
  })

  it('removes a specific query', () => {
    history.add('//div[1]')
    history.add('//span[2]')
    history.add('//p[3]')

    history.remove('//span[2]')

    expect(history.history.value).toHaveLength(2)
    expect(history.history.value.map(i => i.query)).toEqual(['//p[3]', '//div[1]'])
  })
})