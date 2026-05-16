import { _attributes, _templateCache } from "../../injection-tokens.ts";

scriptDirective.$inject = [_templateCache, _attributes];

/**
 * Captures inline `text/ng-template` script contents into `$templateCache`.
 */
export function scriptDirective(
  $templateCache: ng.TemplateCacheService,
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    restrict: "E",
    terminal: true,
    compile(element: HTMLElement): undefined {
      const type = $attributes.read(element, "type");

      const templateId = $attributes.read(element, "id");

      if (type === "text/ng-template" && typeof templateId === "string") {
        $templateCache.set(templateId, element.innerText);
      }

      return undefined;
    },
  };
}
