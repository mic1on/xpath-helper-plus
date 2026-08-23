/** Message sent from popup (home) to content script */
export interface QueryMessage {
  cmd: 'xpath'
  value: string
}

export interface ToggleMessage {
  cmd: 'short' | 'batch' | 'containsId'
  value: boolean
}

export interface PositionMessage {
  cmd: 'position'
}

export interface ToggleBarMessage {
  cmd: 'toggleBar'
}

/** Message sent from content script to popup */
export interface QueryResult {
  query: string
}

export type PopupMessage = QueryMessage | ToggleMessage | PositionMessage | ToggleBarMessage
export type ContentScriptMessage = QueryResult

export type SendResponseCallback = (response?: any) => void
