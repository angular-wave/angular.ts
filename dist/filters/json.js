import { toJson, isUndefined } from '../shared/utils.js';

/**
 * Serializes a value to JSON using AngularTS's `toJson` helper.
 */
function jsonFilter() {
    return function (object, spacing) {
        if (isUndefined(spacing)) {
            spacing = 2;
        }
        return toJson(object, spacing);
    };
}

export { jsonFilter };
