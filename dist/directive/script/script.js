import { _templateCache, _attributes } from '../../injection-tokens.js';

scriptDirective.$inject = [_templateCache, _attributes];
/**
 * Captures inline `text/ng-template` script contents into `$templateCache`.
 */
function scriptDirective($templateCache, $attributes) {
    return {
        restrict: "E",
        terminal: true,
        compile(element) {
            const type = $attributes.read(element, "type");
            const templateId = $attributes.read(element, "id");
            if (type === "text/ng-template" && typeof templateId === "string") {
                $templateCache.set(templateId, element.innerText);
            }
            return undefined;
        },
    };
}

export { scriptDirective };
