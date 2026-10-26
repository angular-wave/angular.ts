import type { ASTType } from "../ast-type.ts";
import type { CompiledExpression } from "../parse.ts";

/** Analysis metadata shared by the parser and interpreter. */
interface NodeMetadata {
  /** @internal */
  _isPure?: boolean;
  /** @internal */
  _constant?: boolean;
  /** @internal */
  _toWatch?: ASTNode[];
  /** @internal */
  _input?: CompiledExpression;
  /** @internal */
  _watchId?: string;
}

export interface BodyNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._Program;
  /** @internal */
  _body: ExpressionStatementNode[];
}

export interface ExpressionStatementNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._ExpressionStatement;
  /** @internal */
  _expression: ExpressionNode;
}

export interface IdentifierNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._Identifier;
  /** @internal */
  _name: string;
}

export interface LiteralNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._Literal;
  /** @internal */
  _value: unknown;
}

export interface ContextNode extends NodeMetadata {
  /** @internal */
  _type:
    | typeof ASTType._ThisExpression
    | typeof ASTType._LocalsExpression
    | typeof ASTType._NGValueParameter;
}

export interface UnaryNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._UnaryExpression;
  /** @internal */
  _operator: string;
  /** @internal */
  _prefix: boolean;
  /** @internal */
  _argument: ExpressionNode;
}

export interface BinaryNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._BinaryExpression | typeof ASTType._LogicalExpression;
  /** @internal */
  _operator: string;
  /** @internal */
  _left: ExpressionNode;
  /** @internal */
  _right: ExpressionNode;
}

export interface AssignmentNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._AssignmentExpression;
  /** @internal */
  _operator: "=";
  /** @internal */
  _left: AssignableNode;
  /** @internal */
  _right: ExpressionNode;
}

export interface ConditionalNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._ConditionalExpression;
  /** @internal */
  _test: ExpressionNode;
  /** @internal */
  _alternate: ExpressionNode;
  /** @internal */
  _consequent: ExpressionNode;
}

export interface CallNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._CallExpression;
  /** @internal */
  _callee: ExpressionNode;
  /** @internal */
  _arguments: ExpressionNode[];
  /** @internal */
  _filter?: boolean;
}

export interface MemberNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._MemberExpression;
  /** @internal */
  _object: ExpressionNode;
  /** @internal */
  _property: ExpressionNode;
  /** @internal */
  _computed: boolean;
}

export type AssignableNode = IdentifierNode | MemberNode;

export interface UpdateNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._UpdateExpression;
  /** @internal */
  _operator: string;
  /** @internal */
  _prefix: boolean;
  /** @internal */
  _argument: AssignableNode;
}

export interface ArrayNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._ArrayExpression;
  /** @internal */
  _elements: ExpressionNode[];
}

export interface ObjectNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._ObjectExpression;
  /** @internal */
  _properties: ObjectPropertyNode[];
}

export interface ObjectPropertyNode extends NodeMetadata {
  /** @internal */
  _type: typeof ASTType._Property;
  /** @internal */
  _key: ExpressionNode;
  /** @internal */
  _value: ExpressionNode;
  /** @internal */
  _computed: boolean;
}

/** Expressions are distinguished by their required payload and node tag. */
export type ExpressionNode =
  | IdentifierNode
  | LiteralNode
  | ContextNode
  | UnaryNode
  | BinaryNode
  | AssignmentNode
  | ConditionalNode
  | CallNode
  | MemberNode
  | UpdateNode
  | ArrayNode
  | ObjectNode;

/** Every parser node, including the program and object-property wrappers. */
export type ASTNode =
  | BodyNode
  | ExpressionStatementNode
  | ObjectPropertyNode
  | ExpressionNode;
