import { _parse } from "../../injection-tokens.ts";
import {
  deProxy,
  isNull,
  isNullOrUndefined,
  isString,
  isUndefined,
  stringify,
} from "../../shared/utils.ts";
import type { Attributes } from "../../core/compile/attributes.ts";
import { getNormalizedAttr, hasNormalizedAttr } from "../../shared/dom.ts";

/** Binds the watched expression as plain text content. */
export function ngBindDirective(): ng.Directive {
  return {
    link(scope: ng.Scope, element: HTMLElement): void {
      const expression = getNormalizedAttr(element, "ngBind");

      if (!isString(expression)) return;

      scope.$watch(
        expression,
        (value: unknown) => {
          const text = stringify(deProxy(value));

          element.textContent = isString(text) ? text : "";
        },
        hasNormalizedAttr(element, "lazy"),
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

ngBindHtmlDirective.$inject = [_parse];
/** Binds trusted HTML into the element while still validating the expression. */
export function ngBindHtmlDirective($parse: ng.ParseService): ng.Directive {
  return {
    restrict: "A",
    compile(_tElement: Element, tAttrs: Attributes) {
      const expression: unknown = tAttrs.ngBindHtml;

      if (!isString(expression)) return () => undefined;

      $parse(expression); // checks for interpolation errors

      return (
        /** Watches the expression and writes the resulting HTML into the element. */
        (scope: ng.Scope, element: HTMLElement): void => {
          scope.$watch(expression, (val: unknown) => {
            const html =
              isUndefined(val) || isNull(val) ? "" : stringify(deProxy(val));

            element.innerHTML = isString(html) ? html : "";
          });
        }
      );
    },
  };
}
