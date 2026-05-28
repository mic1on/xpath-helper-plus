import { sendMessageToContentScript } from '@/utils'
import { useLocalStorage, useClipboard } from '@vueuse/core'
import xPathToCss from 'xpath-to-css'
import type { PopupMessage } from '@/types/messages'

export function useXPathWorkbench() {
  const { isSupported, copy } = useClipboard()

  const mode = ref<string>('xpath')
  const xpathRule = ref<string>("string('xpath helper plus')")
  const xpathShort = useLocalStorage<boolean>('xpathShort', false)
  const xpathBatch = useLocalStorage<boolean>('xpathBatch', false)
  const xpathResult = ref<string>('')
  const xpathResultCount = ref<number | null>(null)

  const executeQuery = () => {
    const message: PopupMessage = { cmd: mode.value as 'xpath' | 'css', value: xpathRule.value }
    sendMessageToContentScript(message, (response: any) => {
      xpathResult.value = response?.[0] ?? ''
      xpathResultCount.value = response?.[1] ?? null
    })
  }

  watch(() => xpathRule.value, executeQuery, { immediate: true })

  const handleShort = (v: boolean) => {
    xpathShort.value = v
    sendMessageToContentScript({ cmd: 'short', value: xpathShort.value })
  }

  const handleBatch = (v: boolean) => {
    xpathBatch.value = v
    sendMessageToContentScript({ cmd: 'batch', value: xpathBatch.value })
  }

  const handlePosition = () => {
    sendMessageToContentScript({ cmd: 'position' })
  }

  const handleCopy = () => {
    copy(xpathRule.value)
  }

  const handleToCss = () => {
    const cssRule = xPathToCss(xpathRule.value)
    copy(cssRule)
  }

  // Listen for query results from content script
  chrome?.runtime?.onMessage?.addListener((request: any) => {
    if (request.query) {
      xpathRule.value = request.query
    }
  })

  // Initialize short mode
  handleShort(xpathShort.value)

  return {
    mode,
    xpathRule,
    xpathShort,
    xpathBatch,
    xpathResult,
    xpathResultCount,
    isSupported,
    handleShort,
    handleBatch,
    handlePosition,
    handleCopy,
    handleToCss,
  }
}