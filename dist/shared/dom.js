import { _scope, _injector } from '../injection-tokens.js';
import { isInstanceOf, isArray, arrayFrom, isDefined, hasOwn, assign, isString, isObject } from './utils.js';
import { NodeType } from './node.js';

/**
 * Key for storing isolate scope data attached to an element.
 */
const ISOLATE_SCOPE_KEY = "$isolateScope";
const ANIMATION_RUNNER_STORAGE_KEY = "$$animationRunner";
const FUTURE_PARENT_ELEMENT_KEY = "$$futureParentElement";
const NG_ANIMATE_ATTR_NAME = "data-ng-animate";
let expandoCache = new WeakMap();
let cacheSize = 0;
const Cache = {
    get size() {
        return cacheSize;
    },
    clear() {
        expandoCache = new WeakMap();
        cacheSize = 0;
    },
};
/**
 * Key for storing scope data attached to an element.
 */
const SCOPE_KEY = _scope;
const DASH_LOWERCASE_REGEXP = /-([a-z])/g;
const UNDERSCORE_LOWERCASE_REGEXP = /_([a-z])/g;
/**
 * HTML attributes whose presence alone represents a truthy value.
 */
const BOOLEAN_ATTR = [
    "multiple",
    "selected",
    "checked",
    "disabled",
    "readonly",
    "required",
    "open",
];
const BOOLEAN_ATTR_SET = new Set(BOOLEAN_ATTR);
/** Element names that support HTML boolean attributes. */
const BOOLEAN_ELEMENTS = [
    "INPUT",
    "SELECT",
    "OPTION",
    "TEXTAREA",
    "BUTTON",
    "FORM",
    "DETAILS",
];
const BOOLEAN_ELEMENTS_SET = new Set(BOOLEAN_ELEMENTS);
///////////////////////////////////////////////////////////////////
////////////        HELPER FUNCTIONS      /////////////////////////
///////////////////////////////////////////////////////////////////
function fnCamelCaseReplace(_all, letter) {
    return letter.toUpperCase();
}
/**
 * Converts kebab-case to camelCase.
 * @param name - Name to normalize.
 * @returns The camel-cased name.
 */
function kebabToCamel(name) {
    return name.replace(DASH_LOWERCASE_REGEXP, fnCamelCaseReplace);
}
/**
 * Converts snake_case to camelCase.
 *
 * @param name - Name to normalize.
 * @returns The camel-cased name.
 */
function snakeToCamel(name) {
    return name.replace(UNDERSCORE_LOWERCASE_REGEXP, fnCamelCaseReplace);
}
function createDocumentFragment() {
    return document.createDocumentFragment();
}
/**
 * Removes expando-backed data from an element.
 *
 * @param element - The element whose stored data should be updated.
 * @param [name] - Optional data key to remove. When omitted, all stored expando data is cleared.
 */
function removeElementData(element, name) {
    const expandoStore = expandoCache.get(element);
    if (expandoStore) {
        if (name) {
            delete expandoStore[name];
        }
        else {
            for (const key in expandoStore) {
                if (hasOwn(expandoStore, key)) {
                    delete expandoStore[key];
                }
            }
        }
        removeIfEmptyData(element);
    }
}
/**
 * Stores data associated with an element inside the expando property of the DOM element.
 *
 * @param element - The element whose expando store should be read or created.
 * @param createIfNecessary - When `true`, creates the expando store if it does not exist.
 * @returns The existing or newly created expando store, or `undefined` when none exists and creation is disabled.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Expando MDN Glossary: Expando}
 */
function getExpando(element, createIfNecessary = false) {
    let expandoStore = expandoCache.get(element);
    if (createIfNecessary && !expandoStore) {
        expandoStore = {};
        expandoCache.set(element, expandoStore);
        cacheSize++;
    }
    return expandoStore;
}
/**
 * Checks if the string contains HTML tags or entities.
 * @returns `true` when the string is plain text, otherwise `false`.
 */
