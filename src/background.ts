import { sendMessageToContentScript } from './utils'

chrome.action.onClicked.addListener(() => {
  sendMessageToContentScript({ cmd: 'toggleBar' })
})

export {}
