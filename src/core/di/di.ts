import {
  assertArgFn,
  isArray,
  isFunction,
  minErr,
} from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.ts";
import type { AnnotatedFactory } from "../../interface.ts";

const $injectorMinErr = minErr($injectTokens._injector);

const ARROW_ARG = /^([^(]+?)=>/;
const FN_ARGS = /^[^(]*\(\s*([^)]*)\)/m;
const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;

function stringifyFn(fn: Function): string {
  return Function.prototype.toString.call(fn);
}

function extractArgs(fn: Function): RegExpMatchArray | null {
  const fnText = stringifyFn(fn).replace(STRIP_COMMENTS, "");
  return fnText.match(ARROW_ARG) || fnText.match(FN_ARGS);
}

/**
 * Returns true when the function source appears to be an ES class.
 */
export function isClass(func: Function): boolean {
  return /^class\b/.test(stringifyFn(func));
}

/**
 * Returns the dependency injection annotation for a function or array-annotated factory.
 *
 * In non-strict mode this will infer argument names when explicit `$inject`
 * metadata is absent, then cache the result on `fn.$inject`.
 *
 * @param fn function or array-annotated factory to inspect
 * @param strictDi when true, throws if explicit annotation is missing
 * @param name optional name used in strict-di error messages
 * @returns ordered dependency token names
 */
export function annotate(
  fn: unknown,
  strictDi = false,
  name?: string,
): string[] {
  let inject: string[] = [];

  if (isFunction(fn)) {
    inject = (fn.$inject as string[] | undefined) ?? [];

    if (!fn.$inject) {
      if (fn.length > 0) {
        if (strictDi) {
          throw $injectorMinErr(
            "strictdi",
            "{0} is not using explicit annotation and cannot be invoked in strict mode",
            name,
          );
        }

        const argDecl = extractArgs(fn);

        argDecl?.[1].split(/,/).forEach((arg) => {
          arg.replace(FN_ARG, (_all, _underscore, injName) => {
            inject.push(injName);
            return injName;
          });
        });
      }

      fn.$inject = inject;
    }
  } else if (isArray<string | Function>(fn)) {
    const last = fn.length - 1;
    assertArgFn(fn[last], "fn");
    inject = (fn as AnnotatedFactory<(...args: any[]) => any>).slice(
      0,
      last,
    ) as string[];
  } else {
    assertArgFn(fn as any, "fn", true);
  }

  return inject;
}
