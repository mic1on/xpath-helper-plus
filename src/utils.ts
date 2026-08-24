import type { PopupMessage, SendResponseCallback } from '@/types/messages'
import { getChromeApi, hasRuntimeConnectionError, sendMessageToPopup } from '@/lib/messaging'

export { sendMessageToPopup }

// The frame (within the active tab) a message should be delivered to. With
// `all_frames: true` the content script runs in every frame (issue #25):
//  - Evaluation and context commands must target the ONE frame that owns the
//    query, so pass that frame's id (0 is the top document).
//  - Mode toggles (short/batch/containsId) must reach EVERY frame so hover in
//    any frame respects them; omit `frameId` to broadcast to all frames.
export function sendMessageToContentScript(
  message: PopupMessage,
  callback?: SendResponseCallback,
  frameId?: number,
): void {
  const chromeApi = getChromeApi()
  if (chromeApi?.tabs === undefined) return
  chromeApi.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTabId = tabs[0]?.id
    if (activeTabId === undefined) {
      callback?.()
      return
    }
    // A numeric frameId pins a specific frame; omitting it broadcasts to all
    // frames (and yields a single arbitrary response, acceptable for the
    // fire-and-forget mode toggles that pass no frameId).
    const options = frameId === undefined ? undefined : { frameId }
    const handleResponse = function (response: any) {
      if (chromeApi.runtime.lastError && hasRuntimeConnectionError()) {
        callback?.()
        return
      }
      if (callback) callback(response)
    }
    if (options) {
      chromeApi.tabs.sendMessage(activeTabId, message, options, handleResponse)
    } else {
      chromeApi.tabs.sendMessage(activeTabId, message, handleResponse)
    }
  })
}
