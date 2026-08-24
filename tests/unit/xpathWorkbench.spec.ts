import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, watch } from 'vue'
import { useXPathWorkbench } from '@/composables/useXPathWorkbench'

const mocks = vi.hoisted(() => ({
  sendMessageToContentScript: vi.fn(),
  runtimeListener: undefined as ((request: unknown, sender: unknown) => void) | undefined,
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

beforeEach(() => {
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  mocks.runtimeListener = undefined
  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: {
        addListener: vi.fn((listener) => {
          mocks.runtimeListener = listener
        }),
      },
    },
  })
  mocks.sendMessageToContentScript.mockReset()
  mocks.sendMessageToContentScript.mockImplementation((message, callback) => {
    if (message.cmd === 'xpath') callback?.(['result', 1, [], []])
  })
})

describe('useXPathWorkbench context evaluation (#47)', () => {
  it('re-evaluates the current XPath when context state changes', async () => {
    useXPathWorkbench()
    await nextTick()
    const evaluationsBefore = mocks.sendMessageToContentScript.mock.calls
      .filter(([message]) => message.cmd === 'xpath').length

    mocks.runtimeListener?.({ contextActive: true }, {})

    const evaluationsAfter = mocks.sendMessageToContentScript.mock.calls
      .filter(([message]) => message.cmd === 'xpath').length
    expect(evaluationsAfter).toBe(evaluationsBefore + 1)
  })
})
