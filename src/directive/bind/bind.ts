import {
  deProxy,
  isDefined,
  isNull,
  isNullOrUndefined,
  isUndefined,
  stringify,
} from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.ts";

/**
 * @returns {ng.Directive}
 */
export function ngBindDirective(): ng.Directive {
  return {
    link(
      scope: ng.Scope,
      element: HTMLElement,
      attr: import("../../core/compile/attributes.ts").Attributes &
        Record<string, string>,
    ): void {
      scope.$watch(
        attr.ngBind,
        (value: any) => {
          const text = stringify(deProxy(value));
          element.textContent = isNullOrUndefined(text) ? "" : String(text);
        },
        isDefined(attr.lazy),
      );
    },
  };
}

/**
 * @returns {ng.Directive}
 */
export function ngBindTemplateDirective(): ng.Directive {
  return {
    link(
      _scope: ng.Scope,
      element: HTMLElement,
      attr: import("../../core/compile/attributes.ts").Attributes,
    ): void {
      attr.$observe("ngBindTemplate", (value: string | null | undefined) => {
        element.textContent = isNullOrUndefined(value) ? "" : value;
      });
    },
  };
}

ngBindHtmlDirective.$inject = [$injectTokens._parse];
/**
 * @param {ng.ParseService} $parse
 */
export function ngBindHtmlDirective($parse: ng.ParseService): ng.Directive {
  return {
    restrict: "A",
    compile(
      _tElement: Element,
      tAttrs: import("../../core/compile/attributes.ts").Attributes &
        Record<string, string>,
    ) {
      $parse(tAttrs.ngBindHtml); // checks for interpolation errors

      return (
        /**
         * @param {ng.Scope} scope
         * @param {Element} element
         */
        (scope: ng.Scope, element: HTMLElement): void => {
          scope.$watch(tAttrs.ngBindHtml, (val: any) => {
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
