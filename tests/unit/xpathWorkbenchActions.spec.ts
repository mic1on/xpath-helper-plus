import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useXPathWorkbench } from '@/composables/useXPathWorkbench'

// Complements xpathWorkbench.spec.ts (which covers tab/frame routing). This
// suite exercises the user-facing action handlers and the connection state
// machine that the routing spec does not touch: batch toggling, focus, CSS
// conversion (incl. its failure path), append-extraction suffix rewriting,
// and connecting -> connected -> unavailable transitions.

const mocks = vi.hoisted(() => ({
  sendMessageToContentScript: vi.fn(),
  copy: vi.fn(),
  xPathToCss: vi.fn((value: string) => `css(${value})`),
  runtimeListener: undefined as ((request: any, sender: any) => void) | undefined,
  updatedListener: undefined as ((tabId: number, info: any) => void) | undefined,
  removedListener: undefined as ((tabId: number) => void) | undefined,
}))

vi.mock('@/utils', () => ({
  sendMessageToContentScript: mocks.sendMessageToContentScript,
}))

vi.mock('@vueuse/core', () => ({
  useClipboard: () => ({ isSupported: ref(true), copy: mocks.copy }),
  useLocalStorage: (_key: string, defaultValue: unknown) => ref(defaultValue),
}))

vi.mock('xpath-to-css', () => ({
  default: (value: string) => mocks.xPathToCss(value),
}))

function eventMock(setListener: (listener: any) => void) {
  return { addListener: vi.fn(setListener), removeListener: vi.fn() }
}

const connectedState = { enabled: true, xpathBatch: false }

beforeEach(() => {
  mocks.runtimeListener = undefined
  mocks.updatedListener = undefined
  mocks.removedListener = undefined
  mocks.copy.mockReset()
  mocks.xPathToCss.mockReset()
  mocks.xPathToCss.mockImplementation((value: string) => `css(${value})`)

  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: eventMock(listener => mocks.runtimeListener = listener),
    },
    tabs: {
      query: vi.fn((_query, callback) => callback([{ id: 41, windowId: 7 }])),
      onActivated: eventMock(() => {}),
      onUpdated: eventMock(listener => mocks.updatedListener = listener),
      onRemoved: eventMock(listener => mocks.removedListener = listener),
    },
  })

  mocks.sendMessageToContentScript.mockReset()
  mocks.sendMessageToContentScript.mockImplementation((_target, message, callback) => {
    if (message.cmd === 'getState') callback?.(connectedState)
    if (message.cmd === 'xpath') callback?.(['result', 2, ['href'], []])
  })
})

describe('useXPathWorkbench action handlers', () => {
  it('handleBatch broadcasts the batch value across all frames (no frameId)', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    mocks.sendMessageToContentScript.mockClear()

    workbench.handleBatch(true)

    expect(workbench.xpathBatch.value).toBe(true)
    expect(mocks.sendMessageToContentScript).toHaveBeenCalledWith(
      { tabId: 41, frameId: undefined },
      { cmd: 'batch', value: true },
    )
  })

  it('handleFocusResult targets the exact active frame with the result index', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()

    // Establish a non-zero active frame via a generated query.
    mocks.runtimeListener?.(
      { cmd: 'queryGenerated', query: '//li', frameUrl: 'https://f' },
      { tab: { id: 41 }, frameId: 5 },
    )
    await nextTick()
    mocks.sendMessageToContentScript.mockClear()

    workbench.handleFocusResult(3)

    expect(mocks.sendMessageToContentScript).toHaveBeenCalledWith(
      { tabId: 41, frameId: 5 },
      { cmd: 'focusResult', value: '//li', index: 3 },
    )
  })

  it('handleCopy copies the current XPath rule to the clipboard', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    workbench.xpathRule.value = '//button[@id="go"]'

    workbench.handleCopy()

    expect(mocks.copy).toHaveBeenCalledWith('//button[@id="go"]')
  })

  it('handleToCss converts the XPath and copies the CSS selector', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    workbench.xpathRule.value = '//div'

    workbench.handleToCss()

    expect(mocks.xPathToCss).toHaveBeenCalledWith('//div')
    expect(mocks.copy).toHaveBeenCalledWith('css(//div)')
  })

  it('handleToCss surfaces a failure sentinel in the result instead of throwing', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    mocks.xPathToCss.mockImplementation(() => {
      throw new Error('cannot convert count()')
    })
    workbench.xpathRule.value = 'count(//div)'

    expect(() => workbench.handleToCss()).not.toThrow()
    expect(workbench.xpathResult.value).toBe('[CSS CONVERSION FAILED] cannot convert count()')
    expect(workbench.xpathResultCount.value).toBeNull()
    expect(mocks.copy).not.toHaveBeenCalled()
  })

  it('handleAppendExtraction replaces an existing trailing step and re-evaluates', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    workbench.xpathRule.value = '//a/@href'

    workbench.handleAppendExtraction('text()')

    // The prior /@href trailing extraction is stripped before appending.
    expect(workbench.xpathRule.value).toBe('//a/text()')
  })

  it('handleAppendExtraction appends a suffix when there is no trailing extraction', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    workbench.xpathRule.value = '//img'

    workbench.handleAppendExtraction('@src')

    expect(workbench.xpathRule.value).toBe('//img/@src')
  })

  it('runQuery evaluates and records the query in history', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    workbench.xpathRule.value = '//span'
    await nextTick()

    workbench.runQuery()

    expect(workbench.queryHistory.value.some((item: any) => item.query === '//span')).toBe(true)
  })
})

describe('useXPathWorkbench connection state machine', () => {
  it('marks the page unavailable when getState returns a non-state response', async () => {
    mocks.sendMessageToContentScript.mockImplementation((_target, message, callback) => {
      if (message.cmd === 'getState') callback?.(undefined)
    })
    const workbench = useXPathWorkbench()
    await nextTick()

    expect(workbench.connectionStatus.value).toBe('unavailable')
    expect(workbench.isPageConnected.value).toBe(false)
  })

  it('flips to connecting then re-probes when the tab starts and finishes loading', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    expect(workbench.connectionStatus.value).toBe('connected')

    mocks.updatedListener?.(41, { status: 'loading' })
    expect(workbench.connectionStatus.value).toBe('connecting')

    mocks.updatedListener?.(41, { status: 'complete' })
    await nextTick()
    expect(workbench.connectionStatus.value).toBe('connected')
  })

  it('ignores loading updates for a tab that is not the active one', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()

    mocks.updatedListener?.(999, { status: 'loading' })
    expect(workbench.connectionStatus.value).toBe('connected')
  })

  it('re-resolves the active tab when the current tab is removed', async () => {
    useXPathWorkbench()
    await nextTick()
    const querySpy = chrome.tabs.query as unknown as ReturnType<typeof vi.fn>
    querySpy.mockClear()

    mocks.removedListener?.(41)

    expect(querySpy).toHaveBeenCalledWith(
      { active: true, currentWindow: true },
      expect.any(Function),
    )
  })
})
