import { hasOwn, isArray, isDefined, isObject, keys } from "./utils.js";
import { NodeType } from "./node.js";
import { $injectTokens } from "../injection-tokens.js";

/** @type {number} */
let elId = 1;

/**
 * Key for storing isolate scope data, attached to an element
 */
const ISOLATE_SCOPE_KEY = "$isolateScope";

const EXPANDO = "ng";

/**
 * Expando cache for adding properties to DOM nodes with JavaScript.
 * This used to be an Object in JQLite decorator, but swapped out for a Map
 *
 * @type {Map<number, import('../interface.ts').ExpandoStore>}
 */
export const Cache = new Map();

/**
 * Key for storing scope data, attached to an element
 */
const SCOPE_KEY = $injectTokens._scope;

const DASH_LOWERCASE_REGEXP = /-([a-z])/g;

const UNDERSCORE_LOWERCASE_REGEXP = /_([a-z])/g;

// Table parts need to be wrapped with `<table>` or they're
// stripped to their contents when put in a div.
// XHTML parsers do not magically insert elements in the
// same way that tag soup parsers do, so we cannot shorten
// this by omitting <tbody> or other required elements.
/**
 * Map of HTML elements to their required wrapper elements.
 * @type {Object.<string, string[]>}
 */
const wrapMap = {
  thead: ["table"],
  col: ["colgroup", "table"],
  tr: ["tbody", "table"],
  td: ["tr", "tbody", "table"],
};

wrapMap.tbody =
  wrapMap.tfoot =
  wrapMap.colgroup =
  wrapMap.caption =
    wrapMap.thead;
wrapMap.th = wrapMap.td;

/**
 * A list of boolean attributes in HTML.
 * @type {string[]}
 */
export const BOOLEAN_ATTR = [
  "multiple",
  "selected",
  "checked",
  "disabled",
  "readonly",
  "required",
  "open",
];

/**
 * A list of boolean attributes in HTML
 * @type {string[]}
 */
const BOOLEAN_ELEMENTS = [
  "INPUT",
  "SELECT",
  "OPTION",
  "TEXTAREA",
  "BUTTON",
  "FORM",
  "DETAILS",
];

///////////////////////////////////////////////////////////////////
////////////        HELPER FUNCTIONS      /////////////////////////
///////////////////////////////////////////////////////////////////

/**
 *
 * @returns {number} Next unique JQInstance id
 */
function elemNextId() {
  return ++elId;
}

/**
 * @param {string} _all
 * @param {string} letter
 * @returns {string}
 */
function fnCamelCaseReplace(_all, letter) {
  return letter.toUpperCase();
}

/**
 * Converts kebab-case to camelCase.
 * @param {string} name Name to normalize
 * @returns {string}
 */
export function kebabToCamel(name) {
  return name.replace(DASH_LOWERCASE_REGEXP, fnCamelCaseReplace);
}

/**
 * Converts sname to camelCase.
 * @param {string} name
 * @returns {string}
 */
export function snakeToCamel(name) {
  return name.replace(UNDERSCORE_LOWERCASE_REGEXP, fnCamelCaseReplace);
}

/**
 * @param {Element & Record<string, any>} element
 * @param {string} [name]
 */
export function removeElementData(element, name) {
  const expandoId = element[EXPANDO];

  const expandoStore = expandoId && Cache.get(expandoId);

  if (expandoStore) {
    if (name) {
      delete expandoStore.data[name];
    } else {
      expandoStore.data = {};
    }

    removeIfEmptyData(element);
  }
}

/**
 * Stores data associated with an element inside the expando property of the DOM element.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Expando MDN Glossary: Expando}
 *
 * @param {Element & Record<string, any> } element
 * @param {boolean} [createIfNecessary=false]
 * @returns {import("../interface.ts").ExpandoStore}
 */
export function getExpando(element, createIfNecessary = false) {
  let expandoId = element[EXPANDO];

  let expandoStore = expandoId && Cache.get(expandoId);

  if (createIfNecessary && !expandoStore) {
    element[EXPANDO] = expandoId = elemNextId();
    expandoStore = {
      data: {},
    };
    Cache.set(expandoId, expandoStore);
  }

  return expandoStore;
}

