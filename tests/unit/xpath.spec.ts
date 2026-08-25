import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  escapeXPathString,
  getIdContainsCandidates,
  getElementIndex,
  makeQueryForElement,
  collectAttributeNames,
  evaluateQuery,
  focusQueryResult,
} from '@/xpath'

// Unit / characterization tests for the pure logic in src/xpath.ts.
//
// These run under jsdom (see vitest.config.ts) because jsdom provides a
// working document.evaluate(), which the shortest-unique check in
// makeQueryForElement relies on via the internal countXPathMatches() helper.
// happy-dom (v12) does not implement document.evaluate, so jsdom is used here.
//
// Several assertions below are CHARACTERIZATION tests: they lock in the
// shortest-unique output and the class/id stability rules. The #13 bug
// (getElementIndex vs XPath position semantics) has been fixed: getElementIndex
// now counts over the same set the emitted predicate selects, and behavioral
// tests evaluate the full generated query.

function setDom(html: string) {
  document.body.innerHTML = html
}

// Count how many nodes an XPath query matches in the current jsdom document.
// Used to assert order-independence / dynamic-class robustness of the #12
// contains() predicates without depending on the extension's own evaluator.
function evaluateQueryCount(query: string): [XPathResult, number] {
  const result = document.evaluate(
    query,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  )
  return [result, result.snapshotLength]
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

  it('counts same-tag siblings by node test regardless of differing classes (#13)', () => {
    // Fixed #13: getElementIndex counts purely by node test (tagName) when
    // called without a predicate matcher, matching XPath `div[n]` position
    // semantics. Here three <div> siblings have classes x / y / x. The bare
    // index therefore numbers them 1, 2, 3 by position - the middle
    // <div class="y"> is NOT skipped as it was under the old
    // tag+class+id "same family" rule.
    setDom('<section><div class="x">1</div><div class="y">2</div><div class="x">3</div></section>')
    const divs = document.querySelectorAll('div')
    expect(getElementIndex(divs[0])).toBe(1)
    expect(getElementIndex(divs[1])).toBe(2)
    expect(getElementIndex(divs[2])).toBe(3)
  })

  it('counts over a predicate-narrowed set when a matcher is supplied (#13)', () => {
    // When makeQueryForElement emits a class/id predicate, getElementIndex is
    // called with a matcher so it counts over EXACTLY the siblings that also
    // satisfy that predicate - because XPath applies the predicate before the
    // position. Here two <div class="x"> straddle a <div class="y">; counting
    // only class="x" siblings makes the third div index 2 within that set.
    setDom('<section><div class="x">1</div><div class="y">2</div><div class="x">3</div></section>')
    const divs = document.querySelectorAll('div')
    const isX = (el: Element) => (el.className || '').split(/\s+/).includes('x')
    expect(getElementIndex(divs[0], isX)).toBe(1)
    expect(getElementIndex(divs[2], isX)).toBe(2)
    // The class="y" div is the lone member of the class="y" set.
    const isY = (el: Element) => (el.className || '').split(/\s+/).includes('y')
    expect(getElementIndex(divs[1], isY)).toBe(0)
  })
})