function isTextNode(html) {
    return !/<|&#?\w+;/.test(html);
}
/** Returns `true` when a node can hold expando-backed cache data. */
function elementAcceptsData(node) {
    // The window object can accept data but has no nodeType
    // Otherwise we are only interested in elements (1) and documents (9)
    switch (node.nodeType) {
        case NodeType._ELEMENT_NODE:
        case NodeType._DOCUMENT_NODE:
        case NodeType._COMMENT_NODE:
        case undefined: // window.object
            return true;
        default:
            return false;
    }
}
/** Deallocates cached data for an element and its descendant tree. */
function dealoc(element, onlyDescendants = false) {
    if (!element ||
        typeof element !== "object" ||
        isInstanceOf(element, Comment)) {
        return;
    }
    if (isArray(element) ||
        isInstanceOf(element, NodeList) ||
        isInstanceOf(element, HTMLCollection)) {
        const nodes = arrayFrom(element);
        for (let i = 0; i < nodes.length; i++) {
            dealoc(nodes[i], onlyDescendants);
        }
        return;
    }
    else {
        const singleNode = element;
        const domElement = singleNode.nodeType === NodeType._DOCUMENT_NODE
            ? singleNode.documentElement
            : singleNode;
        if (!domElement)
            return;
        const acceptsData = elementAcceptsData(domElement);
        if (!onlyDescendants && acceptsData) {
            cleanSingleElementData(domElement);
        }
        if (acceptsData) {
            cleanElementData(domElement.querySelectorAll("*"));
        }
    }
    const singleNode = element;
    if (singleNode.nodeType !== NodeType._DOCUMENT_NODE &&
        "innerHTML" in element) {
        element.innerHTML = "";
    }
}
/**
 * Removes an element's expando bookkeeping when no cached data remains.
 *
 * @param element - The element whose expando store should be cleaned up.
 */
function removeIfEmptyData(element) {
    const expandoStore = expandoCache.get(element);
    if (!expandoStore) {
        return;
    }
    for (const key in expandoStore) {
        if (hasOwn(expandoStore, key)) {
            return;
        }
    }
    expandoCache.delete(element);
    cacheSize--;
}
/**
 * Gets or sets cache data for a given element.
 *
 * @param element - The DOM element to get or set data on.
 * @param key - The key to get/set or an object for mass-setting.
 * @param [value] - The value to set. If not provided, the function acts as a getter.
 * @returns The stored value for keyed reads, the full expando data object for mass reads, or `undefined`.
 */
function getOrSetCacheData(element, key, value) {
    if (!elementAcceptsData(element))
        return undefined;
    const isSimpleSetter = isDefined(value);
    const isSimpleGetter = !isSimpleSetter && key && !isObject(key);
    const massGetter = !key;
    const expandoStore = getExpando(element, !isSimpleGetter);
    if (!expandoStore)
        return undefined;
    if (isSimpleSetter && isString(key)) {
        expandoStore[kebabToCamel(key)] = value;
    }
    else if (massGetter) {
        return expandoStore;
    }
    else if (isSimpleGetter && isString(key)) {
        return expandoStore[kebabToCamel(key)];
    }
    else if (key && typeof key === "object") {
        // key is now narrowed to object
        for (const prop in key) {
            if (hasOwn(key, prop)) {
                expandoStore[kebabToCamel(prop)] = key[prop];
            }
        }
    }
    return undefined;
}
/**
 * Sets cache data for a given element.
 *
 * Walks up to the parent element when called on a node that cannot store expando data directly.
 *
 * @param element - The DOM element or node to set data on.
 * @param key - The cache key to store.
 * @param [value] - The value to store.
 */
function setCacheData(element, key, value) {
    if (elementAcceptsData(element)) {
        const expandoStore = getExpando(element, true);
        expandoStore[kebabToCamel(key)] = value;
    }
    else {
        if (element.parentElement) {
            // TODO: check should occur perhaps prior at compilation level that this is a valid element
            setCacheData(element.parentElement, key, value);
        }
    }
}
/**
 * Gets cache data for a given element.
 *
 * @param element - The DOM element to get data from.
 * @param [key] - The key (as a string) to retrieve.
 * @returns The stored value for the key, or `undefined` if no matching data exists.
 */
function getCacheData(element, key) {
    if (elementAcceptsData(element)) {
        const expandoStore = getExpando(element, false); // Don't create if it doesn't exist
        if (!key) {
            return undefined;
        }
        return expandoStore && expandoStore[kebabToCamel(key)];
    }
    return undefined;
}
/**
 * Deletes cache data for a given element for a particular key.
 *
 * @param element - The DOM element to delete data from.
 * @param key - The key (as a string) to delete.
 */
function deleteCacheData(element, key) {
    if (!key)
        return;
    if (elementAcceptsData(element)) {
        const expandoStore = getExpando(element, false); // Don't create if it doesn't exist
        if (expandoStore && hasOwn(expandoStore, kebabToCamel(key))) {
            delete expandoStore[kebabToCamel(key)];
            removeIfEmptyData(element);
        }
    }
}
/**
 * Gets the scope attached directly to an element.
 *
 * @param element - The DOM element to get data from.
 * @returns The scope stored on the element.
 */
function getScope(element) {
    return getCacheData(element, SCOPE_KEY);
}
/**
 * Sets the scope attached to a given element.
 *
 * @param element - The DOM element to set data on.
 * @param scope - The scope to attach to this element.
 */