/**
 * Checks if the string contains HTML tags or entities.
 * @param {string} html
 * @returns {boolean} True if the string is plain text, false if it contains HTML tags or entities.
 */
export function isTextNode(html) {
  return !/<|&#?\w+;/.test(html);
}

/**
 * Check if element can accept expando data
 * @param {Element|Node} node
 * @returns {boolean}
 */
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

/**
 * @param {Element & Record<string, any>} element
 * @param {Element & Record<string, any>} element
 * @param {boolean} [onlyDescendants]
 * @returns {void}
 */
export function dealoc(element, onlyDescendants) {
  if (!element || element instanceof Comment) return;

  if (isArray(element)) {
    /* @ts-ignore */
    element.forEach((item) => dealoc(item, onlyDescendants));
  } else {
    if (!onlyDescendants && elementAcceptsData(element)) {
      cleanElementData([element]);
    }

    if (elementAcceptsData(element)) {
      cleanElementData(element.querySelectorAll("*"));
    }
  }
  delete element[EXPANDO];
  element.innerHTML = "";
}

/**
 * If expando store data is empty, then delete it and set its expando id.
 * to undefined.
 * @param {Element & Record<string, any>} element
 * @param {Element & Record<string, any>} element
 */
function removeIfEmptyData(element) {
  const expandoId = element[EXPANDO];

  const data = expandoId ? Cache.get(expandoId)?.data : undefined;

  if (!data || !keys(data).length) {
    Cache.delete(expandoId);
    element[EXPANDO] = undefined; // don't delete DOM expandos. Chrome don't like it
  }
}

/**
 * Gets or sets cache data for a given element.
 *
 * @param {Element} element - The DOM element to get or set data on.
 * @param {string|Object.<string, any>} key - The key to get/set or an object for mass-setting.
 * @param {*} [value] - The value to set. If not provided, the function acts as a getter.
 * @returns {*} - The retrieved data if acting as a getter. Otherwise, undefined.
 */
export function getOrSetCacheData(element, key, value) {
  if (!elementAcceptsData(element)) return undefined;

  const isSimpleSetter = isDefined(value);

  const isSimpleGetter = !isSimpleSetter && key && !isObject(key);

  const massGetter = !key;

  const expandoStore = getExpando(element, !isSimpleGetter);

  const data = expandoStore && expandoStore.data;

  if (!data) return undefined;

  if (isSimpleSetter && typeof key === "string") {
    data[kebabToCamel(key)] = value;
  } else if (massGetter) {
    return data;
  } else if (isSimpleGetter && typeof key === "string") {
    return data[kebabToCamel(key)];
  } else if (key && typeof key === "object") {
    // key is now narrowed to object
    for (const prop in key) {
      if (Object.prototype.hasOwnProperty.call(key, prop)) {
        data[kebabToCamel(prop)] = key[prop];
      }
    }
  }

  return undefined;
}

/**
 * Sets cache data for a given element.
 *
 * @param {Element|Node} element - The DOM element to get or set data on.
 * @param {string} key - The key (as a string) to get/set or an object for mass-setting.
 * @param {*} [value] - The value to set. If not provided, the function acts as a getter.
 * @returns
 */
export function setCacheData(element, key, value) {
  if (elementAcceptsData(element)) {
    const expandoStore = getExpando(/** @type {Element} */ (element), true);

    const data = expandoStore && expandoStore.data;

    data[kebabToCamel(key)] = value;
  } else {
    if (element.parentElement) {
      // TODO: check should occur perhaps prior at compilation level that this is a valid element
      setCacheData(element.parentElement, key, value);
    }
  }
}

/**
 * Gets cache data for a given element.
 *
 * @param {Element} element - The DOM element to get data from.
 * @param {string} [key] - The key (as a string) to retrieve. If not provided, returns all data.
 * @returns {*} - The retrieved data for the given key or all data if no key is provided.
 */
export function getCacheData(element, key) {
  if (elementAcceptsData(element)) {
    const expandoStore = getExpando(element, false); // Don't create if it doesn't exist

    const data = expandoStore && expandoStore.data;

    if (!key) {
      return undefined;
    }

    return data && data[kebabToCamel(key)];
  }

  return undefined;
}