describe('makeQueryForElement', () => {
  beforeEach(() => {
    // Reset so leftover .xh-highlight classes from prior runs cannot leak.
    document.body.innerHTML = ''
  })

  it('builds a shortest-unique path with id and positional predicate', () => {
    setDom(
      '<div id="root"><ul><li class="item">a</li><li class="item">b</li><li class="item">c</li></ul></div>'
    )
    const secondLi = document.querySelectorAll('li')[1]
    expect(makeQueryForElement(secondLi)).toBe(
      "//li[@class='item'][2]"
    )
  })

  it('emits id predicate for an element carrying an id', () => {
    setDom('<div id="root"><ul></ul></div>')
    expect(makeQueryForElement(document.getElementById('root')!)).toBe(
      "//div[@id='root']"
    )
  })

  it('uses a compact [@class] match for a single class token', () => {
    // Shortest-path priority: a lone class token emits the compact
    // [@class='token'] form rather than the verbose contains() predicate.
    setDom('<div><span class="card">t</span></div>')
    expect(makeQueryForElement(document.querySelector('span')!)).toBe(
      "//span[@class='card']"
    )
  })

  it('uses the shortest structural class token for multiple classes', () => {
    // Multi-class elements use the shortest stable token and a compact
    // contains(@class, ...) predicate instead of concatenating every class.
    setDom('<div><span class="foo bar">t</span></div>')
    expect(makeQueryForElement(document.querySelector('span')!)).toBe(
      "//span[contains(@class,'foo')]"
    )
  })

  it('chooses the shortest structural class and drops volatile state classes', () => {
    setDom('<div><span class="btn active large">t</span></div>')
    expect(makeQueryForElement(document.querySelector('span')!)).toBe(
      "//span[contains(@class,'btn')]"
    )
  })

  it('keeps a short stable class from a real multi-class table cell', () => {
    setDom('<table><tbody><tr><td class="reg-checkin reg-checkin-ok">+$12</td></tr></tbody></table>')
    expect(makeQueryForElement(document.querySelector('td')!)).toBe(
      "//td[contains(@class,'reg-checkin')]"
    )
  })

  it('keeps a field index in list mode when same-tag siblings share the class (issue: two reg-balance columns)', () => {
    // Each row has eleven cells, two of which are `td.reg-balance` (registered
    // balance + current balance). Hovering the current-balance column in list
    // mode must isolate that column with a positional index, otherwise both
    // balance columns highlight.
    const row = '<tr>'
      + '<td class="reg-email">e</td>'
      + '<td class="reg-balance"><span>reg</span></td>'
      + '<td class="reg-balance loading">loading</td>'
      + '<td class="reg-checkin">-</td>'
      + '</tr>'
    setDom(`<table><tbody>${row}${row}${row}</tbody></table>`)
    const secondRowCells = document.querySelectorAll('tr')[1].querySelectorAll('td')
    // Cell index 2 is the current-balance column (second reg-balance).
    expect(makeQueryForElement(secondRowCells[2], true)).toBe(
      "//td[contains(@class,'reg-balance')][2]"
    )
  })

  it('drops the index in list mode for a homogeneous column of buttons', () => {
    const row = '<tr><td><button class="xllm-result-copy">复制</button></td></tr>'
    setDom(`<table><tbody>${row}${row}</tbody></table>`)
    const secondButton = document.querySelectorAll('button.xllm-result-copy')[1]
    expect(makeQueryForElement(secondButton, true)).toBe(
      "//button[@class='xllm-result-copy']"
    )
  })

  it('generates a compact class XPath for repeated copy buttons', () => {
    setDom(
      '<table><tbody>'
      + '<tr><td><button class="xllm-result-copy">复制 Key</button></td></tr>'
      + '<tr><td><button class="xllm-result-copy">复制 Key</button></td></tr>'
      + '</tbody></table>'
    )
    const secondButton = document.querySelectorAll('button.xllm-result-copy')[1]
    expect(makeQueryForElement(secondButton)).toBe(
      "//tr[2]/td/button[@class='xllm-result-copy']"
    )
    expect(makeQueryForElement(secondButton, true)).toBe(
      "//button[@class='xllm-result-copy']"
    )
  })

  it('drops volatile state class tokens so runtime toggles do not break the locator (#12)', () => {
    // Structural token `card` is kept; `active` (state) is excluded. The
    // generated query must still uniquely resolve the element AFTER the state
    // class is removed at runtime.
    setDom('<div><span class="card active">t</span></div>')
    const query = makeQueryForElement(document.querySelector('span')!)
    expect(query).toBe(
      "//span[contains(@class,'card')]"
    )
    setDom('<div><span class="card">t</span></div>')
    const [, count] = evaluateQueryCount(query)
    expect(count).toBe(1)
  })

  it('treats prefixed/suffixed state conventions (is-open, tab-active) as volatile', () => {
    setDom('<div><span class="nav-item is-open tab-active">t</span></div>')
    // Only the structural `nav-item` token survives.
    expect(makeQueryForElement(document.querySelector('span')!)).toBe(
      "//span[contains(@class,'nav-item')]"
    )
  })

  it('keeps the shortest token when every class looks volatile', () => {
    setDom('<div><span class="active hover">t</span></div>')
    expect(makeQueryForElement(document.querySelector('span')!)).toBe(
      "//span[contains(@class,'hover')]"
    )
  })

  it('matches regardless of class attribute token order', () => {
    // The generated predicate for classes derived from "b a" must still locate
    // an element whose class attribute lists them in the opposite order.
    setDom('<div><span class="a b">t</span></div>')
    const query = makeQueryForElement(document.querySelector('span')!)
    // Now change the DOM so the same element has the tokens reordered and
    // padded with extra whitespace; the query must still match it uniquely.
    setDom('<div><span class="  b   a  ">t</span></div>')
    const [, count] = evaluateQueryCount(query)
    expect(count).toBe(1)
  })

  it('is robust to a dynamically added extra class (multi-class base)', () => {
    // A framework adding e.g. `active`/`hover` at runtime must not break the
    // predicate built from the original class list. This robustness applies to
    // multi-class elements, which use the token-based contains() form.
    setDom('<div><span class="foo bar">t</span></div>')
    const query = makeQueryForElement(document.querySelector('span')!)
    setDom('<div><span class="foo bar active hover">t</span></div>')
    const [, count] = evaluateQueryCount(query)
    expect(count).toBe(1)
  })

  it('falls back to a tag-only component when the class is only whitespace', () => {
    // An all-whitespace className trims to no tokens; emit no class predicate
    // rather than a malformed/empty one.
    setDom('<div><span class="   ">t</span></div>')
    expect(makeQueryForElement(document.querySelector('span')!)).toBe(
      '//span'
    )
  })

  it('generates an evaluable namespace-aware XPath for an SVG element with classes (#47)', () => {
    setDom('<div><svg class="icon active"><path d="M0 0"></path></svg></div>')
    const target = document.querySelector('svg')!
    const query = makeQueryForElement(target)

    expect(query).toContain("*[local-name()='svg' and namespace-uri()='http://www.w3.org/2000/svg']")
    expect(query).toContain("contains(@class,'icon')")
    expect(query).not.toContain("' active '")
  })

  it('generates an evaluable XPath for an SVG child without a class attribute (#47)', () => {
    setDom('<div><svg class="icon"><path d="M0 0"></path><path d="M1 1"></path></svg></div>')
    const target = document.querySelectorAll('path')[1]
    const query = makeQueryForElement(target)

    expect(query).toContain("*[local-name()='path' and namespace-uri()='http://www.w3.org/2000/svg'][2]")
  })

  it('appends /@src when the target element is an img', () => {
    setDom('<div><img src="x.png"></div>')
    expect(makeQueryForElement(document.querySelector('img')!)).toBe(
      '//img/@src'
    )
  })

  it('omits positional predicates in batch (列表模式) mode', () => {
    setDom(
      '<div id="root"><ul><li class="item">a</li><li class="item">b</li><li class="item">c</li></ul></div>'
    )
    const secondLi = document.querySelectorAll('li')[1]
    // batch=true suppresses the trailing [index]; the id/class predicates stay.
    expect(makeQueryForElement(secondLi, true)).toBe(
      "//li[@class='item']"
    )
  })

  it('stops early at a uniquely-matching component', () => {
    setDom(
      '<div id="root"><ul><li class="item">a</li><li class="item">b</li></ul><section><p id="uniqp">hi</p></section></div>'
    )
    const p = document.getElementById('uniqp')!
    // The id-bearing <p> is unique document-wide, so the short path collapses to //p[@id='uniqp'].
    expect(makeQueryForElement(p)).toBe("//p[@id='uniqp']")
  })

  it('keeps building a relative path with a position index consistent with XPath (#13)', () => {
    // Fixed #13: the short path for a non-unique class element carries the
    // position index counted over the SAME set the class predicate selects.
    // Here two identical <li class="item"> exist, so the class contains()
    // predicate is not unique and the first li keeps index [1] - which under
    // XPath resolves to exactly the first matching li (asserted behaviorally
    // below).
    setDom(
      '<div id="root"><ul><li class="item">a</li><li class="item">b</li></ul></div>'
    )
    const firstLi = document.querySelectorAll('li')[0]
    expect(makeQueryForElement(firstLi)).toBe(
      "//li[@class='item'][1]"
    )
  })

  it('keeps ordinary semantic ids exact', () => {
    setDom('<div id="root"><span id="user-name-field-123">t</span></div>')
    const span = document.getElementById('user-name-field-123')!
    expect(makeQueryForElement(span)).toBe(
      "//span[@id='user-name-field-123']"
    )
  })

  it('keeps the full id when no shorter unique fragment is available', () => {
    setDom('<div id="root"><span id="ab-cd-ef">t</span></div>')
    const span = document.getElementById('ab-cd-ef')!
    expect(makeQueryForElement(span)).toBe(
      "//span[@id='ab-cd-ef']"
    )
  })

  it('uses a semantic phrase for a dynamic id', () => {
    setDom('<div id="form-registration-9f3a2">target</div>')
    const target = document.querySelector('div')!
    expect(makeQueryForElement(target)).toBe(
      "//div[contains(@id,'form-registration')]"
    )
  })

  it('keeps a static button id intact instead of reducing it to a generic token', () => {
    setDom('<button class="btn btn-sm btn-outline" id="btn-reg-copy-all">复制全部</button>')
    const target = document.querySelector('button')!
    expect(makeQueryForElement(target)).toBe(
      "//button[@id='btn-reg-copy-all']"
    )
  })
})

