import { _attributes } from "../../injection-tokens.ts";
import { isObject, isString } from "../../shared/utils.ts";

ngListenerDirective.$inject = [_attributes];

function fallbackWhenEmpty(
  value: string | null | undefined,
  fallback: string,
): string {
  if (value) return value;

  return fallback;
}

/** Listens for DOM custom events and projects their payload into the element or scope. */
export function ngListenerDirective(
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    scope: false,
    link: (scope: ng.Scope, element: HTMLElement): void => {
      const configuredChannel = $attributes.read(element, "ngListener");

      const channel = fallbackWhenEmpty(configuredChannel, element.id);

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
