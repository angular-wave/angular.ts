import { _parse } from '../../injection-tokens.js';
import { getController } from '../../shared/dom.js';

ngInitDirective.$inject = [_parse];
function ngInitDirective($parse) {
    return {
        priority: 450,
        compile(_element, attrs) {
            const initFn = $parse(attrs.ngInit);
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
