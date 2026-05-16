import { isArray, isString, isFunction } from '../../shared/utils.js';

/**
 * A value is injectable if it is a function, class constructor, or ng1
 * array-notation-style value where dependency names are strings and the final
 * item is callable.
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

export { isInjectable };
