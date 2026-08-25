import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONTENT_SCRIPT_STATE,
  isContentScriptState,
  reduceContentScriptState,
} from '@/lib/contentState'

const enabledState = {
  enabled: true,
  xpathBatch: true,
}

describe('content-script frame state (#47)', () => {
  it('uses explicit enabled values instead of inverting local frame state', () => {
    const first = reduceContentScriptState(DEFAULT_CONTENT_SCRIPT_STATE, {
      cmd: 'setEnabled',
      value: true,
    })
    const second = reduceContentScriptState(first, {
      cmd: 'setEnabled',
      value: true,
    })

    expect(first.enabled).toBe(true)
    expect(second.enabled).toBe(true)
  })

  it('hydrates the enabled and batch modes for a dynamically inserted frame', () => {
    expect(isContentScriptState(enabledState)).toBe(true)
    expect(enabledState).toEqual({
      enabled: true,
      xpathBatch: true,
    })
  })

  it('updates the batch mode without resetting the rest of the frame state', () => {
    expect(reduceContentScriptState(enabledState, {
      cmd: 'batch',
      value: false,
    })).toEqual({
      ...enabledState,
      xpathBatch: false,
    })
  })

  it('rejects incomplete state responses', () => {
    expect(isContentScriptState({ enabled: true })).toBe(false)
    expect(isContentScriptState(null)).toBe(false)
  })
})
