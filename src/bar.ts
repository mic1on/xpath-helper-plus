class Bar {
    iframe: HTMLIFrameElement
    inDomFlag: boolean
    appendScheduled: boolean
    constructor() {
        this.iframe = document.createElement('iframe');
        this.iframe.src = chrome.runtime.getURL('index.html')
        this.iframe.id = 'xh-bar'
        this.iframe.allow = 'clipboard-write' // can use clipboard
        this.hideBar()

        this.inDomFlag = false
        this.appendScheduled = false
    }

    createIframe():void {
        if (this.inDomFlag) return
        if (!document.body) {
            if (!this.appendScheduled) {
                this.appendScheduled = true
                document.addEventListener('DOMContentLoaded', () => this.createIframe(), { once: true })
            }
            return
        }
        document.body.appendChild(this.iframe)
        this.inDomFlag = true
        this.appendScheduled = false
    }
    moveBar() {
        this.iframe.classList.toggle('bottom');
    }
    showBar() {
        this.createIframe()
        this.iframe.classList.remove('hidden')
    }
    hideBar() {
        this.iframe.classList.add('hidden')
    }

    setVisible(visible: boolean): void {
        visible ? this.showBar() : this.hideBar()
    }
}

export default Bar
