import { _parse, _attributes } from '../../injection-tokens.js';
import { getController } from '../../shared/dom.js';

ngInitDirective.$inject = [_parse, _attributes];
function ngInitDirective($parse, $attributes) {
    return {
        priority: 450,
        compile(element) {
            const initFn = $parse($attributes.read(element, "ngInit") ?? "");
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
