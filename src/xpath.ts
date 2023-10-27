const elementsShareFamily = (primaryEl: Element, siblingEl: Element) => {
    const p = primaryEl, s = siblingEl;
    return (p.tagName === s.tagName &&
        (!p.className || p.className === s.className) &&
        (!p.id || p.id === s.id));
};
const getElementIndex = (el: Element) => {
    let index = 1;  // XPath is one-indexed
    let sib: any;
    for (sib = el.previousSibling; sib; sib = sib.previousSibling) {
        if (sib.nodeType === Node.ELEMENT_NODE && elementsShareFamily(el, sib)) {
            index++;
        }
    }
    if (index > 1) {
        return index;
    }
    for (sib = el.nextSibling; sib; sib = sib.nextSibling) {
        if (sib.nodeType === Node.ELEMENT_NODE && elementsShareFamily(el, sib)) {
            return 1;
        }
    }
    return 0;
};
const makeQueryForElement = (el: any, toShort: boolean = false, batch: boolean = false) => {
    let query = '';
    for (; el && el.nodeType === Node.ELEMENT_NODE; el = el.parentNode) {
        el.classList.remove('xh-highlight')
        let component = el.tagName.toLowerCase();
        const index = getElementIndex(el);
        if (el.id) {
            component += '[@id=\'' + el.id + '\']';
        } else if (el.className) {
            component += '[@class=\'' + el.className + '\']';
        }
        if (!batch && index >= 1) {
            component += '[' + index + ']';
        }
        try {
            const nodes = document.evaluate("//" + component, document, null, XPathResult.ANY_TYPE, null)
            const res = evalNodeValue(nodes);
            if (toShort && res[1] === 1) {
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
    makeQueryForElement
}
