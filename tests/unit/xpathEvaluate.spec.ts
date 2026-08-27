import { beforeEach, describe, expect, it } from 'vitest'
import { evaluateQuery, getNodePreview } from '@/xpath'

// evaluateQuery passes XPathResult.ANY_TYPE, so the underlying engine can hand
// back BOOLEAN / NUMBER / STRING scalar results in addition to node sets. The
// existing suite covers node-set, invalid, and empty paths; these lock in the
// scalar branches of evalNodeValue plus the getNodePreview normalization the
// result list depends on.

function setDom(html: string) {
  document.body.innerHTML = html
}

describe('evaluateQuery scalar result types', () => {
  beforeEach(() => setDom(''))

  it('reports a boolean() result as 1 with a single "match"', () => {
    setDom('<div><span>x</span></div>')
    const [value, count, attributes, items] = evaluateQuery('boolean(//span)')
    expect(value).toBe('1')
    expect(count).toBe(1)
    expect(attributes).toEqual([])
    expect(items).toEqual([])
  })

  it('reports a false boolean() result as 0', () => {
    setDom('<div><span>x</span></div>')
    const [value, count] = evaluateQuery('boolean(//table)')
    expect(value).toBe('0')
    expect(count).toBe(1)
  })

  it('reports a numeric count() result as its stringified number', () => {
    setDom('<ul><li>a</li><li>b</li><li>c</li></ul>')
    const [value, count] = evaluateQuery('count(//li)')
    expect(value).toBe('3')
    expect(count).toBe(1)
  })

  it('reports a string() result verbatim', () => {
    setDom('<div><span>hello world</span></div>')
    const [value, count] = evaluateQuery('string(//span)')
    expect(value).toBe('hello world')
    expect(count).toBe(1)
  })

  it('does not collect attributes or items for a scalar result', () => {
    setDom('<a href="/x">link</a>')
    const [, , attributes, items] = evaluateQuery('count(//a)')
    expect(attributes).toEqual([])
    expect(items).toEqual([])
  })
})

describe('getNodePreview', () => {
  beforeEach(() => setDom(''))

  it('collapses internal whitespace and trims element text content', () => {
    setDom('<p>  hello   world\n\t</p>')
    const p = document.querySelector('p')!
    expect(getNodePreview(p)).toBe('hello world')
  })

  it('reads an attribute node value directly rather than its text content', () => {
    setDom('<a href="/docs/page">docs</a>')
    const attr = document.querySelector('a')!.getAttributeNode('href')!
    expect(getNodePreview(attr)).toBe('/docs/page')
  })

  it('returns the [EMPTY] sentinel for whitespace-only content', () => {
    setDom('<div>   \n  </div>')
    const div = document.querySelector('div')!
    expect(getNodePreview(div)).toBe('[EMPTY]')
  })
})
