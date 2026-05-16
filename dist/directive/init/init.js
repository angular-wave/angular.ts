import { _parse } from '../../injection-tokens.js';
import { getDirectiveAttr, getController } from '../../shared/dom.js';

ngInitDirective.$inject = [_parse];
function ngInitDirective($parse) {
    return {
        priority: 450,
        compile(element, attrs) {
            const initFn = $parse(getDirectiveAttr(element, attrs, "ngInit") || "");
            return {
                pre(scope, element) {
                    const controller = getController(element);
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
