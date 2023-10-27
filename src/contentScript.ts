import Bar from './bar'
import { clearHighlights, evaluateQuery, makeQueryForElement } from './xpath'

const bar = new Bar()


// 鼠标移动事件处理函数
let currentEl: any = null
let xpathShort: boolean = false
let xpathBatch: boolean = false
function handleMouseMove(e: any) {
	if (currentEl === e.toElement) return
	currentEl = e.toElement
	if (e.shiftKey) {
		clearHighlights()
		const query = currentEl ? makeQueryForElement(currentEl, xpathShort, xpathBatch) : ''
		chrome.runtime.sendMessage({
			type: 'query',
			query: query
		}).then(() => { })
	}
}



chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
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
});


