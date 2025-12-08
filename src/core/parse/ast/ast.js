import { isAssignable } from "../interpreter.js";
import { ASTType } from "../ast-type.js";
import { hasOwn, minErr } from "../../../shared/utils.js";

/**
 * @typedef {import("./ast-node.ts").ASTNode} ASTNode
 * @typedef {import("../lexer/token.js").Token} Token
 */

const $parseMinErr = minErr("$parse");

/** @type {Map<string,any>} */
const literals = new Map([
  ["true", true],
  ["false", false],
  ["null", null],
  ["undefined", undefined],
]);

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
  }

  /**
   * Parses the input text and generates an AST.
   * @param {string} text - The input text to parse.
   * @returns {ASTNode} The root node of the AST.
   */
  ast(text) {
    this.text = text;
    this.tokens = this._lexer.lex(text);
    const value = this.program();

    if (this.tokens.length !== 0) {
      this.throwError("is an unexpected token", this.tokens[0]);
    }

    return value;
  }

  /**
   * Parses a program.
   * @returns {ASTNode} The program node.
   */
  program() {
    const body = [];

    let hasMore = true;

    while (hasMore) {
      if (this.tokens.length > 0 && !this.peek("}", ")", ";", "]"))
        body.push(this.expressionStatement());

      if (!this.expect(";")) {
        hasMore = false;
      }
    }

    return { type: ASTType._Program, body };
  }

  /**
   * Parses an expression statement.
   * @returns {ASTNode} The expression statement node.
   */
  expressionStatement() {
    return {
      type: ASTType._ExpressionStatement,
      expression: this.filterChain(),
    };
  }

  /**
   * Parses a filter chain.
   * @returns {ASTNode} The filter chain node.
   */
  filterChain() {
    let left = this.assignment();

    while (this.expect("|")) {
      left = this.filter(left);
    }

    return left;
  }

  /**
   * Parses an assignment expression.
   * @returns {ASTNode} The assignment expression node.
   */
  assignment() {
    let result = this.ternary();

    if (this.expect("=")) {
      if (!isAssignable(result)) {
        throw $parseMinErr("lval", "Trying to assign a value to a non l-value");
      }

      result = {
        type: ASTType._AssignmentExpression,
        left: result,
        right: this.assignment(),
        operator: "=",
      };
    }

    return result;
  }

  /**
   * Parses a ternary expression.
   * @returns {ASTNode} The ternary expression node.
   */
  ternary() {
    const test = this.logicalOR();

    let alternate;

    let consequent;

    if (this.expect("?")) {
      alternate = this.assignment();

      if (this.consume(":")) {
        consequent = this.assignment();

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
  logicalOR() {
    let left = this.logicalAND();

    while (this.expect("||")) {
      left = {
        type: ASTType._LogicalExpression,
        operator: "||",
        left,
        right: this.logicalAND(),
      };
    }

    return left;
  }

  /**
   * Parses a logical AND expression.
   * @returns {ASTNode} The logical AND expression node.
   */
  logicalAND() {
    let left = this.equality();

    while (this.expect("&&")) {
      left = {
        type: ASTType._LogicalExpression,
        operator: "&&",
        left,
        right: this.equality(),
      };
    }

    return left;
  }

  /**
   * Parses an equality expression.
   * @returns {ASTNode} The equality expression node.
   */
  equality() {
    let left = this.relational();

    let token;

    while ((token = this.expect("==", "!=", "===", "!=="))) {
      left = {
        type: ASTType._BinaryExpression,
        operator: /** @type {Token} */ (token).text,
        left,
        right: this.relational(),
      };
    }

    return left;
  }

  /**
   * Parses a relational expression.
   * @returns {ASTNode} The relational expression node.
   */
  relational() {
    let left = this.additive();

    let token;

    while ((token = this.expect("<", ">", "<=", ">="))) {
      left = {
        type: ASTType._BinaryExpression,
        operator: /** @type {Token} */ (token).text,
        left,
        right: this.additive(),
      };
    }

    return left;
  }

  /**
   * Parses an additive expression.
   * @returns {ASTNode} The additive expression node.
   */
  additive() {
    let left = this.multiplicative();

    let token;

    while ((token = this.expect("+", "-"))) {
      left = {
        type: ASTType._BinaryExpression,
        operator: /** @type {Token} */ (token).text,
        left,
        right: this.multiplicative(),
      };
    }

    return left;
  }

  /**
   * Parses a multiplicative expression.
   * @returns {ASTNode} The multiplicative expression node.
   */
  multiplicative() {
    let left = this.unary();

    let token;

    while ((token = this.expect("*", "/", "%"))) {
      left = {
        type: ASTType._BinaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        left,
        right: this.unary(),
      };
    }

    return left;
  }

  /**
   * Parses a unary expression.
   * @returns {ASTNode} The unary expression node.
   */
  unary() {
    let token;

    if ((token = this.expect("+", "-", "!"))) {
      return {
        type: ASTType._UnaryExpression,
        operator: /** @type {import("../lexer/lexer.js").Token} */ (token).text,
        prefix: true,
        argument: this.unary(),
      };
    }

    return this.primary();
  }

  /**
   * Parses a primary expression.
   * @returns {ASTNode} The primary expression node.
   */
  primary() {
    let primary;

    if (this.expect("(")) {
      primary = this.filterChain();
      this.consume(")");
    } else if (this.expect("[")) {
      primary = this.arrayDeclaration();
    } else if (this.expect("{")) {
      primary = this.object();
    } else if (
      hasOwn(
        this._selfReferential,
        /** @type {import("../lexer/lexer.js").Token} */ (this.peek()).text,
      )
    ) {
      primary = structuredClone(this._selfReferential[this.consume().text]);
    } else if (
      literals.has(
        /** @type {import("../lexer/lexer.js").Token} */ (this.peek()).text,
      )
    ) {
      primary = {
        type: ASTType._Literal,
        value: literals.get(this.consume().text),
      };
    } else if (
      /** @type {import("../lexer/lexer.js").Token} */ (this.peek()).identifier
    ) {
      primary = this.identifier();
    } else if (
      /** @type {import("../lexer/lexer.js").Token} */ (this.peek()).constant
    ) {
      primary = this.constant();
    } else {
      this.throwError(
        "not a primary expression",
        /** @type {import("../lexer/lexer.js").Token} */ (this.peek()),
      );
    }

    let next;

    while ((next = this.expect("(", "[", "."))) {
      if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "("
      ) {
        primary = {
          type: ASTType._CallExpression,
          callee: primary,
          arguments: this.parseArguments(),
        };
        this.consume(")");
      } else if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "["
      ) {
        primary = {
          type: ASTType._MemberExpression,
          object: primary,
          property: this.assignment(),
          computed: true,
        };
        this.consume("]");
      } else if (
        /** @type {import("../lexer/lexer.js").Token} */ (next).text === "."
      ) {
        primary = {
          type: ASTType._MemberExpression,
          object: primary,
          property: this.identifier(),
          computed: false,
        };
      } else {
        this.throwError("IMPOSSIBLE");
      }
    }

    return primary;
  }

  /**
   * Parses a filter.
   * @param {ASTNode} baseExpression - The base expression to apply the filter to.
   * @returns {ASTNode} The filter node.
   */
  filter(baseExpression) {
    /** @type {ASTNode[]} */
    const args = [baseExpression];

    const result = {
      type: ASTType._CallExpression,
      callee: this.identifier(),
      arguments: args,
      filter: true,
    };

    while (this.expect(":")) {
      args.push(this.assignment());
    }

    return result;
  }

  /**
   * Parses function arguments.
   * @returns {ASTNode[]} The arguments array.
   */
  parseArguments() {
    /** @type {ASTNode[]} */
    const args = [];

    if (this.peekToken().text !== ")") {
      do {
        args.push(this.filterChain());
      } while (this.expect(","));
    }

    return args;
  }

  /**
   * Parses an identifier.
   * @returns {ASTNode} The identifier node.
   */
  identifier() {
    const token = this.consume();

    if (!token.identifier) {
      this.throwError("is not a valid identifier", token);
    }

    return { type: ASTType._Identifier, name: token.text };
  }

  /**
   * Parses a constant.
   * @returns {ASTNode} The constant node.
   */
  constant() {
    // TODO check that it is a constant
    return { type: ASTType._Literal, value: this.consume().value };
  }

  /**
   * Parses an array declaration.
   * @returns {ASTNode} The array declaration node.
   */
  arrayDeclaration() {
    /** @type {ASTNode[]} */
    const elements = [];

    if (this.peekToken().text !== "]") {
      do {
        if (this.peek("]")) {
          // Support trailing commas per ES5.1.
          break;
        }
        elements.push(this.assignment());
      } while (this.expect(","));
    }
    this.consume("]");

    return { type: ASTType._ArrayExpression, elements };
  }

  /**
   * Parses an object.
   * @returns {ASTNode} The object node.
   */
  object() {
    /** @type {ASTNode[]} */
    const properties = [];

    /** @type {ASTNode} */
    let property;

    if (this.peekToken().text !== "}") {
      do {
        if (this.peek("}")) {
          // Support trailing commas per ES5.1.
          break;
        }
        property = { type: ASTType._Property, kind: "init" };

        if (
          /** @type {import("../lexer/lexer.js").Token} */ (this.peek())
            .constant
        ) {
          property.key = this.constant();
          property.computed = false;
          this.consume(":");
          property.value = this.assignment();
        } else if (
          /** @type {import("../lexer/lexer.js").Token} */ (this.peek())
            .identifier
        ) {
          property.key = this.identifier();
          property.computed = false;

          if (this.peek(":")) {
            this.consume(":");
            property.value = this.assignment();
          } else {
            property.value = property.key;
          }
        } else if (this.peek("[")) {
          this.consume("[");
          property.key = this.assignment();
          this.consume("]");
          property.computed = true;
          this.consume(":");
          property.value = this.assignment();
        } else {
          this.throwError(
            "invalid key",
            /** @type {import("../lexer/lexer.js").Token} */ (this.peek()),
          );
        }
        properties.push(property);
      } while (this.expect(","));
    }
    this.consume("}");

    return { type: ASTType._ObjectExpression, properties };
  }

  /**
   * Throws a syntax error.
   * @param {string} msg - The error message.
   * @param {import("../lexer/lexer.js").Token} [token] - The token that caused the error.
   */
  throwError(msg, token) {
    throw $parseMinErr(
      "syntax",
      "Syntax Error: Token '{0}' {1} at column {2} of the expression [{3}] starting at [{4}].",
      token.text,
      msg,
      token.index + 1,
      this.text,
      this.text.substring(token.index),
    );
  }

  /**
   * Consumes a token if it matches the expected type.
   * @param {string} [e1] - The expected token type.
   * @returns {import("../lexer/lexer.js").Token} The consumed token.
   */
  consume(e1) {
    if (this.tokens.length === 0) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this.text,
      );
    }

    const token = this.expect(e1);

    if (!token) {
      this.throwError(
        `is unexpected, expecting [${e1}]`,
        /** @type {import("../lexer/lexer.js").Token} */ (this.peek()),
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
  peekToken() {
    if (this.tokens.length === 0) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this.text,
      );
    }

    return this.tokens[0];
  }

  /**
   * Checks if the next token matches any of the expected types.
   * @param {...string} [expected] - The expected token types.
   * @returns {import('../lexer/lexer.js').Token|boolean} The next token if it matches, otherwise false.
   */
  peek(...expected) {
    return this.peekAhead(0, ...expected);
  }

  /**
   * Checks if the token at the specified index matches any of the expected types.
   * @param {number} i - The index to check.
   * @param {...string} [expected] - The expected token types.
   * @returns {import("../lexer/lexer.js").Token|boolean} The token at the specified index if it matches, otherwise false.
   */
  peekAhead(i, ...expected) {
    if (this.tokens.length > i) {
      const token = this.tokens[i];

      const { text } = token;

      if (
        expected.includes(text) ||
        (!expected[0] && !expected[1] && !expected[2] && !expected[3])
      ) {
        return token;
      }
    }

    return false;
  }

  /**
   * Consumes the next token if it matches any of the expected types.
   * @param {...string} [expected] - The expected token types.
   * @returns {import("../lexer/lexer.js").Token|boolean} The consumed token if it matches, otherwise false.
   */
  expect(...expected) {
    const token = this.peek(...expected);

    if (token) {
      this.tokens.shift();

      return token;
    }

    return false;
  }
}
