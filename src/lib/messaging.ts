import type { ContentScriptMessage } from '@/types/messages'

/**
 * Shared, dependency-free chrome messaging helpers.
 *
 * This module deliberately imports nothing but *types* (erased at build time),
 * so Rollup can inline it into the content-script bundle without pulling in a
 * shared chunk. See tests/e2e/manifest.spec.ts: the content script must stay
 * self-contained and must not import from `@/utils`.
 */

export function getChromeApi(): typeof chrome | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome
}

export function hasRuntimeConnectionError(): boolean {
  const message = getChromeApi()?.runtime?.lastError?.message ?? ''
  return message.includes('Could not establish connection') || message.includes('Receiving end does not exist')
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
