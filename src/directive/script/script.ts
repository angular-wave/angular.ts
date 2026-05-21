import { _templateCache } from "../../injection-tokens.ts";
import { getNormalizedAttr } from "../../shared/dom.ts";

scriptDirective.$inject = [_templateCache];

/**
 * Captures inline `text/ng-template` script contents into `$templateCache`.
 */
export function scriptDirective(
  $templateCache: ng.TemplateCacheService,
): ng.Directive {
  return {
    restrict: "E",
    terminal: true,
    compile(element: HTMLElement): undefined {
      const type = getNormalizedAttr(element, "type");

      const templateId = getNormalizedAttr(element, "id");

      if (type === "text/ng-template" && typeof templateId === "string") {
        $templateCache.set(templateId, element.innerText);
      }

      return undefined;
    },
  };
}
