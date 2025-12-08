import { isArray, isString } from "./utils.js";
import { createElementFromHTML, NodeType } from "./dom.js";

/**
 * A type-safe wrapper around a DOM Node, HTMLElement, HTML string, NodeList, or an array of Nodes.
 * Provides guarantees around presence and access.
 */
export class NodeRef {
  static $nonscope = true;
  /**
   * @param {Node | Element | string | NodeList | Node[]} element - The DOM node(s) or HTML string to wrap.
   * @throws {Error} If the argument is invalid or cannot be wrapped properly.
   */
  constructor(element) {
    /** @private @type {Node | ChildNode | null} */
    this._node = null;

    /** @private @type {Element | undefined} */
    this._element = undefined;

    /** @private @type {Array<Node>} a stable list on nodes */
    this._nodes = undefined;

    /** @type {boolean} */
    this._isList = false;

    // Handle HTML string
    if (isString(element)) {
      const res = createElementFromHTML(/** @type {string} */ (element));

      switch (true) {
        case res instanceof Element:
          this.element = res;
          break;
        case res instanceof Node:
          this.node = res;
          break;
      }
    }

    // Handle NodeList
    else if (element instanceof NodeList) {
      if (element.length === 1) {
        this.node = element[0];
      } else {
        this._nodes = Array.from(element);
        this._isList = true;
      }
    }

    // Handle single Element
    else if (element instanceof Element) {
      this.element = /** @type {Element} */ element;
    }

    // Handle single Node
    else if (element instanceof Node) {
      this._node = element;
    }

    // Handle array of elements
    else if (isArray(element)) {
      if (element.length === 1) {
        this.node = /** @type {Node} */ (element[0]);
      } else {
        this.nodes = /** @type {Node[]} */ (element);
      }
    } else {
      throw new Error("Invalid element passed to NodeRef");
    }
  }

  /** @returns {Element} */
  get element() {
    return this._element;
  }

  /** @param {Element} el */
  set element(el) {
    this._element = el;
    this._nodes = undefined;
    this._isList = false;
  }

  /** @returns {Node | ChildNode} */
  get node() {
    return this._node || this._element;
  }

  /** @param {Node | ChildNode} node */
  set node(node) {
    this._node = node;

    if (node.nodeType === NodeType._ELEMENT_NODE) {
      this._element = /** @type {Element} */ (node);
    } else {
      this._element = undefined;
    }
  }

  /** @param {Array<Node>} nodes */
  set nodes(nodes) {
    this._nodes = nodes;
    this._isList = true;
  }

  /** @returns {Array<Node>} */
  get nodes() {
    return this._nodes;
  }

  /** @returns {NodeList|Node[]} */
  get nodelist() {
    if (this._nodes.length === 0) return [];

    if (this._nodes[0].parentElement)
      return this._nodes[0].parentElement.childNodes;
    const fragment = document.createDocumentFragment();

    this._nodes.forEach((el) => fragment.appendChild(el));

    return fragment.childNodes;
  }

  /** @returns {Element | Node | ChildNode | NodeList | Node[]} */
  get dom() {
    if (this._isList) return this.nodelist;
    else return this.node;
  }

  /** @returns {number} */
  get size() {
    return this._isList ? this._nodes.length : 1;
  }

  /** @returns {Element | Node | ChildNode} */
  _getAny() {
    if (this._isList) {
      return this._nodes[0];
    } else {
      return this._element || this._node;
    }
  }

  /** @returns {Element | Array<Node> | Node | ChildNode} */
  _getAll() {
    if (this._isList) {
      return this._nodes;
    } else {
      return this._element || this._node;
    }
  }

  /** @returns {Array<Element> | Array<Node>} */
  _collection() {
    if (this._isList) {
      return Array.from(this._nodes);
    } else {
      return [this._element || this._node];
    }
  }

  /**
   * @param {number} index
   * @returns {Element | Node | ChildNode}
   */
  _getIndex(index) {
    if (this._isList) {
      return this._nodes[index];
    } else {
      return this.node;
    }
  }

  /**
   * @param {number} index
   * @param {Element | Node | ChildNode} node
   */
  _setIndex(index, node) {
    if (this._isList) {
      this._nodes[index] = node;
    } else {
      this.node = node;
    }
  }

  /**
   * @returns {NodeRef}
   */
  _clone() {
    const cloned = this._isList
      ? this.nodes.map((el) => el.cloneNode(true))
      : this.node.cloneNode(true);

    return new NodeRef(cloned);
  }

  _isElement() {
    return this._element !== undefined;
  }
}