/**
 * Deletes cache data for a given element for a particular key.
 *
 * @param {Element} element - The DOM element to delete data from.
 * @param {string} key - The key (as a string) to delete.
 * @returns void
 */
export function deleteCacheData(element, key) {
  if (!key) return;

  if (elementAcceptsData(element)) {
    const expandoStore = getExpando(element, false); // Don't create if it doesn't exist

    const data = expandoStore?.data;

    if (data && hasOwn(data, kebabToCamel(key))) {
      delete data[kebabToCamel(key)];
    }
  }
}
/**
 * Gets scope for a given element.
 *
 * @param {Element} element - The DOM element to get data from.
 * @returns {ng.Scope} - The retrieved data for the given key or all data if no key is provided.
 */
export function getScope(element) {
  return getCacheData(element, SCOPE_KEY);
}

/**
 * Set scope for a given element.
 *
 * @param {Element|Node|ChildNode} element - The DOM element to set data on.
 * @param {ng.Scope} scope - The Scope attached to this element
 */
export function setScope(element, scope) {
  return setCacheData(element, SCOPE_KEY, scope);
}

/**
 * Gets isolate scope for a given element.
 *
 * @param {Element} element - The DOM element to get data from.
 * @returns {*} - The retrieved data for the given key or all data if no key is provided.
 */
export function getIsolateScope(element) {
  return getCacheData(element, ISOLATE_SCOPE_KEY);
}

/**
 * Set isolate scope for a given element.
 *
 * @param {Element} element - The DOM element to set data on.
 * @param {ng.Scope} scope - The Scope attached to this element
 */
export function setIsolateScope(element, scope) {
  return setCacheData(element, ISOLATE_SCOPE_KEY, scope);
}

/**
 * Gets the controller instance for a given element, if exists. Defaults to "ngControllerController"
 *
 * @param {Element} element - The DOM element to get data from.
 * @param {string} [name] - Controller name.
 * @returns {ng.Scope|undefined} - The retrieved data
 */
export function getController(element, name) {
  return getInheritedData(element, `$${name || "ngController"}Controller`);
}

/**
 * Walk up the DOM tree (including Shadow DOM) to get inherited data.
 *
 * @param {Node} element - The starting element (or document/document fragment)
 * @param {string} name - The data key to look up
 * @returns {any} - The found value, or undefined if not found
 */
export function getInheritedData(element, name) {
  // if element is the document object work with the html element instead
  if (element.nodeType === NodeType._DOCUMENT_NODE) {
    element = /** @type {Document} */ (element).documentElement;
  }

  let value;

  while (element) {
    value = getCacheData(/** @type {Element} */ (element), name);

    if (isDefined(value)) return value;

    let next = element.parentNode;

    if (!next && element.nodeType === NodeType._DOCUMENT_FRAGMENT_NODE) {
      next = /** @type {ShadowRoot} */ (element).host;
    }

    // Stop the loop when next is falsy, instead of assigning null
    if (!next) break;

    element = next;
  }

  return undefined;
}

/**
 *
 * @param {Element} element
 * @param {boolean} keepData
 */
export function removeElement(element, keepData = false) {
  if (!keepData) {
    dealoc(element);
  }
  const parent = element.parentNode;

  if (parent) parent.removeChild(element);
}

/**
 * Extracts the starting tag from an HTML string or DOM element.
 *
 * @param {string|Element|Node} elementOrStr - The HTML string or DOM element to process.
 * @returns {string} The starting tag or processed result.
 */
export function startingTag(elementOrStr) {
  let clone;

  if (typeof elementOrStr === "string") {
    const parser = new DOMParser();

    const doc = parser.parseFromString(elementOrStr, "text/html");

    const { firstChild } = doc.body;

    if (!firstChild) return ""; // empty string for empty input

    clone = firstChild.cloneNode(true);
  } else if (elementOrStr instanceof Element || elementOrStr instanceof Node) {
    clone = elementOrStr.cloneNode(true);
  } else {
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
    } else if (clone.nodeType === NodeType._COMMENT_NODE) {
      return `<!--${/** @type {Comment} **/ (clone).data.trim()}-->`;
    } else {
      const match = elemHtml.match(/^(<[^>]+>)/);

      if (match) {
        return match[1].replace(/^<([\w-]+)/, (_match, nodeName) => {
          return `<${nodeName.toLowerCase()}`;
        });
      }
    }
  } catch {
    return elemHtml.toLowerCase();
  }

  return elemHtml.toLowerCase();
}

