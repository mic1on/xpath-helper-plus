import type { XPathEvaluationResponse, XPathResultItem } from './types/messages'

// A sibling matcher decides whether a same-tag sibling belongs to the SAME set
// that the emitted component predicate selects. XPath applies a predicate
// BEFORE the positional index, so `tag[predicate][n]` means "the n-th element
// among the tag siblings that ALSO satisfy `predicate`", NOT the n-th tag
// overall. To keep the position index consistent with real XPath evaluation
// (issue #13), getElementIndex counts over exactly that predicate-narrowed set.
type SiblingMatcher = (siblingEl: Element) => boolean;

const getElementIndex = (el: Element, matches?: SiblingMatcher) => {
    // A sibling is in the counted set when it shares the node test (tagName) and
    // - when a predicate is emitted for this component - also satisfies that
    // predicate. With no predicate (bare `tag` component), we count purely by
    // tagName, matching XPath `tag[n]` position semantics.
    const inSameSet = (sib: Element) =>
        sib.tagName === el.tagName && (!matches || matches(sib));
    let index = 1;  // XPath is one-indexed
    let sib: any;
    for (sib = el.previousSibling; sib; sib = sib.previousSibling) {
        if (sib.nodeType === Node.ELEMENT_NODE && inSameSet(sib)) {
            index++;
        }
    }
    if (index > 1) {
        return index;
    }
    for (sib = el.nextSibling; sib; sib = sib.nextSibling) {
        if (sib.nodeType === Node.ELEMENT_NODE && inSameSet(sib)) {
            return 1;
        }
    }
    return 0;
};

const escapeXPathString = (value: string) => {
    if (!value.includes('\'')) {
        return '\'' + value + '\'';
    }
    if (!value.includes('"')) {
        return '"' + value + '"';
    }

    return 'concat(' + value.split('\'').map(part => '\'' + part + '\'').join(', "\'", ') + ')';
};

