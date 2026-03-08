import { isString } from "../shared/utils.ts";
import { NG_ANIMATE_CHILDREN_DATA } from "./shared.ts";
import { setCacheData } from "../shared/dom.ts";
import { $injectTokens as $t } from "../injection-tokens.ts";

$$AnimateChildrenDirective.$inject = [$t._interpolate];

/**
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export function $$AnimateChildrenDirective(
  $interpolate: ng.InterpolateService,
): ng.Directive<any> {
  return {
    link(
      scope: ng.Scope,
      element: Element,
      attrs: ng.Attributes & Record<string, string>,
    ) {
      const val = /** @type {string} */ attrs.ngAnimateChildren;

      if (isString(val) && val.length === 0) {
        // empty attribute
        setCacheData(element, NG_ANIMATE_CHILDREN_DATA, true);
      } else {
        // Interpolate and set the value, so that it is available to
        // animations that run right after compilation
        const interpolateFn = $interpolate(val) as
          | import("../core/interpolate/interface.ts").InterpolationFunction
          | undefined;

        setData(interpolateFn ? interpolateFn(scope) : undefined);
        attrs.$observe("ngAnimateChildren", setData);
      }

      /**
       * @param {string} [value]
       */
      function setData(value?: string): void {
        const res = value === "on" || value === "true";

        setCacheData(element, NG_ANIMATE_CHILDREN_DATA, res);
      }
    },
  };
}
