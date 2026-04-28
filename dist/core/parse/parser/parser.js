import { AST } from '../ast/ast.js';
import { ASTType } from '../ast-type.js';
import { ASTInterpreter } from '../interpreter.js';

class Parser {
    constructor(lexer, $filter) {
        this._ast = new AST(lexer);
        this._astCompiler = new ASTInterpreter($filter);
    }
    /** @internal */
    _parse(exp) {
        const ast = this._ast._ast(exp.trim());
        const fn = this._astCompiler._compile(ast);
        fn._literal = isLiteral(ast);
        fn._constant = !!ast._constant;
        return fn;
    }
}
function isLiteral(ast) {
    const { _body: body } = ast;
    if (!body || body.length !== 1) {
        return true;
    }
    switch (body[0]._expression?._type) {
        case ASTType._Literal:
        case ASTType._ArrayExpression:
        case ASTType._ObjectExpression:
            return true;
        default:
            return false;
    }
}

export { Parser };
