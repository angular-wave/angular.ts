import {
  directiveNormalize,
  getNodeName,
  hasOwn,
  minErr,
} from "../../shared/utils.js";
import { getCacheData } from "../../shared/dom.js";
import { $injectTokens } from "../../injection-tokens.js";

/**
 * The `ngRef` attribute tells AngularTS to assign the controller of a component (or a directive)
 * to the given property in the current scope.
 *
 * If the element with `ngRef` is destroyed `null` is assigned to the property.
 *
 * Note that if you want to assign from a child into the parent scope, you must initialize the
 * target property on the parent scope, otherwise `ngRef` will assign on the child scope.
 * This commonly happens when assigning elements or components wrapped in {@link ngIf} or
 * {@link ngRepeat}. See the second example below.
 *
 *
 * @element ANY
 * @param {string} ngRef property name - A valid AngularTS expression identifier to which the
 *                       controller or dom-wrapped DOM element will be bound.
 * @param {string=} ngRefRead read value - The name of a directive (or component) on this element,
 *                            or the special string `$element`. If a name is provided, `ngRef` will
 *                            assign the matching controller. If `$element` is provided, the element
 *                            itself is assigned (even if a controller is available).
 */

const ngRefMinErr = minErr("ngRef");

ngRefDirective.$inject = [$injectTokens._parse];

/**
 * @param {ng.ParseService} $parse
 * @return {ng.Directive}
 */
export function ngRefDirective($parse) {
  return {
    priority: -1, // Needed for compatibility with element transclusion on the same element
    restrict: "A",
    compile(tElement, tAttrs) {
      // Get the expected controller name, converts <data-some-thing> into "someThing"
      const controllerName = directiveNormalize(getNodeName(tElement));

      // Get the expression for value binding
      const getter = $parse(tAttrs.ngRef);

      const setter =
        getter._assign ||
        function () {
          throw ngRefMinErr(
            "nonassign",
            'Expression in ngRef="{0}" is non-assignable!',
            tAttrs.ngRef,
          );
        };

      return (scope, element, attrs) => {
        let refValue;

        if (hasOwn(attrs, "ngRefRead")) {
          if (attrs.ngRefRead === "$element") {
            refValue = element;
          } else {
            refValue = getCacheData(element, `$${attrs.ngRefRead}Controller`);

            if (!refValue) {
              throw ngRefMinErr(
                "noctrl",
                'The controller for ngRefRead="{0}" could not be found on ngRef="{1}"',
                attrs.ngRefRead,
                tAttrs.ngRef,
              );
            }
          }
        } else {
          refValue = getCacheData(element, `$${controllerName}Controller`);
        }

        refValue = refValue || element;

        setter(scope, refValue);

        // when the element is removed, remove it (nullify it)
        element.addEventListener("$destroy", () => {
          // only remove it if value has not changed,
          // because animations (and other procedures) may duplicate elements
          if (getter(scope) === refValue) {
            setter(scope, null);
          }
        });
      };
    },
  };
}
