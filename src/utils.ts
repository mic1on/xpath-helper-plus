import type { ContentScriptMessage, PopupMessage, SendResponseCallback } from '@/types/messages'

function hasRuntimeConnectionError(): boolean {
  const message = chrome.runtime.lastError?.message ?? ''
  return message.includes('Could not establish connection') || message.includes('Receiving end does not exist')
}

export function sendMessageToContentScript(message: PopupMessage, callback?: SendResponseCallback): void {
  if (chrome?.tabs === undefined) return
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTabId = tabs[0]?.id
    if (activeTabId === undefined) {
      callback?.()
      return
    }

    chrome.tabs.sendMessage(activeTabId, message, function (response) {
      if (chrome.runtime.lastError && hasRuntimeConnectionError()) {
        callback?.()
        return
      }

      if (callback) callback(response)
    })
  })
}

export function sendMessageToPopup(message: ContentScriptMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {})
}
