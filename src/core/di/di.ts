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

function stringifyFn(fn: RuntimeFunction | RuntimeConstructor): string {
  return Function.prototype.toString.call(fn);
}

export function isClass(func: RuntimeFunction | RuntimeConstructor): boolean {
  return /^class\b/.test(stringifyFn(func));
}

export function annotate(fn: unknown, name?: string): string[] {
  let inject: string[] = [];

  if (isFunction(fn)) {
    inject = (fn.$inject as string[] | undefined) ?? [];

    if (!fn.$inject) {
      if (fn.length > 0) {
        throw $injectorError(
          "annotation",
          "{0} requires explicit dependency annotation",
          name,
        );
      }

      fn.$inject = inject;
    }
  } else if (isArray<string | RuntimeFunction>(fn)) {
    const last = fn.length - 1;

    assertArgFn(fn[last], "fn");
    inject = (fn as AnnotatedFactory<(...args: unknown[]) => unknown>).slice(
      0,
      last,
    ) as string[];
  } else {
    assertArgFn(fn as RuntimeFunction | RuntimeConstructor, "fn", true);
  }

  return inject;
}
