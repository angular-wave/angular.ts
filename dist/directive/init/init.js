import { _parse } from '../../injection-tokens.js';
import { getNormalizedAttr, getController } from '../../shared/dom.js';

ngInitDirective.$inject = [_parse];
function ngInitDirective($parse) {
    return {
        priority: 450,
        compile(element) {
            const initFn = $parse(getNormalizedAttr(element, "ngInit") ?? "");
            return {
                pre(scope, linkElement) {
                    const controller = getController(linkElement);
                    if (controller) {
                        initFn(controller);
                    }
                    else {
                        initFn(scope);
                    }
                },
            };
        },
    };
}

export { ngInitDirective };
