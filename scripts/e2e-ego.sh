#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3303}"
SERVER_PID=""
cd "$ROOT_DIR"

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

pnpm build

node --input-type=module > /tmp/xhp-e2e-server.log 2>&1 <<'NODE' &
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = join(process.cwd(), 'extension')
const port = Number(process.env.PORT || 3303)
const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', `http://localhost:${port}`).pathname)
  const relativePath = normalize(pathname).replace(/^[/\\]+/, '')
  const filePath = join(root, relativePath)

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end('Forbidden')
    return
  }

  try {
    if (!statSync(filePath).isFile()) throw new Error('Not a file')
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' })
    createReadStream(filePath).pipe(response)
  }
  catch {
    response.writeHead(404).end('Not found')
  }
}).listen(port, '127.0.0.1')
NODE
SERVER_PID=$!

for _ in {1..50}; do
  if curl --silent --fail "http://127.0.0.1:${PORT}/dist/sidepanel/index.html" > /dev/null; then
    break
  fi
  sleep 0.1
done

curl --silent --fail "http://127.0.0.1:${PORT}/dist/sidepanel/index.html" > /dev/null

node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const manifest = JSON.parse(readFileSync('extension/manifest.json', 'utf8'))
assert.equal(manifest.side_panel.default_path, 'dist/sidepanel/index.html')
assert.equal(manifest.background.service_worker, 'dist/background/index.js')
assert.deepEqual(manifest.content_scripts[0].js, ['dist/contentScripts/index.global.js'])
assert.equal(manifest.content_scripts[0].all_frames, true)
assert.equal(manifest.content_scripts[0].match_about_blank, true)
assert.ok(manifest.permissions.includes('sidePanel'))
assert.ok(!manifest.permissions.includes('scripting'))
assert.equal(manifest.web_accessible_resources, undefined)

