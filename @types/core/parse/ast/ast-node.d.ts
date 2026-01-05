import { ASTType } from "../ast-type.js";
/** The kind of an object property */
export type PropertyKind = "init" | "get" | "set";
/** Base properties for all AST nodes */
interface BaseNode {
  /** The type of the AST node. */
  type: ASTType;
  /** Indicates whether the node depends on non-shallow state. */
  isPure?: boolean;
  /** Indicates whether the expression is a constant. */
  constant?: boolean;
}
/** A node that contains a list of statements, e.g., Program or BlockStatement */
export interface BodyNode extends BaseNode {
  /** The body of the program or block. Always present; empty if no statements. */
  body: ASTNode[];
  /** Optional list of expressions to observe for changes (Angular-specific). */
  toWatch: ASTNode[];
}
/** Expression nodes, e.g., BinaryExpression, UnaryExpression, ConditionalExpression, CallExpression, MemberExpression */
export interface ExpressionNode extends BaseNode {
  /** The single expression contained by an ExpressionStatement. */
  expression?: ASTNode;
  /** The left-hand side of a binary or logical expression. */
  left?: ASTNode;
  /** The right-hand side of a binary or logical expression. */
  right?: ASTNode;
  /** The argument of a unary expression. */
  argument?: ASTNode;
  /** The test expression of a conditional expression. */
  test?: ASTNode;
  /** The alternate expression of a conditional expression. */
  alternate?: ASTNode;
  /** The consequent expression of a conditional expression. */
  consequent?: ASTNode;
  /** The callee of a function or method call expression. */
  callee?: ASTNode;
  /** The arguments of a function or method call expression. */
  arguments?: ASTNode[];
  /** The object of a member expression (e.g., `obj` in `obj.prop`). */
  object?: ASTNode;
  /** The property of a member expression (e.g., `prop` in `obj.prop`). */
  property?: ASTNode;
  /** Indicates if the member expression is computed (`obj[prop]` vs `obj.prop`). */
  computed?: boolean;
  /** The operator of a binary or logical expression, e.g., "+", "*", "&&". */
  operator?: string;
  /** Indicates if the expression should be filtered (Angular-specific). */
  filter?: boolean;
  /** Indicates if the unary operator is a prefix, e.g., `++i` vs `i++`. */
  prefix?: boolean;
}
/** Leaf node representing a literal or identifier */
export interface LiteralNode extends BaseNode {
  /** The value of a literal node, e.g., number, string, boolean. */
  value?: any;
  /** The name of an identifier node. */
  name?: string;
}
/** Node representing an array literal */
export interface ArrayNode extends BaseNode {
  /** The elements of the array. */
  elements: ASTNode[];
}
/** Node representing an object literal */
export interface ObjectNode extends BaseNode {
  /** The properties of the object. */
  properties: ASTNode[];
}
/** Node representing a single property of an object literal */
export interface ObjectPropertyNode extends BaseNode {
  /** Property kind (only "init" is used in Angular expressions) */
  kind: "init";
  /** Property key: identifier, literal, or expression */
  key: ASTNode;
  /** Property value expression */
  value: ASTNode;
  /** Whether the property key is computed (`{ [expr]: value }`) */
  computed: boolean;
}
/** Statement node that wraps an expression */
export interface ExpressionStatementNode extends BaseNode {
  /** The expression contained in this statement. */
  expression: ASTNode;
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
export {};
