import { ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const MAX_HISTORY = 20
const STORAGE_KEY = 'xhp:query-history'

export interface QueryHistoryItem {
  query: string
  timestamp: number
  pinned?: boolean
}

export function useQueryHistory() {
  const history = useLocalStorage<QueryHistoryItem[]>(STORAGE_KEY, [], {
    mergeDefaults: true,
  })

  function add(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return

    const existingIndex = history.value.findIndex((item) => item.query === trimmed)
    const now = Date.now()

    if (existingIndex !== -1) {
      // Move existing to top (or keep pinned at top)
      const [item] = history.value.splice(existingIndex, 1)
      item.timestamp = now
      history.value.unshift(item)
    } else {
      history.value.unshift({ query: trimmed, timestamp: now })
    }

    // Trim to MAX_HISTORY, but keep pinned items
    const pinned = history.value.filter((item) => item.pinned)
    const unpinned = history.value.filter((item) => !item.pinned)
    history.value = [...pinned, ...unpinned].slice(0, MAX_HISTORY)
  }

  function remove(query: string) {
    const index = history.value.findIndex((item) => item.query === query)
    if (index !== -1) {
      history.value.splice(index, 1)
    }
  }

  function clear() {
    history.value = []
  }

  function togglePin(query: string) {
    const item = history.value.find((item) => item.query === query)
    if (item) {
      item.pinned = !item.pinned
      // Re-sort: pinned first, then by timestamp desc
      history.value.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return b.timestamp - a.timestamp
      })
    }
  }

  return {
    history,
    add,
    remove,
    clear,
    togglePin,
    MAX_HISTORY,
  }
}
