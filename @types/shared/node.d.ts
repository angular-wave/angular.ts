/**
 * DOM node type numeric constants used in compile/directive helpers.
 */
export declare const NodeType: {
  readonly _ELEMENT_NODE: 1;
  readonly _DOCUMENT_NODE: 9;
  readonly _TEXT_NODE: 3;
  readonly _COMMENT_NODE: 8;
  readonly _DOCUMENT_FRAGMENT_NODE: 11;
};
/**
 * Union of supported DOM node type numeric constants.
 */
export type NodeType = (typeof NodeType)[keyof typeof NodeType];
