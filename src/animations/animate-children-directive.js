import { isString } from "../shared/utils.js";
import { NG_ANIMATE_CHILDREN_DATA } from "./shared.js";
import { setCacheData } from "../shared/dom.js";
import { $injectTokens as $t } from "../injection-tokens.js";

$$AnimateChildrenDirective.$inject = [$t._interpolate];

/**
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export function $$AnimateChildrenDirective($interpolate) {
  return {
    link(scope, element, attrs) {
      const val = /** @type {string} */ (attrs.ngAnimateChildren);

      if (isString(val) && val.length === 0) {
        // empty attribute
        setCacheData(element, NG_ANIMATE_CHILDREN_DATA, true);
      } else {
        // Interpolate and set the value, so that it is available to
        // animations that run right after compilation
        setData(
          /** @type {import("../core/interpolate/interface.js").InterpolationFunction} */ (
            $interpolate(val)
          )(scope),
        );
        attrs.$observe("ngAnimateChildren", setData);
      }

      /**
       * @param {string} [value]
       */
      function setData(value) {
        const res = value === "on" || value === "true";

        setCacheData(element, NG_ANIMATE_CHILDREN_DATA, res);
      }
    },
  };
}
