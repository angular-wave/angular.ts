import { isArray, isString, isFunction } from './utils.js';

/**
 * A value is "injectable" if it is a function, or if it is an ng1
 * array-notation-style array where the head is strings and the tail is a
 * function.
 */
function isInjectable(val) {
    if (isArray(val) && val.length > 0) {
        const lastIndex = val.length - 1;
        for (let i = 0; i < lastIndex; i++) {
            if (!isString(val[i]))
                return false;
        }
        return isFunction(val[lastIndex]);
    }
    return isFunction(val);
}
/**
 * It is probably a Promise if it's an object and it has a function `then`.
 */
function isPromise(obj) {
    return (obj !== null &&
        typeof obj === "object" &&
        isFunction(obj.then));
}

export { isInjectable, isPromise };