/**
 * Return the DOM siblings between the first and last node in the given array.
 * @param {Node[]} nodes
 * @returns {Node[]}
 */
export function getBlockNodes(nodes) {
  let node = nodes[0];

  const endNode = nodes[nodes.length - 1];

  let blockNodes;

  for (let i = 1; node !== endNode; i++) {
    const next = node.nextSibling;

    if (!next) break; // stop if no next sibling

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
 * @param {Element} element - The DOM element to check.
 * @param {string} name - The name of the attribute.
 * @returns {string|false} - The attribute name if valid, otherwise false.
 */
export function getBooleanAttrName(element, name) {
  const normalizedName = name.toLowerCase();

  const isBooleanAttr = BOOLEAN_ATTR.includes(normalizedName);

  return isBooleanAttr && BOOLEAN_ELEMENTS.includes(element.nodeName)
    ? normalizedName
    : false;
}

/**
 * Takes an array of elements, calls any `$destroy` event handlers, removes any data in cache, and finally removes any
 * listeners.
 * @param {NodeListOf<Element>|Element[]} nodes
 */
export function cleanElementData(nodes) {
  for (let i = 0, ii = nodes.length; i < ii; i++) {
    removeElementData(nodes[i]);
  }
}

/**
 * Return instance of InjectorService attached to element
 * @param {Element} element
 * @returns {ng.InjectorService}
 */
export function getInjector(element) {
  return getInheritedData(element, $injectTokens._injector);
}

/**
 * Creates a DOM element from an HTML string.
 * @param {string} htmlString - A string representing the HTML to parse. Must have only one root element.
 * @returns {Element} - The parsed DOM element.
 */
export function createElementFromHTML(htmlString) {
  const template = document.createElement("template");

  template.innerHTML = htmlString.trim();

  return /** @type {Element} */ (template.content.firstChild);
}

/**
 * Creates a DOM element from an HTML string.
 * @param {string} htmlString - A string representing the HTML to parse.
 * @returns {NodeList} - The parsed DOM element.
 */
export function createNodelistFromHTML(htmlString) {
  const template = document.createElement("template");

  template.innerHTML = htmlString.trim();

  return template.content.childNodes;
}

/**
 * Remove element from the DOM and clear Cache data, associated with the node.
 * @param {Element} element
 */
export function emptyElement(element) {
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
 * Inserts a DOM element before or at the beginning of a parent element.
 *
 * @param {HTMLElement | Element} element
 *   The element to insert into the DOM.
 *
 * @param {HTMLElement | Element} parentElement
 *   The parent element that will receive the inserted element.
 *
 * @param {ChildNode | Element | null} [afterElement]
 *   An optional sibling element — if present and valid, `element`
 *   will be inserted after it. If omitted or invalid, `element`
 *   is prepended to `parentElement`.
 *
 * @returns {void}
 */
export function domInsert(element, parentElement, afterElement) {
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
  } else {
    parentElement.prepend(element);
  }
}

/**
 * @param {HTMLElement} element
 * @param {HTMLElement} parent
 * @param {ChildNode | null | undefined} after
 */
export function animatedomInsert(element, parent, after) {
  const originalVisibility = element.style.visibility;

  const originalPosition = element.style.position;

  const originalPointerEvents = element.style.pointerEvents;

  Object.assign(element.style, {
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
 * Returns the base href of the document.
 *
 * @returns {string} The base href.
 */
export function getBaseHref() {
  const href = document.querySelector("base")?.getAttribute("href");

  return href ? href.replace(/^(https?:)?\/\/[^/]*/, "") : "";
}

/**
 * @param {NodeList|Node} element
 * @returns {Node | undefined}
 */
export function extractElementNode(element) {
  if (!element || !isArray(element)) return /** @type {Node} */ (element);

  for (let i = 0; i < /** @type {NodeList} */ (element).length; i++) {
    const elm = element[i];

    if (elm.nodeType === NodeType._ELEMENT_NODE) {
      return elm;
    }
  }

  return undefined;
}
