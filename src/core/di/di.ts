import { _injector } from "../../injection-tokens.ts";
import {
  assertArgFn,
  isArray,
  isFunction,
  createErrorFactory,
} from "../../shared/utils.ts";
import type { AnnotatedFactory } from "../../interface.ts";
import type {
  RuntimeConstructor,
  RuntimeFunction,
} from "../../shared/utils.ts";

const $injectorError = createErrorFactory(_injector);

const ARROW_ARG = /^([^(]+?)=>/;

const FN_ARGS = /^[^(]*\(\s*([^)]*)\)/m;

const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;

function stringifyFn(fn: RuntimeFunction | RuntimeConstructor): string {
  return Function.prototype.toString.call(fn);
}

function extractArgs(
  fn: RuntimeFunction | RuntimeConstructor,
): RegExpMatchArray | null {
  const fnText = stringifyFn(fn).replace(STRIP_COMMENTS, "");

  return ARROW_ARG.exec(fnText) || FN_ARGS.exec(fnText);
}

export function isClass(func: RuntimeFunction | RuntimeConstructor): boolean {
  return /^class\b/.test(stringifyFn(func));
}

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
          throw $injectorError(
            "strictdi",
            "{0} is not using explicit annotation and cannot be invoked in strict mode",
            name,
          );
        }

        const argDecl = extractArgs(fn);

        argDecl?.[1].split(/,/).forEach((arg) => {
          arg.replace(
            FN_ARG,
            (_all: string, _underscore: string, injName: string) => {
              inject.push(injName);

              return injName;
            },
          );
        });
      }

      fn.$inject = inject;
    }
  } else if (isArray<string | RuntimeFunction>(fn)) {
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
