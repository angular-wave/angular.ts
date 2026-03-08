import type { ASTNode } from "./ast/ast-node.ts";
import type {
  CompiledExpression,
  CompiledExpressionFunction,
} from "./interface.ts";
export declare const PURITY_ABSOLUTE = 1;
export declare const PURITY_RELATIVE = 2;
type LinkContext = object | boolean | undefined;
type CreateFlag = boolean | 1 | undefined;
/**
 * Interprets AST nodes into executable scope-aware functions for `$parse`.
 */
export declare class ASTInterpreter {
  _$filter: ng.FilterService;
  /**
   * @param {ng.FilterService} $filter
   */
  constructor($filter: ng.FilterService);
  /**
   * Compiles the AST into a function.
   * @param {ASTNode} ast - The AST to compile.
   * @returns {CompiledExpression}
   */
  compile(ast: ASTNode): CompiledExpression;
  /**
   * Recurses the AST nodes.
   * @param {ExpressionNode & LiteralNode} ast - The AST node.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - The create flag.
   * @returns {CompiledExpressionFunction} The recursive function.
   */
  _recurse(
    ast: ASTNode,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction;
  /**
   * Unary plus operation.
   * @param {function} argument - The argument function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The unary plus function.
   */
  "unary+"(
    argument: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Unary minus operation.
   * @param {function} argument - The argument function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The unary minus function.
   */
  "unary-"(
    argument: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Unary negation operation.
   * @param {function} argument - The argument function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The unary negation function.
   */
  "unary!"(
    argument: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary plus operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary plus function.
   */
  "binary+"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary minus operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary minus function.
   */
  "binary-"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary multiplication operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary multiplication function.
   */
  "binary*"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary division operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary division function.
   */
  "binary/"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary modulo operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary division function.
   */
  "binary%"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary strict equality operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary strict equality function.
   */
  "binary==="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary strict inequality operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary strict inequality function.
   */
  "binary!=="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary equality operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary equality function.
   */
  "binary=="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary inequality operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary inequality function.
   */
  "binary!="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary less-than operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary less-than function.
   */
  "binary<"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary greater-than operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary greater-than function.
   */
  "binary>"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary less-than-or-equal-to operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary less-than-or-equal-to function.
   */
  "binary<="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary greater-than-or-equal-to operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary greater-than-or-equal-to function.
   */
  "binary>="(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary logical AND operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary logical AND function.
   */
  "binary&&"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Binary logical OR operation.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The binary logical OR function.
   */
  "binary||"(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Ternary conditional operation.
   * @param {function} test - The test function.
   * @param {function} alternate - The alternate function.
   * @param {function} consequent - The consequent function.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The ternary conditional function.
   */
  "ternary?:"(
    test: CompiledExpressionFunction,
    alternate: CompiledExpressionFunction,
    consequent: CompiledExpressionFunction,
    context?: LinkContext,
  ): CompiledExpressionFunction;
  /**
   * Returns the value of a literal.
   * @param {*} value - The literal value.
   * @param {Object} [context] - The context.
   * @returns {CompiledExpressionFunction} The function returning the literal value.
   */
  value(value: any, context?: LinkContext): CompiledExpressionFunction;
  /**
   * Returns the value of an identifier.
   * @param {string} name - The identifier name.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the identifier if it does not exist.
   *  @returns {CompiledExpressionFunction}  The function returning the identifier value.
   */
  identifier(
    name: string,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction;
  /**
   * Returns the value of a computed member expression.
   * @param {function} left - The left operand function.
   * @param {function} right - The right operand function.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the member if it does not exist.
   * @returns {CompiledExpressionFunction}  The function returning the computed member value.
   */
  _computedMember(
    left: CompiledExpressionFunction,
    right: CompiledExpressionFunction,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction;
  /**
   * Returns the value of a non-computed member expression.
   * @param {function} left - The left operand function.
   * @param {string} right - The right operand function.
   * @param {Object} [context] - The context.
   * @param {boolean|1} [create] - Whether to create the member if it does not exist.
   * @returns {CompiledExpressionFunction}  The function returning the non-computed member value.
   */
  nonComputedMember(
    left: CompiledExpressionFunction,
    right: string,
    context?: LinkContext,
    create?: CreateFlag,
  ): CompiledExpressionFunction;
}
/**
 * @param {import("./ast/ast").ASTNode} ast
 * @returns {boolean}
 */
export declare function isAssignable(ast: ASTNode): boolean;
export {};
