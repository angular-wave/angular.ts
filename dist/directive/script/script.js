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
            if (attrMap.type === "text/ng-template") {
                $templateCache.set(attrMap.id, element.innerText);
            }
        },
    };
}

export { scriptDirective };
