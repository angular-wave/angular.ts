import { isNullOrUndefined, arrayFrom, isObject, entries, keys, values, isFunction } from '../shared/utils.js';

/** Creates a filter that returns keys from objects and native keyed collections. */
function keysFilter() {
    return function (input) {
        if (isNullOrUndefined(input))
            return [];
        if (hasIterableMethod(input, "keys")) {
            return arrayFrom(input.keys());
        }
        if (isObject(input)) {
            return keys(input);
        }
        return [];
    };
}
/** Creates a filter that returns values from objects and native keyed collections. */
function valuesFilter() {
    return function (input) {
        if (isNullOrUndefined(input))
            return [];
        if (hasIterableMethod(input, "values")) {
            return arrayFrom(input.values());
        }
        if (isObject(input)) {
            return values(input);
        }
        return [];
    };
}
/** Creates a filter that returns { key, value } pairs from objects and native collections. */
function entriesFilter() {
    return function (input) {
        if (isNullOrUndefined(input))
            return [];
        if (hasIterableMethod(input, "entries")) {
            return arrayFrom(input.entries()).map(([key, value]) => ({ key, value }));
        }
        if (isObject(input)) {
            return entries(input).map(([key, value]) => ({ key, value }));
        }
        return [];
    };
}
function hasIterableMethod(input, method) {
    return (!isNullOrUndefined(input) &&
        isFunction(input[method]));
}

export { entriesFilter, keysFilter, valuesFilter };
