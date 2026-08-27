import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendMessageToContentScript } from '@/utils'

// src/utils.ts::sendMessageToContentScript is the single choke point the Side
// Panel uses to talk to content scripts. Its contract:
//   - null target OR missing chrome.tabs  -> invoke callback with no args, send nothing
//   - target with frameId undefined       -> tabs.sendMessage WITHOUT an options arg
//   - target with a frameId               -> tabs.sendMessage WITH { frameId }
//   - a real response                     -> forwarded to the callback
//   - a runtime disconnect error          -> callback invoked with no args (degrade),
//                                            the raw response is NOT forwarded
// The workbench spec mocks this module, so these are the only tests that
// exercise the real routing/error-classification logic.

const sendMessage = vi.fn()

function stubChrome(options: { withTabs?: boolean, lastError?: { message: string } } = {}) {
  const { withTabs = true, lastError } = options
  vi.stubGlobal('chrome', {
    runtime: { lastError },
    tabs: withTabs ? { sendMessage } : undefined,
  })
}

beforeEach(() => {
  sendMessage.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendMessageToContentScript', () => {
  it('invokes the callback with no args and sends nothing when target is null', () => {
    stubChrome()
    const callback = vi.fn()

    sendMessageToContentScript(null, { cmd: 'getState' }, callback)

    expect(callback).toHaveBeenCalledWith()
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('invokes the callback and sends nothing when chrome.tabs is unavailable', () => {
    stubChrome({ withTabs: false })
    const callback = vi.fn()

    sendMessageToContentScript({ tabId: 1 }, { cmd: 'getState' }, callback)

    expect(callback).toHaveBeenCalledWith()
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('does not throw when no callback is supplied and target is null', () => {
    stubChrome()
    expect(() =>
      sendMessageToContentScript(null, { cmd: 'setEnabled', value: false }),
    ).not.toThrow()
  })

  it('broadcasts to the whole tab (no options arg) when frameId is undefined', () => {
    stubChrome()
    sendMessageToContentScript({ tabId: 7 }, { cmd: 'setEnabled', value: true })

    expect(sendMessage).toHaveBeenCalledTimes(1)
    const [tabId, message, third] = sendMessage.mock.calls[0]
    expect(tabId).toBe(7)
    expect(message).toEqual({ cmd: 'setEnabled', value: true })
    // No options object: the third arg is the response handler, not { frameId }.
    expect(typeof third).toBe('function')
  })

  it('targets a specific frame when frameId is provided', () => {
    stubChrome()
    sendMessageToContentScript(
      { tabId: 7, frameId: 3 },
      { cmd: 'xpath', value: '//a' },
      vi.fn(),
    )

    expect(sendMessage).toHaveBeenCalledWith(
      7,
      { cmd: 'xpath', value: '//a' },
      { frameId: 3 },
      expect.any(Function),
    )
  })

  it('forwards a real response to the callback', () => {
    stubChrome()
    sendMessage.mockImplementation((_tabId, _message, handler) => {
      handler(['value', 1, [], []])
    })
    const callback = vi.fn()

    sendMessageToContentScript({ tabId: 7 }, { cmd: 'xpath', value: '//a' }, callback)

    expect(callback).toHaveBeenCalledWith(['value', 1, [], []])
  })

  it('degrades to a no-arg callback on a runtime disconnect error', () => {
    // When the frame is gone, chrome sets runtime.lastError and passes an
    // undefined response. The helper must swallow the raw response and call the
    // callback with no args so the caller flips to `unavailable` rather than
    // treating undefined as a valid evaluation result.
    stubChrome({ lastError: { message: 'Could not establish connection' } })
    sendMessage.mockImplementation((_tabId, _message, options, handler) => {
      // frameId path: 4th arg is the handler.
      const cb = typeof handler === 'function' ? handler : options
      cb(undefined)
    })
    const callback = vi.fn()

    sendMessageToContentScript(
      { tabId: 7, frameId: 2 },
      { cmd: 'xpath', value: '//a' },
      callback,
    )

    expect(callback).toHaveBeenCalledWith()
  })

  it('forwards the response when lastError is set but is NOT a disconnect error', () => {
    // A non-disconnect lastError should not mask the response — the helper only
    // special-cases the known "receiving end gone" family.
    stubChrome({ lastError: { message: 'Some unrelated error' } })
    sendMessage.mockImplementation((_tabId, _message, handler) => {
      handler('still-here')
    })
    const callback = vi.fn()

    sendMessageToContentScript({ tabId: 7 }, { cmd: 'getState' }, callback)

    expect(callback).toHaveBeenCalledWith('still-here')
  })
})
