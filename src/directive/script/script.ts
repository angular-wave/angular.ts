import { $injectTokens } from "../../injection-tokens.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

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
    compile(element: HTMLElement, attr: Attributes): void {
      const attrMap = attr as Attributes & Record<string, string>;

      if (attrMap.type === "text/ng-template") {
        $templateCache.set(attrMap.id, element.innerText);
      }
    },
  };
}
