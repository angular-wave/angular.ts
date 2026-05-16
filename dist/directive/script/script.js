import { _templateCache } from '../../injection-tokens.js';
import { getDirectiveAttr } from '../../shared/dom.js';

scriptDirective.$inject = [_templateCache];
/**
 * Captures inline `text/ng-template` script contents into `$templateCache`.
 */
function scriptDirective($templateCache) {
    return {
        restrict: "E",
        terminal: true,
        compile(element, attr) {
            const type = getDirectiveAttr(element, attr, "type");
            const templateId = getDirectiveAttr(element, attr, "id");
            if (type === "text/ng-template" && typeof templateId === "string") {
                $templateCache.set(templateId, element.innerText);
            }
            return undefined;
        },
    };
}

export { scriptDirective };
