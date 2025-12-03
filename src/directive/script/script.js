scriptDirective.$inject = ["$templateCache"];

/**
 * @param {ng.TemplateCacheService} $templateCache
 * @returns {import('../../interface.ts').Directive}
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
