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
  /**
   * URL of the frame that generated this query (issue #25). With
   * `all_frames: true` the content script runs in every frame, so a query
   * produced by Shift+hover inside an iframe is relative to THAT frame's
   * document. The popup pairs this URL with the `sender.frameId` it reads off
   * the message to label the active frame and route later evaluation back to
   * the correct frame.
   */
  frameUrl?: string
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
