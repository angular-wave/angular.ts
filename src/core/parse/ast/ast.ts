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

function cloneSelfReferentialNode(node: ASTNode): ASTNode {
  return { ...node };
}

export class AST {
  /** @internal */
  _lexer: Lexer;
  /** @internal */
  _selfReferential: Record<string, ASTNode>;
  /** @internal */
  _index: number;
  /** @internal */
  _text = "";
  /** @internal */
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
  /** @internal */
  _ast(text: string): ASTNode {
    this._text = text;
    this._index = 0;
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
  /** @internal */
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
  /** @internal */
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
  /** @internal */
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
  /** @internal */
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
  /** @internal */
  _ternary(): ASTNode {
    const test: ASTNode = this._nullishCoalescing();

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
   * Parses a nullish coalescing expression.
   * @returns {ASTNode} The nullish coalescing expression node.
   */
  /** @internal */
  _nullishCoalescing(): ASTNode {
    let left: ASTNode = this._logicalOR();

    while (this._expect("??")) {
      left = {
        _type: ASTType._LogicalExpression,
        _operator: "??",
        _left: left,
        _right: this._logicalOR(),
      };
    }

    return left;
  }

  /**
   * Parses a logical OR expression.
   * @returns {ASTNode} The logical OR expression node.
   */
  /** @internal */
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
  /** @internal */
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
  /** @internal */
  _equality(): ASTNode {
    let left: ASTNode = this._relational();

    let token: Token | false;

    while ((token = this._expect("==", "!=", "===", "!=="))) {
      left = {
        _type: ASTType._BinaryExpression,
        _operator: token._text,
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
  /** @internal */
  _relational(): ASTNode {
    let left: ASTNode = this._additive();

    let token: Token | false;

    while ((token = this._expect("<", ">", "<=", ">="))) {
      left = {
        _type: ASTType._BinaryExpression,
        _operator: token._text,
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
  /** @internal */
  _additive(): ASTNode {
    let left: ASTNode = this._multiplicative();

    let token: Token | false;

    while ((token = this._expect("+", "-"))) {
      left = {
        _type: ASTType._BinaryExpression,
        _operator: token._text,
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
  /** @internal */
  _multiplicative(): ASTNode {
    let left: ASTNode = this._unary();

    let token: Token | false;

    while ((token = this._expect("*", "/", "%"))) {
      left = {
        _type: ASTType._BinaryExpression,
        _operator: token._text,
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
  /** @internal */
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
        _operator: token._text,
        _prefix: true,
        _argument: argument,
      };
    }

    // Existing unary: + - !
    if ((token = this._expect("+", "-", "!"))) {
      return {
        _type: ASTType._UnaryExpression,
        _operator: token._text,
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
  /** @internal */
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
        _operator: token._text,
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
  /** @internal */
  _primary(): ASTNode {
    let primary: ASTNode;

    const peekToken = this._peekToken();

    if (peekToken._text === "(") {
      this._index++;
      primary = this._filterChain();
      this._consume(")");
    } else if (peekToken._text === "[") {
      this._index++;
      primary = this._arrayDeclaration();
    } else if (peekToken._text === "{") {
      this._index++;
      primary = this._object();
    } else if (hasOwn(this._selfReferential, peekToken._text)) {
      this._index++;
      primary = cloneSelfReferentialNode(
        this._selfReferential[peekToken._text],
      );
    } else if (hasOwn(literals, peekToken._text)) {
      this._index++;
      primary = {
        _type: ASTType._Literal,
        _value: literals[peekToken._text as keyof typeof literals],
      };
    } else if (peekToken._identifier) {
      this._index++;
      primary = { _type: ASTType._Identifier, _name: peekToken._text };
    } else if (peekToken._constant) {
      this._index++;
      primary = { _type: ASTType._Literal, _value: peekToken._value };
    } else {
      this._throwError("not a primary expression", peekToken);
    }

    while (this._tokens && this._index < this._tokens.length) {
      const next = this._tokens[this._index];

      if (next._text !== "(" && next._text !== "[" && next._text !== ".") {
        break;
      }

      this._index++;

      if (next._text === "(") {
        primary = {
          _type: ASTType._CallExpression,
          _callee: primary,
          _arguments: this._parseArguments(),
        };
        this._consume(")");
      } else if (next._text === "[") {
        primary = {
          _type: ASTType._MemberExpression,
          _object: primary,
          _property: this._assignment(),
          _computed: true,
        };
        this._consume("]");
      } else if (next._text === ".") {
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
  /** @internal */
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
  /** @internal */
  _parseArguments(): ASTNode[] {
    const args: ASTNode[] = [];

    if (this._peekToken()._text !== ")") {
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
  /** @internal */
  _identifier(): ASTNode {
    const token = this._consume();

    if (!token._identifier) {
      this._throwError("is not a valid identifier", token);
    }

    return { _type: ASTType._Identifier, _name: token._text };
  }

  /**
   * Parses a constant.
   * @returns {ASTNode} The constant node.
   */
  /** @internal */
  _constant(): ASTNode {
    // TODO check that it is a constant
    return { _type: ASTType._Literal, _value: this._consume()._value };
  }

  /**
   * Parses an array declaration.
   * @returns {ASTNode} The array declaration node.
   */
  /** @internal */
  _arrayDeclaration(): ASTNode {
    const elements: ASTNode[] = [];

    if (this._peekToken()._text !== "]") {
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
  /** @internal */
  _object(): ASTNode {
    const properties: ASTNode[] = [];

    let property: ObjectPropertyNode;

    if (this._peekToken()._text !== "}") {
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

        if (nextToken._constant) {
          property._key = this._constant();
          property._computed = false;
          this._consume(":");
          property._value = this._assignment();
        } else if (nextToken._identifier) {
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
   * @param {Token} token - The token that caused the error.
   */
  /** @internal */
  _throwError(msg: string, token: Token): never {
    throw $parseMinErr(
      "syntax",
      "Syntax Error: Token '{0}' {1} at column {2} of the expression [{3}] starting at [{4}].",
      token._text,
      msg,
      token._index + 1,
      this._text,
      this._text?.substring(token._index),
    );
  }

  /**
   * Consumes a token if it matches the expected type.
   * @param {string} [e1] - The expected token type.
   * @returns {Token} The consumed token.
   */
  /** @internal */
  _consume(e1?: string): Token {
    if (this._tokens && this._tokens.length === this._index) {
      throw $parseMinErr(
        "ueoe",
        "Unexpected end of expression: {0}",
        this._text,
      );
    }

    const token = isDefined(e1)
      ? this._tokens[this._index]?._text === e1
        ? this._tokens[this._index++]
        : false
      : this._tokens[this._index++];

    if (!token) {
      return this._throwError(
        `is unexpected, expecting [${e1}]`,
        this._peekToken(),
      );
    }

    return token;
  }

  /**
   * Returns the next token without consuming it.
   * @returns {Token} The next token.
   */
  /** @internal */
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
   * @returns {Token|boolean} The next token if it matches, otherwise false.
   */
  /** @internal */
  _peek(e1?: string, e2?: string, e3?: string, e4?: string): Token | false {
    const token = this._tokens && this._tokens[this._index];

    if (!token) return false;

    if (!isDefined(e1)) return token;

    const txt = token._text;

    return e1 === txt || e2 === txt || e3 === txt || e4 === txt ? token : false;
  }

  /**
   * Consumes the next token if it matches any of the expected types.
   * @param {...string} expected - The expected token types.
   * @returns {Token|boolean} The consumed token if it matches, otherwise false.
   */
  /** @internal */
  _expect(e1?: string, e2?: string, e3?: string, e4?: string): Token | false {
    const token = this._tokens && this._tokens[this._index];

    if (!token) return false;

    if (isDefined(e1)) {
      const txt = token._text;

      if (e1 !== txt && e2 !== txt && e3 !== txt && e4 !== txt) {
        return false;
      }
    }

    if (token) {
      this._index++;

      return token;
    }

    return false;
  }
}
