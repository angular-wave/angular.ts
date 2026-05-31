import { _parse } from '../../injection-tokens.js';
import { isString, deProxy, deleteProperty, arrayFrom, createErrorFactory } from '../../shared/utils.js';
import { getNormalizedAttr } from '../../shared/dom.js';

const ngElError = createErrorFactory("ngEl");
ngElDirective.$inject = [_parse];
/**
 * Exposes the current element on `scope.$target` or an assignable expression.
 */
function ngElDirective($parse) {
    return {
        restrict: "A",
        compile(tElement) {
            const expr = getNormalizedAttr(tElement, "ngEl");
            const expression = isString(expr) ? expr.trim() : "";
            const usesExpression = !!expression && !isSimpleElementKey(expression);
            const assign = usesExpression
                ? createElementAssignment($parse, expression)
                : undefined;
            return (scope, element) => {
                const cleanup = assign
                    ? bindExpressionElement(scope, element, assign)
                    : bindKeyedElement(scope, element, expression || element.id);
                registerElementCleanup(scope, element, cleanup);
            };
        },
    };
}
function createElementAssignment($parse, expression) {
    const getter = $parse(expression);
    const setter = getter._assign ??
        function () {
            throw ngElError("nonassign", 'Expression in ngEl="{0}" is non-assignable!', expression);
        };
    return setter;
}
function bindExpressionElement(scope, element, assign) {
    const targetScope = deProxy(scope);
    assign(targetScope, element);
    return () => {
        assign(targetScope, null);
    };
}
function bindKeyedElement(scope, element, key) {
    const target = scope.$target;
    target[key] = element;
    return () => {
        deleteProperty(target, key);
    };
}
function registerElementCleanup(scope, element, cleanup) {
    let cleaned = false;
    let observer = undefined;
    let removeDestroyListener = () => undefined;
    const cleanupOnce = () => {
        if (cleaned) {
            return;
        }
        cleaned = true;
        cleanup();
        removeDestroyListener();
        observer?.disconnect();
    };
    removeDestroyListener = scope.$on("$destroy", cleanupOnce);
    const parent = element.parentNode;
    if (!parent) {
        return;
    }
    observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            arrayFrom(mutation.removedNodes).forEach((removedNode) => {
                if (removedNode === element) {
                    cleanupOnce();
                }
            });
        }
    });
    observer.observe(parent, { childList: true });
}
function isSimpleElementKey(expression) {
    return /^[$A-Z_a-z][$\w]*$/.test(expression);
}

export { ngElDirective };
