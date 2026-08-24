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

/**
 * Context-pin commands for relative XPath generation (issue #26).
 * - `setContext` pins the last hovered element as the context node, so later
 *   generation emits `.`-relative expressions (e.g. `.//span[@class='price']`).
 * - `clearContext` removes the pin and returns to absolute/root generation.
 */
export interface ContextMessage {
  cmd: 'setContext' | 'clearContext'
}

/** Message sent from content script to popup */
export interface QueryResult {
  query: string
}

/**
 * Content-script -> popup notification of whether a context node is currently
 * pinned, so the popup can reflect the toggle state (issue #26).
 */
export interface ContextStateResult {
  contextActive: boolean
}

export type PopupMessage =
  | QueryMessage
  | ToggleMessage
  | PositionMessage
  | ToggleBarMessage
  | ContextMessage
export type ContentScriptMessage = QueryResult | ContextStateResult

export type SendResponseCallback = (response?: any) => void