const countXPathMatches = (query: string, contextNode?: Node) => {
    try {
        const nodes = document.evaluate(
            query,
            contextNode ?? document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        return nodes.snapshotLength;
    } catch (e) {
        console.log(e);
        return 0;
    }
};

const getIdContainsCandidates = (id: string) => {
    const tokens = id
        .split(/[\s_\-:.]+/)
        .map(token => token.trim())
        .filter(token => token.length >= 3);

    return Array.from(new Set([...tokens, id]))
        .sort((a, b) => a.length - b.length);
};

// Stable, semantic attributes preferred for locating an element when it has no
// usable id. These are the attributes crawler/automation authors rely on
// because frameworks keep them stable across renders, unlike hashed class
// names or positional indices. Ordered by preference: test hooks first, then
// form identity, then accessibility semantics.
const STABLE_ATTRIBUTES = [
    'data-testid',
    'data-test',
    'data-qa',
    'data-cy',
    'name',
    'aria-label',
    'role',
];

// Build a `tag[@attr='value']` component from the first stable attribute that
// is present, non-empty, and uniquely identifies the element document-wide.
// Returns null when no stable attribute qualifies, so the caller can fall back
// to class/positional logic. Stable-attribute anchoring only collapses the
// path when it yields a globally unique locator, matching the shortest-unique
// goal.
const makeStableAttrComponent = (
    nodeTest: string,
    el: Element,
): string | null => {
    for (const attr of STABLE_ATTRIBUTES) {
        const value = el.getAttribute(attr);
        if (value === null || value.trim() === '') continue;
        const component = nodeTest + '[@' + attr + '=' + escapeXPathString(value) + ']';
        if (countXPathMatches('//' + component) === 1) {
            return component;
        }
    }
    return null;
};

// Frameworks often append a hash or generated number to an otherwise semantic
// id. Keep ordinary semantic ids exact, because reducing `btn-reg-copy-all` to
// `contains(@id, 'copy')` throws away useful identity and becomes fragile when
// another copy control is added later.
const isDynamicIdToken = (token: string): boolean => {
    return /^[a-f\d]{8,}$/i.test(token)
        || /^(?=.*[a-z])(?=.*\d)[a-z\d]{5,}$/i.test(token)
        || /^\d{6,}$/.test(token);
};

const getDynamicIdCandidates = (id: string): string[] => {
    const tokens = id
        .split(/[\s_\-:.]+/)
        .map(token => token.trim())
        .filter(Boolean);
    const candidates: string[] = [];
    let stableRun: string[] = [];

    const flush = () => {
        if (stableRun.length > 0) {
            candidates.push(stableRun.join('-'));
            stableRun = [];
        }
    };

    for (const token of tokens) {
        if (isDynamicIdToken(token)) flush();
        else stableRun.push(token);
    }
    flush();

    return Array.from(new Set(candidates))
        // Prefer a semantic phrase such as `btn-reg-copy-all` or
        // `form-registration` over a generic one-word fragment such as `copy`.
        .sort((left, right) => right.length - left.length);
};

// Emit an id component. Ordinary ids stay exact and readable. For ids that
// contain an obvious generated fragment, use the longest unique stable phrase
// around that fragment so the locator remains useful after regeneration.
const makeIdComponent = (tagName: string, id: string) => {
    const exact = tagName + '[@id=' + escapeXPathString(id) + ']';
    if (!id.split(/[\s_\-:.]+/).some(isDynamicIdToken)) {
        return exact;
    }

    const uniqueContains = getDynamicIdCandidates(id)
        .map(candidate => tagName + '[contains(@id,' + escapeXPathString(candidate) + ')]')
        .find(component => countXPathMatches('//' + component) === 1);

    return uniqueContains ?? exact;
};

// Volatile / stateful class tokens that frameworks add and remove at runtime
// (interaction, visibility, and validation state). Matching on these makes a
// generated XPath brittle: toggling `active`/`hover`/`open` off would drop the
// locator even though it is structurally the same element (#12, scenario 2).
// We therefore exclude them from the emitted predicate when structural tokens
// remain. Prefix-based state conventions (is-*, has-*, *-active, etc.) are
// handled separately in isVolatileClass.
const VOLATILE_CLASS_TOKENS = new Set([
    'active', 'hover', 'focus', 'focused', 'focus-visible', 'focus-within',
    'selected', 'checked', 'current', 'open', 'opened', 'close', 'closed',
    'show', 'shown', 'showing', 'hide', 'hidden', 'collapsed', 'expanded',
    'visible', 'invisible', 'disabled', 'enabled', 'loading', 'loaded',
    'pending', 'busy', 'dragging', 'dragover', 'draggable', 'pressed',
    'highlight', 'highlighted', 'error', 'success', 'warning', 'invalid',
    'valid', 'dirty', 'pristine', 'touched', 'untouched', 'readonly',
    'sticky', 'fixed', 'scrolled', 'in', 'out', 'fade', 'fade-in', 'fade-out',
    'entering', 'entered', 'leaving', 'left', 'transitioning', 'animating',
]);

const isVolatileClass = (token: string) => {
    const lower = token.toLowerCase();
    if (VOLATILE_CLASS_TOKENS.has(lower)) {
        return true;
    }
    // Common BEM/utility state conventions: is-open, has-error, js-active,
    // ng-*/v-* framework state modifiers, and *-active / *-enter / *-leave
    // transition suffixes (Vue/React transition groups).
    if (/^(is|has|js|ng|v)-/.test(lower)) {
        return true;
    }
    if (/-(active|hover|focus|selected|open|show|hidden|disabled|loading|enter|leave|entering|leaving|error|success)$/.test(lower)) {
        return true;
    }
    return false;
};

const makeClassComponent = (nodeTest: string, className: string) => {
    const tokens = className.split(/\s+/).filter(token => token.length > 0);
    if (tokens.length === 0) {
        // className was only whitespace: fall back to tag-only component.
        return nodeTest;
    }
    // Prefer structural (non-volatile) tokens so that runtime state classes do
    // not make the locator brittle. When several structural tokens remain,
    // choose the shortest one: a short XPath should use the smallest sufficient
    // class signal rather than concatenate every class into a long predicate.
    const structural = tokens.filter(token => !isVolatileClass(token));
    const candidates = structural.length > 0 ? structural : tokens;
    const token = candidates
        .slice()
        .sort((left, right) => left.length - right.length)[0];

    // A lone class can use an exact match. For multiple classes, use a
    // whitespace-normalized word-boundary contains() rather than a bare
    // substring contains(): a bare `contains(@class,'col')` also matches
    // `class="column-x"`, which silently over-matches sibling elements. In
    // single mode the shortest-unique collapse and positional index usually
    // hide this, but list mode returns the leaf locator directly (see
    // makeQueryForElement's batch early-return), so an over-matching predicate
    // would expand the matched set beyond the intended nodes (#51/#52). The
    // word-boundary form keeps the locator compact while matching the token as
    // a whole class name only.
    if (tokens.length === 1) {
        return nodeTest + '[@class=' + escapeXPathString(token) + ']';
    }
    return nodeTest
        + '[contains(concat(\' \', normalize-space(@class), \' \'), '
        + escapeXPathString(' ' + token + ' ') + ')]';
};

// Whether an element satisfies the full component predicate, evaluated by the
// real XPath engine relative to that element (self::component). This lets
// getElementIndex count over EXACTLY the set the emitted predicate selects,
// keeping `tag[predicate][index]` consistent with XPath evaluation order (#13).
const matchesComponent = (el: Element, component: string) => {
    try {
        const result = document.evaluate(
            'boolean(self::' + component + ')',
            el,
            null,
            XPathResult.BOOLEAN_TYPE,
            null
        );
        return result.booleanValue;
    } catch (e) {
        console.log(e);
        return false;
    }
};

// Whether EVERY same-tag sibling of `el` also satisfies the component
// predicate. This distinguishes a homogeneous list (all `li.item` in a `ul`,
// or one copy button per row) from heterogeneous same-tag siblings inside one
// parent (a `td.reg-balance` column sitting next to other non-balance `td`s,
// or two `td.reg-balance` columns among eleven cells). List mode drops the
// positional index only when every same-tag sibling matches; otherwise it keeps
// the index so the locator isolates the hovered field instead of also matching
// the neighbouring column.
const allSameTagSiblingsMatch = (el: Element, component: string): boolean => {
    const parent = el.parentNode;
    if (!(parent instanceof Element)) return true;
    for (let sib = parent.firstElementChild; sib; sib = sib.nextElementSibling) {
        if (sib.tagName !== el.tagName) continue;
        if (!matchesComponent(sib, component)) return false;
    }
    return true;
};

const getNodeTest = (el: Element): string => {
    const tagName = el.localName.toLowerCase();
    return el.namespaceURI === 'http://www.w3.org/2000/svg'
        ? `*[local-name()=${escapeXPathString(tagName)} and namespace-uri()=${escapeXPathString(el.namespaceURI)}]`
        : tagName;
};

const makeQueryForElement = (
    el: Element | null,
    // Batch / list mode: when true, positional `[index]` predicates are omitted
    // so the expression matches an entire set of sibling rows rather than a
    // single element. This is the only user-facing generation option; every
    // other strategy (shortest-unique anchoring, id-contains fallback, stable
    // attributes, single-class simplification) is always applied because the
    // whole point of the tool is to produce the shortest reliable XPath.
    batch: boolean = false,
    // A pinned context element (issue #26). When provided and the walk reaches
    // it, generation stops and the path is emitted RELATIVE to the context: it
    // starts with `.` (e.g. `./div[2]/span[1]`) or a `.//...` collapse when a
    // component is unique within the context (e.g. `.//span[...]`). In list
    // mode, the shortest matching component is returned relative to context.
    // This is what crawler loops want: an expression evaluated against each
    // context node rather than from the document root.
    contextEl: Element | null = null
) => {
    if (contextEl && el && el !== contextEl && !contextEl.contains(el)) {
        contextEl = null;
    }
    let query = '';
    for (; el; el = el.parentNode instanceof Element ? el.parentNode : null) {
        // Reached the pinned context node: everything accumulated so far is the
        // path relative to it. Prefix `.` so the query starts at the context
        // (issue #26) and stop climbing toward the document root.
        if (contextEl && el === contextEl) {
            return '.' + query;
        }
        el.classList.remove('xh-highlight')
        const nodeTest = getNodeTest(el);
        let component = nodeTest;
        if (el.id) {
            component = makeIdComponent(nodeTest, el.id);
        } else {
            // Stable attributes take precedence over class since a semantic
            // attribute is a stronger, shorter anchor than a class token set.
            const stableComponent = makeStableAttrComponent(nodeTest, el);
            if (stableComponent) {
                component = stableComponent;
            } else {
                const className = el.getAttribute('class') ?? '';
                if (className) {
                    component = makeClassComponent(nodeTest, className);
                }
            }
        }
        // Count the position index over EXACTLY the set the emitted predicate
        // selects, so `tag[predicate][index]` resolves to this element under
        // real XPath semantics (a predicate is applied BEFORE the position, so
        // a pure-tag index would be wrong once a class/id predicate is present,
        // #13). matchesComponent re-uses the real XPath engine for parity.
        const predicated = component !== nodeTest;
        const index = getElementIndex(
            el,
            predicated ? (sib: Element) => matchesComponent(sib, component) : undefined
        );
        // Decide whether to keep the positional index. Single mode always keeps
        // it. List mode drops it only when every same-tag sibling matches the
        // predicate (a homogeneous list such as one copy button per row, or all
        // `li.item` in a `ul`). When only some same-tag siblings match, those
        // matches are distinct fields (e.g. two `td.reg-balance` columns among
        // eleven cells), so the index is kept to isolate the hovered field
        // rather than highlighting both columns.
        const dropIndexForBatch = batch && allSameTagSiblingsMatch(el, component);
        if (index >= 1 && !dropIndexForBatch) {
            component += '[' + index + ']';
        }
        // List mode returns the shortest locator for the whole matching set
        // rather than forcing uniqueness for one hovered node. When the leaf
        // predicate homogeneously matches all siblings it stays index-free
        // (`//button[@class='xllm-result-copy']`); when it isolates one field
        // among heterogeneous siblings it keeps the field index
        // (`//td[contains(@class,'reg-balance')][2]`).
        if (batch && component !== nodeTest) {
            if (contextEl) {
                return './/' + component + query;
            }
            return '//' + component + query;
        }
        // If the target element itself is an img, the user most likely wants
        // its src, so append /@src before attempting the shortest-unique
        // collapse (this keeps `//img/@src` rather than a bare `//img`).
        if (query === '' && el.tagName.toLowerCase() === 'img') {
            component += '/@src';
        }
        try {
            // Always attempt the shortest-unique collapse: if a single component
            // uniquely identifies the element (within the pinned context, or
            // globally), stop climbing and emit the compact `//`/`.//` form.
            if (contextEl) {
                if (countXPathMatches('.//' + component, contextEl) === 1) {
                    return './/' + component + query;
                }
            } else if (countXPathMatches('//' + component) === 1) {
                query = '//' + component + query;
                break
            }
        } catch (e) {
            // If the query is invalid, just return the component.
            console.log(e)
        }
        query = '/' + component + query;
    }
    return query;
};
const highlight = (els: Element | Element[]) => {
    Array.isArray(els) ? els.forEach(el => el.classList.add('xh-highlight')) : els.classList.add('xh-highlight');
};

const clearHighlights = () => {
    const els = document.querySelectorAll('.xh-highlight');
    els.forEach(el => el.classList.remove('xh-highlight'));
};

// Collect the union of attribute names present on the matched element nodes,
// sorted and de-duplicated. This powers the result area's "append extraction"
// helper (issue #24): the Side Panel renders one button per real attribute so
// crawler developers can append `/@data-id`, `/@class`, etc. in a single click.
// Only element nodes carry attributes; text/attribute result nodes contribute
// none, and the extension's own transient highlight class is not filtered here
// because attributes (not class values) are what we enumerate.
const collectAttributeNames = (els: Element[]): string[] => {
    const names = new Set<string>();
    for (const el of els) {
        const attrs = el.attributes;
        if (!attrs) continue;
        for (let i = 0; i < attrs.length; i++) {
            const name = attrs[i]?.name;
            if (name) {
                names.add(name);
            }
        }
    }
    return Array.from(names).sort();
};

const getNodePreview = (node: Node): string => {
    const rawValue = node.nodeType === Node.ATTRIBUTE_NODE
        ? (node as Attr).value
        : node.textContent ?? '';
    const normalized = rawValue.replace(/\s+/g, ' ').trim();
    return normalized || '[EMPTY]';
};

const getResultItem = (node: Node, index: number): XPathResultItem => {
    if (node.nodeType === Node.ELEMENT_NODE) {
        return {
            index,
            preview: getNodePreview(node),
            nodeType: 'element',
            tagName: (node as Element).tagName.toLowerCase(),
        };
    }
    if (node.nodeType === Node.ATTRIBUTE_NODE) {
        return { index, preview: getNodePreview(node), nodeType: 'attribute' };
    }
    if (node.nodeType === Node.TEXT_NODE) {
        return { index, preview: getNodePreview(node), nodeType: 'text' };
    }
    return { index, preview: getNodePreview(node), nodeType: 'other' };
};

const evalNodeValue = (xpathResult: XPathResult): XPathEvaluationResponse => {
    let str = '';
    let nodeCount = 0;
    const toHighlight: Element[] = [];
    const items: XPathResultItem[] = [];
    if (xpathResult.resultType === XPathResult.BOOLEAN_TYPE) {
        str = xpathResult.booleanValue ? '1' : '0';
        nodeCount = 1;
    } else if (xpathResult.resultType === XPathResult.NUMBER_TYPE) {
        str = xpathResult.numberValue.toString();
        nodeCount = 1;
    } else if (xpathResult.resultType === XPathResult.STRING_TYPE) {
        str = xpathResult.stringValue;
        nodeCount = 1;
    } else if (xpathResult.resultType ===
        XPathResult.UNORDERED_NODE_ITERATOR_TYPE) {
        for (let node = xpathResult.iterateNext(); node;
            node = xpathResult.iterateNext()) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                toHighlight.push(<Element>node);
            }
            const item = getResultItem(node, nodeCount);
            items.push(item);
            if (str) {
                str += '\n';
            }
            str += item.preview;
            nodeCount++;
        }
        if (nodeCount === 0) {
            str = '[NULL]';
        }
    } else {
        // Since we pass XPathResult.ANY_TYPE to document.evaluate(), we should
        // never get back a result type not handled above.
        str = '[INTERNAL ERROR]';
        nodeCount = 0;
    }

    highlight(toHighlight);
    return [str, nodeCount, collectAttributeNames(toHighlight), items];
}

