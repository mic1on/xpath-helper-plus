import { describe, it, expect, beforeEach } from 'vitest'
import {
  escapeXPathString,
  getIdContainsCandidates,
  getElementIndex,
  makeQueryForElement,
} from '@/xpath'

// Unit / characterization tests for the pure logic in src/xpath.ts.
//
// These run under jsdom (see vitest.config.ts) because jsdom provides a
// working document.evaluate(), which the toShort uniqueness check in
// makeQueryForElement relies on via the internal countXPathMatches() helper.
// happy-dom (v12) does not implement document.evaluate, so it cannot exercise
// the toShort / containsId branches; jsdom was chosen for that reason.
//
// Several assertions below are CHARACTERIZATION tests: they lock in the code's
// CURRENT behavior, including known-questionable output tracked in issues
// #12 (class exact-match) and #13 (getElementIndex vs XPath position
// semantics). Those are intentionally NOT fixed here - this PR only adds the
// test harness and must stay green and behavior-preserving. The TODO(#12) /
// TODO(#13) comments mark the assertions that the follow-up bug-fix PRs should
// flip once the behavior is corrected.

function setDom(html: string) {
  document.body.innerHTML = html
}

describe('escapeXPathString', () => {
  it('wraps a string with no quotes in single quotes', () => {
    expect(escapeXPathString('abc')).toBe("'abc'")
  })

  it('wraps a string containing single quotes in double quotes', () => {
    expect(escapeXPathString("a'b")).toBe('"a\'b"')
  })

  it('wraps a string containing double quotes in single quotes', () => {
    expect(escapeXPathString('a"b')).toBe("'a\"b'")
  })

  it('uses concat() when the string contains BOTH quote kinds', () => {
    // Splits on single quotes, wraps each part in single quotes, and joins the
    // pieces with a literal single-quote token ("'").
    expect(escapeXPathString('a\'b"c')).toBe('concat(\'a\', "\'", \'b"c\')')
  })
})

describe('getIdContainsCandidates', () => {
  it('splits on whitespace/underscore/dash/colon/dot, drops tokens shorter than 3, and appends the full id', () => {
    // Tokens: user, name, field, id, x, ab  ->  drop id/x/ab (< 3 chars),
    // keep user/name/field, then always append the full original id.
    expect(getIdContainsCandidates('user_name-field:id.x ab')).toEqual([
      'user',
      'name',
      'field',
      'user_name-field:id.x ab',
    ])
  })

  it('always includes the full id even when it has no splittable tokens', () => {
    expect(getIdContainsCandidates('foobar')).toEqual(['foobar'])
  })

  it('de-duplicates repeated tokens and the full id', () => {
    // "foo foo" -> tokens [foo, foo] deduped to [foo]; full id "foo foo" added.
    expect(getIdContainsCandidates('foo foo')).toEqual(['foo', 'foo foo'])
  })

  it('sorts candidates by ascending length', () => {
    const result = getIdContainsCandidates('abcd ab abcdef')
    // "ab" is dropped (< 3). Remaining: abcd, abcdef, plus full id "abcd ab abcdef".
    expect(result).toEqual(['abcd', 'abcdef', 'abcd ab abcdef'])
    const lengths = result.map((s) => s.length)
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b))
  })
})

describe('getElementIndex', () => {
  it('returns 0 for a lone element with no same-family siblings', () => {
    setDom('<div><span>only</span></div>')
    expect(getElementIndex(document.querySelector('span')!)).toBe(0)
  })

  it('numbers same-family siblings first / middle / last as 1, 2, 3', () => {
    setDom('<div><p class="a">1</p><p class="a">2</p><p class="a">3</p></div>')
    const ps = document.querySelectorAll('p')
    expect(getElementIndex(ps[0])).toBe(1)
    expect(getElementIndex(ps[1])).toBe(2)
    expect(getElementIndex(ps[2])).toBe(3)
  })

  it('counts only same-tag siblings, ignoring interleaved other tags', () => {
    // <a> <b> <a> : the two <a> are positions 1 and 2 within their tag family;
    // the <b> is a lone family member and returns 0.
    setDom('<div><a>1</a><b>2</b><a>3</a></div>')
    const children = document.querySelector('div')!.children
    expect(getElementIndex(children[0])).toBe(1)
    expect(getElementIndex(children[1])).toBe(0)
    expect(getElementIndex(children[2])).toBe(2)
  })

  it('CHARACTERIZATION: elementsShareFamily also requires matching class, so same-tag siblings with different classes are miscounted', () => {
    // TODO(#13): elementsShareFamily requires tagName AND class AND id to match,
    // but the emitted predicate is a bare positional index like div[2], whose
    // XPath semantics only consider the tag name. Here three <div> siblings have
    // classes x / y / x. Because the middle <div class="y"> is not counted as
    // "same family" as <div class="x">, getElementIndex assigns the third div
    // index 2 - but XPath div[2] actually selects the SECOND div (class="y").
    // This asserts the current (buggy) counting; flip in the #13 fix.
    setDom('<section><div class="x">1</div><div class="y">2</div><div class="x">3</div></section>')
    const divs = document.querySelectorAll('div')
    expect(getElementIndex(divs[0])).toBe(1)
    expect(getElementIndex(divs[1])).toBe(0) // lone member of its (class="y") family
    expect(getElementIndex(divs[2])).toBe(2) // TODO(#13): XPath div[2] != this element
  })
})

