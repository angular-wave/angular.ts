/**
 * Converts kebab-case to camelCase.
 * @param {string} name Name to normalize
 * @returns {string}
 */
export function kebabToCamel(name: string): string;
/**
 * Converts sname to camelCase.
 * @param {string} name
 * @returns {string}
 */
export function snakeToCamel(name: string): string;
/**
 * @param {Element & Record<string, any>} element
 * @param {string} [name]
 */
export function removeElementData(
  element: Element & Record<string, any>,
  name?: string,
): void;
/**
 * Stores data associated with an element inside the expando property of the DOM element.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Expando MDN Glossary: Expando}
 *
 * @param {Element & Record<string, any> } element
 * @param {boolean} [createIfNecessary=false]
 * @returns {import("../interface.ts").ExpandoStore}
 */
export function getExpando(
  element: Element & Record<string, any>,
  createIfNecessary?: boolean,
): import("../interface.ts").ExpandoStore;
/**
 * Checks if the string contains HTML tags or entities.
 * @param {string} html
 * @returns {boolean} True if the string is plain text, false if it contains HTML tags or entities.
 */
export function isTextNode(html: string): boolean;
/**
 * @param {Element & Record<string, any>} element
 * @param {Element & Record<string, any>} element
 * @param {boolean} [onlyDescendants]
 * @returns {void}
 */
export function dealoc(
  element: Element & Record<string, any>,
  onlyDescendants?: boolean,
): void;
/**
 * Gets or sets cache data for a given element.
 *
 * @param {Element} element - The DOM element to get or set data on.
 * @param {string|Object.<string, any>} key - The key to get/set or an object for mass-setting.
 * @param {*} [value] - The value to set. If not provided, the function acts as a getter.
 * @returns {*} - The retrieved data if acting as a getter. Otherwise, undefined.
 */
export function getOrSetCacheData(
  element: Element,
  key:
    | string
    | {
        [x: string]: any;
      },
  value?: any,
): any;
/**
 * Sets cache data for a given element.
 *
 * @param {Element|Node} element - The DOM element to get or set data on.
 * @param {string} key - The key (as a string) to get/set or an object for mass-setting.
 * @param {*} [value] - The value to set. If not provided, the function acts as a getter.
 * @returns
 */
export function setCacheData(
  element: Element | Node,
  key: string,
  value?: any,
): void;
/**
 * Gets cache data for a given element.
 *
 * @param {Element} element - The DOM element to get data from.
 * @param {string} [key] - The key (as a string) to retrieve. If not provided, returns all data.
 * @returns {*} - The retrieved data for the given key or all data if no key is provided.
 */
export function getCacheData(element: Element, key?: string): any;
/**
 * Deletes cache data for a given element for a particular key.
 *
 * @param {Element} element - The DOM element to delete data from.
 * @param {string} key - The key (as a string) to delete.
 * @returns void
 */
export function deleteCacheData(element: Element, key: string): void;
/**
 * Gets scope for a given element.
 *
 * @param {Element} element - The DOM element to get data from.
 * @returns {ng.Scope} - The retrieved data for the given key or all data if no key is provided.
 */
export function getScope(element: Element): ng.Scope;
/**
 * Set scope for a given element.
 *
 * @param {Element|Node|ChildNode} element - The DOM element to set data on.
 * @param {ng.Scope} scope - The Scope attached to this element
 */
export function setScope(
  element: Element | Node | ChildNode,
  scope: ng.Scope,
): void;
/**
 * Gets isolate scope for a given element.
 *
 * @param {Element} element - The DOM element to get data from.
 * @returns {*} - The retrieved data for the given key or all data if no key is provided.
 */
export function getIsolateScope(element: Element): any;
/**
 * Set isolate scope for a given element.
 *
 * @param {Element} element - The DOM element to set data on.
 * @param {ng.Scope} scope - The Scope attached to this element
 */
