export interface XPathResultItem {
  index: number
  preview: string
  nodeType: 'element' | 'attribute' | 'text' | 'other'
  tagName?: string
}

export type XPathEvaluationResponse = [
  value: string,
  count: number,
  attributes: string[],
  items: XPathResultItem[],
]

export interface QueryMessage {
  cmd: 'xpath'
  value: string
}

export interface FocusResultMessage {
  cmd: 'focusResult'
  value: string
  index: number
}

export interface ContentScriptState {
  enabled: boolean
  xpathBatch: boolean
}

export interface ToggleMessage {
  cmd: 'batch'
  value: boolean
}

export interface SetEnabledMessage {
  cmd: 'setEnabled'
  value: boolean
}

export type StateUpdateMessage = ToggleMessage | SetEnabledMessage

export interface GetStateMessage {
  cmd: 'getState'
}

export interface RequestContentStateMessage {
  cmd: 'requestContentState'
}

export interface ContextMessage {
  cmd: 'setContext' | 'clearContext'
}

export interface QueryResult {
  cmd: 'queryGenerated'
  query: string
  frameUrl?: string
}

export interface ContextStateResult {
  cmd: 'contextState'
  active: boolean
}

export type SidePanelMessage =
  | QueryMessage
  | FocusResultMessage
  | StateUpdateMessage
  | GetStateMessage
  | ContextMessage

export type ContentScriptMessage = QueryResult | ContextStateResult | RequestContentStateMessage

export interface ContentScriptTarget {
  tabId: number
  frameId?: number
}

export type SendResponseCallback = (response?: unknown) => void