const focusQueryResult = (query: string, index: number, contextNode: Node = document): boolean => {
    let xpathResult: XPathResult;
    try {
        xpathResult = document.evaluate(
            query,
            contextNode,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
    } catch {
        return false;
    }

    const node = xpathResult.snapshotItem(index);
    let el: Element | null = null;
    if (node?.nodeType === Node.ELEMENT_NODE) {
        el = node as Element;
    } else if (node?.nodeType === Node.ATTRIBUTE_NODE) {
        el = (node as Attr).ownerElement;
    } else {
        el = node?.parentElement ?? null;
    }
    if (!el) return false;

    clearHighlights();
    highlight(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    return true;
};

const evaluateQuery = (query: string, contextNode: Node = document): XPathEvaluationResponse => {
    let xpathResult = null;
    let str = '';
    let nodeCount = 0;

    try {
        xpathResult = document.evaluate(query, contextNode, null,
            XPathResult.ANY_TYPE, null);
    } catch {
        str = '[INVALID XPATH EXPRESSION]';
        nodeCount = 0;
    }

    if (!xpathResult) {
        return [str, nodeCount, [], []];
    }

    return evalNodeValue(xpathResult);
};

export {
    highlight,
    clearHighlights,
    evaluateQuery,
    focusQueryResult,
    makeQueryForElement,
    // Pure helpers exported for unit testing (behavior-preserving; no runtime
    // change to the extension, which imports only the functions above).
    escapeXPathString,
    getIdContainsCandidates,
    STABLE_ATTRIBUTES,
    getElementIndex,
    collectAttributeNames,
    getNodePreview,
}
