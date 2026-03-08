import { isArray, isString } from "./utils.ts";
import { createElementFromHTML } from "./dom.ts";
import { NodeType } from "./node.ts";

/**
 * A type-safe wrapper around a DOM Node, HTMLElement, HTML string, NodeList, or an array of Nodes.
 * Provides guarantees around presence and access.
 */
export class NodeRef {
  static $nonscope = true;
  _node: Node | ChildNode | undefined;
  _element: Element | undefined;
  _nodes: Array<Node>;
  _isList: boolean;
  /**
   * @param {Node | Element | string | NodeList | Node[]} element - The DOM node(s) or HTML string to wrap.
   * @throws {Error} If the argument is invalid or cannot be wrapped properly.
   */
  constructor(element: Node | Element | string | NodeList | Node[]) {
    /** @private @type {Node | ChildNode | undefined} */
    this._node = undefined;

    /** @type {Element | undefined} */
    this._element = undefined;

    /** @private @type {Array<Node>} a stable list on nodes */
    this._nodes = [];

    /** @type {boolean} */
    this._isList = false;

    // Handle HTML string
    if (isString(element)) {
      const res = createElementFromHTML(/** @type {string} */ element);

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
      this.element = element;
    }

    // Handle single Node
    else if (element instanceof Node) {
      this._node = element;
    }

    // Handle array of elements
    else if (isArray(element)) {
      if (element.length === 1) {
        this.node = element[0] as Node;
      } else {
        this.nodes = element as Node[];
      }
    } else {
      throw new Error("Invalid element passed to NodeRef");
    }
  }

  /** @returns {Element} */
  get element(): Element {
    return this._element as Element;
  }

  /** @param {Element} el */
  set element(el: Element) {
    this._element = el;
    this._isList = false;
  }

  /** @returns {Node | ChildNode} */
  get node(): Node | ChildNode {
    return (this._node || this._element) as Node | ChildNode;
  }

  /** @param {Node | ChildNode} node */
  set node(node: Node | ChildNode) {
    this._node = node;

    if (node.nodeType === NodeType._ELEMENT_NODE) {
      this._element = node as Element;
    } else {
      this._element = undefined;
    }
  }

  /** @param {Array<Node>} nodes */
  set nodes(nodes: Array<Node>) {
    this._nodes = nodes;
    this._isList = true;
  }

  /** @returns {Array<Node>} */
  get nodes(): Array<Node> {
    return this._nodes;
  }

  /** @returns {NodeList|Node[]} */
  get nodelist(): NodeList | Node[] {
    if (this._nodes.length === 0) return [];

    if (this._nodes[0].parentElement)
      return this._nodes[0].parentElement.childNodes;
    const fragment = document.createDocumentFragment();

    this._nodes.forEach((el) => fragment.appendChild(el));

    return fragment.childNodes;
  }

  /** @returns {Element | Node | ChildNode | NodeList | Node[]} */
  get dom(): Element | Node | ChildNode | NodeList | Node[] {
    if (this._isList) return this.nodelist;
    else return this.node;
  }

  /** @returns {number} */
  get size() {
    return this._isList ? this._nodes.length : 1;
  }

  /** @returns {Element | Node | ChildNode} */
  _getAny(): Element | Node | ChildNode {
    if (this._isList) {
      return this._nodes[0] as Element | Node | ChildNode;
    } else {
      return (this._element || this._node)! as Element | Node | ChildNode;
    }
  }

  /** @returns {Element | Array<Node> | Node | ChildNode} */
  _getAll(): Element | Array<Node> | Node | ChildNode {
    if (this._isList) {
      return this._nodes;
    } else {
      return (this._element || this._node) as Element | Node | ChildNode;
    }
  }

  /** @returns {Array<Element> | Array<Node>} */
  _collection(): Array<Element | Node | ChildNode> {
    if (this._isList) {
      return Array.from(this._nodes);
    } else {
      return [(this._element || this._node) as Element | Node | ChildNode];
    }
  }

  /**
   * @param {number} index
   * @returns {Element | Node | ChildNode}
   */
  _getIndex(index: number): Element | Node | ChildNode {
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
  _setIndex(index: number, node: Element | Node | ChildNode) {
    if (this._isList) {
      this._nodes[index] = node;
    } else {
      this.node = node;
    }
  }

  /**
   * @returns {NodeRef}
   */
  _clone(): NodeRef {
    const cloned = this._isList
      ? this.nodes.map((el: Node) => el.cloneNode(true) as Node)
      : this.node.cloneNode(true);

    return new NodeRef(cloned);
  }

  _isElement(): boolean {
    return this._element !== undefined;
  }
}
