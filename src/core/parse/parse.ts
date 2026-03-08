import { $injectTokens } from "../../injection-tokens.ts";
import { deProxy, isFunction, nullObject } from "../../shared/utils.ts";
import { validateRequired } from "../../shared/validate.ts";
import type { FilterService } from "../../filters/interface.ts";
import type { ParseService, CompiledExpression } from "./interface.ts";
import { Lexer } from "./lexer/lexer.ts";
import { Parser } from "./parser/parser.ts";

const lexer = new Lexer();

/**
 * Provider for the `$parse` service.
 *
 * It compiles expressions once, caches the resulting functions, and
 * optionally decorates them with interceptor logic.
 */
export class ParseProvider {
  $get: [string, ($filter: FilterService) => ParseService];

  /**
   * Creates the `$parse` provider and its shared expression cache.
   */
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

    /**
     * Wraps a compiled expression with an optional post-processing interceptor.
     */
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
      fn.constant = parsedExpression.constant;
      fn._decoratedNode = parsedExpression._decoratedNode;

      return fn;
    }
  }
}
