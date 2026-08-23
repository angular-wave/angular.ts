import { _injector } from '../../injection-tokens.js';
import { isFunction, isArray, createErrorFactory } from '../../shared/utils.js';
import { validateFunction } from '../../shared/validate.js';

const $injectorError = createErrorFactory(_injector);
function stringifyFn(fn) {
    return Function.prototype.toString.call(fn);
}
function isClass(func) {
    return /^class\b/.test(stringifyFn(func));
}
function annotate(fn, name) {
    let inject = [];
    if (isFunction(fn)) {
        inject = fn.$inject ?? [];
        if (!fn.$inject) {
            if (fn.length > 0) {
                throw $injectorError("annotation", "{0} requires explicit dependency annotation", name);
            }
            fn.$inject = inject;
        }
    }
    else if (isArray(fn)) {
        const last = fn.length - 1;
        validateFunction(fn[last], "fn");
        inject = fn.slice(0, last);
    }
    else {
        validateFunction(fn, "fn", true);
    }
    return inject;
}

export { annotate, isClass };
