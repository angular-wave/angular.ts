import { isAssignable } from "../interpreter.ts";
import { ASTType } from "../ast-type.ts";
import { hasOwn, isDefined, minErr } from "../../../shared/utils.ts";
import type { Lexer } from "../lexer/lexer.ts";
import type { Token } from "../lexer/token.ts";
import type { ASTNode, ObjectPropertyNode } from "./ast-node.ts";

const $parseMinErr = minErr("$parse");

const literals: Record<string, unknown> = {
  true: true,
  false: false,
  null: null,
  undefined,
};

export class AST {
  _lexer: Lexer;
  _selfReferential: Record<string, ASTNode>;
  _index: number;
  _text = "";
  _tokens: Token[] = [];

  /**
   * @param {Lexer} lexer - The lexer instance for tokenizing input
   */
  constructor(lexer: Lexer) {
    this._lexer = lexer;
    this._selfReferential = {
      this: { _type: ASTType._ThisExpression },
      $locals: { _type: ASTType._LocalsExpression },
    };
    this._index = 0;
  }

  /**
   * Parses the input text and generates an AST.
   * @param {string} text - The input text to parse.
   * @returns {ASTNode} The root node of the AST.
   */
  _ast(text: string): ASTNode {
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
  _program(): ASTNode {
    const body: ASTNode[] = [];

    let hasMore = true;

    while (hasMore) {
      if (
        this._tokens &&
        this._tokens.length > this._index &&
        !this._peek("}", ")", ";", "]")
      )
        body.push(this._expressionStatement());

      if (!this._expect(";")) {
        hasMore = false;
      }
    }

    return { _type: ASTType._Program, _body: body };
  }

  /**
   * Parses an expression statement.
   * @returns {ASTNode} The expression statement node.
   */
  _expressionStatement(): ASTNode {
    return {
      _type: ASTType._ExpressionStatement,
      _expression: this._filterChain(),
    };
  }

  /**
   * Parses a filter chain.
   * @returns {ASTNode} The filter chain node.
   */
  _filterChain(): ASTNode {
    let left: ASTNode = this._assignment();

    while (this._expect("|")) {
      left = this._filter(left);
    }

    return left;
  }

  /**
   * Parses an assignment expression.
   * @returns {ASTNode} The assignment expression node.
   */
  _assignment(): ASTNode {
    let result: ASTNode = this._ternary();

    if (this._expect("=")) {
      if (!isAssignable(result)) {
        throw $parseMinErr("lval", "Trying to assign a value to a non l-value");
      }

      result = {
        _type: ASTType._AssignmentExpression,
        _left: result,
        _right: this._assignment(),
        _operator: "=",
      };
    }

    return result;
  }

  /**
   * Parses a ternary expression.
   * @returns {ASTNode} The ternary expression node.
   */
  _ternary(): ASTNode {
    const test: ASTNode = this._logicalOR();

    if (this._expect("?")) {
      const alternate: ASTNode = this._assignment();

      if (this._consume(":")) {
        const consequent: ASTNode = this._assignment();

        return {
          _type: ASTType._ConditionalExpression,
          _test: test,
          _alternate: alternate,
          _consequent: consequent,
        };
      }
    }

    return test;
  }

  /**
   * Parses a logical OR expression.
   * @returns {ASTNode} The logical OR expression node.
   */
  _logicalOR(): ASTNode {
    let left: ASTNode = this._logicalAND();

    while (this._expect("||")) {
      left = {
        _type: ASTType._LogicalExpression,
        _operator: "||",
        _left: left,
        _right: this._logicalAND(),
      };
    }

    return left;
  }

  /**
   * Parses a logical AND expression.
   * @returns {ASTNode} The logical AND expression node.
   */
  _logicalAND(): ASTNode {
    let left: ASTNode = this._equality();

    while (this._expect("&&")) {
      left = {
        _type: ASTType._LogicalExpression,
        _operator: "&&",
        _left: left,
        _right: this._equality(),
      };
    }

    return left;
  }

  /**
   * Parses an equality expression.
   * @returns {ASTNode} The equality expression node.
   */
  _equality(): ASTNode {
    let left: ASTNode = this._relational();

    let token: Token | false;

    while ((token = this._expect("==", "!=", "===", "!=="))) {
      left = {
        _type: ASTType._BinaryExpression,
        _operator: /** @type {Token} */ token.text,
        _left: left,
        _right: this._relational(),
      };
    }

    return left;
  }

  /**
   * Parses a relational expression.
   * @returns {ASTNode} The relational expression node.
   */
  _relational(): ASTNode {
    let left: ASTNode = this._additive();

    let token: Token | false;

    while ((token = this._expect("<", ">", "<=", ">="))) {
      left = {
        _type: ASTType._BinaryExpression,
        _operator: /** @type {Token} */ token.text,
        _left: left,
        _right: this._additive(),
      };
    }

    return left;
  }

  /**
   * Parses an additive expression.
   * @returns {ASTNode} The additive expression node.
   */
  _additive(): ASTNode {
    let left: ASTNode = this._multiplicative();

    let token: Token | false;

    while ((token = this._expect("+", "-"))) {
      left = {
        _type: ASTType._BinaryExpression,
        _operator: /** @type {Token} */ token.text,
        _left: left,
        _right: this._multiplicative(),
      };
    }

    return left;
  }

  /**
   * Parses a multiplicative expression.
   * @returns {ASTNode} The multiplicative expression node.
   */
  _multiplicative(): ASTNode {
    let left: ASTNode = this._unary();

    let token: Token | false;

    while ((token = this._expect("*", "/", "%"))) {
      left = {
        _type: ASTType._BinaryExpression,
        _operator: /** @type {import("../lexer/lexer.ts").Token} */ token.text,
        _left: left,
        _right: this._unary(),
      };
    }

    return left;
  }

  /**
   * Parses a unary expression.
   * @returns {ASTNode} The unary expression node.
   */
  /**
   * Parses a unary / prefix update expression.
   * @returns {ASTNode}
   */
  _unary(): ASTNode {
    let token: Token | false;

    // Prefix update: ++a / --a
    if ((token = this._expect("++", "--"))) {
      const argument: ASTNode = this._unary();

      if (!isAssignable(argument)) {
        throw $parseMinErr(
          "lval",
          "Invalid left-hand side in prefix operation",
        );
      }

      return {
        _type: ASTType._UpdateExpression,
        _operator: /** @type {Token} */ token.text,
        _prefix: true,
        _argument: argument,
      };
    }

    // Existing unary: + - !
    if ((token = this._expect("+", "-", "!"))) {
      return {
        _type: ASTType._UnaryExpression,
        _operator: /** @type {Token} */ token.text,
        _prefix: true,
        _argument: this._unary(),
      };
    }

    // Leaf is postfix (primary + possible trailing ++/--)
    return this._postfix();
  }

  /**
   * Parses a postfix update expression.
   * @returns {ASTNode}
   */
  _postfix(): ASTNode {
    let expr: ASTNode = this._primary();

    // Only one postfix update is allowed (JS also disallows chaining like a++++ in most contexts)
    const token = this._expect("++", "--");

    if (token) {
      if (!isAssignable(expr)) {
        throw $parseMinErr(
          "lval",
          "Invalid left-hand side in postfix operation",
        );
      }

      expr = {
        _type: ASTType._UpdateExpression,
        _operator: /** @type {Token} */ token.text,
        _prefix: false,
        _argument: expr,
      };
    }

    return expr;
  }

  /**
   * Parses a primary expression.
   * @returns {ASTNode} The primary expression node.
   */
  _primary(): ASTNode {
    let primary: ASTNode;
    const peekToken = this._peek();

    if (this._expect("(")) {
      primary = this._filterChain();
      this._consume(")");
    } else if (this._expect("[")) {
      primary = this._arrayDeclaration();
    } else if (this._expect("{")) {
      primary = this._object();
    } else if (hasOwn(this._selfReferential, (peekToken as Token).text)) {
      primary = structuredClone(this._selfReferential[this._consume().text]);
    } else if (hasOwn(literals, (peekToken as Token).text)) {
      primary = {
        _type: ASTType._Literal,
        _value: literals[this._consume().text as keyof typeof literals],
      };
    } else if ((peekToken as Token).identifier) {
      primary = this._identifier();
    } else if ((peekToken as Token).constant) {
      primary = this._constant();
    } else {
      this._throwError("not a primary expression", this._peek() as Token);
    }

    let next: Token | false;

    while ((next = this._expect("(", "[", "."))) {
      if (/** @type {import("../lexer/lexer.ts").Token} */ next.text === "(") {
        primary = {
          _type: ASTType._CallExpression,
          _callee: primary,
          _arguments: this._parseArguments(),
        };
        this._consume(")");
      } else if (
        /** @type {import("../lexer/lexer.ts").Token} */ next.text === "["
      ) {
        primary = {
          _type: ASTType._MemberExpression,
          _object: primary,
          _property: this._assignment(),
          _computed: true,
        };
        this._consume("]");
      } else if (
        /** @type {import("../lexer/lexer.ts").Token} */ next.text === "."
      ) {
        primary = {
          _type: ASTType._MemberExpression,
          _object: primary,
          _property: this._identifier(),
          _computed: false,
        };
      } else {
        throw new Error("IMPOSSIBLE");
      }
    }

    return primary;
  }

  /**
   * Parses a filter.
   * @param {ASTNode} baseExpression - The base expression to apply the filter to.
   * @returns {ASTNode} The filter node.
   */
  _filter(baseExpression: ASTNode): ASTNode {
    const args: ASTNode[] = [baseExpression];

    const result = {
      _type: ASTType._CallExpression,
      _callee: this._identifier(),
      _arguments: args,
      _filter: true,
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
  _parseArguments(): ASTNode[] {
    const args: ASTNode[] = [];

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
  _identifier(): ASTNode {
    const token = this._consume();

    if (!token.identifier) {
      this._throwError("is not a valid identifier", token);
    }

    return { _type: ASTType._Identifier, _name: token.text };
  }

  /**
   * Parses a constant.
   * @returns {ASTNode} The constant node.
   */
  _constant(): ASTNode {
    // TODO check that it is a constant
    return { _type: ASTType._Literal, _value: this._consume().value };
  }

  /**
   * Parses an array declaration.
   * @returns {ASTNode} The array declaration node.
   */
  _arrayDeclaration(): ASTNode {
    const elements: ASTNode[] = [];

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

    return { _type: ASTType._ArrayExpression, _elements: elements };
  }

  /**
   * Parses an object.
   * @returns {ASTNode} The object node.
   */
  _object(): ASTNode {
    const properties: ASTNode[] = [];

    let property: ObjectPropertyNode;

    if (this._peekToken().text !== "}") {
      do {
        if (this._peek("}")) {
          // Support trailing commas per ES5.1.
          break;
        }
        const nextToken = this._peekToken();
        property = {
          _type: ASTType._Property,
          _key: { _type: ASTType._Literal, _value: undefined },
          _value: { _type: ASTType._Literal, _value: undefined },
          _computed: false,
        };

        if (nextToken.constant) {
          property._key = this._constant();
          property._computed = false;
          this._consume(":");
          property._value = this._assignment();
        } else if (nextToken.identifier) {
          property._key = this._identifier();
          property._computed = false;

          if (this._peek(":")) {
            this._consume(":");
            property._value = this._assignment();
          } else {
            property._value = property._key;
          }
        } else if (this._peek("[")) {
          this._consume("[");
          property._key = this._assignment();
          this._consume("]");
          property._computed = true;
          this._consume(":");
          property._value = this._assignment();
        } else {
          this._throwError("invalid key", this._peek() as Token);
        }
        properties.push(property);
      } while (this._expect(","));
    }
    this._consume("}");

    return { _type: ASTType._ObjectExpression, _properties: properties };
  }

  /**
   * Throws a syntax error.
   * @param {string} msg - The error message.
   * @param {import("../lexer/lexer.ts").Token} token - The token that caused the error.
   */
  _throwError(msg: string, token: Token): never {
    throw $parseMinErr(
      "syntax",
      "Syntax Error: Token '{0}' {1} at column {2} of the expression [{3}] starting at [{4}].",
      token.text,
      msg,
      token.index + 1,
      this._text,
      this._text?.substring(token.index),
    );
  }

  /**
   * Consumes a token if it matches the expected type.
   * @param {string} [e1] - The expected token type.
   * @returns {import("../lexer/lexer.ts").Token} The consumed token.
   */
  _consume(e1?: string): Token {
    if (this._tokens && this._tokens.length === this._index) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this._text,
      );
    }

    const token = isDefined(e1) ? this._expect(e1) : this._expect();

    if (!token) {
      this._throwError(`is unexpected, expecting [${e1}]`, this._peekToken());
    } else {
      return token;
    }
  }

  /**
   * Returns the next token without consuming it.
   * @returns {import("../lexer/lexer.ts").Token} The next token.
   */
  _peekToken(): Token {
    if (!this._tokens || this._tokens.length === this._index) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this._text,
      );
    } else {
      return this._tokens[this._index];
    }
  }

  /**
   * Checks if the next token matches any of the expected types.
   * @param {...string} expected - The expected token types.
   * @returns {import('../lexer/lexer.ts').Token|boolean} The next token if it matches, otherwise false.
   */
  _peek(...expected: string[]): Token | false {
    const token = this._tokens && this._tokens[this._index];

    if (!token) return false;

    const j = expected.length;

    if (!j) return token;

    const txt = token.text;

    if (expected.length === 1) return expected[0] === txt ? token : false;

    for (let i = 0; i < j; i++) {
      if (expected[i] === txt || !expected[i]) return token;
    }

    return false;
  }

  /**
   * Consumes the next token if it matches any of the expected types.
   * @param {...string} expected - The expected token types.
   * @returns {import("../lexer/lexer.ts").Token|boolean} The consumed token if it matches, otherwise false.
   */
  _expect(...expected: string[]): Token | false {
    const token = this._peek(...expected);

    if (token) {
      this._index++;

      return token;
    }

    return false;
  }
}
