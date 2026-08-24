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

const makeIdComponent = (tagName: string, id: string, useContainsId: boolean) => {
    if (!useContainsId) {
        return tagName + '[@id=' + escapeXPathString(id) + ']';
    }

    const uniqueContains = getIdContainsCandidates(id)
        .map(candidate => tagName + '[contains(@id,' + escapeXPathString(candidate) + ')]')
        .find(component => countXPathMatches('//' + component) === 1);

    return uniqueContains ?? tagName + '[@id=' + escapeXPathString(id) + ']';
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

const makeClassComponent = (tagName: string, className: string) => {
    // Build a robust, order- and whitespace-independent class predicate: one
    // whitespace-normalized contains() per class token, combined with `and`.
    // This tolerates framework class reordering and dynamically added/removed
    // classes, unlike the fragile full-string [@class='...'] match (#12).
    const tokens = className.split(/\s+/).filter(token => token.length > 0);
    if (tokens.length === 0) {
        // className was only whitespace: fall back to tag-only component.
        return tagName;
    }
    // Prefer structural (non-volatile) tokens so that toggling a runtime state
    // class (active/hover/open/...) does not break the locator (#12, scenario
    // 2). Only when every token looks volatile do we keep them all, since a
    // predicate is still better than a bare tag for narrowing.
    const structural = tokens.filter(token => !isVolatileClass(token));
    const chosen = structural.length > 0 ? structural : tokens;
    const predicate = chosen
        .map(token => "contains(concat(' ', normalize-space(@class), ' '), "
            + escapeXPathString(' ' + token + ' ') + ')')
        .join(' and ');
    return tagName + '[' + predicate + ']';
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

const makeQueryForElement = (
    el: any,
    toShort: boolean = false,
    batch: boolean = false,
    containsId: boolean = false,
    // A pinned context element (issue #26). When provided and the walk reaches
    // it, generation stops and the path is emitted RELATIVE to the context: it
    // starts with `.` (e.g. `./div[2]/span[1]`) or, in short mode, `.//...`
    // when a component is unique within the context (e.g. `.//span[...]`). This
    // is what crawler loops want: an expression evaluated against each context
    // node rather than from the document root.
    contextEl: Element | null = null
) => {
    let query = '';
    for (; el && el.nodeType === Node.ELEMENT_NODE; el = el.parentNode) {
        // Reached the pinned context node: everything accumulated so far is the
        // path relative to it. Prefix `.` so the query starts at the context
        // (issue #26) and stop climbing toward the document root.
        if (contextEl && el === contextEl) {
            return '.' + query;
        }
        el.classList.remove('xh-highlight')
        let component = el.tagName.toLowerCase();
        if (el.id) {
            component = makeIdComponent(component, el.id, toShort && containsId);
        } else if (el.className) {
            component = makeClassComponent(component, el.className);
        }
        // Count the position index over EXACTLY the set the emitted predicate
        // selects, so `tag[predicate][index]` resolves to this element under
        // real XPath semantics (a predicate is applied BEFORE the position, so
        // a pure-tag index would be wrong once a class/id predicate is present,
        // #13). matchesComponent re-uses the real XPath engine for parity.
        const predicated = component !== el.tagName.toLowerCase();
        const index = getElementIndex(
            el,
            predicated ? (sib: Element) => matchesComponent(sib, component) : undefined
        );
        if (!batch && index >= 1) {
            component += '[' + index + ']';
        }
        try {
            if (toShort) {
                // In relative mode a component is "short-able" when it is unique
                // among the context's descendants, so we can collapse the path
                // to `.//component`. Otherwise fall back to global uniqueness.
                if (contextEl) {
                    if (countXPathMatches('.//' + component, contextEl) === 1) {
                        return './/' + component + query;
                    }
                } else if (countXPathMatches('//' + component) === 1) {
                    query = '//' + component + query;
                    break
                }
            }
        } catch (e) {
            // If the query is invalid, just return the component.
            console.log(e)
        }
        // If the last tag is an img, the user probably wants img/@src.
        if (query === '' && el.tagName.toLowerCase() === 'img') {
            component += '/@src';
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
// helper (issue #24): the popup renders one button per real attribute so
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

const focusQueryResult = (query: string, index: number): boolean => {
    let xpathResult: XPathResult;
    try {
        xpathResult = document.evaluate(
            query,
            document,
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

const evaluateQuery = (query: string): XPathEvaluationResponse => {
    let xpathResult = null;
    let str = '';
    let nodeCount = 0;

    try {
        xpathResult = document.evaluate(query, document, null,
            XPathResult.ANY_TYPE, null);
    } catch (e) {
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
    getElementIndex,
    collectAttributeNames,
    getNodePreview,
}
