import { _log, _injector, _attributes } from '../../injection-tokens.js';

ngInjectDirective.$inject = [_log, _injector, _attributes];
/**
 * Injects named services from `$injector` onto the current scope.
 */
function ngInjectDirective($log, $injector, $attributes) {
    return {
        restrict: "A",
        link(scope, element) {
            const expr = $attributes.read(element, "ngInject");
            if (!expr)
                return;
            const tokens = expr
                .split(";")
                .map((x) => x.trim())
                .filter(Boolean);
            for (const name of tokens) {
                if ($injector.has(name)) {
                    scope[name] = $injector.get(name);
                }
                else {
                    $log.warn(`Injectable ${name} not found in $injector`);
                }
            }
        },
    };
}

export { ngInjectDirective };
