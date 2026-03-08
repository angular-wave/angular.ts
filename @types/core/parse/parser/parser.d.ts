import type { FilterService } from "../../../filters/interface.ts";
import type { CompiledExpression } from "../interface.ts";
import { AST } from "../ast/ast.ts";
import { ASTInterpreter } from "../interpreter.ts";
import type { Lexer } from "../lexer/lexer.ts";
/**
 * Bridges lexical analysis, AST generation, and AST interpretation
 * into a compiled expression function used by `$parse`.
 */
export declare class Parser {
  _ast: AST;
  _astCompiler: ASTInterpreter;
  /**
   * @param lexer lexer used to tokenize the input expression
   * @param $filter filter service used by the AST interpreter
   */
  constructor(lexer: Lexer, $filter: FilterService);
  /**
   * Parses one expression string into a compiled expression function.
   */
  _parse(exp: string): CompiledExpression;
}
