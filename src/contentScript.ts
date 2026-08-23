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
function handleMouseMove(e: MouseEvent) {
  if (currentEl === e.target) return
  currentEl = e.target
  if (e.shiftKey) {
    clearHighlights()
    const query = currentEl instanceof Element
      ? makeQueryForElement(currentEl, xpathShort, xpathBatch, xpathContainsId)
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
