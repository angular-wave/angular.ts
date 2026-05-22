import { _templateCache } from '../../injection-tokens.js';
import { getNormalizedAttr } from '../../shared/dom.js';

scriptDirective.$inject = [_templateCache];
/**
 * Captures inline `text/ng-template` script contents into `$templateCache`.
 */
function scriptDirective($templateCache) {
    return {
        restrict: "E",
        terminal: true,
        compile(element) {
            const type = getNormalizedAttr(element, "type");
            const templateId = getNormalizedAttr(element, "id");
            if (type === "text/ng-template" && typeof templateId === "string") {
                $templateCache.set(templateId, element.innerText);
            }
            return undefined;
        },
    };
}

export { scriptDirective };
