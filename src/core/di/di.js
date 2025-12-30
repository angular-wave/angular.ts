import {
  assertArgFn,
  isArray,
  isFunction,
  minErr,
} from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";

const $injectorMinErr = minErr($injectTokens._injector);

const ARROW_ARG = /^([^(]+?)=>/;

const FN_ARGS = /^[^(]*\(\s*([^)]*)\)/m;

const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;

/**
 * @param {Function} fn
 * @returns {string}
 */
function stringifyFn(fn) {
  return Function.prototype.toString.call(fn);
}

/**
 * @param {Function} fn
 * @returns {RegExpMatchArray | null}
 */
function extractArgs(fn) {
  const fnText = stringifyFn(fn).replace(STRIP_COMMENTS, "");

  return fnText.match(ARROW_ARG) || fnText.match(FN_ARGS);
}

/**
 * @param {Function} func
 * @returns {boolean}
 */
export function isClass(func) {
  return /^class\b/.test(stringifyFn(func));
}

/**
 * @param {any} fn
 * @param {boolean} [strictDi]
 * @param {string} [name]
 * @returns {Array<string>}
 */
export function annotate(fn, strictDi, name) {
  /**
   * @type {any[]}
   */
  let inject = [];

  let argDecl;

  let last;

  if (isFunction(fn)) {
    inject = fn.$inject;

    if (!inject) {
      inject = [];

      if (fn.length) {
        if (strictDi) {
          throw $injectorMinErr(
            "strictdi",
            "{0} is not using explicit annotation and cannot be invoked in strict mode",
            name,
          );
        }
        argDecl = extractArgs(fn);
        argDecl &&
          argDecl[1].split(/,/).forEach((arg) => {
            arg.replace(FN_ARG, (_all, _underscore, injName) => {
              inject.push(injName);

              return injName;
            });
          });
      }
      fn.$inject = inject;
    }
  } else if (isArray(fn)) {
    last = /** @type {ng.AnnotatedFactory<any>} */ (fn).length - 1;
    assertArgFn(fn[last], "fn");
    inject = /** @type {ng.AnnotatedFactory<any>} */ (fn).slice(0, last);
  } else {
    assertArgFn(fn, "fn", true);
  }

  return inject;
}
