/**
 * @constructor
 */
export class Parser {
  /**
   *
   * @param {import('../lexer/lexer.js').Lexer} lexer
   * @param {ng.FilterService} $filter
   */
  constructor(
    lexer: import("../lexer/lexer.js").Lexer,
    $filter: ng.FilterService,
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
}
import { AST } from "../ast/ast.js";
import { ASTInterpreter } from "../interpreter.js";