function setScope(element, scope) {
    return setCacheData(element, SCOPE_KEY, scope);
}
/**
 * Sets the isolate scope attached to a given element.
 *
 * @param element - The DOM element to set data on.
 * @param scope - The isolate scope to attach to this element.
 */
function setIsolateScope(element, scope) {
    return setCacheData(element, ISOLATE_SCOPE_KEY, scope);
}
/**
 * Gets the controller instance for a given element.
 *
 * Defaults to `"ngControllerController"` when no controller name is provided.
 *
 * @param element - The DOM element to get data from.
 * @param [name] - Controller name.
 * @returns The nearest inherited controller instance if found.
 */
function getController(element, name) {
    return getInheritedData(element, `$${name || "ngController"}Controller`);
}
/**
 * Walk up the DOM tree (including Shadow DOM) to get inherited data.
 *
 * @param element - The starting element (or document/document fragment).
 * @param name - The data key to look up.
 * @returns The first matching inherited value from the element tree, or `undefined` if none is found.
 */
function getInheritedData(element, name) {
    // if element is the document object work with the html element instead
    if (element.nodeType === NodeType._DOCUMENT_NODE) {
        element = element.documentElement;
    }
    let value;
    while (element) {
        value = getCacheData(element, name);
        if (isDefined(value))
            return value;
        let next = element.parentNode;
        if (!next && element.nodeType === NodeType._DOCUMENT_FRAGMENT_NODE) {
            next = element.host;
        }
        // Stop the loop when next is falsy, instead of assigning null
        if (!next)
            break;
        element = next;
    }
    return undefined;
}
/** Removes an element from the DOM and optionally preserves its cached data. */
function removeElement(element, keepData = false) {
    if (!keepData) {
        dealoc(element);
    }
    const parent = element.parentNode;
    if (parent)
        parent.removeChild(element);
}
const parser = new DOMParser();
/**
 * Extracts the starting tag from an HTML string or DOM element.
 *
 * @param elementOrStr - The HTML string or DOM element to process.
 * @returns The normalized opening tag or equivalent textual representation for the input.
 */
function startingTag(elementOrStr) {
    let clone;
    if (isString(elementOrStr)) {
        const doc = parser.parseFromString(elementOrStr, "text/html");
        const { firstChild } = doc.body;
        if (!firstChild)
            return ""; // empty string for empty input
        clone = firstChild.cloneNode(true);
    }
    else if (isInstanceOf(elementOrStr, Element) ||
        isInstanceOf(elementOrStr, Node)) {
        clone = elementOrStr.cloneNode(true);
    }
    else {
        throw new Error("Input must be an HTML string or a DOM element.");
    }
    while (clone.firstChild) {
        clone.removeChild(clone.firstChild);
    }
    const divWrapper = document.createElement("div");
    divWrapper.appendChild(clone);
    const elemHtml = divWrapper.innerHTML;
    try {
        if (clone.nodeType === NodeType._TEXT_NODE) {
            return elemHtml.toLowerCase();
        }
        else if (clone.nodeType === NodeType._COMMENT_NODE) {
            return `<!--${clone.data.trim()}-->`;
        }
        else {
            const match = elemHtml.match(/^(<[^>]+>)/);
            if (match) {
                return match[1].replace(/^<([\w-]+)/, (_match, nodeName) => {
                    return `<${nodeName.toLowerCase()}`;
                });
            }
        }
    }
    catch {
        return elemHtml.toLowerCase();
    }
    return elemHtml.toLowerCase();
}
/**
 * Returns the DOM siblings between the first and last node in the given array.
 *
 * @returns The contiguous DOM block spanning from the first node to the last node.
 */
function getBlockNodes(nodes) {
    let node = nodes[0];
    const endNode = nodes[nodes.length - 1];
    let blockNodes;
    for (let i = 1; node !== endNode; i++) {
        const next = node.nextSibling;
        if (!next)
            break; // stop if no next sibling
        node = next;
        if (blockNodes || nodes[i] !== node) {
            if (!blockNodes) {
                // use element to avoid circular dependency
                blockNodes = Array.prototype.slice.call(nodes, 0, i);
            }
            blockNodes.push(node);
        }
    }
    return blockNodes || nodes;
}
/**
 * Gets the name of a boolean attribute if it exists on a given element.
 *
 * @param element - The DOM element to check.
 * @param name - The name of the attribute.
 * @returns The normalized boolean attribute name, or `false` when the attribute is not boolean for the element.
 */
