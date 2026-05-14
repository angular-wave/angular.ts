import { _injector } from '../../injection-tokens.js';
import { isFunction, isArray, assertArgFn, createErrorFactory } from '../../shared/utils.js';

const $injectorError = createErrorFactory(_injector);
const ARROW_ARG = /^([^(]+?)=>/;
const FN_ARGS = /^[^(]*\(\s*([^)]*)\)/m;
const FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
function stringifyFn(fn) {
    return Function.prototype.toString.call(fn);
}
function extractArgs(fn) {
    const fnText = stringifyFn(fn).replace(STRIP_COMMENTS, "");
    return ARROW_ARG.exec(fnText) || FN_ARGS.exec(fnText);
}
function isClass(func) {
    return /^class\b/.test(stringifyFn(func));
}
function annotate(fn, strictDi = false, name) {
    let inject = [];
    if (isFunction(fn)) {
        inject = fn.$inject ?? [];
        if (!fn.$inject) {
            if (fn.length > 0) {
                if (strictDi) {
                    throw $injectorError("strictdi", "{0} is not using explicit annotation and cannot be invoked in strict mode", name);
                }
                const argDecl = extractArgs(fn);
                argDecl?.[1].split(/,/).forEach((arg) => {
                    arg.replace(FN_ARG, (_all, _underscore, injName) => {
                        inject.push(injName);
                        return injName;
                    });
                });
            }
            fn.$inject = inject;
        }
    }
    else if (isArray(fn)) {
        const last = fn.length - 1;
        assertArgFn(fn[last], "fn");
        inject = fn.slice(0, last);
    }
    else {
        assertArgFn(fn, "fn", true);
    }
    return inject;
}

export { annotate, isClass };
