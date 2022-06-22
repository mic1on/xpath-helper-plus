class Bar {
    iframe: HTMLIFrameElement
    inDomFlag: boolean
    constructor() {
        this.iframe = document.createElement('iframe');
        this.iframe.src = chrome.runtime.getURL('index.html')
        this.iframe.id = 'xh-bar'
        this.iframe.allow = 'clipboard-write' // can use clipboard
        this.hideBar()

        this.inDomFlag = false
    }

    createIframe():void {
        document.body.appendChild(this.iframe)
    }
    moveBar() {
        this.iframe.classList.toggle('bottom');
    }
    isShow() {
        return !this.iframe.classList.contains('hidden')
    }
    showBar() {
        if (!this.inDomFlag) {
            this.inDomFlag = true
            this.createIframe()
        }
        this.iframe.classList.remove('hidden')
    }
    hideBar() {
        this.iframe.classList.add('hidden')
    }

    toggleBar(): boolean {
        if (this.isShow()) {
            this.hideBar()
        } else {
            this.showBar()
        }
        return this.isShow()
    }
}

export default Bar
