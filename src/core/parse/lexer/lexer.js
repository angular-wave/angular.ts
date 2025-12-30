/* eslint-disable id-length */
/* eslint-disable no-magic-numbers */
import { isDefined, minErr } from "../../../shared/utils.js";

/**
 * @typedef {import("./token.ts").Token} Token
 */

const $parseMinErr = minErr("$parse");

/** @type {Record<string, any>} */
const ESCAPE = {
  n: "\n",
  f: "\f",
  r: "\r",
  t: "\t",
  v: "\v",
  "'": "'",
  '"': '"',
};

const OPERATORS = new Set(
  "+ - * / % === !== == != < > <= >= && || ! = |".split(" "),
);

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
  constructor(options) {
    /** @type {LexerOptions} */
    this._options = options;
    this._text = "";
    this._index = 0;
  }

  /**
   * Tokenizes the input text.
   * @param {string} text Input text to lex.
   * @returns {Array<Token>} Array of tokens.
   */
  _lex(text) {
    this._text = text;
    this._index = 0;
    /** @type {Array<Token>} */
    this._tokens = [];

    while (this._index < this._text.length) {
      const ch = this._text.charAt(this._index);

      if (ch === '"' || ch === "'") {
        this._readString(ch);
      } else if (
        this._isNumber(ch) ||
        (ch === "." && this._isNumber(/** @type {string} */ (this._peek())))
      ) {
        this._readNumber();
      } else if (
        this._isIdentifierStart &&
        this._isIdentifierStart(this._peekMultichar())
      ) {
        this._readIdent();
      } else if (this._is(ch, "(){}[].,;:?")) {
        this._tokens.push({ index: this._index, text: ch });
        this._index++;
      } else if (this._isWhitespace(ch)) {
        this._index++;
      } else {
        const ch2 = ch + this._peek();

        const ch3 = ch2 + this._peek(2);

        const op1 = OPERATORS.has(ch);

        const op2 = OPERATORS.has(ch2);

        const op3 = OPERATORS.has(ch3);

        if (op1 || op2 || op3) {
          const token = op3 ? ch3 : op2 ? ch2 : ch;

          this._tokens.push({
            index: this._index,
            text: token,
            operator: true,
          });
          this._index += token.length;
        } else {
          this._throwError(
            "Unexpected next character ",
            this._index,
            this._index + 1,
          );
        }
      }
    }

    return this._tokens;
  }

  /**
   * Checks if a character is contained in a set of characters.
   * @param {string} ch Character to check.
   * @param {string} chars Set of characters.
   * @returns {boolean} True if character is in the set, false otherwise.
   */
  _is(ch, chars) {
    return chars.indexOf(ch) !== -1;
  }

  /**
   * Peeks at the next character in the text.
   * @param {number} [i=1] Number of characters to peek.
   * @returns {string|false} Next character or false if end of text.
   */
  _peek(i) {
    const num = i || 1;

    return this._index + num < this._text.length
      ? this._text.charAt(this._index + num)
      : false;
  }

  /**
   * Checks if a character is a number.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a number, false otherwise.
   */
  _isNumber(ch) {
    return ch >= "0" && ch <= "9" && typeof ch === "string";
  }

  /**
   * Checks if a character is whitespace.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is whitespace, false otherwise.
   */
  _isWhitespace(ch) {
    return (
      ch === " " || ch === "\r" || ch === "\t" || ch === "\n" || ch === "\v"
    );
  }

  /**
   * Checks if a character is a valid identifier start.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a valid identifier start, false otherwise.
   */
  _isIdentifierStart(ch) {
    return this._options.isIdentifierStart
      ? this._options.isIdentifierStart(ch, this._codePointAt(ch))
      : (ch >= "a" && ch <= "z") ||
          (ch >= "A" && ch <= "Z") ||
          ch === "_" ||
          ch === "$";
  }

  /**
   * Checks if a character is a valid identifier continuation.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is a valid identifier continuation, false otherwise.
   */
  _isIdentifierContinue(ch) {
    return this._options.isIdentifierContinue
      ? this._options.isIdentifierContinue(ch, this._codePointAt(ch))
      : (ch >= "a" && ch <= "z") ||
          (ch >= "A" && ch <= "Z") ||
          ch === "_" ||
          ch === "$" ||
          (ch >= "0" && ch <= "9");
  }

  /**
   * Converts a character to its Unicode code point.
   * @param {string} ch Character to convert.
   * @returns {number} Unicode code point.
   */
  _codePointAt(ch) {
    if (ch.length === 1) return ch.charCodeAt(0);

    return (ch.charCodeAt(0) << 10) + ch.charCodeAt(1) - 0x35fdc00;
  }

  /**
   * Peeks at the next multicharacter sequence in the text.
   * @returns {string} Next multicharacter sequence.
   */
  _peekMultichar() {
    const ch = this._text.charAt(this._index);

    const peek = this._peek();

    if (!peek) {
      return ch;
    }
    const cp1 = ch.charCodeAt(0);

    const cp2 = peek.charCodeAt(0);

    if (cp1 >= 0xd800 && cp1 <= 0xdbff && cp2 >= 0xdc00 && cp2 <= 0xdfff) {
      return ch + peek;
    }

    return ch;
  }

  /**
   * Checks if a character is an exponent operator.
   * @param {string} ch Character to check.
   * @returns {boolean} True if character is an exponent operator, false otherwise.
   */
  _isExpOperator(ch) {
    return ch === "-" || ch === "+" || this._isNumber(ch);
  }

  /**
   * Throws a lexer error.
   * @param {string} error Error message.
   * @param {number} [start] Start index.
   * @param {number} [end] End index.
   * @throws {Error} Lexer error.
   */
  _throwError(error, start, end) {
    end = end || this._index;
    const colStr = isDefined(start)
      ? `s ${start}-${this._index} [${this._text.substring(start, end)}]`
      : ` ${end}`;

    throw $parseMinErr(
      "lexerr",
      `Lexer Error: ${error} at column${colStr} in expression [${this._text}].`,
    );
  }

  /**
   * Reads and tokenizes a number from the text.
   * @return {void}
   */
  _readNumber() {
    let number = "";

    const start = this._index;

    while (this._index < this._text.length) {
      const ch = this._text.charAt(this._index).toLowerCase();

      if (ch === "." || this._isNumber(ch)) {
        number += ch;
      } else {
        const peekCh = this._peek();

        if (ch === "e" && this._isExpOperator(/** @type {string} */ (peekCh))) {
          number += ch;
        } else if (
          this._isExpOperator(ch) &&
          peekCh &&
          this._isNumber(peekCh) &&
          number.charAt(number.length - 1) === "e"
        ) {
          number += ch;
        } else if (
          this._isExpOperator(ch) &&
          (!peekCh || !this._isNumber(peekCh)) &&
          number.charAt(number.length - 1) === "e"
        ) {
          this._throwError("Invalid exponent");
        } else {
          break;
        }
      }
      this._index++;
    }
    /** @type {Array<Token>} */ (this._tokens).push({
      index: start,
      text: number,
      constant: true,
      value: Number(number),
    });
  }

  /**
   * Reads and tokenizes an identifier from the text.
   */
  _readIdent() {
    const start = this._index;

    this._index += this._peekMultichar().length;

    while (this._index < this._text.length) {
      const ch = this._peekMultichar();

      if (this._isIdentifierContinue && !this._isIdentifierContinue(ch)) {
        break;
      }
      this._index += ch.length;
    }
    /** @type {Array<Token>} */ (this._tokens).push({
      index: start,
      text: this._text.slice(start, this._index),
      identifier: true,
    });
  }

  /**
   * Reads and tokenizes a string from the text.
   * @param {string} quote Quote character used for the string.
   */
  _readString(quote) {
    const start = this._index;

    let string = "";

    let escape = false;

    this._index++; // Skip opening quote

    while (this._index < this._text.length) {
      const ch = this._text[this._index];

      if (escape) {
        if (ch === "u") {
          // Handle unicode escapes
          // Simplified for brevity
          string += this._handleUnicodeEscape();
        } else {
          string += ESCAPE[ch] || ch;
        }
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === quote) {
        /** @type {Array<Token>} */ (this._tokens).push({
          index: start,
          text: this._text.slice(start, this._index + 1),
          constant: true,
          value: string,
        });
        this._index++; // Skip closing quote

        return;
      } else {
        string += ch;
      }

      this._index++;
    }

    this._throwError("Unterminated quote", start);
  }

  /**
   * @returns {string}
   */
  _handleUnicodeEscape() {
    const hex = this._text.substring(this._index + 1, this._index + 5);

    if (!hex.match(/[\da-f]{4}/i)) {
      this._throwError(`Invalid unicode escape [\\u${hex}]`);
    }
    this._index += 4; // Move index past the four hexadecimal digits

    return String.fromCharCode(parseInt(hex, 16));
  }
}
