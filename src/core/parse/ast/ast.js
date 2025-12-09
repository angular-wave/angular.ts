import { isAssignable } from "../interpreter.js";
import { ASTType } from "../ast-type.js";
import { hasOwn, minErr } from "../../../shared/utils.js";

/**
 * @typedef {import("./ast-node.ts").ASTNode} ASTNode
 * @typedef {import("../lexer/token.js").Token} Token
 */

const $parseMinErr = minErr("$parse");

const literals = {
  true: true,
  false: false,
  null: null,
  undefined,
};

/**
 * @class
 */
export class AST {
  /**
   * @param {import('../lexer/lexer.js').Lexer} lexer - The lexer instance for tokenizing input
   */
  constructor(lexer) {
    /** @type {import('../lexer/lexer.js').Lexer} */
    this._lexer = lexer;
    this._selfReferential = {
      this: { type: ASTType._ThisExpression },
      $locals: { type: ASTType._LocalsExpression },
    };
    this._index = 0;
  }

  /**
   * Parses the input text and generates an AST.
   * @param {string} text - The input text to parse.
   * @returns {ASTNode} The root node of the AST.
   */
  _ast(text) {
    this._text = text;
    this._tokens = this._lexer._lex(text);

    const value = this._program();

    if (this._tokens.length > this._index) {
      this._throwError("is an unexpected token", this._tokens[this._index]);
    }

    return value;
  }

  /**
   * Parses a program.
   * @returns {ASTNode} The program node.
   */
  _program() {
    const body = [];

    let hasMore = true;

    while (hasMore) {
      if (this._tokens.length > this._index && !this._peek("}", ")", ";", "]"))
        body.push(this._expressionStatement());

      if (!this._expect(";")) {
        hasMore = false;
      }
    }

    return { type: ASTType._Program, body };
  }

  /**
   * Parses an expression statement.
   * @returns {ASTNode} The expression statement node.
   */
  _expressionStatement() {
    return {
      type: ASTType._ExpressionStatement,
      expression: this._filterChain(),
    };
  }

  /**
   * Parses a filter chain.
   * @returns {ASTNode} The filter chain node.
   */
  _filterChain() {
    let left = this._assignment();

    while (this._expect("|")) {
      left = this._filter(left);
    }

    return left;
  }

  /**
   * Parses an assignment expression.
   * @returns {ASTNode} The assignment expression node.
   */
  _assignment() {
    let result = this._ternary();

    if (this._expect("=")) {
      if (!isAssignable(result)) {
        throw $parseMinErr("lval", "Trying to assign a value to a non l-value");
      }

      result = {
        type: ASTType._AssignmentExpression,
        left: result,
        right: this._assignment(),
        operator: "=",
      };
    }

    return result;
  }

  /**
   * Parses a ternary expression.
   * @returns {ASTNode} The ternary expression node.
   */
  _ternary() {
    const test = this._logicalOR();

    let alternate;

    let consequent;

    if (this._expect("?")) {
      alternate = this._assignment();

      if (this._consume(":")) {
        consequent = this._assignment();

        return {
          type: ASTType._ConditionalExpression,
          test,
          alternate,
          consequent,
        };
      }
    }

    return test;
  }

  /**
   * Parses a logical OR expression.
   * @returns {ASTNode} The logical OR expression node.
   */
  _logicalOR() {
    let left = this._logicalAND();

    while (this._expect("||")) {
      left = {
        type: ASTType._LogicalExpression,
        operator: "||",
        left,
        right: this._logicalAND(),
      };
    }

    return left;
  }

  /**
   * Parses a logical AND expression.
   * @returns {ASTNode} The logical AND expression node.
   */
  _logicalAND() {
    let left = this._equality();

    while (this._expect("&&")) {
      left = {
        type: ASTType._LogicalExpression,
        operator: "&&",
        left,
        right: this._equality(),
      };
    }

    return left;
  }

  /**
   * Parses an equality expression.
   * @returns {ASTNode} The equality expression node.
   */
  _equality() {
    let left = this._relational();

    let token;

    while ((token = this._expect("==", "!=", "===", "!=="))) {
      left = {
        type: ASTType._BinaryExpression,
        operator: /** @type {Token} */ (token).text,
        left,
        right: this._relational(),
      };
    }

    return left;
  }

