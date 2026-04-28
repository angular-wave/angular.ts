import { _log, _injector } from '../../injection-tokens.js';

ngInjectDirective.$inject = [_log, _injector];
/**
 * Injects named services from `$injector` onto the current scope.
 */
function ngInjectDirective($log, $injector) {
    return {
        restrict: "A",
        link(scope, _element, attrs) {
            const attrMap = attrs;
            const expr = attrMap.ngInject;
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
