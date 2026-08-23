import type { PopupMessage, SendResponseCallback } from '@/types/messages'
import { getChromeApi, hasRuntimeConnectionError, sendMessageToPopup } from '@/lib/messaging'

export { sendMessageToPopup }

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