  /**
   * Parses a relational expression.
   * @returns {ASTNode} The relational expression node.
   */
  _relational() {
    let left = this._additive();

    let token;

    while ((token = this._expect("<", ">", "<=", ">="))) {
      left = {
        type: ASTType._BinaryExpression,
        operator: /** @type {Token} */ (token).text,
        left,
        right: this._additive(),
      };
    }

    return left;
  }

  /**
   * Parses an additive expression.
   * @returns {ASTNode} The additive expression node.
   */
  _additive() {
    let left = this._multiplicative();

    let token;

    while ((token = this._expect("+", "-"))) {
      left = {
        type: ASTType._BinaryExpression,
        operator: /** @type {Token} */ (token).text,
        left,
        right: this._multiplicative(),
      };
    }

    return left;
  }

  /**
   * Parses a multiplicative expression.
   * @returns {ASTNode} The multiplicative expression node.
   */
  _multiplicative() {
    let left = this._unary();

    let token;

    while ((token = this._expect("*", "/", "%"))) {
      left = {
        type: ASTType._BinaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        left,
        right: this._unary(),
      };
    }

    return left;
  }

  /**
   * Parses a unary expression.
   * @returns {ASTNode} The unary expression node.
   */
  _unary() {
    let token;

    if ((token = this._expect("+", "-", "!"))) {
      return {
        type: ASTType._UnaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        prefix: true,
        argument: this._unary(),
      };
    }

    return this._primary();
  }

