import { beforeEach, describe, expect, it, vi } from 'vitest'

interface BackgroundListeners {
  action?: (tab: chrome.tabs.Tab) => Promise<void>
  command?: (command: string) => Promise<void>
  message?: (
    request: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => boolean | undefined
}

const listeners: BackgroundListeners = {}
const sendMessage = vi.fn()
const queryTabs = vi.fn()
const openSidePanel = vi.fn()

beforeEach(async () => {
  vi.resetModules()
  sendMessage.mockReset()
  queryTabs.mockReset()
  openSidePanel.mockReset()
  openSidePanel.mockResolvedValue(undefined)
  queryTabs.mockResolvedValue([{ id: 52, windowId: 8 }])

  vi.stubGlobal('chrome', {
    action: {
      onClicked: {
        addListener: vi.fn((listener) => listeners.action = listener),
      },
    },
    commands: {
      onCommand: {
        addListener: vi.fn((listener) => listeners.command = listener),
      },
    },
    runtime: {
      lastError: undefined,
      onMessage: {
        addListener: vi.fn((listener) => listeners.message = listener),
      },
    },
    sidePanel: {
      open: openSidePanel,
    },
    tabs: {
      query: queryTabs,
      sendMessage,
    },
  })

  await import('@/background/main')
})

describe('background Side Panel lifecycle', () => {
  it('opens the Side Panel and enables picking when the action is clicked', async () => {
    await listeners.action?.({ id: 41, windowId: 7 })

    expect(sendMessage).toHaveBeenCalledWith(
      41,
      { cmd: 'setEnabled', value: true },
      expect.any(Function),
    )
    expect(openSidePanel).toHaveBeenCalledWith({ tabId: 41 })
  })

  it('opens the Side Panel for the active tab from the keyboard command', async () => {
    await listeners.command?.('open-side-panel')

    expect(queryTabs).toHaveBeenCalledWith({ active: true, currentWindow: true })
    expect(sendMessage).toHaveBeenCalledWith(
      52,
      { cmd: 'setEnabled', value: true },
      expect.any(Function),
    )
    expect(openSidePanel).toHaveBeenCalledWith({ tabId: 52 })
  })

  it('ignores unrelated keyboard commands', async () => {
    await listeners.command?.('unrelated-command')

    expect(queryTabs).not.toHaveBeenCalled()
    expect(openSidePanel).not.toHaveBeenCalled()
  })

  it('hydrates a newly inserted frame from frame 0 (#25/#43)', () => {
    // A dynamically inserted child frame asks the background for the current
    // content-script state. The background MUST forward getState to frame 0
    // (the authoritative source per AGENTS.md) and relay its response, so the
    // new frame hydrates its enabled/batch modes instead of starting stale.
    const frameState = { enabled: true, xpathBatch: true }
    sendMessage.mockImplementation((_tabId, message, _options, callback) => {
      if (message.cmd === 'getState') callback?.(frameState)
    })
    const sendResponse = vi.fn()

    const keepAlive = listeners.message?.(
      { cmd: 'requestContentState' },
      { tab: { id: 77 } } as chrome.runtime.MessageSender,
      sendResponse,
    )

    // Returning true keeps the message channel open for the async response.
    expect(keepAlive).toBe(true)
    expect(sendMessage).toHaveBeenCalledWith(
      77,
      { cmd: 'getState' },
      { frameId: 0 },
      expect.any(Function),
    )
    expect(sendResponse).toHaveBeenCalledWith(frameState)
  })

  it('answers requestContentState with no state when the sender has no tab', () => {
    const sendResponse = vi.fn()

    listeners.message?.(
      { cmd: 'requestContentState' },
      {} as chrome.runtime.MessageSender,
      sendResponse,
    )

    expect(sendResponse).toHaveBeenCalledWith()
    expect(sendMessage).not.toHaveBeenCalled()
  })
})
