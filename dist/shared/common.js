import { assign, keys } from './utils.js';

/**
 * Given an array and an item, removes the item in-place when present.
 */
function removeFrom(array, obj) {
    const i = array.indexOf(obj);
    if (i !== -1)
        array.splice(i, 1);
    return array;
}
/**
 * Applies option defaults and only copies option keys known by the defaults.
 * Earlier defaults take precedence over later defaults.
 */
function defaults(opts, ...defaultsList) {
    const defaultVals = assign({}, ...defaultsList.reverse());
    opts = opts || {};
    const defaultKeys = keys(defaultVals);
    defaultKeys.forEach((key) => {
        if (key in opts)
            defaultVals[key] = opts[key];
    });
    return defaultVals;
}
/**
 * Reduce helper that pushes an item to an array, then returns the array.
 */
function pushR(arr, obj) {
    arr.push(obj);
    return arr;
}
/**
 * Returns the last element of an array or string.
 */
function tail(arr) {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

export { defaults, pushR, removeFrom, tail };