  /**
   * Parses a primary expression.
   * @returns {ASTNode} The primary expression node.
   */
  _primary() {
    let primary;

    if (this._expect("(")) {
      primary = this._filterChain();
      this._consume(")");
    } else if (this._expect("[")) {
      primary = this._arrayDeclaration();
    } else if (this._expect("{")) {
      primary = this._object();
    } else if (
      hasOwn(
        this._selfReferential,
        /** @type {import("../lexer/lexer.js").Token} */ (this._peek()).text,
      )
    ) {
      primary = structuredClone(this._selfReferential[this._consume().text]);
    } else if (
      hasOwn(
        literals,
        /** @type {import("../lexer/lexer.js").Token} */ (this._peek()).text,
      )
    ) {
      primary = {
        type: ASTType._Literal,
        value: literals[this._consume().text],
      };
    } else if (
      /** @type {import("../lexer/lexer.js").Token} */ (this._peek()).identifier
    ) {
      primary = this._identifier();
    } else if (
      /** @type {import("../lexer/lexer.js").Token} */ (this._peek()).constant
    ) {
      primary = this._constant();
    } else {
      this._throwError(
        "not a primary expression",
        /** @type {import("../lexer/lexer.js").Token} */ (this._peek()),
      );
    }

    let next;

    while ((next = this._expect("(", "[", "."))) {
      if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "("
      ) {
        primary = {
          type: ASTType._CallExpression,
          callee: primary,
          arguments: this._parseArguments(),
        };
        this._consume(")");
      } else if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "["
      ) {
        primary = {
          type: ASTType._MemberExpression,
          object: primary,
          property: this._assignment(),
          computed: true,
        };
        this._consume("]");
      } else if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "."
      ) {
        primary = {
          type: ASTType._MemberExpression,
          object: primary,
          property: this._identifier(),
          computed: false,
        };
      } else {
        this._throwError("IMPOSSIBLE");
      }
    }

    return primary;
  }

  /**
   * Parses a filter.
   * @param {ASTNode} baseExpression - The base expression to apply the filter to.
   * @returns {ASTNode} The filter node.
   */
  _filter(baseExpression) {
    /** @type {ASTNode[]} */
    const args = [baseExpression];

    const result = {
      type: ASTType._CallExpression,
      callee: this._identifier(),
      arguments: args,
      filter: true,
    };

    while (this._expect(":")) {
      args.push(this._assignment());
    }

    return result;
  }

  /**
   * Parses function arguments.
   * @returns {ASTNode[]} The arguments array.
   */
  _parseArguments() {
    /** @type {ASTNode[]} */
    const args = [];

    if (this._peekToken().text !== ")") {
      do {
        args.push(this._filterChain());
      } while (this._expect(","));
    }

    return args;
  }

  /**
   * Parses an identifier.
   * @returns {ASTNode} The identifier node.
   */
  _identifier() {
    const token = this._consume();

    if (!token.identifier) {
      this._throwError("is not a valid identifier", token);
    }

    return { type: ASTType._Identifier, name: token.text };
  }

  /**
   * Parses a constant.
   * @returns {ASTNode} The constant node.
   */
  _constant() {
    // TODO check that it is a constant
    return { type: ASTType._Literal, value: this._consume().value };
  }

  /**
   * Parses an array declaration.
   * @returns {ASTNode} The array declaration node.
   */
  _arrayDeclaration() {
    /** @type {ASTNode[]} */
    const elements = [];

    if (this._peekToken().text !== "]") {
      do {
        if (this._peek("]")) {
          // Support trailing commas per ES5.1.
          break;
        }
        elements.push(this._assignment());
      } while (this._expect(","));
    }
    this._consume("]");

    return { type: ASTType._ArrayExpression, elements };
  }

  /**
   * Parses an object.
   * @returns {ASTNode} The object node.
   */
  _object() {
    /** @type {ASTNode[]} */
    const properties = [];

    /** @type {ASTNode} */
    let property;

    if (this._peekToken().text !== "}") {
      do {
        if (this._peek("}")) {
          // Support trailing commas per ES5.1.
          break;
        }
        property = { type: ASTType._Property, kind: "init" };

        if (
          /** @type {import("../lexer/lexer.js").Token} */ (this._peek())
            .constant
        ) {
          property.key = this._constant();
          property.computed = false;
          this._consume(":");
          property.value = this._assignment();
        } else if (
          /** @type {import("../lexer/lexer.js").Token} */ (this._peek())
            .identifier
        ) {
          property.key = this._identifier();
          property.computed = false;

          if (this._peek(":")) {
            this._consume(":");
            property.value = this._assignment();
          } else {
            property.value = property.key;
          }
        } else if (this._peek("[")) {
          this._consume("[");
          property.key = this._assignment();
          this._consume("]");
          property.computed = true;
          this._consume(":");
          property.value = this._assignment();
        } else {
          this._throwError(
            "invalid key",
            /** @type {import("../lexer/lexer.js").Token} */ (this._peek()),
          );
        }
        properties.push(property);
      } while (this._expect(","));
    }
    this._consume("}");

    return { type: ASTType._ObjectExpression, properties };
  }

  /**
   * Throws a syntax error.
   * @param {string} msg - The error message.
   * @param {import("../lexer/lexer.js").Token} [token] - The token that caused the error.
   */
  _throwError(msg, token) {
    throw $parseMinErr(
      "syntax",
      "Syntax Error: Token '{0}' {1} at column {2} of the expression [{3}] starting at [{4}].",
      token.text,
      msg,
      token.index + 1,
      this._text,
      this._text.substring(token.index),
    );
  }

  /**
   * Consumes a token if it matches the expected type.
   * @param {string} [e1] - The expected token type.
   * @returns {import("../lexer/lexer.js").Token} The consumed token.
   */
  _consume(e1) {
    if (this._tokens.length === this._index) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this._text,
      );
    }

    const token = this._expect(e1);

    if (!token) {
      this._throwError(
        `is unexpected, expecting [${e1}]`,
        /** @type {import("../lexer/lexer.js").Token} */ (this._peek()),
      );
    } else {
      return /** @type  {import("../lexer/lexer.js").Token} */ (token);
    }

    return undefined;
  }

  /**
   * Returns the next token without consuming it.
   * @returns {import("../lexer/lexer.js").Token} The next token.
   */
  _peekToken() {
    if (this._tokens.length === this._index) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this._text,
      );
    }

    return this._tokens[this._index];
  }

  /**
   * Checks if the next token matches any of the expected types.
   * @param {...string} [expected] - The expected token types.
   * @returns {import('../lexer/lexer.js').Token|boolean} The next token if it matches, otherwise false.
   */
  _peek(...expected) {
    const token = this._tokens[this._index];

    const j = expected.length;

    if (!token || !j) return token;

    const txt = token.text;

    for (let i = 0; i < j; i++) {
      if (expected[i] === txt || !expected[i]) return token;
    }

    return false;
  }

  /**
   * Consumes the next token if it matches any of the expected types.
   * @param {...string} [expected] - The expected token types.
   * @returns {import("../lexer/lexer.js").Token|boolean} The consumed token if it matches, otherwise false.
   */
  _expect(...expected) {
    const token = this._peek(...expected);

    if (token) {
      this._index++;

      return token;
    }

    return false;
  }
}
