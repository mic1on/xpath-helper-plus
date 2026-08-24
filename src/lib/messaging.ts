import type { ContentScriptMessage } from '@/types/messages'

export function getChromeApi(): typeof chrome | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome
}

export function hasRuntimeConnectionError(): boolean {
  const message = getChromeApi()?.runtime?.lastError?.message ?? ''
  return message.includes('Could not establish connection')
    || message.includes('Receiving end does not exist')
    || message.includes('The message port closed')
}

export function notifyExtension(message: ContentScriptMessage): void {
  try {
    const maybePromise = getChromeApi()?.runtime?.sendMessage(message)
    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === 'function') {
      ;(maybePromise as Promise<unknown>).catch(() => {})
    }
  } catch {}
}