describe('makeQueryForElement stable attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('prefers data-testid over class as a stable anchor', () => {
    setDom('<div><button class="btn primary" data-testid="submit">Go</button></div>')
    const btn = document.querySelector('button')!
    expect(makeQueryForElement(btn)).toBe(
      "//button[@data-testid='submit']"
    )
  })

  it('uses stable attributes automatically as the shortest unique anchor', () => {
    setDom('<div><button class="btn" data-testid="submit">Go</button></div>')
    const btn = document.querySelector('button')!
    expect(makeQueryForElement(btn)).toBe(
      "//button[@data-testid='submit']"
    )
  })

  it('follows the priority order: name chosen over aria-label/role', () => {
    setDom('<form><input name="email" aria-label="Email" role="textbox"></form>')
    const input = document.querySelector('input')!
    expect(makeQueryForElement(input)).toBe(
      "//input[@name='email']"
    )
  })

  it('falls back to aria-label when higher-priority attributes are absent', () => {
    setDom('<div><span aria-label="Close dialog">x</span></div>')
    const span = document.querySelector('span')!
    expect(makeQueryForElement(span)).toBe(
      "//span[@aria-label='Close dialog']"
    )
  })

  it('skips a non-unique stable attribute in short mode and falls back to class', () => {
    // Two elements share role="tab"; in short mode the role locator is not
    // unique, so it is skipped and class is used instead.
    setDom(
      '<div>'
      + '<button class="one" role="tab">A</button>'
      + '<button class="two" role="tab">B</button>'
      + '</div>'
    )
    const first = document.querySelector('button.one')!
    expect(makeQueryForElement(first)).toBe(
      "//button[@class='one']"
    )
  })

  it('id still takes precedence over stable attributes', () => {
    setDom('<div><span id="uid" data-testid="hook">t</span></div>')
    const span = document.querySelector('span')!
    expect(makeQueryForElement(span)).toBe(
      "//span[@id='uid']"
    )
  })
})

