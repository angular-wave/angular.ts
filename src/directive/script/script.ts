import { _templateCache } from "../../injection-tokens.ts";
import type { Attributes } from "../../core/compile/attributes.ts";
import { getDirectiveAttr } from "../../shared/dom.ts";

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
    compile(element: HTMLElement, attr: Attributes): undefined {
      const type = getDirectiveAttr(element, attr, "type");

      const templateId = getDirectiveAttr(element, attr, "id");

      if (type === "text/ng-template" && typeof templateId === "string") {
        $templateCache.set(templateId, element.innerText);
      }

      return undefined;
    },
  };
}
