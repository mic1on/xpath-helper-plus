import { clearHighlights, evaluateQuery, focusQueryResult, makeQueryForElement } from '@/xpath'
import './style.css'
import { DEFAULT_CONTENT_SCRIPT_STATE, isContentScriptState, reduceContentScriptState } from '@/lib/contentState'
import { notifyExtension } from '@/lib/messaging'
import type { ContentScriptState, SidePanelMessage, StateUpdateMessage } from '@/types/messages'

const isTopFrame = window === window.top

let currentEl: EventTarget | null = null
let state: ContentScriptState = { ...DEFAULT_CONTENT_SCRIPT_STATE }
let contextEl: Element | null = null
let hydrationUpdates: StateUpdateMessage[] | null = isTopFrame ? null : []

const CONTEXT_CLASS = 'xh-context'

function markContext(el: Element | null): void {
  if (contextEl && contextEl !== el) {
    contextEl.classList.remove(CONTEXT_CLASS)
  }
  contextEl = el
  contextEl?.classList.add(CONTEXT_CLASS)
}

function handleMouseMove(event: MouseEvent): void {
  if (currentEl === event.target) return
  currentEl = event.target
  if (!event.shiftKey) return

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
  notifyExtension({ cmd: 'queryGenerated', query, frameUrl: window.location.href })
}

function setPickerEnabled(enabled: boolean): void {
  if (enabled === state.enabled) return
  if (enabled) {
    document.addEventListener('mousemove', handleMouseMove)
    clearHighlights()
  } else {
    document.removeEventListener('mousemove', handleMouseMove)
    clearHighlights()
    markContext(null)
  }
}

function applyState(nextState: ContentScriptState): void {
  setPickerEnabled(nextState.enabled)
  state = nextState
}

function applyStateMessage(message: StateUpdateMessage): void {
  hydrationUpdates?.push(message)
  applyState(reduceContentScriptState(state, message))
}

chrome.runtime.onMessage.addListener((request: SidePanelMessage, _sender, sendResponse) => {
  switch (request.cmd) {
    case 'xpath':
      clearHighlights()
      sendResponse(evaluateQuery(request.value, contextEl ?? document))
      break
    case 'focusResult':
      sendResponse(focusQueryResult(request.value, request.index, contextEl ?? document))
      break
    case 'setEnabled':
    case 'short':
    case 'batch':
    case 'containsId':
      applyStateMessage(request)
      break
    case 'getState':
      sendResponse(state)
      break
    case 'setContext':
      markContext(currentEl instanceof Element ? currentEl : null)
      notifyExtension({ cmd: 'contextState', active: contextEl !== null })
      break
    case 'clearContext':
      markContext(null)
      notifyExtension({ cmd: 'contextState', active: false })
      break
  }
})

if (!isTopFrame) {
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
