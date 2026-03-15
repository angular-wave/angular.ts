/* eslint-disable id-length */
/* eslint-disable no-magic-numbers */
import { isDefined, minErr } from "../../../shared/utils.ts";
import type { Token } from "./token.ts";

export type { Token } from "./token.ts";

const $parseMinErr = minErr("$parse");

const ESCAPE: Record<string, string> = {
  n: "\n",
  f: "\f",
  r: "\r",
  t: "\t",
  v: "\v",
  "'": "'",
  '"': '"',
};

const OPERATORS = new Set<string>(
  "+ - * / % ++ -- === !== == != < > <= >= && || ! = |".split(" "),
);

/**
 * Represents a lexer that tokenizes input text. The Lexer takes the original
 * expression string and returns an array of tokens parsed from that string.
 */
export class Lexer {
  _text: string;
  _index: number;
  _tokens: Token[];

  /**
   * The optional parameter is ignored and only exists to preserve current JS
   * call sites that still instantiate the lexer with an unused config object.
   *
   * @param _options
   */
  constructor(_options?: unknown) {
    this._text = "";
    this._index = 0;
    this._tokens = [];
  }

  /**
   * Tokenizes the input text.
   * @param text
   * @returns Array of tokens.
   */
  _lex(text: string): Token[] {
    this._text = text;
    this._index = 0;
    this._tokens = [];

    while (this._index < this._text.length) {
      const ch = this._text.charAt(this._index);
      const peek = this._peek();

      if (ch === '"' || ch === "'") {
        this._readString(ch);
      } else if (this._isNumber(ch) || (ch === "." && this._isNumber(peek))) {
        this._readNumber();
      } else if (this._isIdentifierStart(this._peekMultichar())) {
        this._readIdent();
      } else if (this._is(ch, "(){}[].,;:?")) {
        this._tokens.push({ index: this._index, text: ch });
        this._index++;
      } else if (this._isWhitespace(ch)) {
        this._index++;
      } else {
        const ch2 = ch + (peek || "");
        const ch3 = ch2 + (this._peek(2) || "");
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
   */
  _is(ch: string, chars: string): boolean {
    return chars.indexOf(ch) !== -1;
  }

  /**
   * Peeks at the next character in the text.
   */
  _peek(i = 1): string | false {
    return this._index + i < this._text.length
      ? this._text.charAt(this._index + i)
      : false;
  }

  /**
   * Checks if a character is a number.
   */
  _isNumber(ch: unknown): boolean {
    return typeof ch === "string" && ch >= "0" && ch <= "9";
  }

  /**
   * Checks if a character is whitespace.
   */
  _isWhitespace(ch: string): boolean {
    return (
      ch === " " || ch === "\r" || ch === "\t" || ch === "\n" || ch === "\v"
    );
  }

  /**
   * Checks if a character is a valid identifier start.
   */
  _isIdentifierStart(ch: string): boolean {
    return (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      ch === "_" ||
      ch === "$"
    );
  }

  /**
   * Checks if a character is a valid identifier continuation.
   */
  _isIdentifierContinue(ch: string): boolean {
    return (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      ch === "_" ||
      ch === "$" ||
      (ch >= "0" && ch <= "9")
    );
  }

  /**
   * Peeks at the next multicharacter sequence in the text.
   */
  _peekMultichar(): string {
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
   */
  _isExpOperator(ch: unknown): boolean {
    return ch === "-" || ch === "+" || this._isNumber(ch);
  }

  /**
   * Throws a lexer error.
   */
  _throwError(error: string, start?: number, end?: number): never {
    const endIndex = end ?? this._index;
    const colStr = isDefined(start)
      ? `s ${start}-${this._index} [${this._text.substring(start, endIndex)}]`
      : ` ${endIndex}`;

    throw $parseMinErr(
      "lexerr",
      `Lexer Error: ${error} at column${colStr} in expression [${this._text}].`,
    );
  }

  /**
   * Reads and tokenizes a number from the text.
   */
  _readNumber(): void {
    let number = "";
    const start = this._index;

    while (this._index < this._text.length) {
      const ch = this._text.charAt(this._index).toLowerCase();

      if (ch === "." || this._isNumber(ch)) {
        number += ch;
      } else {
        const peekCh = this._peek();

        if (ch === "e" && this._isExpOperator(peekCh)) {
          number += ch;
        } else if (
          this._isExpOperator(ch) &&
          this._isNumber(peekCh) &&
          number.charAt(number.length - 1) === "e"
        ) {
          number += ch;
        } else if (
          this._isExpOperator(ch) &&
          !this._isNumber(peekCh) &&
          number.charAt(number.length - 1) === "e"
        ) {
          this._throwError("Invalid exponent");
        } else {
          break;
        }
      }
      this._index++;
    }

    this._tokens.push({
      index: start,
      text: number,
      constant: true,
      value: Number(number),
    });
  }

  /**
   * Reads and tokenizes an identifier from the text.
   */
  _readIdent(): void {
    const start = this._index;

    this._index += this._peekMultichar().length;

    while (this._index < this._text.length) {
      const ch = this._peekMultichar();

      if (!this._isIdentifierContinue(ch)) {
        break;
      }
      this._index += ch.length;
    }

    this._tokens.push({
      index: start,
      text: this._text.slice(start, this._index),
      identifier: true,
    });
  }

  /**
   * Reads and tokenizes a string from the text.
   */
  _readString(quote: string): void {
    const start = this._index;
    let string = "";
    let escape = false;

    this._index++;

    while (this._index < this._text.length) {
      const ch = this._text[this._index];

      if (escape) {
        if (ch === "u") {
          string += this._handleUnicodeEscape();
        } else {
          string += ESCAPE[ch] || ch;
        }
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === quote) {
        this._tokens.push({
          index: start,
          text: this._text.slice(start, this._index + 1),
          constant: true,
          value: string,
        });
        this._index++;

        return;
      } else {
        string += ch;
      }

      this._index++;
    }

    this._throwError("Unterminated quote", start);
  }

  _handleUnicodeEscape(): string {
    const hex = this._text.substring(this._index + 1, this._index + 5);

    if (!/[\da-f]{4}/i.test(hex)) {
      this._throwError(`Invalid unicode escape [\\u${hex}]`);
    }
    this._index += 4;

    return String.fromCharCode(parseInt(hex, 16));
  }
}
