import { _log, _parse } from "../../injection-tokens.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

ngSetterDirective.$inject = [_parse, _log];

/**
 * Mirrors an element's HTML content into an assignable scope expression.
 */
export function ngSetterDirective(
  $parse: ng.ParseService,
  $log: ng.LogService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: Attributes): void {
      const modelExpression: unknown = attrs.ngSetter;

      if (typeof modelExpression !== "string" || modelExpression === "") {
        $log.warn("ng-setter: expression null");

        return;
      }

      const assignModel = $parse(modelExpression)._assign;

      if (!assignModel) {
        $log.warn("ng-setter: expression invalid");

        return;
      }

      const updateModel = (value: string) => {
        assignModel(scope, value.trim());
      };

      const observer = new MutationObserver((mutationsList) => {
        let contentChanged = false;

        for (const mutation of mutationsList) {
          if (
            mutation.type === "childList" ||
            mutation.type === "characterData"
          ) {
            contentChanged = true;
            break;
          }
        }

        if (contentChanged) {
          updateModel(element.innerHTML);
        }
      });

      observer.observe(element, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      scope.$on("$destroy", () => {
        observer.disconnect();
      });
      updateModel(element.innerHTML);
    },
  };
}
