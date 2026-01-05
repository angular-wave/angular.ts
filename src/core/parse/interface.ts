import type { Scope } from "../scope/scope.js";
import { BodyNode } from "./ast/ast-node.ts";

/**
 * Describes metadata and behavior for a compiled AngularTS expression.
 */
export interface CompiledExpressionProps {
  /** Indicates if the expression is a literal. */
  _literal: boolean;
  /** Indicates if the expression is constant. */
  constant: boolean;
  /** Optional flag for pure expressions. */
  _isPure?: boolean;
  /** AST node decorated with metadata. */
  _decoratedNode: BodyNode;
  /** Expression inputs; may be an array or a function. */
  _inputs?: any[] | Function;
  /**
   * Optional assign function for two-way binding.
   * Assigns a value to a context.
   * If value is not provided, may return the getter.
   */
  _assign?: (context: any, value: any) => any;
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
 * Parses a string or expression function into a compiled expression.
 * @param expression - The input expression to evaluate.
 * @param interceptorFn - Optional value transformer.
 * @returns A compiled expression.
 */
export type ParseService = (
  expression: string,
  interceptorFn?: (value: any) => any,
) => CompiledExpression;
