import type { ContentScriptMessage, PopupMessage, SendResponseCallback } from '@/types/messages'

function getChromeApi(): typeof chrome | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome
}

function hasRuntimeConnectionError(): boolean {
  const message = getChromeApi()?.runtime?.lastError?.message ?? ''
  return message.includes('Could not establish connection') || message.includes('Receiving end does not exist')
}

export function sendMessageToContentScript(message: PopupMessage, callback?: SendResponseCallback): void {
  const chromeApi = getChromeApi()
  if (chromeApi?.tabs === undefined) return
  chromeApi.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTabId = tabs[0]?.id
    if (activeTabId === undefined) {
      callback?.()
      return
    }

    chromeApi.tabs.sendMessage(activeTabId, message, function (response) {
      if (chromeApi.runtime.lastError && hasRuntimeConnectionError()) {
        callback?.()
        return
      }

      if (callback) callback(response)
    })
  })
}

export function sendMessageToPopup(message: ContentScriptMessage): void {
  const chromeApi = getChromeApi()
  try {
    const maybePromise = chromeApi?.runtime?.sendMessage(message)
    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === 'function') {
      ;(maybePromise as Promise<unknown>).catch(() => {})
    }
  } catch {}
}
