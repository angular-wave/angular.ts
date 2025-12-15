import { ASTType } from "../ast-type.js";

/**
 * Represents a node in an Abstract Syntax Tree (AST).
 */
export type ASTNode = {
  /** The type of the AST node. */
  type: ASTType;

  /** The name of the identifier, if applicable. */
  name?: string;

  /** The kind of the property (e.g., 'init'). */
  kind?: string;

  /** The value of the node if it is a literal. */
  value?: any;

  /** The elements of an array node. */
  elements?: ASTNode[];

  /** The properties of an object node. */
  properties?: ASTNode[];

  /** The key of an object property. */
  key?: ASTNode;

  /** The left-hand side of a binary expression. */
  left?: ASTNode;

  /** The right-hand side of a binary expression. */
  right?: ASTNode;

  /** The argument of a unary expression. */
  argument?: ASTNode;

  /** The test expression of a conditional expression. */
  test?: ASTNode;

  /** The alternate expression of a conditional expression. */
  alternate?: ASTNode;

  /** The consequent expression of a conditional expression. */
  consequent?: ASTNode;

  /** The body of a program or block statement. */
  body?: ASTNode[];

  /** A list of expressions to observe in a program or block statement. */
  toWatch?: ASTNode[];

  /** The expression of an expression statement. */
  expression?: ASTNode;

  /** The callee of a call expression. */
  callee?: ASTNode;

  /** The arguments of a call expression. */
  arguments?: ASTNode[];

  /** Indicates if a unary operator is a prefix. */
  prefix?: boolean;

  /** The object of a member expression. */
  object?: ASTNode;

  /** The property of a member expression. */
  property?: ASTNode;

  /** Indicates if a member expression is computed. */
  computed?: boolean;

  /** The operator of a binary or logical expression. */
  operator?: string;

  /** Indicates if the expression should be filtered. */
  filter?: boolean;

  /** Indicates in node depends on non-shallow state of objects */
  isPure?: boolean;

  /** Indicates the expression is a contant */
  constant?: boolean;
};
