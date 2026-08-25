import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue'
import { useClipboard, useLocalStorage } from '@vueuse/core'
import xPathToCss from 'xpath-to-css'
import { sendMessageToContentScript } from '@/utils'
import { isContentScriptState } from '@/lib/contentState'
import type {
  ContentScriptMessage,
  ContentScriptTarget,
  XPathEvaluationResponse,
  XPathResultItem,
} from '@/types/messages'
import { useQueryHistory } from './useQueryHistory'

export type PageConnectionStatus = 'connecting' | 'connected' | 'unavailable'

function getChromeApi(): typeof chrome | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome
}

export function useXPathWorkbench() {
  const { isSupported, copy } = useClipboard()

  const xpathRule = ref("string('xpath helper plus')")
  const xpathBatch = useLocalStorage<boolean>('xpathBatch', false)
  const xpathResult = ref('')
  const xpathResultCount = ref<number | null>(null)
  const xpathResultItems = ref<XPathResultItem[]>([])
  const xpathAttributes = ref<string[]>([])
  const xpathContextActive = ref(false)

  const activeTabId = ref<number | null>(null)
  const activeFrameId = ref(0)
  const activeFrameUrl = ref('')
  const connectionStatus = ref<PageConnectionStatus>('connecting')
  const isPageConnected = computed(() => connectionStatus.value === 'connected')
  let sidePanelWindowId: number | null = null

  const { history, add: addToHistory, clear: clearHistory, togglePin } = useQueryHistory()

  const getTarget = (frameId?: number): ContentScriptTarget | null => {
    if (activeTabId.value === null) return null
    return {
      tabId: activeTabId.value,
      frameId,
    }
  }

  const clearEvaluation = (): void => {
    xpathResult.value = ''
    xpathResultCount.value = null
    xpathAttributes.value = []
    xpathResultItems.value = []
  }

  const resetFrameContext = (): void => {
    activeFrameId.value = 0
    activeFrameUrl.value = ''
    xpathContextActive.value = false
    clearEvaluation()
  }

  const executeQuery = (): void => {
    const target = getTarget(activeFrameId.value)
    if (!target) {
      clearEvaluation()
      return
    }

    sendMessageToContentScript(target, { cmd: 'xpath', value: xpathRule.value }, (response) => {
      if (target.tabId !== activeTabId.value || target.frameId !== activeFrameId.value) return
      if (!Array.isArray(response)) {
        clearEvaluation()
        if (connectionStatus.value !== 'connecting') connectionStatus.value = 'unavailable'
        return
      }

      const result = response as XPathEvaluationResponse
      connectionStatus.value = 'connected'
      xpathResult.value = result[0] ?? ''
      xpathResultCount.value = result[1] ?? null
      xpathAttributes.value = Array.isArray(result[2]) ? result[2] : []
      xpathResultItems.value = Array.isArray(result[3]) ? result[3] : []
    })
  }

  const syncModes = (tabId: number): void => {
    const target = { tabId }
    sendMessageToContentScript(target, { cmd: 'batch', value: xpathBatch.value })
    sendMessageToContentScript(target, { cmd: 'setEnabled', value: true })
  }

  const probeTab = (tabId: number): void => {
    connectionStatus.value = 'connecting'
    sendMessageToContentScript({ tabId, frameId: 0 }, { cmd: 'getState' }, (response) => {
      if (tabId !== activeTabId.value) return
      if (!isContentScriptState(response)) {
        connectionStatus.value = 'unavailable'
        clearEvaluation()
        return
      }

      connectionStatus.value = 'connected'
      syncModes(tabId)
      executeQuery()
    })
  }

  const setActiveTab = (tab?: { id?: number, windowId?: number }): void => {
    const nextTabId = tab?.id ?? null
    if (tab?.windowId !== undefined) sidePanelWindowId = tab.windowId

    const previousTabId = activeTabId.value
    if (previousTabId !== null && previousTabId !== nextTabId) {
      sendMessageToContentScript({ tabId: previousTabId }, { cmd: 'setEnabled', value: false })
    }

    activeTabId.value = nextTabId
    resetFrameContext()
    if (nextTabId === null) {
      connectionStatus.value = 'unavailable'
      return
    }
    probeTab(nextTabId)
  }

  const refreshActiveTab = (): void => {
    const chromeApi = getChromeApi()
    if (!chromeApi?.tabs) {
      setActiveTab()
      return
    }
    chromeApi.tabs.query({ active: true, currentWindow: true }, tabs => setActiveTab(tabs[0]))
  }

  const runQuery = (): void => {
    executeQuery()
    addToHistory(xpathRule.value)
  }

  watch(xpathRule, executeQuery)

  const handleBatch = (value: boolean): void => {
    xpathBatch.value = value
    sendMessageToContentScript(getTarget(), { cmd: 'batch', value })
  }

  const handleFocusResult = (index: number): void => {
    sendMessageToContentScript(getTarget(activeFrameId.value), {
      cmd: 'focusResult',
      value: xpathRule.value,
      index,
    })
  }

  const handleSetContext = (): void => {
    sendMessageToContentScript(getTarget(activeFrameId.value), { cmd: 'setContext' })
  }

  const handleClearContext = (): void => {
    sendMessageToContentScript(getTarget(activeFrameId.value), { cmd: 'clearContext' })
  }

  const handleCopy = (): void => {
    copy(xpathRule.value)
  }

  const handleToCss = (): void => {
    try {
      copy(xPathToCss(xpathRule.value))
    } catch (error) {
      xpathResult.value = error instanceof Error
        ? `[CSS CONVERSION FAILED] ${error.message}`
        : '[CSS CONVERSION FAILED]'
      xpathResultCount.value = null
      xpathResultItems.value = []
    }
  }

  const handleAppendExtraction = (suffix: string): void => {
    const base = xpathRule.value.replace(/\/(?:text\(\)|@[\w:.-]+)\s*$/, '')
    xpathRule.value = `${base.replace(/\/+$/, '')}/${suffix}`
    addToHistory(xpathRule.value)
  }

  const chromeApi = getChromeApi()
  const handleRuntimeMessage = (request: ContentScriptMessage, sender: chrome.runtime.MessageSender): void => {
    if (sender.tab?.id !== activeTabId.value) return

    if (request.cmd === 'queryGenerated') {
      activeFrameId.value = sender.frameId ?? 0
      activeFrameUrl.value = request.frameUrl ?? ''
      xpathContextActive.value = false
      if (request.query === xpathRule.value) {
        executeQuery()
      } else {
        xpathRule.value = request.query
      }
    } else if (request.cmd === 'contextState') {
      activeFrameId.value = sender.frameId ?? activeFrameId.value
      xpathContextActive.value = request.active
      executeQuery()
    }
  }

  const handleTabActivated = (activeInfo: chrome.tabs.OnActivatedInfo): void => {
    if (sidePanelWindowId !== null && activeInfo.windowId !== sidePanelWindowId) return
    setActiveTab({ id: activeInfo.tabId, windowId: activeInfo.windowId })
  }

  const handleTabUpdated = (
    tabId: number,
    changeInfo: chrome.tabs.OnUpdatedInfo,
  ): void => {
    if (tabId !== activeTabId.value || !changeInfo.status) return
    resetFrameContext()
    if (changeInfo.status === 'loading') {
      connectionStatus.value = 'connecting'
    } else {
      probeTab(tabId)
    }
  }

  const handleTabRemoved = (tabId: number): void => {
    if (tabId === activeTabId.value) refreshActiveTab()
  }

  const disableActiveTab = (): void => {
    const target = getTarget()
    if (target) sendMessageToContentScript(target, { cmd: 'setEnabled', value: false })
  }

  chromeApi?.runtime?.onMessage?.addListener(handleRuntimeMessage)
  chromeApi?.tabs?.onActivated?.addListener(handleTabActivated)
  chromeApi?.tabs?.onUpdated?.addListener(handleTabUpdated)
  chromeApi?.tabs?.onRemoved?.addListener(handleTabRemoved)
  globalThis.addEventListener?.('pagehide', disableActiveTab)
  refreshActiveTab()

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disableActiveTab()
      chromeApi?.runtime?.onMessage?.removeListener(handleRuntimeMessage)
      chromeApi?.tabs?.onActivated?.removeListener(handleTabActivated)
      chromeApi?.tabs?.onUpdated?.removeListener(handleTabUpdated)
      chromeApi?.tabs?.onRemoved?.removeListener(handleTabRemoved)
      globalThis.removeEventListener?.('pagehide', disableActiveTab)
    })
  }

  return {
    xpathRule,
    xpathBatch,
    xpathResult,
    xpathResultCount,
    xpathResultItems,
    xpathAttributes,
    xpathContextActive,
    activeTabId,
    activeFrameId,
    activeFrameUrl,
    connectionStatus,
    isPageConnected,
    isSupported,
    handleBatch,
    handleFocusResult,
    handleSetContext,
    handleClearContext,
    handleCopy,
    handleToCss,
    handleAppendExtraction,
    queryHistory: history,
    addToQueryHistory: addToHistory,
    clearQueryHistory: clearHistory,
    toggleQueryPin: togglePin,
    runQuery,
  }
}
