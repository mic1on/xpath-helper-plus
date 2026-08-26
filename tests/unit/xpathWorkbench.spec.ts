import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useXPathWorkbench } from '@/composables/useXPathWorkbench'

const enabledState = {
  enabled: true,
  xpathBatch: false,
}

const mocks = vi.hoisted(() => ({
  sendMessageToContentScript: vi.fn(),
  runtimeListener: undefined as ((request: any, sender: any) => void) | undefined,
  activatedListener: undefined as ((info: any) => void) | undefined,
  updatedListener: undefined as ((tabId: number, info: any) => void) | undefined,
  removedListener: undefined as ((tabId: number) => void) | undefined,
}))

vi.mock('@/utils', () => ({
  sendMessageToContentScript: mocks.sendMessageToContentScript,
}))

vi.mock('@vueuse/core', () => ({
  useClipboard: () => ({ isSupported: ref(true), copy: vi.fn() }),
  useLocalStorage: (_key: string, defaultValue: unknown) => ref(defaultValue),
}))

vi.mock('xpath-to-css', () => ({
  default: (value: string) => value,
}))

function eventMock(setListener: (listener: any) => void) {
  return {
    addListener: vi.fn(setListener),
    removeListener: vi.fn(),
  }
}

beforeEach(() => {
  mocks.runtimeListener = undefined
  mocks.activatedListener = undefined
  mocks.updatedListener = undefined
  mocks.removedListener = undefined

  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: eventMock(listener => mocks.runtimeListener = listener),
    },
    tabs: {
      query: vi.fn((_query, callback) => callback([{ id: 41, windowId: 7 }])),
      onActivated: eventMock(listener => mocks.activatedListener = listener),
      onUpdated: eventMock(listener => mocks.updatedListener = listener),
      onRemoved: eventMock(listener => mocks.removedListener = listener),
    },
  })

  mocks.sendMessageToContentScript.mockReset()
  mocks.sendMessageToContentScript.mockImplementation((target, message, callback) => {
    if (message.cmd === 'getState') callback?.(enabledState)
    if (message.cmd === 'xpath') callback?.(['result', 1, [], []])
  })
})

describe('useXPathWorkbench side panel routing', () => {
  it('targets the active tab and evaluates in its top frame', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()

    expect(workbench.activeTabId.value).toBe(41)
    expect(workbench.connectionStatus.value).toBe('connected')
    expect(mocks.sendMessageToContentScript).toHaveBeenCalledWith(
      { tabId: 41, frameId: 0 },
      expect.objectContaining({ cmd: 'xpath' }),
      expect.any(Function),
    )
  })

  it('routes iframe-generated XPath evaluation back to the same tab and frame', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    mocks.sendMessageToContentScript.mockClear()

    mocks.runtimeListener?.(
      { cmd: 'queryGenerated', query: '//button', frameUrl: 'https://frame.example/form' },
      { tab: { id: 41 }, frameId: 9 },
    )
    await nextTick()

    expect(workbench.xpathRule.value).toBe('//button')
    expect(workbench.activeFrameId.value).toBe(9)
    expect(workbench.activeFrameUrl.value).toBe('https://frame.example/form')
    expect(mocks.sendMessageToContentScript).toHaveBeenCalledWith(
      { tabId: 41, frameId: 9 },
      { cmd: 'xpath', value: '//button' },
      expect.any(Function),
    )
  })

  it('re-evaluates when a different frame generates the same XPath', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()

    mocks.runtimeListener?.(
      { cmd: 'queryGenerated', query: '//button', frameUrl: 'https://first.example' },
      { tab: { id: 41 }, frameId: 3 },
    )
    await nextTick()
    mocks.sendMessageToContentScript.mockClear()

    mocks.runtimeListener?.(
      { cmd: 'queryGenerated', query: '//button', frameUrl: 'https://second.example' },
      { tab: { id: 41 }, frameId: 9 },
    )

    expect(workbench.activeFrameId.value).toBe(9)
    expect(mocks.sendMessageToContentScript).toHaveBeenCalledWith(
      { tabId: 41, frameId: 9 },
      { cmd: 'xpath', value: '//button' },
      expect.any(Function),
    )
  })

  it('ignores messages from a different tab', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    const originalQuery = workbench.xpathRule.value

    mocks.runtimeListener?.(
      { cmd: 'queryGenerated', query: '//wrong-tab', frameUrl: 'https://example.com' },
      { tab: { id: 99 }, frameId: 2 },
    )

    expect(workbench.xpathRule.value).toBe(originalQuery)
    expect(workbench.activeFrameId.value).toBe(0)
  })

  it('ignores stale contextState notifications and does not mutate frame routing (#26 removal)', async () => {
    // Regression guard: the relative-context feature was removed, so a legacy
    // `contextState` notification from an old content script must be a no-op —
    // it must NOT overwrite activeFrameId or trigger a re-evaluation.
    const workbench = useXPathWorkbench()
    await nextTick()

    // Establish a known frame via a real queryGenerated message.
    mocks.runtimeListener?.(
      { cmd: 'queryGenerated', query: '//button', frameUrl: 'https://frame.example' },
      { tab: { id: 41 }, frameId: 7 },
    )
    await nextTick()
    expect(workbench.activeFrameId.value).toBe(7)

    const evaluationsBefore = mocks.sendMessageToContentScript.mock.calls
      .filter(([, message]) => message.cmd === 'xpath').length

    // A stray contextState message (different frameId) must be ignored entirely.
    mocks.runtimeListener?.(
      { cmd: 'contextState', active: true } as any,
      { tab: { id: 41 }, frameId: 99 },
    )
    await nextTick()

    const evaluationsAfter = mocks.sendMessageToContentScript.mock.calls
      .filter(([, message]) => message.cmd === 'xpath').length
    expect(workbench.activeFrameId.value).toBe(7)
    expect(evaluationsAfter).toBe(evaluationsBefore)
  })

  it('disables the previous picker when the active tab changes', async () => {
    const workbench = useXPathWorkbench()
    await nextTick()
    mocks.sendMessageToContentScript.mockClear()

    mocks.activatedListener?.({ tabId: 52, windowId: 7 })

    expect(workbench.activeTabId.value).toBe(52)
    expect(mocks.sendMessageToContentScript).toHaveBeenCalledWith(
      { tabId: 41 },
      { cmd: 'setEnabled', value: false },
    )
    expect(mocks.sendMessageToContentScript).toHaveBeenCalledWith(
      { tabId: 52, frameId: 0 },
      { cmd: 'getState' },
      expect.any(Function),
    )
  })
})
