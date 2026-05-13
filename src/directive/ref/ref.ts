import { _parse } from "../../injection-tokens.ts";
import {
  deProxy,
  directiveNormalize,
  getNodeName,
  hasOwn,
  createErrorFactory,
  isString,
} from "../../shared/utils.ts";
import { getCacheData } from "../../shared/dom.ts";

const ngRefError = createErrorFactory("ngRef");

type RefAssignFn = (scope: ng.Scope, value: unknown) => unknown;

ngRefDirective.$inject = [_parse];

export function ngRefDirective($parse: ng.ParseService): ng.Directive {
  return {
    priority: -1,
    restrict: "A",
    compile(tElement: Element, tAttrs: ng.Attributes) {
      const controllerName = directiveNormalize(getNodeName(tElement));

      const expression: unknown = tAttrs.ngRef;

      if (!isString(expression)) return () => undefined;

      const getter = $parse(expression);

      const setter =
        (getter._assign as RefAssignFn | undefined) ??
        function (): never {
          throw ngRefError(
            "nonassign",
            'Expression in ngRef="{0}" is non-assignable!',
            expression,
          );
        };

      return (scope: ng.Scope, element: Element, attrs: ng.Attributes) => {
        let refValue: unknown;

        if (hasOwn(attrs, "ngRefRead")) {
          const readTarget: unknown = attrs.ngRefRead;

          if (readTarget === "$element") {
            refValue = element;
          } else if (isString(readTarget)) {
            refValue = getCacheData(element, `$${readTarget}Controller`);
          }
        } else {
          refValue =
            getCacheData(element, `$${controllerName}Controller`) ?? element;
        }

        refValue = deProxy(refValue);

        if (refValue && typeof refValue === "object") {
          try {
            Object.defineProperty(refValue, "$nonscope", {
              configurable: true,
              value: true,
            });
          } catch {
            // Non-extensible refs can still be assigned; they may be proxied on read.
          }
        }

        const targetScope = deProxy(scope) as ng.Scope;

        setter(targetScope, refValue);

        scope.$on("$destroy", () => {
          setter(targetScope, null);
        });
      };
    },
  };
}
