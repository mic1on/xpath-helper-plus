import type { ContentScriptState, StateUpdateMessage } from '@/types/messages'

export const DEFAULT_CONTENT_SCRIPT_STATE: ContentScriptState = {
  enabled: false,
  xpathBatch: false,
}

export function reduceContentScriptState(
  state: ContentScriptState,
  message: StateUpdateMessage,
): ContentScriptState {
  switch (message.cmd) {
    case 'setEnabled':
      return { ...state, enabled: message.value }
    case 'batch':
      return { ...state, xpathBatch: message.value }
  }
}

export function isContentScriptState(value: unknown): value is ContentScriptState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<ContentScriptState>
  return typeof state.enabled === 'boolean'
    && typeof state.xpathBatch === 'boolean'
}
