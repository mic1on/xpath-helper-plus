const sendMessageToContentScript = (message: any, callback: CallableFunction | null = null) => {
    if (chrome?.tabs === undefined) return
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
    {
      chrome.tabs.sendMessage(<number>tabs[0].id, message, function(response)
      {
        if(callback) callback(response);
      });
    });
  }

export {
    sendMessageToContentScript
}
