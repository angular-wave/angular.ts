import { $injectTokens } from "../../injection-tokens.ts";
import { deProxy, isFunction, nullObject } from "../../shared/utils.ts";
import { validateRequired } from "../../shared/validate.ts";
import type { FilterService } from "../../filters/filter.ts";
import { Lexer } from "./lexer/lexer.ts";
import { Parser } from "./parser/parser.ts";

import type { Scope } from "../scope/scope.ts";
import type { BodyNode } from "./ast/ast-node.ts";

/**
 * Describes metadata and behavior for a compiled AngularTS expression.
 */
export interface CompiledExpressionProps {
  /** Indicates if the expression is a literal. */
  _literal: boolean;
  /** Indicates if the expression is constant. */
  _constant: boolean;
  /** Optional flag for pure expressions. */
  _isPure?: boolean;
  /** AST node decorated with metadata. */
  _decoratedNode: BodyNode;
  /** Expression inputs; may be an array or a function. */
  _inputs?: any[] | Function;
  /** Optional interceptor applied to the evaluated result. */
  _interceptor?: (value: any) => any;
  /**
   * Optional assign function for two-way binding.
   * Assigns a value to a context.
   * If value is not provided, may return the getter.
   */
  _assign?: (scope: ng.Scope, value: any, locals?: object) => any;
}

/**
 * Expression function with context and optional locals/assign.
 * Evaluates the compiled expression.
 */
export type CompiledExpressionFunction = (
  context?: Scope | typeof Proxy<Scope>,
  locals?: object,
  _assign?: any,
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

const lexer = new Lexer();

export class ParseProvider {
  $get: [string, ($filter: FilterService) => ParseService];

  constructor() {
    const cache = nullObject() as Record<string, CompiledExpression>;

    this.$get = [
      $injectTokens._filter,
      ($filter: FilterService): ParseService => {
        const $parse: ParseService = (exp, interceptorFn) => {
          validateRequired(exp, "exp");

          const cacheKey = exp.trim();

          let parsedExpression = cache[cacheKey];

          if (!parsedExpression) {
            const parser = new Parser(lexer, $filter);

            parsedExpression = parser._parse(cacheKey);
            cache[cacheKey] = parsedExpression;
          }

          return addInterceptor(parsedExpression, interceptorFn);
        };

        return $parse;
      },
    ];

    function addInterceptor(
      parsedExpression: CompiledExpression,
      interceptorFn?: (value: any) => any,
    ): CompiledExpression {
      if (!interceptorFn) {
        return parsedExpression;
      }

      const fn = function interceptedExpression(scope, locals, assign) {
        if ((scope as { getter?: boolean } | undefined)?.getter) {
          return undefined;
        }

        const value = parsedExpression(scope, locals, assign);

        const res = isFunction(value) ? value() : value;

        return interceptorFn(deProxy(res));
      } as CompiledExpression;

      fn._interceptor = interceptorFn;
      fn._literal = parsedExpression._literal;
      fn._constant = parsedExpression._constant;
      fn._decoratedNode = parsedExpression._decoratedNode;

      return fn;
    }
  }
}
