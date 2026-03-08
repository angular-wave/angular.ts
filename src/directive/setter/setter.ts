import { $injectTokens as $t } from "../../injection-tokens.ts";

ngSetterDirective.$inject = [$t._parse, $t._log];

/**
 * Mirrors an element's HTML content into an assignable scope expression.
 *
 * @param {ng.ParseService} $parse
 */
export function ngSetterDirective(
  $parse: ng.ParseService,
  $log: ng.LogService,
): ng.Directive {
  return {
    restrict: "A",
    link(
      scope: ng.Scope,
      element: HTMLElement,
      attrs: import("../../core/compile/attributes.ts").Attributes,
    ): void {
      const attrMap =
        attrs as import("../../core/compile/attributes.ts").Attributes &
          Record<string, string>;
      const modelExpression = attrMap.ngSetter;

      if (!modelExpression) {
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

      scope.$on("$destroy", () => observer.disconnect());
      updateModel(element.innerHTML);
    },
  };
}
