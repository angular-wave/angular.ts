import type { Lexer } from "../lexer/lexer.ts";
import type { Token } from "../lexer/token.ts";
import type { ASTNode } from "./ast-node.ts";
/**
 * Recursive-descent parser that converts lexer tokens into AST nodes for `$parse`.
 */
export declare class AST {
  _lexer: Lexer;
  _selfReferential: Record<string, ASTNode>;
  _index: number;
  _text: string;
  _tokens: Token[];
  /**
   * @param {Lexer} lexer - The lexer instance for tokenizing input
   */
  constructor(lexer: Lexer);
  /**
   * Parses the input text and generates an AST.
   * @param {string} text - The input text to parse.
   * @returns {ASTNode} The root node of the AST.
   */
  _ast(text: string): ASTNode;
  /**
   * Parses a program.
   * @returns {ASTNode} The program node.
   */
  _program(): ASTNode;
  /**
   * Parses an expression statement.
   * @returns {ASTNode} The expression statement node.
   */
  _expressionStatement(): ASTNode;
  /**
   * Parses a filter chain.
   * @returns {ASTNode} The filter chain node.
   */
  _filterChain(): ASTNode;
  /**
   * Parses an assignment expression.
   * @returns {ASTNode} The assignment expression node.
   */
  _assignment(): ASTNode;
  /**
   * Parses a ternary expression.
   * @returns {ASTNode} The ternary expression node.
   */
  _ternary(): ASTNode;
  /**
   * Parses a logical OR expression.
   * @returns {ASTNode} The logical OR expression node.
   */
  _logicalOR(): ASTNode;
  /**
   * Parses a logical AND expression.
   * @returns {ASTNode} The logical AND expression node.
   */
  _logicalAND(): ASTNode;
  /**
   * Parses an equality expression.
   * @returns {ASTNode} The equality expression node.
   */
  _equality(): ASTNode;
  /**
   * Parses a relational expression.
   * @returns {ASTNode} The relational expression node.
   */
  _relational(): ASTNode;
  /**
   * Parses an additive expression.
   * @returns {ASTNode} The additive expression node.
   */
  _additive(): ASTNode;
  /**
   * Parses a multiplicative expression.
   * @returns {ASTNode} The multiplicative expression node.
   */
  _multiplicative(): ASTNode;
  /**
   * Parses a unary expression.
   * @returns {ASTNode} The unary expression node.
   */
  /**
   * Parses a unary / prefix update expression.
   * @returns {ASTNode}
   */
  _unary(): ASTNode;
  /**
   * Parses a postfix update expression.
   * @returns {ASTNode}
   */
  _postfix(): ASTNode;
  /**
   * Parses a primary expression.
   * @returns {ASTNode} The primary expression node.
   */
  _primary(): ASTNode;
  /**
   * Parses a filter.
   * @param {ASTNode} baseExpression - The base expression to apply the filter to.
   * @returns {ASTNode} The filter node.
   */
  _filter(baseExpression: ASTNode): ASTNode;
  /**
   * Parses function arguments.
   * @returns {ASTNode[]} The arguments array.
   */
  _parseArguments(): ASTNode[];
  /**
   * Parses an identifier.
   * @returns {ASTNode} The identifier node.
   */
  _identifier(): ASTNode;
  /**
   * Parses a constant.
   * @returns {ASTNode} The constant node.
   */
  _constant(): ASTNode;
  /**
   * Parses an array declaration.
   * @returns {ASTNode} The array declaration node.
   */
  _arrayDeclaration(): ASTNode;
  /**
   * Parses an object.
   * @returns {ASTNode} The object node.
   */
  _object(): ASTNode;
  /**
   * Throws a syntax error.
   * @param {string} msg - The error message.
   * @param {import("../lexer/lexer.ts").Token} token - The token that caused the error.
   */
  _throwError(msg: string, token: Token): never;
  /**
   * Consumes a token if it matches the expected type.
   * @param {string} [e1] - The expected token type.
   * @returns {import("../lexer/lexer.ts").Token} The consumed token.
   */
  _consume(e1?: string): Token;
  /**
   * Returns the next token without consuming it.
   * @returns {import("../lexer/lexer.ts").Token} The next token.
   */
  _peekToken(): Token;
  /**
   * Checks if the next token matches any of the expected types.
   * @param {...string} expected - The expected token types.
   * @returns {import('../lexer/lexer.ts').Token|boolean} The next token if it matches, otherwise false.
   */
  _peek(...expected: string[]): Token | false;
  /**
   * Consumes the next token if it matches any of the expected types.
   * @param {...string} expected - The expected token types.
   * @returns {import("../lexer/lexer.ts").Token|boolean} The consumed token if it matches, otherwise false.
   */
  _expect(...expected: string[]): Token | false;
}
