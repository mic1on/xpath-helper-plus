import type {
  ContentScriptTarget,
  SendResponseCallback,
  SidePanelMessage,
} from '@/types/messages'
import { getChromeApi, hasRuntimeConnectionError, notifyExtension } from '@/lib/messaging'

export { notifyExtension }

export function sendMessageToContentScript(
  target: ContentScriptTarget | null,
  message: SidePanelMessage,
  callback?: SendResponseCallback,
): void {
  const chromeApi = getChromeApi()
  if (!target || chromeApi?.tabs === undefined) {
    callback?.()
    return
  }

  const options = target.frameId === undefined ? undefined : { frameId: target.frameId }
  const handleResponse = (response: unknown): void => {
    if (chromeApi.runtime.lastError && hasRuntimeConnectionError()) {
      callback?.()
      return
    }
    callback?.(response)
  }

  if (options) {
    chromeApi.tabs.sendMessage(target.tabId, message, options, handleResponse)
  } else {
    chromeApi.tabs.sendMessage(target.tabId, message, handleResponse)
  }
}
