import type { Token } from "./token.ts";
export type { Token } from "./token.ts";
/**
 * Represents a lexer that tokenizes input text. The Lexer takes the original
 * expression string and returns an array of tokens parsed from that string.
 */
export declare class Lexer {
  _text: string;
  _index: number;
  _tokens: Token[];
  /**
   * The optional parameter is ignored and only exists to preserve current JS
   * call sites that still instantiate the lexer with an unused config object.
   *
   * @param _options
   */
  constructor(_options?: unknown);
  /**
   * Tokenizes the input text.
   * @param text
   * @returns Array of tokens.
   */
  _lex(text: string): Token[];
  /**
   * Checks if a character is contained in a set of characters.
   */
  _is(ch: string, chars: string): boolean;
  /**
   * Peeks at the next character in the text.
   */
  _peek(i?: number): string | false;
  /**
   * Checks if a character is a number.
   */
  _isNumber(ch: unknown): boolean;
  /**
   * Checks if a character is whitespace.
   */
  _isWhitespace(ch: string): boolean;
  /**
   * Checks if a character is a valid identifier start.
   */
  _isIdentifierStart(ch: string): boolean;
  /**
   * Checks if a character is a valid identifier continuation.
   */
  _isIdentifierContinue(ch: string): boolean;
  /**
   * Peeks at the next multicharacter sequence in the text.
   */
  _peekMultichar(): string;
  /**
   * Checks if a character is an exponent operator.
   */
  _isExpOperator(ch: unknown): boolean;
  /**
   * Throws a lexer error.
   */
  _throwError(error: string, start?: number, end?: number): never;
  /**
   * Reads and tokenizes a number from the text.
   */
  _readNumber(): void;
  /**
   * Reads and tokenizes an identifier from the text.
   */
  _readIdent(): void;
  /**
   * Reads and tokenizes a string from the text.
   */
  _readString(quote: string): void;
  _handleUnicodeEscape(): string;
}
