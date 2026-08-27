import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getChromeApi,
  hasRuntimeConnectionError,
  notifyExtension,
} from '@/lib/messaging'

// src/lib/messaging.ts is the dependency-light module shared by the Side Panel
// AND the classic MV3 content script (which cannot import @/utils). Its job is
// to (1) safely resolve the chrome API when it may be undefined, (2) classify
// "the receiving end went away" runtime errors so callers can degrade to an
// `unavailable` state instead of throwing, and (3) fire-and-forget a message to
// the extension while swallowing the rejection MV3 raises when no listener is
// registered. These tests lock in exactly that contract.

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getChromeApi', () => {
  it('returns the chrome global when it is defined', () => {
    const fakeChrome = { runtime: {} } as unknown as typeof chrome
    vi.stubGlobal('chrome', fakeChrome)
    expect(getChromeApi()).toBe(fakeChrome)
  })

  it('returns undefined when chrome is not present (non-extension context)', () => {
    vi.stubGlobal('chrome', undefined)
    expect(getChromeApi()).toBeUndefined()
  })
})

describe('hasRuntimeConnectionError', () => {
  const withLastError = (message?: string) => {
    vi.stubGlobal('chrome', {
      runtime: { lastError: message === undefined ? undefined : { message } },
    })
  }

  it('detects the three MV3 disconnect messages', () => {
    withLastError('Could not establish connection. Receiving end does not exist.')
    expect(hasRuntimeConnectionError()).toBe(true)

    withLastError('Receiving end does not exist')
    expect(hasRuntimeConnectionError()).toBe(true)

    withLastError('The message port closed before a response was received.')
    expect(hasRuntimeConnectionError()).toBe(true)
  })

  it('returns false for unrelated runtime errors', () => {
    withLastError('Some other extension failure')
    expect(hasRuntimeConnectionError()).toBe(false)
  })

  it('returns false when there is no lastError at all', () => {
    withLastError(undefined)
    expect(hasRuntimeConnectionError()).toBe(false)
  })

  it('returns false when chrome is undefined', () => {
    vi.stubGlobal('chrome', undefined)
    expect(hasRuntimeConnectionError()).toBe(false)
  })
})

describe('notifyExtension', () => {
  it('forwards the message to chrome.runtime.sendMessage', () => {
    const sendMessage = vi.fn(() => undefined)
    vi.stubGlobal('chrome', { runtime: { sendMessage } })

    notifyExtension({ cmd: 'queryGenerated', query: '//button', frameUrl: 'https://x' })

    expect(sendMessage).toHaveBeenCalledWith({
      cmd: 'queryGenerated',
      query: '//button',
      frameUrl: 'https://x',
    })
  })

  it('swallows a rejected sendMessage promise (no listener registered)', async () => {
    // MV3 rejects sendMessage when nothing is listening. notifyExtension is
    // fire-and-forget, so the rejection must be caught and never surface as an
    // unhandled promise rejection.
    const rejection = Promise.reject(new Error('Could not establish connection'))
    const sendMessage = vi.fn(() => rejection)
    vi.stubGlobal('chrome', { runtime: { sendMessage } })

    expect(() => notifyExtension({ cmd: 'requestContentState' })).not.toThrow()
    // Allow the microtask queue to flush the attached .catch handler.
    await Promise.resolve()
    await expect(rejection).rejects.toThrow('Could not establish connection')
  })

  it('does not throw when sendMessage itself throws synchronously', () => {
    const sendMessage = vi.fn(() => {
      throw new Error('Extension context invalidated')
    })
    vi.stubGlobal('chrome', { runtime: { sendMessage } })

    expect(() => notifyExtension({ cmd: 'requestContentState' })).not.toThrow()
  })

  it('is a no-op when chrome is undefined', () => {
    vi.stubGlobal('chrome', undefined)
    expect(() => notifyExtension({ cmd: 'requestContentState' })).not.toThrow()
  })
})
