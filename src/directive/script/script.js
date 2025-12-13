import { $injectTokens } from "../../injection-tokens.js";

scriptDirective.$inject = [$injectTokens._templateCache];

/**
 * @param {ng.TemplateCacheService} $templateCache
 * @returns {ng.Directive}
 */
export function scriptDirective($templateCache) {
  return {
    restrict: "E",
    terminal: true,
    compile(element, attr) {
      if (attr.type === "text/ng-template") {
        $templateCache.set(attr.id, element.innerText);
      }
    },
  };
}
