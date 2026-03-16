import { hasOwn, isArray, isDefined, isObject, keys } from "./utils.js";
import { NodeType } from "./node.ts";
import { $injectTokens } from "../injection-tokens.ts";
import type { ExpandoStore } from "../interface.ts";

let elId = 1;

/**
 * Key for storing isolate scope data attached to an element.
 */
const ISOLATE_SCOPE_KEY = "$isolateScope";

const EXPANDO = "ng";

/**
 * Stores per-node expando metadata keyed by the generated expando id.
 * This used to be an object in the JQLite decorator, but was swapped out for a `Map`.
 */
export const Cache = new Map<number, ExpandoStore>();

/**
 * Key for storing scope data attached to an element.
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
 */
const wrapMap: Record<string, string[]> = {
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
 * HTML attributes whose presence alone represents a truthy value.
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

///////////////////////////////////////////////////////////////////
////////////        HELPER FUNCTIONS      /////////////////////////
///////////////////////////////////////////////////////////////////

/** Returns the next unique expando/cache identifier. */
function elemNextId() {
  return ++elId;
}

function fnCamelCaseReplace(_all: string, letter: string): string {
  return letter.toUpperCase();
}

/**
 * Converts kebab-case to camelCase.
 * @param name - Name to normalize.
 * @returns The camel-cased name.
 */
export function kebabToCamel(name: string): string {
  return name.replace(DASH_LOWERCASE_REGEXP, fnCamelCaseReplace);
}

/**
 * Converts snake_case to camelCase.
 *
 * @param name - Name to normalize.
 * @returns The camel-cased name.
 */
export function snakeToCamel(name: string): string {
  return name.replace(UNDERSCORE_LOWERCASE_REGEXP, fnCamelCaseReplace);
}

/**
 * Removes expando-backed data from an element.
 *
 * @param element - The element whose stored data should be updated.
 * @param [name] - Optional data key to remove. When omitted, all stored expando data is cleared.
 */
export function removeElementData(
  element: Element & Record<string, any>,
  name?: string,
): void {
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
 * @param element - The element whose expando store should be read or created.
 * @param createIfNecessary - When `true`, creates the expando store if it does not exist.
 * @returns The existing or newly created expando store, or `undefined` when none exists and creation is disabled.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Expando MDN Glossary: Expando}
 */
export function getExpando(
  element: Element & Record<string, any>,
  createIfNecessary = false,
): import("../interface.ts").ExpandoStore | undefined {
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
 * @returns `true` when the string is plain text, otherwise `false`.
 */
export function isTextNode(html: string): boolean {
  return !/<|&#?\w+;/.test(html);
}

/** Returns `true` when a node can hold expando-backed cache data. */
function elementAcceptsData(node: Element | Node): boolean {
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
export function dealoc(
  element:
    | (Element & Record<string, any>)
    | (Element & Record<string, any>)[]
    | NodeListOf<Element>
    | HTMLCollectionOf<Element>
    | null
    | undefined,
  onlyDescendants = false,
): void {
  if (!element || typeof element !== "object" || element instanceof Comment) {
    return;
  }

  if (
    isArray(element) ||
    element instanceof NodeList ||
    element instanceof HTMLCollection
  ) {
    Array.from(element).forEach((item) => dealoc(item, onlyDescendants));

    return;
  } else {
    const domElement = element as Element & Record<string, any>;

    if (!onlyDescendants && elementAcceptsData(domElement)) {
      cleanElementData([domElement]);
    }

    if (elementAcceptsData(domElement)) {
      cleanElementData(domElement.querySelectorAll("*"));
    }
  }
  delete (element as Element & Record<string, any>)[EXPANDO];
  (element as Element).innerHTML = "";
}

/**
 * Removes an element's expando bookkeeping when no cached data remains.
 *
 * @param element - The element whose expando store should be cleaned up.
 */
function removeIfEmptyData(element: Element & Record<string, any>): void {
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
 * @param element - The DOM element to get or set data on.
 * @param key - The key to get/set or an object for mass-setting.
 * @param [value] - The value to set. If not provided, the function acts as a getter.
 * @returns The stored value for keyed reads, the full expando data object for mass reads, or `undefined`.
 */
export function getOrSetCacheData(
  element: Element,
  key?: string | Record<string, any>,
  value?: any,
): any {
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
 * Walks up to the parent element when called on a node that cannot store expando data directly.
 *
 * @param element - The DOM element or node to set data on.
 * @param key - The cache key to store.
 * @param [value] - The value to store.
 */
export function setCacheData(
  element: Element | Node,
  key: string,
  value?: any,
): void {
  if (elementAcceptsData(element)) {
    const expandoStore = getExpando(
      element as Element & Record<string, any>,
      true,
    );

    const { data } = expandoStore!;

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
 * @param element - The DOM element to get data from.
 * @param [key] - The key (as a string) to retrieve.
 * @returns The stored value for the key, or `undefined` if no matching data exists.
 */
export function getCacheData(element: Element, key?: string): any {
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
 * @param element - The DOM element to delete data from.
 * @param key - The key (as a string) to delete.
 */
export function deleteCacheData(element: Element, key?: string): void {
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
 * Gets the scope attached directly to an element.
 *
 * @param element - The DOM element to get data from.
 * @returns The scope stored on the element.
 */
export function getScope(element: Element): ng.Scope {
  return getCacheData(element, SCOPE_KEY);
}

/**
 * Sets the scope attached to a given element.
 *
 * @param element - The DOM element to set data on.
 * @param scope - The scope to attach to this element.
 */
export function setScope(
  element: Element | Node | ChildNode,
  scope: ng.Scope,
): void {
  return setCacheData(element, SCOPE_KEY, scope);
}

/**
 * Gets the isolate scope attached directly to an element.
 *
 * @param element - The DOM element to get data from.
 * @returns The isolate scope stored on the element.
 */
export function getIsolateScope(element: Element): any {
  return getCacheData(element, ISOLATE_SCOPE_KEY);
}

/**
 * Sets the isolate scope attached to a given element.
 *
 * @param element - The DOM element to set data on.
 * @param scope - The isolate scope to attach to this element.
 */
export function setIsolateScope(element: Element, scope: ng.Scope): void {
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
export function getController(
  element: Element,
  name?: string,
): ng.Scope | undefined {
  return getInheritedData(element, `$${name || "ngController"}Controller`);
}

/**
 * Walk up the DOM tree (including Shadow DOM) to get inherited data.
 *
 * @param element - The starting element (or document/document fragment).
 * @param name - The data key to look up.
 * @returns The first matching inherited value from the element tree, or `undefined` if none is found.
 */
export function getInheritedData(element: Node, name: string): any {
  // if element is the document object work with the html element instead
  if (element.nodeType === NodeType._DOCUMENT_NODE) {
    element = (element as Document).documentElement;
  }

  let value;

  while (element) {
    value = getCacheData(element as Element, name);

    if (isDefined(value)) return value;

    let next = element.parentNode;

    if (!next && element.nodeType === NodeType._DOCUMENT_FRAGMENT_NODE) {
      next = (element as ShadowRoot).host;
    }

    // Stop the loop when next is falsy, instead of assigning null
    if (!next) break;

    element = next;
  }

  return undefined;
}

/** Removes an element from the DOM and optionally preserves its cached data. */
export function removeElement(element: Element, keepData = false): void {
  if (!keepData) {
    dealoc(element);
  }
  const parent = element.parentNode;

  if (parent) parent.removeChild(element);
}

const parser = new DOMParser();

/**
 * Extracts the starting tag from an HTML string or DOM element.
 *
 * @param elementOrStr - The HTML string or DOM element to process.
 * @returns The normalized opening tag or equivalent textual representation for the input.
 */
export function startingTag(elementOrStr: string | Element | Node): string {
  let clone: Node;

  if (typeof elementOrStr === "string") {
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
      return `<!--${(clone as Comment).data.trim()}-->`;
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
 * Returns the DOM siblings between the first and last node in the given array.
 *
 * @returns The contiguous DOM block spanning from the first node to the last node.
 */
export function getBlockNodes(nodes: Node[]): Node[] {
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
 * @param element - The DOM element to check.
 * @param name - The name of the attribute.
 * @returns The normalized boolean attribute name, or `false` when the attribute is not boolean for the element.
 */
export function getBooleanAttrName(
  element: Element,
  name: string,
): string | false {
  const normalizedName = name.toLowerCase();

  const isBooleanAttr = BOOLEAN_ATTR.includes(normalizedName);

  return isBooleanAttr && BOOLEAN_ELEMENTS.includes(element.nodeName)
    ? normalizedName
    : false;
}

/** Removes cached data for each element in a node collection. */
export function cleanElementData(nodes: NodeListOf<Element> | Element[]): void {
  for (let i = 0, ii = nodes.length; i < ii; i++) {
    removeElementData(nodes[i]);
  }
}

/** Returns the nearest injector service found while walking up the element tree. */
export function getInjector(element: Element): ng.InjectorService {
  return getInheritedData(element, $injectTokens._injector);
}

/**
 * Parses an HTML string into a detached `DocumentFragment`.
 *
 * @param htmlString - Markup to parse.
 * @returns The parsed fragment.
 */
function parseHTML(htmlString: string): DocumentFragment {
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
export function createElementFromHTML(htmlString: string): Element {
  const content = parseHTML(htmlString);

  return content.firstChild as Element;
}

/**
 * Creates a node list from an HTML fragment string.
 *
 * @param htmlString - Markup to parse.
 * @returns The child nodes parsed from the markup fragment.
 */
export function createNodelistFromHTML(
  htmlString: string,
): NodeListOf<ChildNode> {
  return parseHTML(htmlString).childNodes;
}

/** Removes all children from an element and clears cache data for the removed subtree. */
export function emptyElement(element: Element): void {
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
export function domInsert(
  element: HTMLElement | Element,
  parentElement: HTMLElement | Element,
  afterElement?: ChildNode | Element | null,
): void {
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
 * Inserts a DOM element while temporarily hiding it to avoid visual flicker.
 *
 * @param element - The element to insert.
 * @param parent - The parent element that receives the node.
 * @param [after] - Optional sibling after which the node should be inserted.
 */
export function animatedomInsert(
  element: HTMLElement,
  parent: HTMLElement,
  after?: ChildNode | null,
): void {
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
 * Returns the base href of the current document.
 *
 * @returns The normalized base href path, or an empty string when no `<base>` is present.
 */
export function getBaseHref(): string {
  const href = document.querySelector("base")?.getAttribute("href");

  return href ? href.replace(/^(https?:)?\/\/[^/]*/, "") : "";
}

/**
 * Returns the first element node from a node list, or the node itself when a single node is passed.
 *
 * @returns The extracted element node, the original node, or `undefined` when no element node exists.
 */
export function extractElementNode(element: NodeList | Node): Node | undefined {
  if (!element || !isArray(element)) return element as Node;

  const nodeList = element as NodeListOf<Node>;

  for (let i = 0; i < nodeList.length; i++) {
    const elm = nodeList[i] as Node;

    if (elm.nodeType === NodeType._ELEMENT_NODE) {
      return elm;
    }
  }

  return undefined;
}
