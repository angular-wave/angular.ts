import { isString } from "../shared/utils.js";
import { NG_ANIMATE_CHILDREN_DATA } from "./shared.js";
import { setCacheData } from "../shared/dom.js";
import { $injectTokens as $t } from "../injection-tokens.js";

$$AnimateChildrenDirective.$inject = [$t.$interpolate];

/**
 * @param {*} $interpolate
 * @returns {import("../interface.ts").Directive}
 */
export function $$AnimateChildrenDirective($interpolate) {
  return {
    link(scope, element, attrs) {
      const val = attrs.ngAnimateChildren;

      if (isString(val) && val.length === 0) {
        // empty attribute
        setCacheData(element, NG_ANIMATE_CHILDREN_DATA, true);
      } else {
        // Interpolate and set the value, so that it is available to
        // animations that run right after compilation
        setData($interpolate(val)(scope));
        attrs.$observe("ngAnimateChildren", setData);
      }

      function setData(value) {
        value = value === "on" || value === "true";
        setCacheData(element, NG_ANIMATE_CHILDREN_DATA, value);
      }
    },
  };
}
