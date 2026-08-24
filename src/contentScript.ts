import Bar from './bar'
import { clearHighlights, evaluateQuery, focusQueryResult, makeQueryForElement } from './xpath'
import { DEFAULT_CONTENT_SCRIPT_STATE, isContentScriptState, reduceContentScriptState } from './lib/contentState'
import { sendMessageToPopup } from './lib/messaging'
import type { ContentScriptState, PopupMessage, StateUpdateMessage } from './types/messages'

// With `all_frames: true` this content script runs independently in every
// frame. Only the top frame owns the visible bar; each frame evaluates and
// highlights against its own document.
const isTopFrame = window === window.top
const bar = isTopFrame ? new Bar() : null

let currentEl: EventTarget | null = null
let state: ContentScriptState = { ...DEFAULT_CONTENT_SCRIPT_STATE }
let contextEl: Element | null = null
let hydrationUpdates: StateUpdateMessage[] | null = isTopFrame ? null : []

const CONTEXT_CLASS = 'xh-context'

function markContext(el: Element | null) {
  if (contextEl && contextEl !== el) {
    contextEl.classList.remove(CONTEXT_CLASS)
  }
  contextEl = el
  if (contextEl) {
    contextEl.classList.add(CONTEXT_CLASS)
  }
}

function handleMouseMove(e: MouseEvent) {
  if (currentEl === e.target) return
  currentEl = e.target
  if (e.shiftKey) {
    clearHighlights()
    const query = currentEl instanceof Element
      ? makeQueryForElement(
          currentEl,
          state.xpathShort,
          state.xpathBatch,
          state.xpathContainsId,
          contextEl,
        )
      : ''
    sendMessageToPopup({ query, frameUrl: window.location.href })
  }
}

function setHoverEnabled(enabled: boolean) {
  if (enabled === state.enabled) return
  if (enabled) {
    document.addEventListener('mousemove', handleMouseMove)
    clearHighlights()
  } else {
    document.removeEventListener('mousemove', handleMouseMove)
  }
}

function applyState(nextState: ContentScriptState) {
  setHoverEnabled(nextState.enabled)
  state = nextState
  bar?.setVisible(state.enabled)
}

function applyStateMessage(message: StateUpdateMessage) {
  hydrationUpdates?.push(message)
  applyState(reduceContentScriptState(state, message))
}

chrome.runtime.onMessage.addListener(function (request: PopupMessage, _sender, sendResponse) {
  if (request.cmd === 'xpath') {
    clearHighlights()
    sendResponse(evaluateQuery(request.value, contextEl ?? document))
  }
  if (request.cmd === 'focusResult') {
    sendResponse(focusQueryResult(request.value, request.index, contextEl ?? document))
  }
  if (
    request.cmd === 'setEnabled'
    || request.cmd === 'short'
    || request.cmd === 'batch'
    || request.cmd === 'containsId'
  ) {
    applyStateMessage(request)
  }
  if (request.cmd === 'getState') {
    sendResponse(state)
  }
  if (request.cmd === 'setContext') {
    markContext(currentEl instanceof Element ? currentEl : null)
    sendMessageToPopup({ contextActive: contextEl !== null })
  }
  if (request.cmd === 'clearContext') {
    markContext(null)
    sendMessageToPopup({ contextActive: false })
  }
  if (request.cmd === 'position') {
    bar?.moveBar()
  }
})

if (!isTopFrame) {
  // A frame may be created after the bar or mode toggles changed. Pull the
  // current top-frame state instead of assuming defaults or inverting local
  // booleans on the next toggle.
  const maybePromise = chrome.runtime.sendMessage({ cmd: 'requestContentState' })
  if (maybePromise && typeof maybePromise.then === 'function') {
    maybePromise.then((currentState: unknown) => {
      if (isContentScriptState(currentState)) {
        const hydratedState = (hydrationUpdates ?? []).reduce(
          reduceContentScriptState,
          currentState,
        )
        applyState(hydratedState)
      }
      hydrationUpdates = null
    }).catch(() => {
      hydrationUpdates = null
    })
  }
}
