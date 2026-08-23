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

const countXPathMatches = (query: string) => {
    try {
        const nodes = document.evaluate(query, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
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
    const predicate = tokens
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
    containsId: boolean = false
) => {
    let query = '';
    for (; el && el.nodeType === Node.ELEMENT_NODE; el = el.parentNode) {
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
            if (toShort && countXPathMatches('//' + component) === 1) {
                query = '//' + component + query;
                break
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
const evalNodeValue = (xpathResult: XPathResult) => {
    let str = '';
    let nodeCount = 0;
    const toHighlight: Element[] = [];
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
            if (str) {
                str += '\n';
            }
            str += node.textContent;
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
    return [str, nodeCount];
}
const evaluateQuery = (query: string) => {
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
        return [str, nodeCount];
    }

    return evalNodeValue(xpathResult);
};

export {
    highlight,
    clearHighlights,
    evaluateQuery,
    makeQueryForElement,
    // Pure helpers exported for unit testing (behavior-preserving; no runtime
    // change to the extension, which imports only the functions above).
    escapeXPathString,
    getIdContainsCandidates,
    getElementIndex
}