function getBooleanAttrName(element, name) {
    const normalizedName = name.toLowerCase();
    const isBooleanAttr = BOOLEAN_ATTR_SET.has(normalizedName);
    return isBooleanAttr && BOOLEAN_ELEMENTS_SET.has(element.nodeName)
        ? normalizedName
        : false;
}
function cleanSingleElementData(node) {
    if (node.hasAttribute(NG_ANIMATE_ATTR_NAME) ||
        isDefined(getCacheData(node, ANIMATION_RUNNER_STORAGE_KEY))) {
        node.dispatchEvent(new Event("$destroy"));
    }
    removeElementData(node);
}
/** Removes cached data for each element in a node collection. */
function cleanElementData(nodes) {
    for (let i = 0, ii = nodes.length; i < ii; i++) {
        cleanSingleElementData(nodes[i]);
    }
}
/** Returns the nearest injector service found while walking up the element tree. */
function getInjector(element) {
    return getInheritedData(element, _injector);
}
/**
 * Parses an HTML string into a detached `DocumentFragment`.
 *
 * @param htmlString - Markup to parse.
 * @returns The parsed fragment.
 */
function parseHTML(htmlString) {
    const template = document.createElement("template");
    template.innerHTML = htmlString.trim();
    return template.content;
}
/**
 * Creates a single DOM element from an HTML string.
 * The markup must contain exactly one root node.
 *
 * @param htmlString - Markup to parse.
 * @returns The single root element parsed from the markup.
 */
function createElementFromHTML(htmlString) {
    const content = parseHTML(htmlString);
    return content.firstChild;
}
/**
 * Creates a node list from an HTML fragment string.
 *
 * @param htmlString - Markup to parse.
 * @returns The child nodes parsed from the markup fragment.
 */
function createNodelistFromHTML(htmlString) {
    return parseHTML(htmlString).childNodes;
}
/** Removes all children from an element and clears cache data for the removed subtree. */
function emptyElement(element) {
    dealoc(element, true);
    switch (element.nodeType) {
        case NodeType._ELEMENT_NODE:
        case NodeType._DOCUMENT_NODE:
        case NodeType._DOCUMENT_FRAGMENT_NODE:
            element.replaceChildren();
            break;
    }
}
/**
 * Inserts a DOM element relative to a parent and optional sibling anchor.
 * When `afterElement` is present and still attached, insertion happens after that node.
 * Otherwise the element is prepended to `parentElement`.
 */
function domInsert(element, parentElement, afterElement) {
    // if for some reason the previous element was removed
    // from the dom sometime before this code runs then let's
    // just stick to using the parent element as the anchor
    if (afterElement) {
        const afterNode = extractElementNode(afterElement);
        if (afterNode && !afterNode.parentNode && !afterNode.previousSibling) {
            afterElement = null;
        }
    }
    if (afterElement) {
        afterElement.after(element);
    }
    else {
        parentElement.prepend(element);
    }
}
/**
 * Inserts a DOM element while temporarily hiding it to avoid visual flicker.
 *
 * @param element - The element to insert.
 * @param parent - The parent element that receives the node.
 * @param [after] - Optional sibling after which the node should be inserted.
 */
function animatedomInsert(element, parent, after) {
    const originalVisibility = element.style.visibility;
    const originalPosition = element.style.position;
    const originalPointerEvents = element.style.pointerEvents;
    assign(element.style, {
        visibility: "hidden",
        position: "absolute",
        pointerEvents: "none",
    });
    domInsert(element, parent, after);
    requestAnimationFrame(() => {
        element.style.visibility = originalVisibility;
        element.style.position = originalPosition;
        element.style.pointerEvents = originalPointerEvents;
    });
}
/**
 * Returns the base href of the current document.
 *
 * @returns The normalized base href path, or an empty string when no `<base>` is present.
 */
function getBaseHref() {
    const href = document.querySelector("base")?.getAttribute("href");
    return href ? href.replace(/^(https?:)?\/\/[^/]*/, "") : "";
}
/**
 * Returns the first element node from a node list, or the node itself when a single node is passed.
 *
 * @returns The extracted element node, the original node, or `undefined` when no element node exists.
 */
function extractElementNode(element) {
    if (!element || !isArray(element))
        return element;
    const nodeList = element;
    for (let i = 0; i < nodeList.length; i++) {
        const elm = nodeList[i];
        if (elm.nodeType === NodeType._ELEMENT_NODE) {
            return elm;
        }
    }
    return undefined;
}

export { BOOLEAN_ATTR, Cache, FUTURE_PARENT_ELEMENT_KEY, animatedomInsert, createDocumentFragment, createElementFromHTML, createNodelistFromHTML, dealoc, deleteCacheData, domInsert, emptyElement, extractElementNode, getBaseHref, getBlockNodes, getBooleanAttrName, getCacheData, getController, getInheritedData, getInjector, getOrSetCacheData, getScope, isTextNode, kebabToCamel, removeElement, removeElementData, setCacheData, setIsolateScope, setScope, snakeToCamel, startingTag };
