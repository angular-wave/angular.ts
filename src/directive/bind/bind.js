import {
  deProxy,
  isDefined,
  isNull,
  isUndefined,
  stringify,
} from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";

/**
 * @returns {ng.Directive}
 */
export function ngBindDirective() {
  return {
    /**
     * @param {ng.Scope} scope
     * @param {Element} element
     * @param {ng.Attributes} attr
     */
    link(scope, element, attr) {
      scope.$watch(
        attr.ngBind,
        (value) => {
          element.textContent = stringify(deProxy(value));
        },
        isDefined(attr.lazy),
      );
    },
  };
}

/**
 * @returns {ng.Directive}
 */
export function ngBindTemplateDirective() {
  return {
    /**
     * @param {ng.Scope} _scope
     * @param {Element} element
     * @param {ng.Attributes} attr
     */
    link(_scope, element, attr) {
      attr.$observe("ngBindTemplate", (/** @type {string | null} */ value) => {
        element.textContent = isUndefined(value) ? "" : value;
      });
    },
  };
}

ngBindHtmlDirective.$inject = [$injectTokens._parse];
/**
 * @param {ng.ParseService} $parse
 * @returns {ng.Directive}
 */
export function ngBindHtmlDirective($parse) {
  return {
    restrict: "A",
    compile(_tElement, tAttrs) {
      $parse(tAttrs.ngBindHtml); // checks for interpolation errors

      return (
        /**
         * @param {ng.Scope} scope
         * @param {Element} element
         */
        (scope, element) => {
          scope.$watch(tAttrs.ngBindHtml, (val) => {
            if (isUndefined(val) || isNull(val)) {
              val = "";
            }
            element.innerHTML = val;
          });
        }
      );
    },
  };
}
