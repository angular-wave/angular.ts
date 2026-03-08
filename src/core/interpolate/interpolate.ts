import {
  isDefined,
  isUndefined,
  minErr,
  stringify,
} from "../../shared/utils.js";
import { $injectTokens as $t } from "../../injection-tokens.ts";
import type { ParseService } from "../parse/interface.ts";
import type { InterpolateService, InterpolationFunction } from "./interface.ts";

type SceLike = {
  URL: string;
  MEDIA_URL: string;
  getTrusted(context: string | undefined, value: any): any;
  valueOf(value: any): any;
};

const $interpolateMinErr = minErr("$interpolate");

function throwNoconcat(text: string): never {
  throw $interpolateMinErr(
    "noconcat",
    "Error while interpolating: {0}\nStrict Contextual Escaping disallows " +
      "interpolations that concatenate multiple expressions when a trusted value is " +
      "required.  See http://docs.angularjs.org/api/ng.$sce",
    text,
  );
}

function interr(text: string, err: Error): never {
  throw $interpolateMinErr(
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
    ($parse: ParseService, $sce: SceLike) => InterpolateService,
  ];

  constructor() {
    this.startSymbol = "{{";
    this.endSymbol = "}}";

    this.$get = [
      $t._parse,
      $t._sce,
      ($parse: ParseService, $sce: SceLike): InterpolateService => {
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
          trustedContext?: string,
          allOrNothing?: boolean,
        ): InterpolationFunction | undefined => {
          const contextAllowsConcatenation =
            trustedContext === $sce.URL || trustedContext === $sce.MEDIA_URL;

          if (!text.length || text.indexOf(provider.startSymbol) === -1) {
            if (mustHaveExpression) {
              return undefined;
            }

            let unescapedText = unescapeText(text);

            if (contextAllowsConcatenation) {
              unescapedText = $sce.getTrusted(trustedContext, unescapedText);
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
          const parseFns = expressions.map((expression) =>
            $parse(expression, interceptor),
          );

          if (!mustHaveExpression || expressions.length > 0) {
            const compute = (values: any[]) => {
              for (let i = 0; i < expressions.length; i++) {
                if (allOrNothing && isUndefined(values[i])) {
                  return undefined;
                }
                concat[expressionPositions[i]] = values[i];
              }

              if (contextAllowsConcatenation) {
                return $sce.getTrusted(
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
                  ? $sce.getTrusted(trustedContext, value)
                  : $sce.valueOf(value);

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
