import type { ContentScriptMessage, ContentScriptState, PopupMessage, SendResponseCallback } from './types/messages'

function hasRuntimeConnectionError(): boolean {
  const message = chrome.runtime.lastError?.message ?? ''
  return message.includes('Could not establish connection') || message.includes('Receiving end does not exist')
}

function sendMessageToContentScript(
  message: PopupMessage,
  callback?: SendResponseCallback,
  frameId?: number,
): void {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTabId = tabs[0]?.id
    if (activeTabId === undefined) {
      callback?.()
      return
    }

    const options = frameId === undefined ? undefined : { frameId }
    const handleResponse = function (response: unknown) {
      if (chrome.runtime.lastError && hasRuntimeConnectionError()) {
        callback?.()
        return
      }
      callback?.(response)
    }

    if (options) {
      chrome.tabs.sendMessage(activeTabId, message, options, handleResponse)
    } else {
      chrome.tabs.sendMessage(activeTabId, message, handleResponse)
    }
  })
}

function toggleBar(): void {
  sendMessageToContentScript({ cmd: 'getState' }, (response) => {
    const state = response as ContentScriptState | undefined
    if (typeof state?.enabled !== 'boolean') return
    sendMessageToContentScript({ cmd: 'setEnabled', value: !state.enabled })
  }, 0)
}

chrome.action.onClicked.addListener(toggleBar)

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-bar') {
    toggleBar()
  }
})

chrome.runtime.onMessage.addListener((request: ContentScriptMessage, sender, sendResponse) => {
  if (!('cmd' in request) || request.cmd !== 'requestContentState') return

  const tabId = sender.tab?.id
  if (tabId === undefined) {
    sendResponse()
    return
  }

  chrome.tabs.sendMessage(tabId, { cmd: 'getState' }, { frameId: 0 }, (response) => {
    if (chrome.runtime.lastError && hasRuntimeConnectionError()) {
      sendResponse()
      return
    }
    sendResponse(response)
  })
  return true
})

export {}