export function setIsolateScope(element: Element, scope: ng.Scope): void;
/**
 * Gets the controller instance for a given element, if exists. Defaults to "ngControllerController"
 *
 * @param {Element} element - The DOM element to get data from.
 * @param {string} [name] - Controller name.
 * @returns {ng.Scope|undefined} - The retrieved data
 */
export function getController(
  element: Element,
  name?: string,
): ng.Scope | undefined;
/**
 * Walk up the DOM tree (including Shadow DOM) to get inherited data.
 *
 * @param {Node} element - The starting element (or document/document fragment)
 * @param {string} name - The data key to look up
 * @returns {any} - The found value, or undefined if not found
 */
export function getInheritedData(element: Node, name: string): any;
/**
 *
 * @param {Element} element
 * @param {boolean} keepData
 */
export function removeElement(element: Element, keepData?: boolean): void;
/**
 * Extracts the starting tag from an HTML string or DOM element.
 *
 * @param {string|Element|Node} elementOrStr - The HTML string or DOM element to process.
 * @returns {string} The starting tag or processed result.
 */
export function startingTag(elementOrStr: string | Element | Node): string;
/**
 * Return the DOM siblings between the first and last node in the given array.
 * @param {Node[]} nodes
 * @returns {Node[]}
 */
export function getBlockNodes(nodes: Node[]): Node[];
/**
 * Gets the name of a boolean attribute if it exists on a given element.
 *
 * @param {Element} element - The DOM element to check.
 * @param {string} name - The name of the attribute.
 * @returns {string|false} - The attribute name if valid, otherwise false.
 */
export function getBooleanAttrName(
  element: Element,
  name: string,
): string | false;
/**
 * Takes an array of elements, calls any `$destroy` event handlers, removes any data in cache, and finally removes any
 * listeners.
 * @param {NodeListOf<Element>|Element[]} nodes
 */
export function cleanElementData(nodes: NodeListOf<Element> | Element[]): void;
/**
 * Return instance of InjectorService attached to element
 * @param {Element} element
 * @returns {ng.InjectorService}
 */
export function getInjector(element: Element): ng.InjectorService;
/**
 * Creates a DOM element from an HTML string.
 * @param {string} htmlString - A string representing the HTML to parse. Must have only one root element.
 * @returns {Element} - The parsed DOM element.
 */
export function createElementFromHTML(htmlString: string): Element;
/**
 * Creates a DOM element from an HTML string.
 * @param {string} htmlString - A string representing the HTML to parse.
 * @returns {NodeList} - The parsed DOM element.
 */
export function createNodelistFromHTML(htmlString: string): NodeList;
/**
 * Remove element from the DOM and clear Cache data, associated with the node.
 * @param {Element} element
 */
export function emptyElement(element: Element): void;
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
export function domInsert(
  element: HTMLElement | Element,
  parentElement: HTMLElement | Element,
  afterElement?: ChildNode | Element | null,
): void;
/**
 * @param {HTMLElement} element
 * @param {HTMLElement} parent
 * @param {ChildNode | null | undefined} after
 */
export function animatedomInsert(
  element: HTMLElement,
  parent: HTMLElement,
  after: ChildNode | null | undefined,
): void;
/**
 * Returns the base href of the document.
 *
 * @returns {string} The base href.
 */
export function getBaseHref(): string;
/**
 * @param {NodeList|Node} element
 * @returns {Node | undefined}
 */
export function extractElementNode(element: NodeList | Node): Node | undefined;
/**
 * Expando cache for adding properties to DOM nodes with JavaScript.
 * This used to be an Object in JQLite decorator, but swapped out for a Map
 *
 * @type {Map<number, import('../interface.ts').ExpandoStore>}
 */
export const Cache: Map<number, import("../interface.ts").ExpandoStore>;
/**
 * A list of boolean attributes in HTML.
 * @type {string[]}
 */
export const BOOLEAN_ATTR: string[];
