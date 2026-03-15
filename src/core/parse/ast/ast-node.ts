import { ASTType } from "../ast-type.ts";

/** Base properties for all AST nodes */
interface BaseNode {
  /** The type of the AST node. */
  _type: ASTType;

  /** Indicates whether the node depends on non-shallow state. */
  _isPure?: boolean;

  /** Indicates whether the expression is a constant. */
  _constant?: boolean;

  /** Watch targets collected during AST decoration. */
  _toWatch?: ASTNode[];

  /** Generic expression payload fields used across legacy node shapes. */
  _expression?: ASTNode;
  _left?: ASTNode;
  _right?: ASTNode;
  _argument?: ASTNode;
  _test?: ASTNode;
  _alternate?: ASTNode;
  _consequent?: ASTNode;
  _callee?: ASTNode;
  _arguments?: ASTNode[];
  _object?: ASTNode;
  _property?: ASTNode;
  _computed?: boolean;
  _operator?: string;
  _filter?: boolean;
  _prefix?: boolean;
  _name?: string;
  _value?: any;
  _elements?: ASTNode[];
  _properties?: ASTNode[];
  _body?: ASTNode[];
  _key?: ASTNode;
  _input?: any;
  _watchId?: string;
}

/** A node that contains a list of statements, e.g., Program or BlockStatement */
export interface BodyNode extends BaseNode {
  /** The body of the program or block. Always present; empty if no statements. */
  _body: ASTNode[];

  /** Optional list of expressions to observe for changes (Angular-specific). */
  _toWatch: ASTNode[];
}

/** Expression nodes, e.g., BinaryExpression, UnaryExpression, ConditionalExpression, CallExpression, MemberExpression */
export interface ExpressionNode extends BaseNode {
  /** The single expression contained by an ExpressionStatement. */
  _expression?: ASTNode;

  /** The left-hand side of a binary or logical expression. */
  _left?: ASTNode;

  /** The right-hand side of a binary or logical expression. */
  _right?: ASTNode;

  /** The argument of a unary expression. */
  _argument?: ASTNode;

  /** The test expression of a conditional expression. */
  _test?: ASTNode;

  /** The alternate expression of a conditional expression. */
  _alternate?: ASTNode;

  /** The consequent expression of a conditional expression. */
  _consequent?: ASTNode;

  /** The callee of a function or method call expression. */
  _callee?: ASTNode;

  /** The arguments of a function or method call expression. */
  _arguments?: ASTNode[];

  /** The object of a member expression (e.g., `obj` in `obj.prop`). */
  _object?: ASTNode;

  /** The property of a member expression (e.g., `prop` in `obj.prop`). */
  _property?: ASTNode;

  /** Indicates if the member expression is computed (`obj[prop]` vs `obj.prop`). */
  _computed?: boolean;

  /** The operator of a binary or logical expression, e.g., "+", "*", "&&". */
  _operator?: string;

  /** Indicates if the expression should be filtered (Angular-specific). */
  _filter?: boolean;

  /** Indicates if the unary operator is a prefix, e.g., `++i` vs `i++`. */
  _prefix?: boolean;
}

/** Leaf node representing a literal or identifier */
export interface LiteralNode extends BaseNode {
  /** The value of a literal node, e.g., number, string, boolean. */
  _value?: any;

  /** The name of an identifier node. */
  _name?: string;
}

/** Node representing an array literal */
export interface ArrayNode extends BaseNode {
  /** The elements of the array. */
  _elements: ASTNode[];
}

/** Node representing an object literal */
export interface ObjectNode extends BaseNode {
  /** The properties of the object. */
  _properties: ASTNode[];
}

/** Node representing a single property of an object literal */
export interface ObjectPropertyNode extends BaseNode {
  /** Property key: identifier, literal, or expression */
  _key: ASTNode;

  /** Property value expression */
  _value: ASTNode;

  /** Whether the property key is computed (`{ [expr]: value }`) */
  _computed: boolean;
}

/** Statement node that wraps an expression */
export interface ExpressionStatementNode extends BaseNode {
  /** The expression contained in this statement. */
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
