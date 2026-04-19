/**
 * Represents a token produced by the lexer, which will be used by the AST to construct an abstract syntax tree.
 */
export interface Token {
  /** Index of the token. */
  /** @internal */
  _index: number;

  /** Text of the token. */
  /** @internal */
  _text: string;

  /** Indicates if token is an identifier. */
  /** @internal */
  _identifier?: boolean;

  /** Indicates if token is a constant. */
  /** @internal */
  _constant?: boolean;

  /** Value of the token if it's a constant. */
  /** @internal */
  _value?: string | number;

  /** Indicates if token is an operator. */
  /** @internal */
  _operator?: boolean;
}
