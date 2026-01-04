import { $injectTokens as $t } from "../../injection-tokens.js";

ngSetterDirective.$inject = [$t._parse, $t._log];

/**
 * @param {ng.ParseService} $parse
 * @param {ng.LogService} $log
 * @returns {ng.Directive}
 */
export function ngSetterDirective($parse, $log) {
  return {
    restrict: "A",
    link(scope, element, attrs) {
      const modelExpression = attrs.ngSetter;

      if (!modelExpression) {
        $log.warn("ng-setter: expression null");

        return;
      }

      const assignModel = $parse(modelExpression)._assign;

      if (!assignModel) {
        $log.warn("ng-setter: expression invalid");

        return;
      }

      const updateModel = (/** @type {string} */ value) => {
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
