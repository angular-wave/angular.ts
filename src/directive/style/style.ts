/**
 * Watches an expression and applies the resulting CSS properties to the element.
 */
export function ngStyleDirective(): ng.Directive {
  return {
    restrict: "A",
    link(
      scope: ng.Scope,
      element: HTMLElement,
      attr: import("../../core/compile/attributes.ts").Attributes,
    ): void {
      const attrMap =
        attr as import("../../core/compile/attributes.ts").Attributes &
          Record<string, string>;

      let oldStyles: Record<string, string> | null = null;

      scope.$watch(
        attrMap.ngStyle,
        (
          newStyles: Record<string, string> & {
            $target?: Record<string, string>;
          },
        ) => {
          const target = newStyles?.$target || newStyles;

          if (oldStyles) {
            for (const key in oldStyles) {
              element.style.removeProperty(key);
            }
          }

          if (target) {
            oldStyles = {};

            for (const key in target) {
              const value = target[key];

              element.style.setProperty(key, value);
              oldStyles[key] = value;
            }
          } else {
            oldStyles = null;
          }
        },
      );
    },
  };
}
