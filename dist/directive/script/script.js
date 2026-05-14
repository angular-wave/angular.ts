import { _templateCache } from '../../injection-tokens.js';

scriptDirective.$inject = [_templateCache];
/**
 * Captures inline `text/ng-template` script contents into `$templateCache`.
 */
function scriptDirective($templateCache) {
    return {
        restrict: "E",
        terminal: true,
        compile(element, attr) {
            const attrMap = attr;
            const templateId = attr.id;
            if (attrMap.type === "text/ng-template" &&
                typeof templateId === "string") {
                $templateCache.set(templateId, element.innerText);
            }
            return undefined;
        },
    };
}

export { scriptDirective };
