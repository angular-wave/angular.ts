import { _parse } from "../../injection-tokens.ts";
import {
  directiveNormalize,
  getNodeName,
  hasOwn,
  createErrorFactory,
} from "../../shared/utils.ts";
import { getCacheData } from "../../shared/dom.ts";

const ngRefError = createErrorFactory("ngRef");

ngRefDirective.$inject = [_parse];

export function ngRefDirective($parse: ng.ParseService): ng.Directive {
  return {
    priority: -1,
    restrict: "A",
    compile(tElement: Element, tAttrs: ng.Attributes) {
      const controllerName = directiveNormalize(getNodeName(tElement));

      const getter = $parse(tAttrs.ngRef);

      const setter =
        getter._assign ||
        function () {
          throw ngRefError(
            "nonassign",
            'Expression in ngRef="{0}" is non-assignable!',
            tAttrs.ngRef,
          );
        };

      return (scope: ng.Scope, element: Element, attrs: ng.Attributes) => {
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
