/**
 * A type-safe wrapper around a DOM Node, HTMLElement, HTML string, NodeList, or an array of Nodes.
 * Provides guarantees around presence and access.
 */
export class NodeRef {
  static $nonscope: boolean;
  /**
   * @param {Node | Element | string | NodeList | Node[]} element - The DOM node(s) or HTML string to wrap.
   * @throws {Error} If the argument is invalid or cannot be wrapped properly.
   */
  constructor(element: Node | Element | string | NodeList | Node[]);
  initial: string | Node | NodeList | Node[];
  /** @private @type {Node | ChildNode | null} */
  private _node;
  /** @private @type {Element | undefined} */
  private _element;
  /** @private @type {Array<Node>} a stable list on nodes */
  private _nodes;
  /** @type {boolean} */
  linked: boolean;
  /** @type {boolean} */
  isList: boolean;
  /** @param {Element} el */
  set element(el: Element);
  /** @returns {Element} */
  get element(): Element;
  /** @param {Node | ChildNode} node */
  set node(node: Node | ChildNode);
  /** @returns {Node | ChildNode} */
  get node(): Node | ChildNode;
  /** @param {Array<Node>} nodes */
  set nodes(nodes: Array<Node>);
  /** @returns {Array<Node>} */
  get nodes(): Array<Node>;
  /** @returns {NodeList|Node[]} */
  get nodelist(): NodeList | Node[];
  /** @returns {Element | Node | ChildNode | NodeList | Node[]} */
  get dom(): Element | Node | ChildNode | NodeList | Node[];
  /** @returns {number} */
  get size(): number;
  /** @returns {Element | Node | ChildNode} */
  getAny(): Element | Node | ChildNode;
  /** @returns {Element | Array<Node> | Node | ChildNode} */
  getAll(): Element | Array<Node> | Node | ChildNode;
  /** @returns {Array<Element> | Array<Node>} */
  collection(): Array<Element> | Array<Node>;
  /**
   * @param {number} index
   * @returns {Element | Node | ChildNode}
   */
  getIndex(index: number): Element | Node | ChildNode;
  /**
   * @param {number} index
   * @param {Element | Node | ChildNode} node
   */
  setIndex(index: number, node: Element | Node | ChildNode): void;
  /**
   * @returns {NodeRef}
   */
  clone(): NodeRef;
  isElement(): boolean;
}
