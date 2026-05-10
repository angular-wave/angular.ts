import { _injector, _parse } from "../../injection-tokens.ts";
import {
  deProxy,
  isDefined,
  isFunction,
  isUndefined,
  createErrorFactory,
  stringify,
} from "../../shared/utils.ts";
import type { ParseService } from "../parse/parse.ts";
import { SCE_CONTEXTS, type SceContext } from "../../services/sce/context.ts";
import {
  getSecurityAdapter,
  type SecurityAdapter,
} from "../security/security-adapter.ts";

export interface InterpolationFunction {
  expressions: string[];
  /**
   * Evaluate the interpolation.
   * @param context - The scope/context
   * @param cb - Optional callback when expressions change
   */
  (context: any, cb?: (val: any) => void): any;
  exp: string;
}

export interface InterpolateService {
  (
    text: string,
    mustHaveExpression?: boolean,
    trustedContext?: SceContext,
    allOrNothing?: boolean,
  ): InterpolationFunction | undefined;
  endSymbol(): string;
  startSymbol(): string;
}

const $interpolateError = createErrorFactory("$interpolate");

function throwNoconcat(text: string): never {
  throw $interpolateError(
    "noconcat",
    "Error while interpolating: {0}\nSecurity contexts disallow " +
      "interpolations that concatenate multiple expressions when a trusted value is " +
      "required.",
    text,
  );
}

function interr(text: string, err: Error): never {
  throw $interpolateError(
    "interr",
    "Can't interpolate: {0}\n{1}",
    text,
    err.toString(),
  );
}

export class InterpolateProvider {
  startSymbol: string;
  endSymbol: string;
  $get: [
    string,
    string,
    ($injector: ng.InjectorService, $parse: ParseService) => InterpolateService,
  ];

  constructor() {
    this.startSymbol = "{{";
    this.endSymbol = "}}";

    this.$get = [
      _injector,
      _parse,
      (
        $injector: ng.InjectorService,
        $parse: ParseService,
      ): InterpolateService => {
        const security: SecurityAdapter = getSecurityAdapter($injector);

        const provider = this;

        const startSymbolLength = this.startSymbol.length;

        const endSymbolLength = this.endSymbol.length;

        const escapedStartRegexp = new RegExp(
          provider.startSymbol.replace(/./g, escape),
          "g",
        );

        const escapedEndRegexp = new RegExp(
          provider.endSymbol.replace(/./g, escape),
          "g",
        );

        function escape(ch: string): string {
          return `\\\\\\${ch}`;
        }

        function unescapeText(text: string): string {
          return text
            .replace(escapedStartRegexp, provider.startSymbol)
            .replace(escapedEndRegexp, provider.endSymbol);
        }

        const $interpolate = (
          text: string,
          mustHaveExpression?: boolean,
          trustedContext?: SceContext,
          allOrNothing?: boolean,
        ): InterpolationFunction | undefined => {
          const contextAllowsConcatenation =
            trustedContext === SCE_CONTEXTS._URL ||
            trustedContext === SCE_CONTEXTS._MEDIA_URL;

          if (!text.length || text.indexOf(provider.startSymbol) === -1) {
            if (mustHaveExpression) {
              return undefined;
            }

            let unescapedText = unescapeText(text);

            if (contextAllowsConcatenation) {
              unescapedText = security.getTrusted(
                trustedContext,
                unescapedText,
              );
            }

            const constantInterp = (() =>
              unescapedText) as unknown as InterpolationFunction;

            constantInterp.exp = text;
            constantInterp.expressions = [];

            return constantInterp;
          }

          allOrNothing = !!allOrNothing;
          let startIndex: number;

          let endIndex: number;

          let index = 0;

          const expressions: string[] = [];

          const textLength = text.length;

          const concat: any[] = [];

          const expressionPositions: number[] = [];

          while (index < textLength) {
            startIndex = text.indexOf(provider.startSymbol, index);
            endIndex =
              startIndex === -1
                ? -1
                : text.indexOf(
                    provider.endSymbol,
                    startIndex + startSymbolLength,
                  );

            if (startIndex !== -1 && endIndex !== -1) {
              if (index !== startIndex) {
                concat.push(unescapeText(text.substring(index, startIndex)));
              }

              const exp = text.substring(
                startIndex + startSymbolLength,
                endIndex,
              );

              expressions.push(exp);
              index = endIndex + endSymbolLength;
              expressionPositions.push(concat.length);
              concat.push("");
            } else {
              if (index !== textLength) {
                concat.push(unescapeText(text.substring(index)));
              }
              break;
            }
          }

          const singleExpression =
            concat.length === 1 && expressionPositions.length === 1;

          const interceptor =
            contextAllowsConcatenation && singleExpression
              ? undefined
              : parseStringifyInterceptor;

          if (!mustHaveExpression || expressions.length > 0) {
            if (singleExpression) {
              const expression = expressions[0];

              const parseFn = $parse(expression);

              const watchProp = expression.trim();

              const compute = interceptor
                ? (context: any) => {
                    const value = parseFn(context);

                    return parseStringifyInterceptor(
                      deProxy(isFunction(value) ? value() : value),
                    );
                  }
                : (context: any) => parseFn(context);

              const fn = ((context: any, cb?: (val: any) => void) => {
                try {
                  if (cb) {
                    context.$watch(watchProp, () => cb(compute(context)));
                  }

                  return compute(context);
                } catch (err) {
                  return interr(text, err as Error);
                }
              }) as InterpolationFunction;

              fn.exp = text;
              fn.expressions = expressions;

              return fn;
            }

            const parseFns = expressions.map((expression) =>
              $parse(expression, interceptor),
            );

            const compute = (values: any[]) => {
              for (let i = 0; i < expressions.length; i++) {
                if (allOrNothing && isUndefined(values[i])) {
                  return undefined;
                }
                concat[expressionPositions[i]] = values[i];
              }

              if (contextAllowsConcatenation) {
                return security.getTrusted(
                  trustedContext,
                  singleExpression ? concat[0] : concat.join(""),
                );
              }

              if (trustedContext && concat.length > 1) {
                throwNoconcat(text);
              }

              return concat.join("");
            };

            const fn = ((context: any, cb?: (val: any) => void) => {
              const values = new Array(expressions.length);

              try {
                for (let i = 0; i < expressions.length; i++) {
                  if (cb) {
                    const watchProp = expressions[i].trim();

                    context.$watch(watchProp, () => {
                      const watchedValues = new Array(expressions.length);

                      for (let j = 0; j < expressions.length; j++) {
                        watchedValues[j] = parseFns[j](context);
                      }

                      cb(compute(watchedValues));
                    });
                  }

                  values[i] = parseFns[i](context);
                }

                return compute(values);
              } catch (err) {
                return interr(text, err as Error);
              }
            }) as InterpolationFunction;

            fn.exp = text;
            fn.expressions = expressions;

            return fn;
          }

          function parseStringifyInterceptor(value: any): any {
            try {
              value =
                trustedContext && !contextAllowsConcatenation
                  ? security.getTrusted(trustedContext, value)
                  : security.valueOf(value);

              return allOrNothing && !isDefined(value)
                ? value
                : stringify(value);
            } catch (err) {
              return interr(text, err as Error);
            }
          }

          return undefined;
        };

        $interpolate.startSymbol = () => provider.startSymbol;
        $interpolate.endSymbol = () => provider.endSymbol;

        return $interpolate as InterpolateService;
      },
    ];
  }
}
