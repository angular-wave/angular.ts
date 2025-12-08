/**
 * @typedef {Object} ParsedAST
 * @property {import("../ast/ast-node.d.ts").ASTNode} ast - AST representation of expression
 */
/**
 * @constructor
 */
export class Parser {
  /**
   *
   * @param {import('../lexer/lexer.js').Lexer} lexer
   * @param {function(any):any} $filter
   */
  constructor(
    lexer: import("../lexer/lexer.js").Lexer,
    $filter: (arg0: any) => any,
  );
  /** @type {AST} */
  _ast: AST;
  /** @type {ASTInterpreter} */
  _astCompiler: ASTInterpreter;
  /**
   * @param {string} exp - Expression to be parsed
   * @returns {import("../interface.ts").CompiledExpression}
   */
  _parse(exp: string): import("../interface.ts").CompiledExpression;
  #private;
}
export type ParsedAST = {
  /**
   * - AST representation of expression
   */
  ast: import("../ast/ast-node.d.ts").ASTNode;
};
import { AST } from "../ast/ast.js";
import { ASTInterpreter } from "../interpreter.js";
