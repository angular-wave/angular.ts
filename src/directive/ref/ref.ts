// @ts-nocheck

import {
  directiveNormalize,
  getNodeName,
  hasOwn,
  minErr,
} from "../../shared/utils.ts";
import { getCacheData } from "../../shared/dom.ts";
import { $injectTokens } from "../../injection-tokens.ts";

const ngRefMinErr = minErr("ngRef");

ngRefDirective.$inject = [$injectTokens._parse];

export function ngRefDirective($parse) {
  return {
    priority: -1,
    restrict: "A",
    compile(tElement, tAttrs) {
      const controllerName = directiveNormalize(getNodeName(tElement));

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
          }
        } else {
          refValue =
            getCacheData(element, `$${controllerName}Controller`) || element;
        }

        setter(scope, refValue);

        scope.$on("$destroy", () => {
          setter(scope, null);
        });
      };
    },
  };
}
