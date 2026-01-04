import { $injectTokens } from "../../injection-tokens.js";
import { deProxy, isFunction } from "../../shared/utils.js";
import { Lexer } from "./lexer/lexer.js";
import { Parser } from "./parser/parser.js";
import { validateRequired } from "../../shared/validate.js";

export class ParseProvider {
  constructor() {
    const cache = Object.create(null);

    this.$get = [
      $injectTokens._filter,
      /**
       *
       * @param {ng.FilterService} $filter
       * @returns {ng.ParseService}
       */
      function ($filter) {
        return $parse;

        /** @type {ng.ParseService} */
        function $parse(exp, interceptorFn) {
          validateRequired(exp, "exp"); // Note: changing this to a stricter validateInstance breaks multiple tests
          /** @type {import("./interface.ts").CompiledExpression} */
          let parsedExpression;

          exp = exp.trim();
          const cacheKey = exp;

          parsedExpression = cache[cacheKey];

          if (!parsedExpression) {
            const lexer = new Lexer();

            const parser = new Parser(lexer, $filter);

            parsedExpression = parser._parse(exp);
          }

          return addInterceptor(parsedExpression, interceptorFn);
        }

        /**
         * @param {import("./interface.ts").CompiledExpression} parsedExpression
         * @param {(value: any) => any} [interceptorFn]
         * @returns {import('./interface.ts').CompiledExpression|*}
         */
        function addInterceptor(parsedExpression, interceptorFn) {
          if (!interceptorFn) {
            return parsedExpression;
          }

          /**
           *
           * @param {ng.Scope} scope
           * @param {Object} [locals]
           * @param {*} [assign]
           * @returns
           */
          const fn = function interceptedExpression(scope, locals, assign) {
            // Do not invoke for getters
            if (scope?.getter) {
              return undefined;
            }
            const value = parsedExpression(scope, locals, assign);

            const res = isFunction(value) ? value() : value;

            return interceptorFn(deProxy(res));
          };

          fn._interceptor = interceptorFn;

          fn._literal = parsedExpression._literal;

          fn.constant = parsedExpression.constant;

          fn._decoratedNode = parsedExpression._decoratedNode;

          return fn;
        }
      },
    ];
  }
}
