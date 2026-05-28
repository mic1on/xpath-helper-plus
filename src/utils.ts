import type { PopupMessage, SendResponseCallback } from '@/types/messages'

export function sendMessageToContentScript(message: PopupMessage, callback?: SendResponseCallback): void {
  if (chrome?.tabs === undefined) return
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(<number>tabs[0].id, message, function (response) {
      if (callback) callback(response)
    })
  })
}

export function sendMessageToPopup(message: Record<string, unknown>): void {
  chrome.runtime.sendMessage(message).then(() => {})
}