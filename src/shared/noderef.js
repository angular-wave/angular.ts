import { assertArg, isString } from "./utils.js";
import { createElementFromHTML } from "./dom.js";

/**
 * A type-safe wrapper around a DOM Node, HTMLElement, HTML string, NodeList, or an array of Nodes.
 * Provides guarantees around presence and access.
 */
export class NodeRef {
  /**
   * @param {Node | Element | string | NodeList | Node[]} element - The DOM node(s) or HTML string to wrap.
   * @throws {Error} If the argument is invalid or cannot be wrapped properly.
   */
  constructor(element) {
    assertArg(element, "element");
    this.initial = null;

    /** @private @type {Node | ChildNode | null} */
    this._node = null;

    /** @private @type {Element | undefined} */
    this._element = undefined;

    /** @private @type {Array<Node>} a stable list on nodes */
    this._nodes = undefined;

    /** @type {boolean} */
    this.linked = false;

    /** @type {boolean} */
    this.isList = false;

    // Handle HTML string
    if (isString(element)) {
      this.initial = element;
      let res = createElementFromHTML(/** @type {string} */ (element));
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
      this.initial = Array.from(element).map((e) => e.cloneNode(true));
      if (element.length == 1) {
        this.node = element[0];
      } else {
        this._nodes = Array.from(element);
        this.isList = true;
      }
    }

    // Handle single Element
    else if (element instanceof Element) {
      this.initial = element.cloneNode(true);
      this.element = /** @type {Element} */ element;
    }

    // Handle single Node
    else if (element instanceof Node) {
      this.initial = element.cloneNode(true);
      this._node = element;
    }

    // Handle array of elements
    else if (Array.isArray(element)) {
      if (element.length === 1) {
        this.initial = element[0].cloneNode(true);
        this.node = element[0];
      } else {
        this.initial = Array.from(element).map((e) => e.cloneNode(true));
        this.nodes = element;
      }
    } else {
      throw new Error("Invalid element passed to NodeRef");
    }
  }

  /** @returns {Element} */
  get element() {
    assertArg(this._element, "element");
    return this._element;
  }

  /** @param {Element} el */
  set element(el) {
    assertArg(el instanceof Element, "element");
    this._element = el;
    this._nodes = undefined;
    this.isList = false;
  }

  /** @returns {Node | ChildNode} */
  get node() {
    assertArg(this._node || this._element, "node");
    return this._node || this._element;
  }

  /** @param {Node | ChildNode} node */
  set node(node) {
    assertArg(node instanceof Node, "node");
    this._node = node;
    if (node.nodeType === Node.ELEMENT_NODE) {
      this._element = /** @type {Element} */ (node);
    } else {
      this._element = undefined;
    }
  }

  /** @param {Array<Node>} nodes */
  set nodes(nodes) {
    assertArg(
      Array.isArray(nodes) && nodes.every((n) => n instanceof Node),
      "nodes",
    );
    this._nodes = nodes;
    this.isList = true;
  }

  /** @returns {Array<Node>} */
  get nodes() {
    assertArg(this._nodes, "nodes");
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
    if (this.isList) return this.nodelist;
    else return this.node;
  }

  /** @returns {number} */
  get size() {
    return this.isList ? this._nodes.length : 1;
  }

  /** @returns {Element | Node | ChildNode} */
  getAny() {
    if (this.isList) {
      return this._nodes[0];
    } else {
      return this._element || this._node;
    }
  }

  /** @returns {Element | Array<Node> | Node | ChildNode} */
  getAll() {
    if (this.isList) {
      return this._nodes;
    } else {
      return this._element || this._node;
    }
  }

  /** @returns {Array<Element> | Array<Node>} */
  collection() {
    if (this.isList) {
      return Array.from(this._nodes);
    } else {
      return [this._element || this._node];
    }
  }

  /**
   * @param {number} index
   * @returns {Element | Node | ChildNode}
   */
  getIndex(index) {
    if (this.isList) {
      return this._nodes[index];
    } else {
      return this.node;
    }
  }

  /**
   * @param {number} index
   * @param {Element | Node | ChildNode} node
   */
  setIndex(index, node) {
    assertArg(index !== null, "index");
    assertArg(node, "node");
    if (this.isList) {
      this._nodes[index] = node;
    } else {
      this.node = node;
    }
  }

  /**
   * @returns {NodeRef}
   */
  clone() {
    const cloned = this.isList
      ? this.nodes.map((el) => el.cloneNode(true))
      : this.node.cloneNode(true);

    return new NodeRef(cloned);
  }

  isElement() {
    return this._element !== undefined;
  }
}
