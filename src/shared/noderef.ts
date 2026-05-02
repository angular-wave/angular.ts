import { arrayFrom, isArray, isInstanceOf, isString } from "./utils.ts";
import { createDocumentFragment, createElementFromHTML } from "./dom.ts";
import { NodeType } from "./node.ts";

/**
 * A type-safe wrapper around a DOM Node, HTMLElement, HTML string, NodeList, or an array of Nodes.
 * Provides guarantees around presence and access.
 */
export class NodeRef {
  static $nonscope = true;
  /** @internal */
  _node: Node | ChildNode | undefined;
  /** @internal */
  _element: Element | undefined;
  /** @internal */
  _nodes: Array<Node>;
  /** @internal */
  _nodeList: NodeList | undefined;
  /** @internal */
  _isList: boolean;
  /**
   * @param element - The DOM node(s) or HTML string to wrap.
   * @throws {Error} If the argument is invalid or cannot be wrapped properly.
   */
  constructor(element: Node | Element | string | NodeList | Node[]) {
    this._node = undefined;

    this._element = undefined;

    this._nodes = [];

    this._nodeList = undefined;

    this._isList = false;

    // Handle HTML string
    if (isString(element)) {
      const res = createElementFromHTML(element);

      switch (true) {
        case isInstanceOf(res, Element):
          this.element = res;
          break;
        case isInstanceOf(res, Node):
          this.node = res;
          break;
      }
    }

    // Handle NodeList
    else if (isInstanceOf(element, NodeList)) {
      if (element.length === 1) {
        this.node = element[0];
      } else {
        this._nodeList = element;
        this._isList = true;
      }
    }

    // Handle single Element
    else if (isInstanceOf(element, Element)) {
      this.element = element;
    }

    // Handle single Node
    else if (isInstanceOf(element, Node)) {
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

  /** @returns The wrapped element. */
  get element(): Element {
    return this._element as Element;
  }

  /** @param el The element to wrap. */
  set element(el: Element) {
    this._element = el;
    this._node = undefined;
    this._nodes = [];
    this._nodeList = undefined;
    this._isList = false;
  }

  /** @returns The wrapped node. */
  get node(): Node | ChildNode {
    return (this._node || this._element) as Node | ChildNode;
  }

  /** @param node The node to wrap. */
  set node(node: Node | ChildNode) {
    this._node = node;
    this._nodeList = undefined;

    if (node.nodeType === NodeType._ELEMENT_NODE) {
      this._element = node as Element;
    } else {
      this._element = undefined;
    }
  }

  /** @param nodes The node collection to wrap. */
  set nodes(nodes: Array<Node>) {
    this._nodes = nodes;
    this._nodeList = undefined;
    this._isList = true;
  }

  /** @returns The wrapped node collection. */
  get nodes(): Array<Node> {
    if (this._nodeList) return arrayFrom(this._nodeList);

    return this._nodes;
  }

  /** @returns A live node list view of the wrapped nodes. */
  get nodelist(): NodeList | Node[] {
    if (this._nodeList) return this._nodeList;

    if (this._nodes.length === 0) return [];

    if (this._nodes[0].parentElement)
      return this._nodes[0].parentElement.childNodes;

    return this._nodes;
  }

  /** @returns A detached fragment containing the wrapped node list. */
  get fragment(): DocumentFragment {
    const fragment = createDocumentFragment();

    const collection = this._collection();

    for (let i = 0; i < collection.length; i++) {
      fragment.appendChild(collection[i]);
    }

    return fragment;
  }

  /** @returns The wrapped DOM value. */
  get dom(): Element | Node | ChildNode | NodeList | Node[] | DocumentFragment {
    if (this._isList) {
      const firstNode = this._getIndex(0);

      return firstNode && !firstNode.parentElement
        ? this.fragment
        : this.nodelist;
    } else return this.node;
  }

  /** @returns The number of wrapped nodes. */
  get size() {
    return this._isList ? this._nodeList?.length || this._nodes.length : 1;
  }

  /** @returns The first wrapped node or element. */
  /** @internal */
  _getAny(): Element | Node | ChildNode {
    if (this._isList) {
      return (this._nodeList?.[0] || this._nodes[0]) as
        | Element
        | Node
        | ChildNode;
    } else {
      return (this._element || this._node)! as Element | Node | ChildNode;
    }
  }

  /** @returns All wrapped nodes or the single wrapped node. */
  /** @internal */
  _getAll(): Element | Array<Node> | Node | ChildNode {
    if (this._isList) {
      return this.nodes;
    } else {
      return (this._element || this._node) as Element | Node | ChildNode;
    }
  }

  /** @returns A collection view of the wrapped nodes. */
  /** @internal */
  _collection(): Array<Element | Node | ChildNode> {
    if (this._isList) {
      return this.nodes;
    } else {
      return [(this._element || this._node) as Element | Node | ChildNode];
    }
  }

  /**
   * Returns the node at a specific index from this reference.
   */
  /** @internal */
  _getIndex(index: number): Element | Node | ChildNode {
    if (this._isList) {
      return (this._nodeList?.[index] || this._nodes[index]) as
        | Element
        | Node
        | ChildNode;
    } else {
      return this.node;
    }
  }

  /**
   * Replaces the node at a specific index in this reference.
   */
  /** @internal */
  _setIndex(index: number, node: Element | Node | ChildNode) {
    if (this._isList) {
      if (this._nodeList) {
        this._nodes = arrayFrom(this._nodeList);
        this._nodeList = undefined;
      }

      this._nodes[index] = node;
    } else {
      this.node = node;
    }
  }

  /**
   * Clones the referenced node or node list.
   */
  /** @internal */
  _clone(): NodeRef {
    if (!this._isList) {
      return new NodeRef(this.node.cloneNode(true));
    }

    const collection = this._collection();

    const cloned = new Array<Node>(collection.length);

    for (let i = 0; i < collection.length; i++) {
      cloned[i] = collection[i].cloneNode(true);
    }

    return new NodeRef(cloned);
  }

  /** @internal */
  _isElement(): boolean {
    return this._element !== undefined;
  }

  /** @internal */
  _release(): void {
    this._node = undefined;
    this._element = undefined;
    this._nodes = [];
    this._nodeList = undefined;
    this._isList = false;
  }
}
