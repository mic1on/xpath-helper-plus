import Bar from './bar'
import { clearHighlights, evaluateQuery, makeQueryForElement } from './xpath'
import { sendMessageToPopup } from './utils'
import type { PopupMessage } from './types/messages'

const bar = new Bar()

// Mouse move event handler
let currentEl: any = null
let xpathShort: boolean = false
let xpathBatch: boolean = false
function handleMouseMove(e: any) {
  if (currentEl === e.toElement) return
  currentEl = e.toElement
  if (e.shiftKey) {
    clearHighlights()
    const query = currentEl ? makeQueryForElement(currentEl, xpathShort, xpathBatch) : ''
    sendMessageToPopup({ type: 'query', query })
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