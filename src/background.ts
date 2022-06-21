chrome.action.onClicked.addListener(tab => {
    chrome.tabs.sendMessage(<number>tab.id, {cmd: 'toggleBar'}, () => {})
})

export {}
