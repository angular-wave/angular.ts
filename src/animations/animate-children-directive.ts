import { isString } from "../shared/utils.js";
import { NG_ANIMATE_CHILDREN_DATA } from "./shared.ts";
import { setCacheData } from "../shared/dom.ts";
import { $injectTokens as $t } from "../injection-tokens.js";
import { InterpolationFunction } from "../core/interpolate/interface.ts";

$$AnimateChildrenDirective.$inject = [$t._interpolate];

/** Propagates `ng-animate-children` state to the element cache for animation lookups. */
export function $$AnimateChildrenDirective(
  $interpolate: ng.InterpolateService,
): ng.Directive<any> {
  return {
    link(
      scope: ng.Scope,
      element: Element,
      attrs: ng.Attributes & Record<string, string>,
    ) {
      const val = attrs.ngAnimateChildren;

      if (isString(val) && val.length === 0) {
        // empty attribute
        setCacheData(element, NG_ANIMATE_CHILDREN_DATA, true);
      } else {
        // Interpolate and set the value, so that it is available to
        // animations that run right after compilation
        const interpolateFn = $interpolate(val) as
          | InterpolationFunction
          | undefined;

        setData(interpolateFn ? interpolateFn(scope) : undefined);
        attrs.$observe("ngAnimateChildren", setData);
      }

      function setData(value?: string): void {
        const res = value === "on" || value === "true";

        setCacheData(element, NG_ANIMATE_CHILDREN_DATA, res);
      }
    },
  };
}
