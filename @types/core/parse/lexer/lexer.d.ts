/**
 * @typedef {Object} LexerOptions
 * @property {(ch: string, codePoint: number) => boolean} [isIdentifierStart] - Custom function to determine if a character is a valid identifier start.
 * @property {(ch: string, codePoint: number) => boolean} [isIdentifierContinue] - Custom function to determine if a character is a valid identifier continuation.
 */
/**
 * Represents a lexer that tokenizes input text. The Lexer takes the original expression string and returns an array of tokens parsed from that string.
 * For example, the string "a + b" would result in tokens for a, +, and b.
 */
export class Lexer {
  /**
   * Creates an instance of Lexer.
   * @param {LexerOptions} options - Lexer options.
   */
  constructor(options: LexerOptions);
  /** @type {LexerOptions} */
  _options: LexerOptions;
  /**
   * Tokenizes the input text.
   * @param {string} text Input text to lex.
   * @returns {Array<Token>} Array of tokens.
   */
  _lex(text: string): Array<Token>;
  _text: string;
  _index: number;
  /** @type {Array<Token>} */
  _tokens: Array<Token>;
  /**
   * Checks if a character is contained in a set of characters.
   * @param {string} ch Character to check.
   * @param {string} chars Set of characters.
   * @returns {boolean} True if character is in the set, false otherwise.
   */
  _is(ch: string, chars: string): boolean;
  /**
   * Peeks at the next character in the text.
   * @param {number} [i=1] Number of characters to peek.
   * @returns {string|false} Next character or false if end of text.
   */
  _peek(i?: number): string | false;
  /**
   * Checks if a character is a number.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a number, false otherwise.
   */
  _isNumber(ch: string): boolean;
  /**
   * Checks if a character is whitespace.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is whitespace, false otherwise.
   */
  _isWhitespace(ch: string): boolean;
  /**
   * Checks if a character is a valid identifier start.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a valid identifier start, false otherwise.
   */
  _isIdentifierStart(ch: string): boolean;
  /**
   * Checks if a character is a valid identifier continuation.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a valid identifier continuation, false otherwise.
   */
  _isIdentifierContinue(ch: string): boolean;
  /**
   * Converts a character to its Unicode code point.
   * @param {string} ch Character to convert.
   * @returns {number} Unicode code point.
   */
  _codePointAt(ch: string): number;
  /**
   * Peeks at the next multicharacter sequence in the text.
   * @returns {string} Next multicharacter sequence.
   */
  _peekMultichar(): string;
  /**
   * Checks if a character is an exponent operator.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is an exponent operator, false otherwise.
   */
  _isExpOperator(ch: string): boolean;
  /**
   * Throws a lexer error.
   * @param {string} error Error message.
   * @param {number} [start] Start index.
   * @param {number} [end] End index.
   * @throws {Error} Lexer error.
   */
  _throwError(error: string, start?: number, end?: number): void;
  /**
   * Reads and tokenizes a number from the text.
   * @return {void}
   */
  _readNumber(): void;
  /**
   * Reads and tokenizes an identifier from the text.
   */
  _readIdent(): void;
  /**
   * Reads and tokenizes a string from the text.
   * @param {string} quote Quote character used for the string.
   */
  _readString(quote: string): void;
  /**
   * @returns {string}
   */
  _handleUnicodeEscape(): string;
}
export type Token = import("./token.ts").Token;
export type LexerOptions = {
  /**
   * - Custom function to determine if a character is a valid identifier start.
   */
  isIdentifierStart?: (ch: string, codePoint: number) => boolean;
  /**
   * - Custom function to determine if a character is a valid identifier continuation.
   */
  isIdentifierContinue?: (ch: string, codePoint: number) => boolean;
};
