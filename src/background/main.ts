import type {
  ContentScriptMessage,
  ContentScriptState,
  SidePanelMessage,
} from '@/types/messages'
import { hasRuntimeConnectionError } from '@/lib/messaging'

function sendToTab(
  tabId: number,
  message: SidePanelMessage,
  callback?: (response?: unknown) => void,
  frameId?: number,
): void {
  const options = frameId === undefined ? undefined : { frameId }
  const handleResponse = (response: unknown): void => {
    if (chrome.runtime.lastError && hasRuntimeConnectionError()) {
      callback?.()
      return
    }
    callback?.(response)
  }

  if (options) {
    chrome.tabs.sendMessage(tabId, message, options, handleResponse)
  } else {
    chrome.tabs.sendMessage(tabId, message, handleResponse)
  }
}

function enablePicker(tabId: number): void {
  sendToTab(tabId, { cmd: 'setEnabled', value: true })
}

async function openSidePanel(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined || tab.windowId === undefined) return
  enablePicker(tab.id)
  try {
    await chrome.sidePanel.open({ tabId: tab.id })
  } catch {}
}

chrome.action.onClicked.addListener(openSidePanel)

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-side-panel') return
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (activeTab) await openSidePanel(activeTab)
})

chrome.runtime.onMessage.addListener((request: ContentScriptMessage, sender, sendResponse) => {
  if (request.cmd !== 'requestContentState') return

  const tabId = sender.tab?.id
  if (tabId === undefined) {
    sendResponse()
    return
  }

  sendToTab(tabId, { cmd: 'getState' }, (response) => {
    sendResponse(response as ContentScriptState | undefined)
  }, 0)
  return true
})

export {}
