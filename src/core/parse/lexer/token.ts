/**
 * Represents a token produced by the lexer, which will be used by the AST to construct an abstract syntax tree.
 */
export interface Token {
  /** Index of the token. */
  _index: number;

  /** Text of the token. */
  _text: string;

  /** Indicates if token is an identifier. */
  _identifier?: boolean;

  /** Indicates if token is a constant. */
  _constant?: boolean;

  /** Value of the token if it's a constant. */
  _value?: string | number;

  /** Indicates if token is an operator. */
  _operator?: boolean;
}
