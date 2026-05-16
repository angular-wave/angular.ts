import { _attributes, _parse } from "../../injection-tokens.ts";
import {
  deProxy,
  isNull,
  isNullOrUndefined,
  isString,
  isUndefined,
  stringify,
} from "../../shared/utils.ts";
import type { Attributes } from "../../interface.ts";

ngBindDirective.$inject = [_attributes];
/** Binds the watched expression as plain text content. */
export function ngBindDirective(
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    link(scope: ng.Scope, element: HTMLElement): void {
      const expression = $attributes.read(element, "ngBind");

      if (!isString(expression)) return;

      scope.$watch(
        expression,
        (value: unknown) => {
          const text = stringify(deProxy(value));

          element.textContent = isString(text) ? text : "";
        },
        $attributes.has(element, "lazy"),
      );
    },
  };
}

/** Binds the interpolated template value as plain text content. */
ngBindTemplateDirective.$inject = [_attributes];
export function ngBindTemplateDirective(
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    link(scope: ng.Scope, element: HTMLElement): void {
      $attributes.observe(scope, element, "ngBindTemplate", (value) => {
        element.textContent = isNullOrUndefined(value) ? "" : value;
      });
    },
  };
}

ngBindHtmlDirective.$inject = [_parse, _attributes];
/** Binds trusted HTML into the element while still validating the expression. */
export function ngBindHtmlDirective(
  $parse: ng.ParseService,
  $attributes?: ng.AttributesService,
): ng.Directive {
  return {
    restrict: "A",
    compile(tElement: Element, tAttrs: Attributes) {
      const expression: unknown =
        $attributes?.read(tElement, "ngBindHtml") ?? tAttrs.ngBindHtml;

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
