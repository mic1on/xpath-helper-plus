import type { PopupMessage, SendResponseCallback } from './types/messages'

function hasRuntimeConnectionError(): boolean {
  const message = chrome.runtime.lastError?.message ?? ''
  return message.includes('Could not establish connection') || message.includes('Receiving end does not exist')
}

function sendMessageToContentScript(message: PopupMessage, callback?: SendResponseCallback): void {
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

function toggleBar(): void {
  sendMessageToContentScript({ cmd: 'toggleBar' })
}

chrome.action.onClicked.addListener(() => {
  toggleBar()
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-bar') {
    toggleBar()
  }
})

export {}
