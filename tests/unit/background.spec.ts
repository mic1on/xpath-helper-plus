import { beforeEach, describe, expect, it, vi } from 'vitest'

interface BackgroundListeners {
  action?: (tab: chrome.tabs.Tab) => Promise<void>
  command?: (command: string) => Promise<void>
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
        addListener: vi.fn(),
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
})
