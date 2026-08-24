import { sendMessageToContentScript } from '@/utils'
import { useLocalStorage, useClipboard } from '@vueuse/core'
import xPathToCss from 'xpath-to-css'
import type { PopupMessage, XPathEvaluationResponse, XPathResultItem } from '@/types/messages'
import { useQueryHistory } from './useQueryHistory'

function getChromeApi(): typeof chrome | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome
}

export function useXPathWorkbench() {
  const { isSupported, copy } = useClipboard()

  const xpathRule = ref<string>("string('xpath helper plus')")
  const xpathShort = useLocalStorage<boolean>('xpathShort', false)
  const xpathBatch = useLocalStorage<boolean>('xpathBatch', false)
  const xpathContainsId = useLocalStorage<boolean>('xpathContainsId', false)
  const xpathResult = ref<string>('')
  const xpathResultCount = ref<number | null>(null)
  const xpathResultItems = ref<XPathResultItem[]>([])
  // Attribute names present on the currently matched element nodes (issue #24),
  // used to render the dynamic "append extraction" buttons in the result area.
  const xpathAttributes = ref<string[]>([])
  // Whether a context node is currently pinned in the page (issue #26). Driven
  // by the content script's contextActive notifications, not persisted, since
  // the pin lives on a specific DOM element in the active tab.
  const xpathContextActive = ref<boolean>(false)

  // The frame (iframe) whose element was last selected via Shift+hover (issue
  // #25). With `all_frames: true` the generated query is relative to that
  // frame's own document, so evaluation must target the SAME frame.
  // `activeFrameId` is the Chrome frameId reported on the content script's
  // notification (0 is the top document). `activeFrameUrl` is surfaced in the
  // UI so users can tell which frame the current query resolves against.
  const activeFrameId = ref<number>(0)
  const activeFrameUrl = ref<string>('')

  const { history, add: addToHistory, clear: clearHistory, togglePin } = useQueryHistory()

  const executeQuery = () => {
    const message: PopupMessage = { cmd: 'xpath', value: xpathRule.value }
    // Route evaluation to the frame that produced the current query (issue
    // #25); defaults to the top frame when nothing iframe-specific is selected.
    sendMessageToContentScript(message, (response?: XPathEvaluationResponse) => {
      xpathResult.value = response?.[0] ?? ''
      xpathResultCount.value = response?.[1] ?? null
      xpathAttributes.value = Array.isArray(response?.[2]) ? response[2] : []
      xpathResultItems.value = Array.isArray(response?.[3]) ? response[3] : []
    }, activeFrameId.value)
  }

  // Record to history only on explicit user action (Enter key or Run), not on every keystroke
  const runQuery = () => {
    executeQuery()
    addToHistory(xpathRule.value)
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

  const handleContainsId = (v: boolean) => {
    xpathContainsId.value = v
    sendMessageToContentScript({ cmd: 'containsId', value: xpathContainsId.value })
  }

  const handleFocusResult = (index: number) => {
    sendMessageToContentScript({
      cmd: 'focusResult',
      value: xpathRule.value,
      index,
    }, undefined, activeFrameId.value)
  }

  const handlePosition = () => {
    // The bar lives in the top frame only; always target it.
    sendMessageToContentScript({ cmd: 'position' }, undefined, 0)
  }

  // Pin / clear the relative-XPath context node in the page (issue #26). The
  // active state is confirmed by the content script's contextActive reply.
  // Routed to the active frame so the pin lands in the same document as the
  // last-selected element (issue #25).
  const handleSetContext = () => {
    sendMessageToContentScript({ cmd: 'setContext' }, undefined, activeFrameId.value)
  }

  const handleClearContext = () => {
    sendMessageToContentScript({ cmd: 'clearContext' }, undefined, activeFrameId.value)
  }

  const handleCopy = () => {
    copy(xpathRule.value)
  }

  const handleToCss = () => {
    try {
      const cssRule = xPathToCss(xpathRule.value)
      copy(cssRule)
    } catch (error) {
      xpathResult.value = error instanceof Error
        ? `[CSS CONVERSION FAILED] ${error.message}`
        : '[CSS CONVERSION FAILED]'
      xpathResultCount.value = null
      xpathResultItems.value = []
    }
  }

  // Append an extraction step to the current XPath (issue #24). `suffix` is a
  // trailing step such as `text()`, `@href`, or `@src`. Any existing trailing
  // extraction step is replaced (rather than stacked) so repeated clicks toggle
  // between extractions instead of producing invalid `/@href/text()` chains.
  // The change re-runs the query via the xpathRule watcher.
  const handleAppendExtraction = (suffix: string) => {
    const base = xpathRule.value.replace(/\/(?:text\(\)|@[\w:.-]+)\s*$/, '')
    const normalized = base.replace(/\/+$/, '')
    xpathRule.value = `${normalized}/${suffix}`
    addToHistory(xpathRule.value)
  }

  // Listen for query results from content script
  getChromeApi()?.runtime?.onMessage?.addListener((request: any, sender: any) => {
    if (request.query) {
      xpathRule.value = request.query
      // Record which frame produced this query so evaluation is routed back to
      // the same frame (issue #25). `sender.frameId` is undefined only in
      // non-extension contexts; default to the top frame (0) then.
      activeFrameId.value = typeof sender?.frameId === 'number' ? sender.frameId : 0
      activeFrameUrl.value = request.frameUrl ?? ''
    }
    // Context pin state confirmation (issue #26).
    if (typeof request.contextActive === 'boolean') {
      xpathContextActive.value = request.contextActive
      executeQuery()
    }
  })

  // Initialize short mode
  handleShort(xpathShort.value)
  handleBatch(xpathBatch.value)
  handleContainsId(xpathContainsId.value)

  return {
    xpathRule,
    xpathShort,
    xpathBatch,
    xpathContainsId,
    xpathResult,
    xpathResultCount,
    xpathResultItems,
    xpathAttributes,
    xpathContextActive,
    activeFrameUrl,
    isSupported,
    handleShort,
    handleBatch,
    handleContainsId,
    handleFocusResult,
    handlePosition,
    handleSetContext,
    handleClearContext,
    handleCopy,
    handleToCss,
    handleAppendExtraction,
    // Query history
    queryHistory: history,
    addToQueryHistory: addToHistory,
    clearQueryHistory: clearHistory,
    toggleQueryPin: togglePin,
    runQuery,
  }
}