import { assertArgFn, minErr } from "../../shared/utils.js";
import { INJECTOR_LITERAL } from "./ng-module/ng-module.js";

/**
 * Shared utility functions
 */

const $injectorMinErr = minErr(INJECTOR_LITERAL);
const ARROW_ARG = /^([^(]+?)=>/;
const FN_ARGS = /^[^(]*\(\s*([^)]*)\)/m;
const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;

/**
 * @param {Function} fn
 * @returns {string}
 */
export function stringifyFn(fn) {
  return Function.prototype.toString.call(fn);
}

/**
 * @param {Function} fn
 * @returns {Array<any>}
 */
export function extractArgs(fn) {
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
  let $inject, argDecl, last;

  if (typeof fn === "function") {
    if (!($inject = fn.$inject)) {
      $inject = [];
      if (fn.length) {
        if (strictDi) {
          throw $injectorMinErr(
            "strictdi",
            "{0} is not using explicit annotation and cannot be invoked in strict mode",
            name,
          );
        }
        argDecl = extractArgs(fn);
        argDecl[1].split(/,/).forEach(function (arg) {
          arg.replace(FN_ARG, function (_all, _underscore, name) {
            $inject.push(name);
          });
        });
      }
      fn.$inject = $inject;
    }
  } else if (Array.isArray(fn)) {
    last = /** @type {Array} */ (fn).length - 1;
    assertArgFn(fn[last], "fn");
    $inject = /** @type {Array} */ (fn).slice(0, last);
  } else {
    assertArgFn(fn, "fn", true);
  }
  return $inject;
}
