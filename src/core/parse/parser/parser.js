import { AST } from "../ast/ast.js";
import { ASTType } from "../ast-type.js";
import { ASTInterpreter } from "../interpreter.js";

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
    const { ast } = this.#getAst(exp);

    const fn = this._astCompiler.compile(ast);

    fn.literal = isLiteral(ast);
    fn.constant = !!ast.constant;

    return fn;
  }

  /**
   * @param {string} exp - Expression to be parsed
   * @returns {ParsedAST}
   */
  #getAst(exp) {
    exp = exp.trim();

    return {
      ast: this._ast._ast(exp),
    };
  }
}

/**
 * @param {import("../ast/ast-node.d.ts").ASTNode} ast
 * @returns {boolean}
 */
function isLiteral(ast) {
  const { body } = ast;

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
    return false;
  }
}
