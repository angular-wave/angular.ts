import { kebabToCamel } from "../../shared/dom.ts";

/**
 * Creates an attribute observer directive that mirrors attribute changes onto scope.
 *
 * @param source - The name of the attribute to be observed.
 */
export function ngObserveDirective(source: string, prop: string): ng.Directive {
  return {
    restrict: "A",
    compile:
      () =>
      (scope: ng.Scope, element: HTMLElement): void => {
        if (prop === "") {
          prop = source;
        }
        const normalized = kebabToCamel(prop);

        if (!scope[normalized]) {
          scope[normalized] = element.getAttribute(source);
        }

        const observer = new MutationObserver((mutations) => {
          const mutation = mutations[0];

          const newValue = (mutation.target as HTMLElement).getAttribute(
            source,
          );

          if (scope[normalized] !== newValue) {
            scope[normalized] = newValue;
          }
        });

        observer.observe(element, {
          attributes: true,
          attributeFilter: [source],
        });

        scope.$on("$destroy", () => {
          observer.disconnect();
        });
      },
  };
}
