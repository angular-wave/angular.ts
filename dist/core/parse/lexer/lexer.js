import { isString, isDefined, minErr } from '../../../shared/utils.js';

const $parseMinErr = minErr("$parse");
/* eslint-disable id-length */
const ESCAPE = {
    n: "\n",
    f: "\f",
    r: "\r",
    t: "\t",
    v: "\v",
    "'": "'",
    '"': '"',
};
/* eslint-enable id-length */
const OPERATORS = new Set("+ - * / % ++ -- === !== == != < > <= >= && || ! = |".split(" "));
/**
 * Represents a lexer that tokenizes input text. The Lexer takes the original
 * expression string and returns an array of tokens parsed from that string.
 */
class Lexer {
    /**
     * The optional parameter is ignored and only exists to preserve current JS
     * call sites that still instantiate the lexer with an unused config object.
     *
     * @param _options
     */
    constructor(options) {
        this._text = "";
        this._index = 0;
        this._tokens = [];
    }
    /**
     * Tokenizes the input text.
     * @param text
     * @returns Array of tokens.
     */
    /** @internal */
    _lex(text) {
        this._text = text;
        this._index = 0;
        this._tokens = [];
        while (this._index < this._text.length) {
            const ch = this._text.charAt(this._index);
            const peek = this._peek();
            if (ch === '"' || ch === "'") {
                this._readString(ch);
            }
            else if (this._isNumber(ch) || (ch === "." && this._isNumber(peek))) {
                this._readNumber();
            }
            else if (this._isIdentifierStart(this._peekMultichar())) {
                this._readIdent();
            }
            else if (this._is(ch, "(){}[].,;:?")) {
                this._tokens.push({ _index: this._index, _text: ch });
                this._index++;
            }
            else if (this._isWhitespace(ch)) {
                this._index++;
            }
            else {
                const ch2 = ch + (peek || "");
                const ch3 = ch2 + (this._peek(2) || "");
                const op1 = OPERATORS.has(ch);
                const op2 = OPERATORS.has(ch2);
                const op3 = OPERATORS.has(ch3);
                if (op1 || op2 || op3) {
                    const token = op3 ? ch3 : op2 ? ch2 : ch;
                    this._tokens.push({
                        _index: this._index,
                        _text: token,
                        _operator: true,
                    });
                    this._index += token.length;
                }
                else {
                    this._throwError("Unexpected next character ", this._index, this._index + 1);
                }
            }
        }
        return this._tokens;
    }
    /**
     * Checks if a character is contained in a set of characters.
     */
    /** @internal */
    _is(ch, chars) {
        return chars.indexOf(ch) !== -1;
    }
    /**
     * Peeks at the next character in the text.
     */
    /** @internal */
    _peek(i = 1) {
        return this._index + i < this._text.length
            ? this._text.charAt(this._index + i)
            : false;
    }
    /**
     * Checks if a character is a number.
     */
    /** @internal */
    _isNumber(ch) {
        return isString(ch) && ch >= "0" && ch <= "9";
    }
    /**
     * Checks if a character is whitespace.
     */
    /** @internal */
    _isWhitespace(ch) {
        return (ch === " " || ch === "\r" || ch === "\t" || ch === "\n" || ch === "\v");
    }
    /**
     * Checks if a character is a valid identifier start.
     */
    /** @internal */
    _isIdentifierStart(ch) {
        return ((ch >= "a" && ch <= "z") ||
            (ch >= "A" && ch <= "Z") ||
            ch === "_" ||
            ch === "$");
    }
    /**
     * Checks if a character is a valid identifier continuation.
     */
    /** @internal */
    _isIdentifierContinue(ch) {
        return ((ch >= "a" && ch <= "z") ||
            (ch >= "A" && ch <= "Z") ||
            ch === "_" ||
            ch === "$" ||
            (ch >= "0" && ch <= "9"));
    }
    /**
     * Peeks at the next multicharacter sequence in the text.
     */
    /** @internal */
    _peekMultichar() {
        const ch = this._text.charAt(this._index);
        const peek = this._peek();
        if (!peek) {
            return ch;
        }
        const cp1 = ch.charCodeAt(0);
        const cp2 = peek.charCodeAt(0);
        // eslint-disable-next-line no-magic-numbers
        if (cp1 >= 0xd800 && cp1 <= 0xdbff && cp2 >= 0xdc00 && cp2 <= 0xdfff) {
            return ch + peek;
        }
        return ch;
    }
    /**
     * Checks if a character is an exponent operator.
     */
    /** @internal */
    _isExpOperator(ch) {
        return ch === "-" || ch === "+" || this._isNumber(ch);
    }
    /**
     * Throws a lexer error.
     */
    /** @internal */
    _throwError(error, start, end) {
        const endIndex = end ?? this._index;
        const colStr = isDefined(start)
            ? `s ${start}-${this._index} [${this._text.substring(start, endIndex)}]`
            : ` ${endIndex}`;
        throw $parseMinErr("lexerr", `Lexer Error: ${error} at column${colStr} in expression [${this._text}].`);
    }
    /**
     * Reads and tokenizes a number from the text.
     */
    /** @internal */
    _readNumber() {
        let number = "";
        const start = this._index;
        while (this._index < this._text.length) {
            const ch = this._text.charAt(this._index).toLowerCase();
            if (ch === "." || this._isNumber(ch)) {
                number += ch;
            }
            else {
                const peekCh = this._peek();
                if (ch === "e" && this._isExpOperator(peekCh)) {
                    number += ch;
                }
                else if (this._isExpOperator(ch) &&
                    this._isNumber(peekCh) &&
                    number.charAt(number.length - 1) === "e") {
                    number += ch;
                }
                else if (this._isExpOperator(ch) &&
                    !this._isNumber(peekCh) &&
                    number.charAt(number.length - 1) === "e") {
                    this._throwError("Invalid exponent");
                }
                else {
                    break;
                }
            }
            this._index++;
        }
        this._tokens.push({
            _index: start,
            _text: number,
            _constant: true,
            _value: Number(number),
        });
    }
    /**
     * Reads and tokenizes an identifier from the text.
     */
    /** @internal */
    _readIdent() {
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
            _index: start,
            _text: this._text.slice(start, this._index),
            _identifier: true,
        });
    }
    /**
     * Reads and tokenizes a string from the text.
     */
    /** @internal */
    _readString(quote) {
        const start = this._index;
        let string = "";
        let escape = false;
        this._index++;
        while (this._index < this._text.length) {
            const ch = this._text[this._index];
            if (escape) {
                if (ch === "u") {
                    string += this._handleUnicodeEscape();
                }
                else {
                    string += ESCAPE[ch] || ch;
                }
                escape = false;
            }
            else if (ch === "\\") {
                escape = true;
            }
            else if (ch === quote) {
                this._tokens.push({
                    _index: start,
                    _text: this._text.slice(start, this._index + 1),
                    _constant: true,
                    _value: string,
                });
                this._index++;
                return;
            }
            else {
                string += ch;
            }
            this._index++;
        }
        this._throwError("Unterminated quote", start);
    }
    /** @internal */
    _handleUnicodeEscape() {
        const hex = this._text.substring(this._index + 1, this._index + 5);
        if (!/[\da-f]{4}/i.test(hex)) {
            this._throwError(`Invalid unicode escape [\\u${hex}]`);
        }
        this._index += 4;
        return String.fromCharCode(parseInt(hex, 16));
    }
}

export { Lexer };