// Behavioral #13 tests: build a synthetic DOM with same-tag / different-class
// siblings, generate the FULL query, evaluate it with the real XPath engine,
// and assert it resolves to EXACTLY the originally-selected node. This proves
// the index+predicate combination is correct under real XPath semantics.
describe('makeQueryForElement #13 behavioral (query resolves to the selected node)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  // Evaluate a query and return the single matched element (or null).
  function resolveOne(query: string): Node | null {
    const [result, count] = evaluateQueryCount(query)
    if (count !== 1) {
      return null
    }
    return result.snapshotItem(0)
  }

  it('resolves to the exact same-tag sibling when siblings have differing classes', () => {
    // The #13 reproduction shape: two <div> with different classes. Selecting
    // the second div must generate a query that resolves to exactly that node.
    setDom('<section><div class="a">1</div><div class="b">2</div></section>')
    const target = document.querySelectorAll('div')[1]
    const query = makeQueryForElement(target)
    expect(resolveOne(query)).toBe(target)
  })

  it('resolves each of three same-tag siblings whose classes are x / y / x', () => {
    setDom('<section><div class="x">1</div><div class="y">2</div><div class="x">3</div></section>')
    const divs = document.querySelectorAll('div')
    for (let i = 0; i < divs.length; i++) {
      const query = makeQueryForElement(divs[i])
      expect(resolveOne(query)).toBe(divs[i])
    }
  })

  it('resolves the correct element among same-class and different-class same-tag siblings', () => {
    // Two <li class="item"> straddle a <li class="other">. XPath applies the
    // class predicate before the position index, so the index must count only
    // the class="item" members. Verify every li resolves back to itself.
    setDom(
      '<ul><li class="item">a</li><li class="other">b</li><li class="item">c</li></ul>'
    )
    const lis = document.querySelectorAll('li')
    for (let i = 0; i < lis.length; i++) {
      const query = makeQueryForElement(lis[i])
      expect(resolveOne(query)).toBe(lis[i])
    }
  })

  it('resolves the target when a multi-class sibling shares one class token', () => {
    // The first div has class "card"; the target shares "card" plus "active".
    // The emitted predicate for the target requires BOTH tokens, so the index
    // is counted over that narrower set (here a single element -> no index).
    setDom(
      '<section><div class="card">1</div><div class="card active">2</div></section>'
    )
    const target = document.querySelectorAll('div')[1]
    const query = makeQueryForElement(target)
    expect(resolveOne(query)).toBe(target)
  })

  it('resolves an id-bearing target unaffected by same-tag class siblings', () => {
    setDom(
      '<section><div class="x">1</div><div id="target">2</div><div class="x">3</div></section>'
    )
    const target = document.getElementById('target')!
    const query = makeQueryForElement(target)
    expect(resolveOne(query)).toBe(target)
  })
})

