import type { DecoratedASTNode } from "./interpreter.js";
import type { Scope } from "../scope/scope.js";
/**
 * Describes metadata and behavior for a compiled AngularTS expression.
 */
export interface CompiledExpressionProps {
  /** Indicates if the expression is a literal. */
  literal: boolean;
  /** Indicates if the expression is constant. */
  constant: boolean;
  /** Optional flag for pure expressions. */
  isPure?: boolean;
  /** Indicates if the expression should be evaluated only once. */
  oneTime: boolean;
  /** AST node decorated with metadata. */
  decoratedNode: DecoratedASTNode;
  /**
   * Optional custom watch delegate function for the expression.
   * @param scope - The current scope.
   * @param listener - A listener function.
   * @param equalityCheck - Whether to use deep equality.
   * @param expression - The compiled expression or string.
   */
  _watchDelegate?: (
    scope: Scope,
    listener: Function,
    expression: CompiledExpression | string | ((scope: Scope) => any),
  ) => any;
  /** Expression inputs; may be an array or a function. */
  inputs: any[] | Function;
  /**
   * Optional assign function for two-way binding.
   * Assigns a value to a context.
   * If value is not provided, may return the getter.
   */
  assign?: (context: any, value: any) => any;
}
/**
 * Expression function with context and optional locals/assign.
 * Evaluates the compiled expression.
 */
export type CompiledExpressionFunction = (
  context?: Scope | typeof Proxy<Scope>,
  locals?: object,
  assign?: any,
) => any;
/**
 * A compiled expression that is both a function and includes expression metadata.
 */
export type CompiledExpression = CompiledExpressionFunction &
  CompiledExpressionProps;
/**
 * Map used for expressions that watch specific object keys.
 */
export interface CompiledExpressionHandlerMap {
  /** Indicates if the expression is a literal. */
  literal: boolean;
  /** Indicates if the expression is constant. */
  constant: boolean;
  /** Optional flag for pure expressions. */
  isPure?: boolean;
  /** Indicates if the expression should be evaluated only once. */
  oneTime: boolean;
  /** A map of property keys to observe. */
  keyMap: Map<string, Function>;
}
/**
 * Parses a string or expression function into a compiled expression.
 * @param expression - The input expression (string or function).
 * @param interceptorFn - Optional value transformer.
 * @param expensiveChecks - Whether to enable expensive change detection.
 * @returns A compiled expression.
 */
export type ParseService = (
  expression?: CompiledExpression | string | ((scope: Scope) => any),
  interceptorFn?: (value: any, scope: Scope, locals: any) => any,
  expensiveChecks?: boolean,
) => CompiledExpression;
