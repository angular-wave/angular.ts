import { ASTType } from "../ast-type.ts";

/** Base properties for all AST nodes */
interface BaseNode {
  /** The type of the AST node. */
  /** @internal */
  _type: ASTType;

  /** Indicates whether the node depends on non-shallow state. */
  /** @internal */
  _isPure?: boolean;

  /** Indicates whether the expression is a constant. */
  /** @internal */
  _constant?: boolean;

  /** Watch targets collected during AST decoration. */
  /** @internal */
  _toWatch?: ASTNode[];

  /** Generic expression payload fields used across legacy node shapes. */
  /** @internal */
  _expression?: ASTNode;
  /** @internal */
  _left?: ASTNode;
  /** @internal */
  _right?: ASTNode;
  /** @internal */
  _argument?: ASTNode;
  /** @internal */
  _test?: ASTNode;
  /** @internal */
  _alternate?: ASTNode;
  /** @internal */
  _consequent?: ASTNode;
  /** @internal */
  _callee?: ASTNode;
  /** @internal */
  _arguments?: ASTNode[];
  /** @internal */
  _object?: ASTNode;
  /** @internal */
  _property?: ASTNode;
  /** @internal */
  _computed?: boolean;
  /** @internal */
  _operator?: string;
  /** @internal */
  _filter?: boolean;
  /** @internal */
  _prefix?: boolean;
  /** @internal */
  _name?: string;
  /** @internal */
  _value?: unknown;
  /** @internal */
  _elements?: ASTNode[];
  /** @internal */
  _properties?: ASTNode[];
  /** @internal */
  _body?: ASTNode[];
  /** @internal */
  _key?: ASTNode;
  /** @internal */
  _input?: unknown;
  /** @internal */
  _watchId?: string;
}

/** A node that contains a list of statements, e.g., Program or BlockStatement */
export interface BodyNode extends BaseNode {
  /** The body of the program or block. Always present; empty if no statements. */
  /** @internal */
  _body: ASTNode[];

  /** Optional list of expressions to observe for changes (Angular-specific). */
  /** @internal */
  _toWatch: ASTNode[];
}

/** Expression nodes, e.g., BinaryExpression, UnaryExpression, ConditionalExpression, CallExpression, MemberExpression */
export interface ExpressionNode extends BaseNode {
  /** The single expression contained by an ExpressionStatement. */
  /** @internal */
  _expression?: ASTNode;

  /** The left-hand side of a binary or logical expression. */
  /** @internal */
  _left?: ASTNode;

  /** The right-hand side of a binary or logical expression. */
  /** @internal */
  _right?: ASTNode;

  /** The argument of a unary expression. */
  /** @internal */
  _argument?: ASTNode;

  /** The test expression of a conditional expression. */
  /** @internal */
  _test?: ASTNode;

  /** The alternate expression of a conditional expression. */
  /** @internal */
  _alternate?: ASTNode;

  /** The consequent expression of a conditional expression. */
  /** @internal */
  _consequent?: ASTNode;

  /** The callee of a function or method call expression. */
  /** @internal */
  _callee?: ASTNode;

  /** The arguments of a function or method call expression. */
  /** @internal */
  _arguments?: ASTNode[];

  /** The object of a member expression (e.g., `obj` in `obj.prop`). */
  /** @internal */
  _object?: ASTNode;

  /** The property of a member expression (e.g., `prop` in `obj.prop`). */
  /** @internal */
  _property?: ASTNode;

  /** Indicates if the member expression is computed (`obj[prop]` vs `obj.prop`). */
  /** @internal */
  _computed?: boolean;

  /** The operator of a binary or logical expression, e.g., "+", "*", "&&". */
  /** @internal */
  _operator?: string;

  /** Indicates if the expression should be filtered (Angular-specific). */
  /** @internal */
  _filter?: boolean;

  /** Indicates if the unary operator is a prefix, e.g., `++i` vs `i++`. */
  /** @internal */
  _prefix?: boolean;
}

/** Leaf node representing a literal or identifier */
export interface LiteralNode extends BaseNode {
  /** The value of a literal node, e.g., number, string, boolean. */
  /** @internal */
  _value?: unknown;

  /** The name of an identifier node. */
  /** @internal */
  _name?: string;
}

/** Node representing an array literal */
export interface ArrayNode extends BaseNode {
  /** The elements of the array. */
  /** @internal */
  _elements: ASTNode[];
}

/** Node representing an object literal */
export interface ObjectNode extends BaseNode {
  /** The properties of the object. */
  /** @internal */
  _properties: ASTNode[];
}

/** Node representing a single property of an object literal */
export interface ObjectPropertyNode extends BaseNode {
  /** Property key: identifier, literal, or expression */
  /** @internal */
  _key: ASTNode;

  /** Property value expression */
  /** @internal */
  _value: ASTNode;

  /** Whether the property key is computed (`{ [expr]: value }`) */
  /** @internal */
  _computed: boolean;
}

/** Statement node that wraps an expression */
export interface ExpressionStatementNode extends BaseNode {
  /** The expression contained in this statement. */
  /** @internal */
  _expression: ASTNode;
}

/** The union type covering all AST nodes */
export type ASTNode =
  | BodyNode
  | ExpressionNode
  | LiteralNode
  | ArrayNode
  | ObjectNode
  | ObjectPropertyNode
  | ExpressionStatementNode;