for (const path of [
  'extension/dist/background/index.js',
  'extension/dist/contentScripts/index.global.js',
]) {
  const bundle = readFileSync(path, 'utf8')
  assert.doesNotMatch(bundle, /(^|[;}])\s*import\s/m)
  assert.doesNotMatch(bundle, /\sfrom\s+["']/)
}
NODE

ego-browser nodejs <<'EOF'
const taskName = `xpath-helper-plus-e2e-${Date.now()}`
const task = await useOrCreateTaskSpace(taskName)
try {
  await openOrReuseTab('about:blank', { wait: true })
  const chromeMock = String.raw`(() => {
    try { localStorage.clear() } catch {}
    const makeEvent = () => {
      let listener
      return {
        addListener(value) { listener = value },
        removeListener(value) { if (listener === value) listener = undefined },
        emit(...args) { listener?.(...args) },
      }
    }
    const runtimeEvent = makeEvent()
    const sent = []
    const runtimeSent = []
    const tabs = {
      query(_query, callback) { callback([{ id: 41, windowId: 7 }]) },
      sendMessage(tabId, message, ...args) {
        const options = args.find(value => value && typeof value === 'object')
        const callback = args.find(value => typeof value === 'function')
        sent.push({ tabId, message, frameId: options?.frameId ?? null })
        if (!callback) return
        if (message.cmd === 'getState') callback({ enabled: true, xpathShort: false, xpathBatch: false, xpathContainsId: false })
        else if (message.cmd === 'xpath') callback([
          '<button id="save">Save</button>\\n<button>Cancel</button>',
          2,
          ['id', 'type', 'aria-label'],
          [
            { index: 0, preview: 'Save', nodeType: 'element', tagName: 'button' },
            { index: 1, preview: 'Cancel', nodeType: 'element', tagName: 'button' },
          ],
        ])
        else callback()
      },
      onActivated: makeEvent(), onUpdated: makeEvent(), onRemoved: makeEvent(),
    }
    globalThis.chrome = {
      runtime: {
        lastError: undefined,
        onMessage: runtimeEvent,
        sendMessage(message) { runtimeSent.push(message); return Promise.resolve() },
      },
      tabs,
      i18n: { getUILanguage() { return 'en' } },
    }
    globalThis.__xhpEmit = (request, sender = { tab: { id: 41 }, frameId: 0 }, sendResponse = () => {}) => runtimeEvent.emit(request, sender, sendResponse)
    globalThis.__xhpSent = sent
    globalThis.__xhpRuntimeSent = runtimeSent
  })()`
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: chromeMock })
  await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: false })
  await gotoAndWait(`http://127.0.0.1:${process.env.PORT || 3303}/dist/sidepanel/index.html`, { timeout: 20, settle: 1 })

  const initial = await js(`(() => ({
    connected: document.querySelector('.xh-status--connected') !== null,
    resultCount: document.querySelector('.xh-count')?.textContent?.trim(),
    results: document.querySelectorAll('.xh-result-item').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))()`)
  if (!initial.connected || initial.resultCount !== '2' || initial.results !== 2 || initial.overflow) throw new Error(`Initial Side Panel state failed: ${JSON.stringify(initial)}`)

  await fillInput('css:.xh-panel--editor textarea', '//button[@data-test="save"]')
  await pressKey('Enter')
  await wait(0.2)
  const afterRun = await js(`(() => ({
    value: document.querySelector('.xh-panel--editor textarea')?.value.trim(),
    history: document.querySelector('.xh-history-count')?.textContent?.trim(),
    sent: globalThis.__xhpSent.filter(item => item.message.cmd === 'xpath').at(-1),
  }))()`)
  if (afterRun.value !== '//button[@data-test="save"]' || afterRun.history !== '1' || afterRun.sent.tabId !== 41 || afterRun.sent.frameId !== 0) throw new Error(`Query workflow failed: ${JSON.stringify(afterRun)}`)

  await click('css:.xh-toggle:first-of-type')
  const afterToggle = await js(`(() => ({
    checked: document.querySelector('.xh-toggle:first-of-type input')?.checked,
    last: globalThis.__xhpSent.at(-1),
  }))()`)
  if (!afterToggle.checked || afterToggle.last.message.cmd !== 'short' || afterToggle.last.message.value !== true) throw new Error(`Mode routing failed: ${JSON.stringify(afterToggle)}`)

  await click('css:.xh-action--ghost')
  const historyOpen = await js(`(() => ({
    visible: getComputedStyle(document.querySelector('.xh-history-dropdown')).display !== 'none',
    items: document.querySelectorAll('.xh-history-item').length,
  }))()`)
  if (!historyOpen.visible || historyOpen.items !== 1) throw new Error(`History workflow failed: ${JSON.stringify(historyOpen)}`)

  await click('css:.xh-language__option:first-child')
  const localeState = await js(`(() => ({ lang: document.documentElement.lang }))()`)
  if (localeState.lang !== 'zh-CN') throw new Error(`Locale workflow failed: ${JSON.stringify(localeState)}`)

  await js(`globalThis.__xhpEmit({ cmd: 'queryGenerated', query: '//iframe/button', frameUrl: 'https://frame.example/form' }, { tab: { id: 41 }, frameId: 9 })`)
  await wait(0.25)
  const iframeState = await js(`(() => ({
    value: document.querySelector('.xh-panel--editor textarea')?.value,
    badge: document.querySelector('.xh-frame-badge')?.textContent?.trim(),
    lastXPath: globalThis.__xhpSent.filter(item => item.message.cmd === 'xpath').at(-1),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))()`)
  if (iframeState.value !== '//iframe/button' || !iframeState.badge?.includes('frame.example/form') || iframeState.lastXPath.tabId !== 41 || iframeState.lastXPath.frameId !== 9 || iframeState.overflow) throw new Error(`iframe routing failed: ${JSON.stringify(iframeState)}`)

  await cdp('Emulation.setDeviceMetricsOverride', { width: 280, height: 720, deviceScaleFactor: 1, mobile: false })
  const narrowState = await js(`(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll('body *')].some(element => {
      const rect = element.getBoundingClientRect()
      return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1
    }),
  }))()`)
  if (narrowState.clientWidth !== 280 || narrowState.scrollWidth !== 280 || narrowState.overflow) throw new Error(`Narrow layout failed: ${JSON.stringify(narrowState)}`)

  const contentBundle = await (await fetch(`http://127.0.0.1:${process.env.PORT || 3303}/dist/contentScripts/index.global.js`)).text()
  await gotoAndWait('about:blank', { timeout: 20, settle: 0.2 })
  await js(`document.body.innerHTML = '<main><button id="target" class="action primary">Save</button></main>'`)
  await js(contentBundle)
  await js(`globalThis.__xhpEmit({ cmd: 'setEnabled', value: true }, {}, () => {})`)
  await js(`document.querySelector('#target').dispatchEvent(new MouseEvent('mousemove', { bubbles: true, shiftKey: true }))`)
  await wait(0.1)
  await js(`(() => {
    const notification = globalThis.__xhpRuntimeSent.at(-1)
    globalThis.__xhpEvaluation = null
    globalThis.__xhpEmit({ cmd: 'xpath', value: notification.query }, {}, response => { globalThis.__xhpEvaluation = response })
  })()`)
  const contentState = await js(`(() => ({
    notification: globalThis.__xhpRuntimeSent.at(-1),
    evaluation: globalThis.__xhpEvaluation,
    highlighted: document.querySelector('#target').classList.contains('xh-highlight'),
  }))()`)
  if (contentState.notification?.cmd !== 'queryGenerated' || !contentState.notification.query || contentState.evaluation?.[1] !== 1 || !contentState.highlighted) throw new Error(`Content script picker failed: ${JSON.stringify(contentState)}`)

  cliLog(JSON.stringify({ initial, afterRun, afterToggle, historyOpen, iframeState, narrowState, contentState }, null, 2))
  await captureScreenshot()
}
finally {
  await completeTaskSpace(task.id, { keep: false })
}
EOF
