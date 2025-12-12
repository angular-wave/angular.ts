import { $injectTokens } from "../../injection-tokens";
import { deProxy, isFunction, isNullOrUndefined } from "../../shared/utils.js";
import { PURITY_RELATIVE } from "./interpreter.js";
import { Lexer } from "./lexer/lexer.js";
import { Parser } from "./parser/parser.js";

export class ParseProvider {
  constructor() {
    const cache = Object.create(null);

    /** @type {function(any):boolean?} */
    let identStart;

    /** @type {function(any):boolean?} */
    let identContinue;

    /**
     * Allows defining the set of characters that are allowed in AngularTS expressions. The function
     * `identifierStart` will get called to know if a given character is a valid character to be the
     * first character for an identifier. The function `identifierContinue` will get called to know if
     * a given character is a valid character to be a follow-up identifier character. The functions
     * `identifierStart` and `identifierContinue` will receive as arguments the single character to be
     * identifier and the character code point. These arguments will be `string` and `numeric`. Keep in
     * mind that the `string` parameter can be two characters long depending on the character
     * representation. It is expected for the function to return `true` or `false`, whether that
     * character is allowed or not.
     *
     * Since this function will be called extensively, keep the implementation of these functions fast,
     * as the performance of these functions have a direct impact on the expressions parsing speed.
     *
     * @param {function(any):boolean} [identifierStart] The function that will decide whether the given character is
     *   a valid identifier start character.
     * @param {function(any):boolean} [identifierContinue] The function that will decide whether the given character is
     *   a valid identifier continue character.
     * @returns {ParseProvider}
     */
    this.setIdentifierFns = function (identifierStart, identifierContinue) {
      identStart = identifierStart;
      identContinue = identifierContinue;

      return this;
    };

    this.$get = [
      $injectTokens._filter,
      /**
       *
       * @param {(any) => any} $filter
       * @returns {import('./interface').ParseService}
       */
      function ($filter) {
        /** @type {import("./lexer/lexer.js").LexerOptions} */
        const $lexerOptions = {
          isIdentifierStart: isFunction(identStart) && identStart,
          isIdentifierContinue: isFunction(identContinue) && identContinue,
        };

        return $parse;

        /**
         * @param {string} exp
         * @param interceptorFn
         * @returns any
         */
        function $parse(exp, interceptorFn) {
          let parsedExpression, cacheKey;

          switch (typeof exp) {
            case "string":
              exp = exp.trim();
              cacheKey = exp;

              parsedExpression = cache[cacheKey];

              if (!parsedExpression) {
                const lexer = new Lexer($lexerOptions);

                const parser = new Parser(lexer, $filter);

                parsedExpression = parser._parse(exp);

                cache[cacheKey] = addWatchDelegate(parsedExpression);
              }

              return addInterceptor(parsedExpression, interceptorFn);

            case "function":
              return addInterceptor(exp, interceptorFn);

            default:
              return addInterceptor(() => {
                /* empty */
              }, interceptorFn);
          }
        }

        /**
         * @param {Function} parsedExpression
         * @param interceptorFn
         * @returns {import('./interface').CompiledExpression|*}
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

            if (!interceptorFn.$$pure) {
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

export function constantWatchDelegate(
  scope,
  listener,
  objectEquality,
  parsedExpression,
) {
  const unwatch = scope.$watch(
    () => {
      unwatch();

      return parsedExpression(scope);
    },
    listener,
    objectEquality,
  );

  return unwatch;
}

/**
 *
 * @param {import('./interface.ts').CompiledExpression} parsedExpression
 * @returns {import('./interface.ts').CompiledExpression}
 */
function addWatchDelegate(parsedExpression) {
  if (parsedExpression.constant) {
    parsedExpression.$$watchDelegate = constantWatchDelegate;
  } else if (parsedExpression.inputs) {
    parsedExpression.$$watchDelegate = inputsWatchDelegate;
  }

  return parsedExpression;
}

/**
 *
 * @param {ng.Scope} scope
 * @param {Function} listener
 * @param {*} objectEquality
 * @param {import('./interface').CompiledExpression} parsedExpression
 * @returns {any}
 */
function inputsWatchDelegate(
  scope,
  listener,
  objectEquality,
  parsedExpression,
) {
  const inputExpressions = /** @type {Function} */ (parsedExpression.inputs);

  let lastResult;

  if (inputExpressions.length === 1) {
    let oldInputValueOf = expressionInputDirtyCheck; // init to something unique so that equals check fails

    const inputExpression = inputExpressions[0];

    return scope.$watch(
      // @ts-ignore
      ($scope) => {
        const newInputValue = inputExpression($scope);

        if (
          !expressionInputDirtyCheck(
            newInputValue,
            oldInputValueOf,
            inputExpression.isPure,
          )
        ) {
          lastResult = parsedExpression($scope, undefined, [newInputValue]);
          oldInputValueOf = newInputValue && getValueOf(newInputValue);
        }

        return lastResult;
      },
      listener,
      objectEquality,
    );
  } else {
    const oldInputValueOfValues = [];

    const oldInputValues = [];

    for (let i = 0, ii = inputExpressions.length; i < ii; i++) {
      oldInputValueOfValues[i] = expressionInputDirtyCheck; // init to something unique so that equals check fails
      oldInputValues[i] = null;
    }

    // return scope.$watch(
    //   // @ts-ignore
    //   (scope) => {
    //     debugger
    //     let changed = false;

    //     for (let i = 0, ii = inputExpressions.length; i < ii; i++) {
    //       const newInputValue = inputExpressions[i](scope);

    //       if (
    //         changed ||
    //         (changed = !expressionInputDirtyCheck(
    //           newInputValue,
    //           oldInputValueOfValues[i],
    //           inputExpressions[i].isPure,
    //         ))
    //       ) {
    //         oldInputValues[i] = newInputValue;
    //         oldInputValueOfValues[i] =
    //           newInputValue && getValueOf(newInputValue);
    //       }
    //     }

    //     if (changed) {
    //       lastResult = parsedExpression(scope, undefined, oldInputValues);
    //     }

    //     return lastResult;
    //   },
    //   listener,
    //   objectEquality,
    // );
    return undefined;
  }
}

function chainInterceptors(first, second) {
  function chainedInterceptor(value) {
    return second(first(value));
  }
  chainedInterceptor.$stateful = first.$stateful || second.$stateful;
  chainedInterceptor.$$pure = first.$$pure && second.$$pure;

  return chainedInterceptor;
}

function expressionInputDirtyCheck(
  newValue,
  oldValueOfValue,
  compareObjectIdentity,
) {
  if (isNullOrUndefined(newValue) || isNullOrUndefined(oldValueOfValue)) {
    // null/undefined
    return newValue === oldValueOfValue;
  }

  if (typeof newValue === "object") {
    // attempt to convert the value to a primitive type
    // TODO(docs): add a note to docs that by implementing valueOf even objects and arrays can
    //             be cheaply dirty-checked
    newValue = getValueOf(newValue);

    if (typeof newValue === "object" && !compareObjectIdentity) {
      // objects/arrays are not supported - deep-watching them would be too expensive
      return false;
    }

    // fall-through to the primitive equality check
  }

  // Primitive or NaN

  return (
    newValue === oldValueOfValue ||
    (Number.isNaN(newValue) && Number.isNaN(oldValueOfValue))
  );
}

function getValueOf(value) {
  return isFunction(value.valueOf)
    ? value.valueOf()
    : {}.constructor.prototype.valueOf.call(value);
}
