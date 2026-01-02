import { $injectTokens } from "../../injection-tokens.js";
import { deProxy, isFunction } from "../../shared/utils.js";
import { PURITY_RELATIVE } from "./interpreter.js";
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
       * @param {(param: any) => any} $filter
       * @returns {ng.ParseService}
       */
      function ($filter) {
        return $parse;

        /** @type {ng.ParseService} */
        function $parse(exp, interceptorFn) {
          validateRequired(exp, "exp");
          let parsedExpression;

          exp = exp.trim();
          const cacheKey = exp;

          parsedExpression = cache[cacheKey];

          if (!parsedExpression) {
            const lexer = new Lexer();

            const parser = new Parser(lexer, $filter);

            parsedExpression = parser._parse(exp);

            cache[cacheKey] = addWatchDelegate(parsedExpression);
          }

          return addInterceptor(parsedExpression, interceptorFn);
        }

        /**
         * @param {Function} parsedExpression
         * @param interceptorFn
         * @returns {import('./interface.ts').CompiledExpression|*}
         */
        function addInterceptor(parsedExpression, interceptorFn) {
          if (!interceptorFn) {
            return parsedExpression;
          }

          // Extract any existing interceptors out of the parsedExpression
          // to ensure the original parsedExpression is always the $$intercepted
          // @ts-ignore
          if (parsedExpression.$$interceptor) {
            interceptorFn = chainInterceptors(
              // @ts-ignore
              parsedExpression.$$interceptor,
              interceptorFn,
            );
            // @ts-ignore
            parsedExpression = parsedExpression.$$intercepted;
          }

          let useInputs = false;

          const fn = function interceptedExpression(
            scope,
            locals,
            assign,
            inputs,
          ) {
            const value =
              useInputs && inputs
                ? inputs[0]
                : parsedExpression(scope, locals, assign, inputs);

            // Do not invoke for getters
            if (scope?.getter) {
              return undefined;
            }
            const res = isFunction(value) ? value() : value;

            return interceptorFn(deProxy(res));
          };

          // Maintain references to the interceptor/intercepted
          fn.$$intercepted = parsedExpression;
          fn.$$interceptor = interceptorFn;

          // Propagate the literal/oneTime/constant attributes
          // @ts-ignore
          fn.literal = parsedExpression.literal;
          // @ts-ignore
          fn.oneTime = parsedExpression.oneTime;
          // @ts-ignore
          fn.constant = parsedExpression.constant;
          // @ts-ignore
          fn.decoratedNode = parsedExpression.decoratedNode;

          // Treat the interceptor like filters.
          // If it is not $stateful then only watch its inputs.
          // If the expression itself has no inputs then use the full expression as an input.
          if (!interceptorFn.$stateful) {
            // @ts-ignore
            useInputs = !parsedExpression.inputs;
            // @ts-ignore
            fn.inputs = parsedExpression.inputs
              ? // @ts-ignore
                parsedExpression.inputs
              : [parsedExpression];

            if (!interceptorFn._pure) {
              fn.inputs = fn.inputs.map(function (input) {
                // Remove the isPure flag of inputs when it is not absolute because they are now wrapped in a
                // non-pure interceptor function.
                if (input.isPure === PURITY_RELATIVE) {
                  return function depurifier(x) {
                    return input(x);
                  };
                }

                return input;
              });
            }
          }

          return addWatchDelegate(fn);
        }
      },
    ];
  }
}

export function constantWatchDelegate(scope, listener, parsedExpression) {
  const unwatch = scope.$watch(() => {
    unwatch();

    return parsedExpression(scope);
  }, listener);

  return unwatch;
}

/**
 *
 * @param {import('./interface.ts').CompiledExpression} parsedExpression
 * @returns {import('./interface.ts').CompiledExpression}
 */
function addWatchDelegate(parsedExpression) {
  if (parsedExpression.constant) {
    parsedExpression._watchDelegate = constantWatchDelegate;
  } else if (parsedExpression.inputs) {
    parsedExpression._watchDelegate = inputsWatchDelegate;
  }

  return parsedExpression;
}

/**
 * Watches input expressions and calls the parsedExpression with their current values.
 *
 * @param {ng.Scope} scope
 * @param {Function} listener - Callback when the expression result changes
 * @param {import('./interface.ts').CompiledExpression} parsedExpression
 * @returns {Function} Unwatch function
 */
function inputsWatchDelegate(scope, listener, parsedExpression) {
  const inputExpressions = /** @type {Function[]} */ (parsedExpression.inputs);

  const getValues = () => inputExpressions.map((fn) => fn(scope));

  const evaluate = () => parsedExpression(scope, undefined, getValues());

  // Immediately call the listener with the initial value
  listener(evaluate());

  // Return a reactive/unwatch function
  return () => {
    // In AngularTS, reactive triggers would handle updates,
    // so this is just a placeholder for unwatch cleanup.
  };
}

function chainInterceptors(first, second) {
  function chainedInterceptor(value) {
    return second(first(value));
  }
  chainedInterceptor.$stateful = first.$stateful || second.$stateful;
  chainedInterceptor._pure = first._pure && second._pure;

  return chainedInterceptor;
}
