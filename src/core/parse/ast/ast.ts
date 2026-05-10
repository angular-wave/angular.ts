import { isAssignable } from "../interpreter.ts";
import { ASTType } from "../ast-type.ts";
import {
  hasOwn,
  isDefined,
  createErrorFactory,
} from "../../../shared/utils.ts";
import type { Lexer } from "../lexer/lexer.ts";
import type { Token } from "../lexer/token.ts";
import type { ASTNode, ObjectPropertyNode } from "./ast-node.ts";

const $parseError = createErrorFactory("$parse");

const literals: Record<string, unknown> = {
  true: true,
  false: false,
  null: null,
  undefined,
};

const BINARY_BINDING_POWER: Record<
  string,
  { left: number; right: number; type: ASTType }
> = {
  "=": { left: 10, right: 9, type: ASTType._AssignmentExpression },
  "?": { left: 20, right: 19, type: ASTType._ConditionalExpression },
  "??": { left: 30, right: 31, type: ASTType._LogicalExpression },
  "||": { left: 40, right: 41, type: ASTType._LogicalExpression },
  "&&": { left: 50, right: 51, type: ASTType._LogicalExpression },
  "==": { left: 60, right: 61, type: ASTType._BinaryExpression },
  "!=": { left: 60, right: 61, type: ASTType._BinaryExpression },
  "===": { left: 60, right: 61, type: ASTType._BinaryExpression },
  "!==": { left: 60, right: 61, type: ASTType._BinaryExpression },
  "<": { left: 70, right: 71, type: ASTType._BinaryExpression },
  ">": { left: 70, right: 71, type: ASTType._BinaryExpression },
  "<=": { left: 70, right: 71, type: ASTType._BinaryExpression },
  ">=": { left: 70, right: 71, type: ASTType._BinaryExpression },
  "+": { left: 80, right: 81, type: ASTType._BinaryExpression },
  "-": { left: 80, right: 81, type: ASTType._BinaryExpression },
  "*": { left: 90, right: 91, type: ASTType._BinaryExpression },
  "/": { left: 90, right: 91, type: ASTType._BinaryExpression },
  "%": { left: 90, right: 91, type: ASTType._BinaryExpression },
};

const PREFIX_BINDING_POWER = 100;

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
    let left: ASTNode = this._expression(0);

    while (this._expect("|")) {
      left = this._filter(left);
    }

    return left;
  }

  /**
   * Parses an expression using Pratt binding powers.
   * @returns {ASTNode} The parsed expression node.
   */
  /** @internal */
  _expression(minBindingPower: number): ASTNode {
    let left = this._prefix();

    while (this._tokens && this._index < this._tokens.length) {
      const token = this._tokens[this._index];

      const operator = token._text;

      const bindingPower = BINARY_BINDING_POWER[operator];

      if (!bindingPower || bindingPower.left < minBindingPower) {
        break;
      }

      this._index++;

      if (operator === "=") {
        if (!isAssignable(left)) {
          throw $parseError(
            "lval",
            "Trying to assign a value to a non l-value",
          );
        }

        left = {
          _type: ASTType._AssignmentExpression,
          _left: left,
          _right: this._expression(bindingPower.right),
          _operator: operator,
        };
      } else if (operator === "?") {
        const alternate = this._expression(0);

        this._consume(":");

        left = {
          _type: ASTType._ConditionalExpression,
          _test: left,
          _alternate: alternate,
          _consequent: this._expression(0),
        };
      } else {
        left = {
          _type: bindingPower.type,
          _operator: operator,
          _left: left,
          _right: this._expression(bindingPower.right),
        };
      }
    }

    return left;
  }

  /**
   * Parses a prefix expression and its postfix continuation.
   * @returns {ASTNode}
   */
  /** @internal */
  _prefix(): ASTNode {
    let token: Token | false;

    if ((token = this._expect("++", "--"))) {
      const argument = this._expression(PREFIX_BINDING_POWER);

      if (!isAssignable(argument)) {
        throw $parseError("lval", "Invalid left-hand side in prefix operation");
      }

      return {
        _type: ASTType._UpdateExpression,
        _operator: token._text,
        _prefix: true,
        _argument: argument,
      };
    }

    if ((token = this._expect("+", "-", "!"))) {
      return {
        _type: ASTType._UnaryExpression,
        _operator: token._text,
        _prefix: true,
        _argument: this._expression(PREFIX_BINDING_POWER),
      };
    }

    return this._postfix(this._primary());
  }

  /**
   * Parses call, member, and postfix update continuations.
   * @returns {ASTNode}
   */
  /** @internal */
  _postfix(primary: ASTNode): ASTNode {
    let expr = primary;

    while (this._tokens && this._index < this._tokens.length) {
      const next = this._tokens[this._index];

      if (next._text === "(") {
        this._index++;
        expr = {
          _type: ASTType._CallExpression,
          _callee: expr,
          _arguments: this._parseArguments(),
        };
        this._consume(")");
      } else if (next._text === "[") {
        this._index++;
        expr = {
          _type: ASTType._MemberExpression,
          _object: expr,
          _property: this._expression(0),
          _computed: true,
        };
        this._consume("]");
      } else if (next._text === ".") {
        this._index++;
        expr = {
          _type: ASTType._MemberExpression,
          _object: expr,
          _property: this._identifier(),
          _computed: false,
        };
      } else if (next._text === "++" || next._text === "--") {
        this._index++;

        if (!isAssignable(expr)) {
          throw $parseError(
            "lval",
            "Invalid left-hand side in postfix operation",
          );
        }

        expr = {
          _type: ASTType._UpdateExpression,
          _operator: next._text,
          _prefix: false,
          _argument: expr,
        };
        break;
      } else {
        break;
      }
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
      args.push(this._expression(0));
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
        elements.push(this._expression(0));
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
          property._value = this._expression(0);
        } else if (nextToken._identifier) {
          property._key = this._identifier();
          property._computed = false;

          if (this._peek(":")) {
            this._consume(":");
            property._value = this._expression(0);
          } else {
            property._value = property._key;
          }
        } else if (this._peek("[")) {
          this._consume("[");
          property._key = this._expression(0);
          this._consume("]");
          property._computed = true;
          this._consume(":");
          property._value = this._expression(0);
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
    throw $parseError(
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
      throw $parseError(
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
      throw $parseError(
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