describe('makeQueryForElement', () => {
  beforeEach(() => {
    // Reset so leftover .xh-highlight classes from prior runs cannot leak.
    document.body.innerHTML = ''
  })

  it('builds a full absolute path with id, class, and positional predicates (plain mode)', () => {
    setDom(
      '<div id="root"><ul><li class="item">a</li><li class="item">b</li><li class="item">c</li></ul></div>'
    )
    const secondLi = document.querySelectorAll('li')[1]
    expect(makeQueryForElement(secondLi)).toBe(
      "/html/body/div[@id='root']/ul/li[@class='item'][2]"
    )
  })

  it('emits id predicate for an element carrying an id', () => {
    setDom('<div id="root"><ul></ul></div>')
    expect(makeQueryForElement(document.getElementById('root')!)).toBe(
      "/html/body/div[@id='root']"
    )
  })

  it('CHARACTERIZATION: uses exact full-string @class match for non-id elements', () => {
    // TODO(#12): class matching uses [@class='foo bar'], which requires the
    // exact class string (token order + whitespace). This is fragile for
    // multi-class / dynamic-class elements. Capture current behavior here; the
    // #12 fix should switch to a contains()/normalize-space() token match and
    // flip this assertion.
    setDom('<div><span class="foo bar">t</span></div>')
    expect(makeQueryForElement(document.querySelector('span')!)).toBe(
      "/html/body/div/span[@class='foo bar']"
    )
  })

  it('appends /@src when the target element is an img', () => {
    setDom('<div><img src="x.png"></div>')
    expect(makeQueryForElement(document.querySelector('img')!)).toBe(
      '/html/body/div/img/@src'
    )
  })

  it('omits positional predicates in batch (列表模式) mode', () => {
    setDom(
      '<div id="root"><ul><li class="item">a</li><li class="item">b</li><li class="item">c</li></ul></div>'
    )
    const secondLi = document.querySelectorAll('li')[1]
    // batch=true suppresses the trailing [index]; the id/class predicates stay.
    expect(makeQueryForElement(secondLi, false, true)).toBe(
      "/html/body/div[@id='root']/ul/li[@class='item']"
    )
  })

  it('stops early at a uniquely-matching component in toShort (精简) mode', () => {
    setDom(
      '<div id="root"><ul><li class="item">a</li><li class="item">b</li></ul><section><p id="uniqp">hi</p></section></div>'
    )
    const p = document.getElementById('uniqp')!
    // The id-bearing <p> is unique document-wide, so the short path collapses to //p[@id='uniqp'].
    expect(makeQueryForElement(p, true)).toBe("//p[@id='uniqp']")
  })

  it('CHARACTERIZATION: toShort keeps building a relative path when the leaf is not unique on its own', () => {
    // TODO(#13): the short path for a non-unique class element still carries the
    // positional index derived from getElementIndex. Here two identical
    // <li class="item"> exist, so //li[@class='item'] is not unique and the
    // first li keeps its [1] index. Locks in current output.
    setDom(
      '<div id="root"><ul><li class="item">a</li><li class="item">b</li></ul></div>'
    )
    const firstLi = document.querySelectorAll('li')[0]
    expect(makeQueryForElement(firstLi, true)).toBe("//li[@class='item'][1]")
  })

  it('uses contains(@id, ...) with the first uniquely-matching token in containsId mode', () => {
    // toShort + containsId: makeIdComponent tries contains(@id, <token>) for
    // ascending-length candidates and picks the first that matches exactly one
    // node. For "user-name-field-123" the numeric token "123" is unique here.
    setDom('<div id="root"><span id="user-name-field-123">t</span></div>')
    const span = document.getElementById('user-name-field-123')!
    expect(makeQueryForElement(span, true, false, true)).toBe(
      "//span[contains(@id,'123')]"
    )
  })

  it('falls back to the full id in containsId mode when no shorter token is unique', () => {
    // "ab-cd-ef" splits into ab/cd/ef, all shorter than 3 chars, so no partial
    // token candidates survive; makeIdComponent falls back to the full id via
    // contains(@id, 'ab-cd-ef') which is unique -> that whole path is unique.
    setDom('<div id="root"><span id="ab-cd-ef">t</span></div>')
    const span = document.getElementById('ab-cd-ef')!
    expect(makeQueryForElement(span, true, false, true)).toBe(
      "//span[contains(@id,'ab-cd-ef')]"
    )
  })
})