// Relative XPath generation from a pinned context node (issue #26). When a
// context element is supplied, the walk stops there and emits a `.`-relative
// expression suitable for crawler loops (evaluate against each context node).
describe('makeQueryForElement relative context (#26)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  function resolveOne(query: string, contextNode: Node): Node | null {
    const result = document.evaluate(
      query,
      contextNode,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    )
    if (result.snapshotLength !== 1) return null
    return result.snapshotItem(0)
  }

  it('emits a `.//`-relative path that stops at the context node', () => {
    setDom(
      '<ul><li class="row"><span class="price">9.9</span></li></ul>'
    )
    const context = document.querySelector('li.row')!
    const target = document.querySelector('span.price')!
    const query = makeQueryForElement(target, false, context)
    // The span is unique within the context subtree, so the shortest-unique
    // collapse yields a `.//` relative locator.
    expect(query).toBe(
      ".//span[@class='price']"
    )
    expect(resolveOne(query, context)).toBe(target)
  })

  it('returns "." when the target IS the context node', () => {
    setDom('<div id="ctx"><span>x</span></div>')
    const context = document.getElementById('ctx')!
    expect(makeQueryForElement(context, false, context)).toBe('.')
  })

  it('collapses to `.//component` in short mode when unique within the context', () => {
    setDom(
      '<li class="row"><div><span class="price">9.9</span></div></li>'
    )
    const context = document.querySelector('li.row')!
    const target = document.querySelector('span.price')!
    // The price span is unique within the context subtree, so short mode
    // collapses the intermediate path to `.//`.
    const query = makeQueryForElement(target, false, context)
    expect(query).toBe(
      ".//span[@class='price']"
    )
    expect(resolveOne(query, context)).toBe(target)
  })

  it('relative path resolves correctly against sibling context nodes (crawler loop)', () => {
    // Two structurally identical list rows. A relative expression generated
    // from one row must resolve the analogous element inside EACH row.
    setDom(
      '<ul>' +
        '<li class="row"><span class="price">1</span><a class="link">x</a></li>' +
        '<li class="row"><span class="price">2</span><a class="link">y</a></li>' +
      '</ul>'
    )
    const rows = document.querySelectorAll('li.row')
    const firstLink = rows[0].querySelector('a.link')!
    const query = makeQueryForElement(firstLink, false, rows[0] as Element)
    // Same relative query, evaluated against the SECOND row, resolves its link.
    expect(resolveOne(query, rows[1])).toBe(rows[1].querySelector('a.link'))
  })

  it('falls back to an absolute path when the target is outside the pinned context', () => {
    setDom('<section id="context"><span>inside</span></section><aside><span id="target">outside</span></aside>')
    const context = document.getElementById('context')!
    const target = document.getElementById('target')!
    const query = makeQueryForElement(target, false, context)

    expect(query.startsWith('.')).toBe(false)
    expect(resolveOne(query, document)).toBe(target)
  })

  it('omits positional index under batch mode in relative context', () => {
    setDom(
      '<div class="ctx"><ul><li class="item">a</li><li class="item">b</li></ul></div>'
    )
    const context = document.querySelector('div.ctx')!
    const secondLi = document.querySelectorAll('li')[1]
    const query = makeQueryForElement(secondLi, true, context)
    expect(query).toBe(
      ".//li[@class='item']"
    )
  })
})

