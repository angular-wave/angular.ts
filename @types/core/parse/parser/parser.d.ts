import type { FilterService } from "../../../filters/interface.ts";
import type { CompiledExpression } from "../interface.ts";
import { AST } from "../ast/ast.ts";
import { ASTInterpreter } from "../interpreter.ts";
import type { Lexer } from "../lexer/lexer.ts";
export declare class Parser {
  _ast: AST;
  _astCompiler: ASTInterpreter;
  constructor(lexer: Lexer, $filter: FilterService);
  _parse(exp: string): CompiledExpression;
}
