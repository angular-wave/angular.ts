import { _attributes } from "../../injection-tokens.ts";
import { keys } from "../../shared/utils.ts";

ngStyleDirective.$inject = [_attributes];
/**
 * Watches an expression and applies the resulting CSS properties to the element.
 */
export function ngStyleDirective(
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement): void {
      const expression = $attributes.read(element, "ngStyle");

      if (expression === undefined) {
        return;
      }

      let oldStyles: Record<string, string> | null = null;

      scope.$watch(
        expression,
        (
          newStyles:
            | (Record<string, string> & {
                $target?: Record<string, string>;
              })
            | null
            | undefined,
        ) => {
          const target = newStyles?.$target ?? newStyles;

          if (oldStyles) {
            keys(oldStyles).forEach((key) => {
              element.style.removeProperty(key);
            });
          }

          if (!target) {
            oldStyles = null;

            return;
          }

          const nextStyles: Record<string, string> = {};

          keys(target).forEach((key) => {
            const value = target[key];

            element.style.setProperty(key, value);
            nextStyles[key] = value;
          });

          oldStyles = nextStyles;
        },
      );
    },
  };
}