describe('structured XPath results', () => {
  beforeEach(() => setDom(''))

  it('returns one normalized preview item per node match (issue #22)', () => {
    setDom('<ul><li> First  item </li><li><strong>Second</strong> item</li></ul>')

    const [value, count, , items] = evaluateQuery('//li')

    expect(value).toBe('First item\nSecond item')
    expect(count).toBe(2)
    expect(items).toEqual([
      { index: 0, preview: 'First item', nodeType: 'element', tagName: 'li' },
      { index: 1, preview: 'Second item', nodeType: 'element', tagName: 'li' },
    ])
  })

  it('keeps empty matches visible in the result list', () => {
    setDom('<div></div>')
    const [, , , items] = evaluateQuery('//div')
    expect(items[0]?.preview).toBe('[EMPTY]')
  })

  it('evaluates a relative query against the pinned context only (#47)', () => {
    setDom(
      '<section class="row"><span class="price">first</span></section>' +
      '<section class="row"><span class="price">second</span></section>'
    )
    const context = document.querySelectorAll('section')[1]

    const [value, count, , items] = evaluateQuery('.//span', context)

    expect(value).toBe('second')
    expect(count).toBe(1)
    expect(items).toHaveLength(1)
  })

  it('focuses a relative result inside the pinned context (#47)', () => {
    setDom(
      '<section><span>first</span></section>' +
      '<section><span>second</span></section>'
    )
    const context = document.querySelectorAll('section')[1]
    const target = context.querySelector('span')!
    target.scrollIntoView = vi.fn()

    expect(focusQueryResult('.//span', 0, context)).toBe(true)
    expect(target.classList.contains('xh-highlight')).toBe(true)
    expect(document.querySelector('section span')?.classList.contains('xh-highlight')).toBe(false)
  })

  it('focuses and scrolls the selected element into view', () => {
    setDom('<p>first</p><p>second</p>')
    const target = document.querySelectorAll('p')[1]
    const scrollIntoView = vi.fn()
    target.scrollIntoView = scrollIntoView

    expect(focusQueryResult('//p', 1)).toBe(true)
    expect(target.classList.contains('xh-highlight')).toBe(true)
    expect(document.querySelectorAll('.xh-highlight')).toHaveLength(1)
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })
  })

  it('focuses an attribute result through its owner element', () => {
    setDom('<a href="/docs">docs</a>')
    const target = document.querySelector('a')!
    target.scrollIntoView = vi.fn()

    expect(focusQueryResult('//a/@href', 0)).toBe(true)
    expect(target.classList.contains('xh-highlight')).toBe(true)
  })

  it('does not change highlights for an out-of-range result', () => {
    setDom('<p class="xh-highlight">first</p>')
    expect(focusQueryResult('//p', 2)).toBe(false)
    expect(document.querySelector('p')?.classList.contains('xh-highlight')).toBe(true)
  })
})

describe('collectAttributeNames', () => {
  beforeEach(() => setDom(''))

  it('returns the sorted, de-duplicated union of attribute names (issue #24)', () => {
    setDom(
      '<a href="/x" class="link" data-id="1">x</a>' +
      '<img src="/i.png" class="thumb" srcset="/i2.png 2x">'
    )
    const els = Array.from(document.querySelectorAll('a, img'))
    expect(collectAttributeNames(els)).toEqual([
      'class',
      'data-id',
      'href',
      'src',
      'srcset',
    ])
  })

  it('returns an empty list when no element carries attributes', () => {
    setDom('<span>plain</span>')
    const els = Array.from(document.querySelectorAll('span'))
    expect(collectAttributeNames(els)).toEqual([])
  })

  it('returns an empty list for an empty node set', () => {
    expect(collectAttributeNames([])).toEqual([])
  })
})
