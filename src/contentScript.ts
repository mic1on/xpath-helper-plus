import Bar from './bar'
import { clearHighlights, evaluateQuery, makeQueryForElement } from './xpath'
import { sendMessageToPopup } from './lib/messaging'
import type { PopupMessage } from './types/messages'

// With `all_frames: true` (issue #25) this content script is injected into the
// top document AND every child frame (including cross-origin iframes, which get
// their own isolated instance). Only the top frame hosts the visible floating
// bar UI; sub-frames run the same hover/highlight/evaluate logic against their
// OWN document so elements inside an iframe can be selected and located. Frame
// boundaries mean a mousemove never crosses into another document, so whichever
// frame the pointer is over is the one that generates the query — that frame
// then tags its message with its own URL so the popup can label / route to it.
const isTopFrame = window === window.top

// The bar only exists in the top frame; sub-frames leave this null and just
// track their own enabled state for the shared mousemove listener.
const bar = isTopFrame ? new Bar() : null

// Mouse move event handler
let currentEl: EventTarget | null = null
let xpathShort: boolean = false
let xpathBatch: boolean = false
let xpathContainsId: boolean = false
// Whether hover-to-generate is currently active in THIS frame. Kept in sync
// across every frame because the bar toggle is broadcast to all of them.
let enabled: boolean = false
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
    // Tag the notification with this frame's URL so the popup can show which
    // frame the query belongs to (issue #25); the popup reads sender.frameId
    // off the same message to route later evaluation back to this frame.
    sendMessageToPopup({ query, frameUrl: window.location.href })
  }
}

function enableHover() {
  if (enabled) return
  enabled = true
  document.addEventListener('mousemove', handleMouseMove)
  clearHighlights()
}

function disableHover() {
  if (!enabled) return
  enabled = false
  document.removeEventListener('mousemove', handleMouseMove)
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
    // Only the top frame owns the bar; sub-frames ignore this no-op.
    bar?.moveBar()
  }
  if (request.cmd === 'toggleBar') {
    // Broadcast to every frame. The top frame flips the visible bar and mirrors
    // its show state onto hover; sub-frames have no bar, so they toggle their
    // own hover state so the two stay in lockstep (both start disabled).
    if (bar) {
      const isShow = bar.toggleBar()
      isShow ? enableHover() : disableHover()
    } else {
      enabled ? disableHover() : enableHover()
    }
  }
})
