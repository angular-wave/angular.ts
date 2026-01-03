import { AST } from "../ast/ast.js";
import { ASTType } from "../ast-type.js";
import { ASTInterpreter } from "../interpreter.js";

/**
 * @constructor
 */
export class Parser {
  /**
   *
   * @param {import('../lexer/lexer.js').Lexer} lexer
   * @param {ng.FilterService} $filter
   */
  constructor(lexer, $filter) {
    /** @type {AST} */
    this._ast = new AST(lexer);

    /** @type {ASTInterpreter} */
    this._astCompiler = new ASTInterpreter($filter);
  }

  /**
   * @param {string} exp - Expression to be parsed
   * @returns {import("../interface.ts").CompiledExpression}
   */
  _parse(exp) {
    exp = exp.trim();
    const ast = this._ast._ast(exp);

    const fn = this._astCompiler.compile(ast);

    fn.literal = isLiteral(ast);
    fn.constant = !!ast.constant;

    return fn;
  }
}

/**
 * @param {import("../ast/ast-node.ts").ASTNode} ast
 * @returns {boolean}
 */
function isLiteral(ast) {
  const { body } = ast;

  // non-single-expression programs are literals
  if (!body || body.length !== 1) {
    return true;
  }

  if (body && body.length === 1) {
    switch (body[0].expression?.type) {
      case ASTType._Literal:
      case ASTType._ArrayExpression:
      case ASTType._ObjectExpression:
        return true;
      default:
        return false;
    }
  } else {
    return true;
  }
}
