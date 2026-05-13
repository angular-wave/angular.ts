import { isObject, isString } from "../../shared/utils.ts";
import { Attributes } from "../../core/compile/attributes.ts";

/** Listens for DOM custom events and projects their payload into the element or scope. */
export function ngListenerDirective(): ng.Directive {
  return {
    scope: false,
    link: (scope: ng.Scope, element: HTMLElement, attrs: Attributes): void => {
      const configuredChannel: unknown = attrs.ngListener;

      const channel =
        typeof configuredChannel === "string" && configuredChannel !== ""
          ? configuredChannel
          : element.id;

      const hasTemplateContent = element.childNodes.length > 0;

      const fn = (event: Event) => {
        const value = (event as CustomEvent<unknown>).detail;

        if (hasTemplateContent) {
          if (isObject(value)) {
            scope.$merge(value);
          }
        } else if (isString(value)) {
          element.innerHTML = value;
        }
      };

      element.addEventListener(channel, fn);

      scope.$on("$destroy", () => {
        element.removeEventListener(channel, fn);
      });
    },
  };
}
