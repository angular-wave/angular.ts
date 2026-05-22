import { isNullOrUndefined } from '../shared/utils.js';

/** Creates a locale-aware relative time filter backed by Intl.RelativeTimeFormat. */
function relativeTimeFilter() {
    return function (input, unit = "day", locales, options) {
        const value = parseRelativeTimeInput(input);
        if (isNullOrUndefined(value))
            return "";
        return new Intl.RelativeTimeFormat(locales, options).format(value, unit);
    };
}
function parseRelativeTimeInput(input) {
    if (isNullOrUndefined(input) || input === "")
        return undefined;
    const value = Number(input);
    return Number.isFinite(value) ? value : undefined;
}

export { relativeTimeFilter };
