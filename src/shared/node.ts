/**
 * DOM node type numeric constants used in compile/directive helpers.
 */
export const NodeType = {
  _ELEMENT_NODE: 1,
  _DOCUMENT_NODE: 9,
  _TEXT_NODE: 3,
  _COMMENT_NODE: 8,
  _DOCUMENT_FRAGMENT_NODE: 11,
} as const;

/**
 * Union of supported DOM node type numeric constants.
 */
export type NodeType = (typeof NodeType)[keyof typeof NodeType];
