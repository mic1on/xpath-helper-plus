import Bar from './bar'
import { clearHighlights, evaluateQuery, makeQueryForElement } from './xpath'
import { sendMessageToPopup } from './lib/messaging'
import type { PopupMessage } from './types/messages'

const bar = new Bar()

// Mouse move event handler
let currentEl: EventTarget | null = null
let xpathShort: boolean = false
let xpathBatch: boolean = false
let xpathContainsId: boolean = false
// Pinned context node for relative XPath generation (issue #26). When set,
// makeQueryForElement emits an expression relative to this element.
let contextEl: Element | null = null

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
      ? makeQueryForElement(currentEl, xpathShort, xpathBatch, xpathContainsId, contextEl)
      : ''
    sendMessageToPopup({ query })
  }
}

chrome.runtime.onMessage.addListener(function (request: PopupMessage, sender, sendResponse) {
  if (request.cmd === 'xpath') {
    clearHighlights()
    const res = evaluateQuery(request.value)
    sendResponse(res)
  }
  if (request.cmd === 'short') {
    xpathShort = request.value
  }
  if (request.cmd === 'batch') {
    xpathBatch = request.value
  }
  if (request.cmd === 'containsId') {
    xpathContainsId = request.value
  }
  if (request.cmd === 'setContext') {
    // Pin the most recently hovered element as the relative context node.
    markContext(currentEl instanceof Element ? currentEl : null)
    sendMessageToPopup({ contextActive: contextEl !== null })
  }
  if (request.cmd === 'clearContext') {
    markContext(null)
    sendMessageToPopup({ contextActive: false })
  }
  if (request.cmd === 'position') {
    bar.moveBar()
  }
  if (request.cmd === 'toggleBar') {
    const isShow = bar.toggleBar()
    if (!isShow) {
      document.removeEventListener('mousemove', handleMouseMove)
    } else {
      document.addEventListener('mousemove', handleMouseMove)
      clearHighlights()
    }
  }
})
