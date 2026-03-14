import type { FilterService } from "../../../filters/filter.ts";
import type { CompiledExpression } from "../interface.ts";
import type { BodyNode, ExpressionNode } from "../ast/ast-node.ts";
import { AST } from "../ast/ast.ts";
import { ASTType } from "../ast-type.ts";
import { ASTInterpreter } from "../interpreter.ts";
import type { Lexer } from "../lexer/lexer.ts";

export class Parser {
  _ast: AST;
  _astCompiler: ASTInterpreter;

  constructor(lexer: Lexer, $filter: FilterService) {
    this._ast = new AST(lexer);
    this._astCompiler = new ASTInterpreter($filter);
  }

  _parse(exp: string): CompiledExpression {
    const ast = this._ast._ast(exp.trim());
    const fn = this._astCompiler.compile(ast);

    fn._literal = isLiteral(ast as BodyNode);
    fn.constant = !!ast.constant;

    return fn;
  }
}

function isLiteral(ast: BodyNode): boolean {
  const { body } = ast;

  if (!body || body.length !== 1) {
    return true;
  }

  switch ((body[0] as ExpressionNode).expression?.type) {
    case ASTType._Literal:
    case ASTType._ArrayExpression:
    case ASTType._ObjectExpression:
      return true;
    default:
      return false;
  }
}
