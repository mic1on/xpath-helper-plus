class Bar {
    iframe: HTMLIFrameElement

    constructor() {
        this.iframe = document.createElement('iframe');
    }

    createIframe():void {
        let bar = document.getElementById('xh-bar')
        if (!bar) {
            this.iframe.src = chrome.runtime.getURL('index.html')
            this.iframe.id = 'xh-bar'
            this.hideBar()
            document.body.appendChild(this.iframe)
        }
    }

    isShow() {
        return !this.iframe.classList.contains('hidden')
    }
    showBar() {
        this.iframe.classList.remove('hidden')
    }
    hideBar() {
        this.iframe.classList.add('hidden')
    }

    toggleBar(): boolean {
        this.createIframe()
        if (this.isShow()) {
            this.hideBar()
        } else {
            this.showBar()
        }
        return this.isShow()
    }
}

export default Bar
