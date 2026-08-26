import { clearHighlights, evaluateQuery, focusQueryResult, makeQueryForElement } from '@/xpath'
import './style.css'
import { DEFAULT_CONTENT_SCRIPT_STATE, isContentScriptState, reduceContentScriptState } from '@/lib/contentState'
import { notifyExtension } from '@/lib/messaging'
import type { ContentScriptState, SidePanelMessage, StateUpdateMessage } from '@/types/messages'

const isTopFrame = window === window.top

let currentEl: EventTarget | null = null
let state: ContentScriptState = { ...DEFAULT_CONTENT_SCRIPT_STATE }
let hydrationUpdates: StateUpdateMessage[] | null = isTopFrame ? null : []

function handleMouseMove(event: MouseEvent): void {
  if (currentEl === event.target) return
  currentEl = event.target
  if (!event.shiftKey) return

  clearHighlights()
  const query = currentEl instanceof Element
    ? makeQueryForElement(
        currentEl,
        state.xpathBatch,
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
      sendResponse(evaluateQuery(request.value))
      break
    case 'focusResult':
      sendResponse(focusQueryResult(request.value, request.index))
      break
    case 'setEnabled':
    case 'batch':
      applyStateMessage(request)
      break
    case 'getState':
      sendResponse(state)
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
