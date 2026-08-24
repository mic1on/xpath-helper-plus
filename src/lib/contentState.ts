import type { ContentScriptState, StateUpdateMessage } from '@/types/messages'

export const DEFAULT_CONTENT_SCRIPT_STATE: ContentScriptState = {
  enabled: false,
  xpathShort: false,
  xpathBatch: false,
  xpathContainsId: false,
}

export function reduceContentScriptState(
  state: ContentScriptState,
  message: StateUpdateMessage,
): ContentScriptState {
  switch (message.cmd) {
    case 'setEnabled':
      return { ...state, enabled: message.value }
    case 'short':
      return { ...state, xpathShort: message.value }
    case 'batch':
      return { ...state, xpathBatch: message.value }
    case 'containsId':
      return { ...state, xpathContainsId: message.value }
  }
}

export function isContentScriptState(value: unknown): value is ContentScriptState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<ContentScriptState>
  return typeof state.enabled === 'boolean'
    && typeof state.xpathShort === 'boolean'
    && typeof state.xpathBatch === 'boolean'
    && typeof state.xpathContainsId === 'boolean'
}
