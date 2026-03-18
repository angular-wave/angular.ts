import {
  deProxy,
  isDefined,
  isNull,
  isNullOrUndefined,
  isUndefined,
  stringify,
} from "../../shared/utils.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

/** Binds the watched expression as plain text content. */
export function ngBindDirective(): ng.Directive {
  return {
    link(
      scope: ng.Scope,
      element: HTMLElement,
      attr: Attributes & Record<string, string>,
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

/** Binds the interpolated template value as plain text content. */
export function ngBindTemplateDirective(): ng.Directive {
  return {
    link(_scope: ng.Scope, element: HTMLElement, attr: Attributes): void {
      attr.$observe("ngBindTemplate", (value: string | null | undefined) => {
        element.textContent = isNullOrUndefined(value) ? "" : value;
      });
    },
  };
}

ngBindHtmlDirective.$inject = [$injectTokens._parse];
/** Binds trusted HTML into the element while still validating the expression. */
export function ngBindHtmlDirective($parse: ng.ParseService): ng.Directive {
  return {
    restrict: "A",
    compile(_tElement: Element, tAttrs: Attributes & Record<string, string>) {
      $parse(tAttrs.ngBindHtml); // checks for interpolation errors

      return (
        /** Watches the expression and writes the resulting HTML into the element. */
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
