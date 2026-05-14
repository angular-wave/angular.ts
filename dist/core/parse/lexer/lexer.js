import { isDefined, createErrorFactory } from '../../../shared/utils.js';

const $parseError = createErrorFactory("$parse");
const ESCAPE = {
    n: "\n",
    f: "\f",
    r: "\r",
    t: "\t",
    v: "\v",
    "'": "'",
    '"': '"',
};
const [CHAR_0, CHAR_9, CHAR_A, CHAR_Z, CHAR_LOWER_A, CHAR_LOWER_Z, CHAR_DOLLAR, CHAR_UNDERSCORE,] = ["0", "9", "A", "Z", "a", "z", "$", "_"].map((value) => value.charCodeAt(0));
/**
 * Represents a lexer that tokenizes input text. The Lexer takes the original
 * expression string and returns an array of tokens parsed from that string.
 */
class Lexer {
    constructor() {
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
        const textLength = text.length;
        while (this._index < textLength) {
            const index = this._index;
            const ch = text.charAt(index);
            const code = text.charCodeAt(index);
            if (ch === '"' || ch === "'") {
                this._readString(ch);
                continue;
            }
            if ((code >= CHAR_0 && code <= CHAR_9) ||
                (ch === "." &&
                    text.charCodeAt(index + 1) >= CHAR_0 &&
                    text.charCodeAt(index + 1) <= CHAR_9)) {
                this._readNumber();
                continue;
            }
            if ((code >= CHAR_LOWER_A && code <= CHAR_LOWER_Z) ||
                (code >= CHAR_A && code <= CHAR_Z) ||
                code === CHAR_UNDERSCORE ||
                code === CHAR_DOLLAR) {
                this._readIdent();
                continue;
            }
            if (ch === " " ||
                ch === "\r" ||
                ch === "\t" ||
                ch === "\n" ||
                ch === "\v") {
                this._index++;
                continue;
            }
            switch (ch) {
                case "(":
                case ")":
                case "{":
                case "}":
                case "[":
                case "]":
                case ".":
                case ",":
                case ";":
                case ":":
                    this._tokens.push({ _index: index, _text: ch });
                    this._index++;
                    continue;
                case "?":
                    if (text.charAt(index + 1) !== "?") {
                        this._tokens.push({ _index: index, _text: ch });
                        this._index++;
                        continue;
                    }
                    break;
            }
            const peek = index + 1 < textLength ? text.charAt(index + 1) : "";
            let token;
            switch (ch) {
                case "=":
                    token =
                        peek === "="
                            ? text.charAt(index + 2) === "="
                                ? "==="
                                : "=="
                            : "=";
                    break;
                case "!":
                    token =
                        peek === "="
                            ? text.charAt(index + 2) === "="
                                ? "!=="
                                : "!="
                            : "!";
                    break;
                case "<":
                    token = peek === "=" ? "<=" : "<";
                    break;
                case ">":
                    token = peek === "=" ? ">=" : ">";
                    break;
                case "&":
                    token = peek === "&" ? "&&" : undefined;
                    break;
                case "|":
                    token = peek === "|" ? "||" : "|";
                    break;
                case "?":
                    token = "??";
                    break;
                case "+":
                    token = peek === "+" ? "++" : "+";
                    break;
                case "-":
                    token = peek === "-" ? "--" : "-";
                    break;
                case "*":
                case "/":
                case "%":
                    token = ch;
                    break;
            }
            if (token) {
                this._tokens.push({
                    _index: index,
                    _text: token,
                    _operator: true,
                });
                this._index += token.length;
            }
            else {
                this._throwError("Unexpected next character ", index, index + 1);
            }
        }
        return this._tokens;
    }
    /**
     * Throws a lexer error.
     */
    /** @internal */
    _throwError(error, start, end) {
        const endIndex = end ?? this._index;
        const colStr = isDefined(start)
            ? `s ${String(start)}-${String(this._index)} [${this._text.substring(start, endIndex)}]`
            : ` ${String(endIndex)}`;
        throw $parseError("lexerr", `Lexer Error: ${error} at column${colStr} in expression [${this._text}].`);
    }
    /**
     * Reads and tokenizes a number from the text.
     */
    /** @internal */
    _readNumber() {
        const start = this._index;
        while (this._index < this._text.length) {
            const ch = this._text.charAt(this._index);
            const code = ch.charCodeAt(0);
            if (ch === "." || (code >= CHAR_0 && code <= CHAR_9)) {
                this._index++;
            }
            else {
                if (ch !== "e" && ch !== "E") {
                    break;
                }
                let exponentIndex = this._index + 1;
                const exponentMarker = this._text.charAt(exponentIndex);
                if (exponentMarker === "-" || exponentMarker === "+") {
                    exponentIndex++;
                }
                const exponentCode = this._text.charCodeAt(exponentIndex);
                if (!(exponentCode >= CHAR_0 && exponentCode <= CHAR_9)) {
                    const markerCode = exponentMarker.charCodeAt(0);
                    if (exponentMarker === "-" ||
                        exponentMarker === "+" ||
                        (markerCode >= CHAR_0 && markerCode <= CHAR_9)) {
                        this._throwError("Invalid exponent");
                    }
                    break;
                }
                this._index = exponentIndex + 1;
                while (this._index < this._text.length &&
                    this._text.charCodeAt(this._index) >= CHAR_0 &&
                    this._text.charCodeAt(this._index) <= CHAR_9) {
                    this._index++;
                }
            }
        }
        const number = this._text.slice(start, this._index);
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
        this._index++;
        while (this._index < this._text.length) {
            const code = this._text.charCodeAt(this._index);
            if (!((code >= CHAR_LOWER_A && code <= CHAR_LOWER_Z) ||
                (code >= CHAR_A && code <= CHAR_Z) ||
                (code >= CHAR_0 && code <= CHAR_9) ||
                code === CHAR_UNDERSCORE ||
                code === CHAR_DOLLAR)) {
                break;
            }
            this._index++;
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
        this._index++;
        while (this._index < this._text.length) {
            const ch = this._text[this._index];
            if (ch === quote) {
                this._tokens.push({
                    _index: start,
                    _text: this._text.slice(start, this._index + 1),
                    _constant: true,
                    _value: this._text.slice(start + 1, this._index),
                });
                this._index++;
                return;
            }
            if (ch === "\\") {
                break;
            }
            this._index++;
        }
        let string = this._text.slice(start + 1, this._index);
        let escape = false;
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
