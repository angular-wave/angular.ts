import { $injectTokens } from "../../injection-tokens.js";

scriptDirective.$inject = [$injectTokens._templateCache];

/**
 * Captures inline `text/ng-template` script contents into `$templateCache`.
 */
export function scriptDirective(
  $templateCache: ng.TemplateCacheService,
): ng.Directive {
  return {
    restrict: "E",
    terminal: true,
    compile(
      element: HTMLElement,
      attr: import("../../core/compile/attributes.ts").Attributes,
    ): void {
      const attrMap =
        attr as import("../../core/compile/attributes.ts").Attributes &
          Record<string, string>;

      if (attrMap.type === "text/ng-template") {
        $templateCache.set(attrMap.id, element.innerText);
      }
    },
  };
}
