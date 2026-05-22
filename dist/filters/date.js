import { isNullOrUndefined, deProxy, isDate } from '../shared/utils.js';

/** Creates a locale-aware date formatting filter backed by Intl.DateTimeFormat. */
function dateFilter() {
    return function (input, locales, options) {
        if (isNullOrUndefined(input))
            return "";
        const rawInput = deProxy(input);
        const date = isDate(rawInput) ? rawInput : new Date(rawInput);
        if (Number.isNaN(date.getTime()))
            return "";
        return new Intl.DateTimeFormat(locales, options).format(date);
    };
}

export { dateFilter };
