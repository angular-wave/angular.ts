import { _parse } from "../../injection-tokens.ts";
import {
  callFunction,
  deProxy,
  isDefined,
  isFunction,
  isUndefined,
  createErrorFactory,
  stringify,
} from "../../shared/utils.ts";
import type { ParseService } from "../parse/parse.ts";
import { SCE_CONTEXTS, type SceContext } from "../../services/sce/context.ts";

type InterpolationSecurity = Pick<
  ng.SceService,
  "getTrusted" | "getTrustedMediaUrl" | "valueOf"
>;

export interface InterpolationFunction {
  /** Expressions extracted from the interpolation text. */
  expressions: string[];
  /**
   * Evaluate the interpolation.
   * @param context - The scope/context
   * @param cb - Optional callback when expressions change
   */
  (context: unknown, cb?: (val: unknown) => void): unknown;
  /** Original interpolation text. */
  exp: string;
}

interface WatchableContext {
  $watch: (expression: string, listener: () => void) => unknown;
}

function getWatchableContext(context: unknown): WatchableContext | undefined {
  return isFunction((context as Partial<WatchableContext> | undefined)?.$watch)
    ? (context as WatchableContext)
    : undefined;
}

export interface InterpolateService {
  (
    text: string,
    mustHaveExpression?: boolean,
    trustedContext?: SceContext,
    allOrNothing?: boolean,
  ): InterpolationFunction | undefined;
  /** Return the configured interpolation end delimiter. */
  endSymbol(): string;
  /** Return the configured interpolation start delimiter. */
  startSymbol(): string;
}

/** Delimiter configuration accepted by `NgModule.config()`. */
export interface InterpolateConfig {
  /** Opening delimiter. Defaults to `{{`. */
  startSymbol?: string;
  /** Closing delimiter. Defaults to `}}`. */
  endSymbol?: string;
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

/** @internal */
export interface InterpolateRuntimeState {
  startSymbol: string;
  endSymbol: string;
  destroyed: boolean;
}

/** @internal */
export function createInterpolateRuntimeState(): InterpolateRuntimeState {
  return {
    startSymbol: "{{",
    endSymbol: "}}",
    destroyed: false,
  };
}

/** @internal */
export function applyInterpolateConfiguration(
  state: InterpolateRuntimeState,
  config: InterpolateConfig,
): void {
  assertInterpolateRuntimeActive(state);

  if (config.startSymbol !== undefined) {
    state.startSymbol = config.startSymbol;
  }

  if (config.endSymbol !== undefined) {
    state.endSymbol = config.endSymbol;
  }
}

/** @internal */
export function destroyInterpolateRuntimeState(
  state: InterpolateRuntimeState,
): void {
  if (state.destroyed) return;

  state.destroyed = true;
  state.startSymbol = "{{";
  state.endSymbol = "}}";
}

function assertInterpolateRuntimeActive(state: InterpolateRuntimeState): void {
  if (state.destroyed) {
    throw new Error("Interpolation runtime has already been disposed.");
  }
}

/** @internal */
export function createInterpolateService(
  state: InterpolateRuntimeState,
  $parse: ParseService,
  security: InterpolationSecurity,
): InterpolateService {
  assertInterpolateRuntimeActive(state);

  const interpolationStartSymbol = state.startSymbol;

  const interpolationEndSymbol = state.endSymbol;

  const startSymbolLength = interpolationStartSymbol.length;

  const endSymbolLength = interpolationEndSymbol.length;

  const escapedStartRegexp = new RegExp(
    interpolationStartSymbol.replace(/./g, escape),
    "g",
  );

  const escapedEndRegexp = new RegExp(
    interpolationEndSymbol.replace(/./g, escape),
    "g",
  );

  function escape(ch: string): string {
    return `\\\\\\${ch}`;
  }

  function unescapeText(text: string): string {
    return text
      .replace(escapedStartRegexp, interpolationStartSymbol)
      .replace(escapedEndRegexp, interpolationEndSymbol);
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

    if (!text.length || !text.includes(interpolationStartSymbol)) {
      if (mustHaveExpression) {
        return undefined;
      }

      let unescapedText: unknown = unescapeText(text);

      if (contextAllowsConcatenation) {
        unescapedText = security.getTrusted(trustedContext, unescapedText);
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

    const concat: unknown[] = [];

    const expressionPositions: number[] = [];

    while (index < textLength) {
      startIndex = text.indexOf(interpolationStartSymbol, index);
      endIndex =
        startIndex === -1
          ? -1
          : text.indexOf(
              interpolationEndSymbol,
              startIndex + startSymbolLength,
            );

      if (startIndex !== -1 && endIndex !== -1) {
        if (index !== startIndex) {
          concat.push(unescapeText(text.substring(index, startIndex)));
        }

        const exp = text.substring(startIndex + startSymbolLength, endIndex);

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
        const [expression] = expressions;

        const parseFn = $parse(expression);

        const watchProp = expression.trim();

        const compute = interceptor
          ? (context: unknown) => {
              const value = parseFn(context);

              return parseStringifyInterceptor(
                deProxy(isFunction(value) ? value() : value),
              );
            }
          : (context: unknown) => parseFn(context);

        const fn = ((context: unknown, cb?: (val: unknown) => void) => {
          try {
            if (cb) {
              const watchable = getWatchableContext(context);

              if (watchable) {
                callFunction(watchable.$watch, watchable, watchProp, () => {
                  cb(compute(context));
                });
              }
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

      const compute = (values: unknown[]): unknown => {
        for (let i = 0; i < expressions.length; i++) {
          if (allOrNothing && isUndefined(values[i])) {
            return undefined;
          }
          concat[expressionPositions[i]] = values[i];
        }

        if (contextAllowsConcatenation) {
          return security.getTrusted(trustedContext, concat.join(""));
        }

        if (trustedContext && concat.length > 1) {
          throwNoconcat(text);
        }

        return concat.join("");
      };

      const fn = ((context: unknown, cb?: (val: unknown) => void) => {
        const values = new Array<unknown>(expressions.length);

        try {
          for (let i = 0; i < expressions.length; i++) {
            if (cb) {
              const watchProp = expressions[i].trim();

              const watchable = getWatchableContext(context);

              if (watchable) {
                callFunction(watchable.$watch, watchable, watchProp, () => {
                  const watchedValues = new Array<unknown>(expressions.length);

                  for (let j = 0; j < expressions.length; j++) {
                    watchedValues[j] = parseFns[j](context);
                  }

                  cb(compute(watchedValues));
                });
              }
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

    function parseStringifyInterceptor(value: unknown): unknown {
      try {
        value =
          trustedContext && !contextAllowsConcatenation
            ? security.getTrusted(trustedContext, value)
            : security.valueOf(value);

        return allOrNothing && !isDefined(value) ? value : stringify(value);
      } catch (err) {
        return interr(text, err as Error);
      }
    }

    return undefined;
  };

  $interpolate.startSymbol = () => interpolationStartSymbol;
  $interpolate.endSymbol = () => interpolationEndSymbol;

  return $interpolate as InterpolateService;
}

/** @internal */
export function createInterpolateRegistration(
  state: InterpolateRuntimeState,
  security: InterpolationSecurity,
): [string, ($parse: ParseService) => InterpolateService] {
  return [
    _parse,
    ($parse) => createInterpolateService(state, $parse, security),
  ];
}
