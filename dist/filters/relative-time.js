import { isNullOrUndefined } from '../shared/utils.js';

const DEFAULT_LOCALE = "en-US";
/** Creates a locale-aware relative time filter backed by Intl.RelativeTimeFormat. */
function relativeTimeFilter() {
    return function (input, unit = "day", options, locale = DEFAULT_LOCALE) {
        const value = parseRelativeTimeInput(input);
        if (isNullOrUndefined(value))
            return "";
        return new Intl.RelativeTimeFormat(options?.locale ?? locale, stripLocale(options)).format(value, unit);
    };
}
function parseRelativeTimeInput(input) {
    if (isNullOrUndefined(input) || input === "")
        return undefined;
    const value = Number(input);
    return Number.isFinite(value) ? value : undefined;
}
function stripLocale(options) {
    if (!options)
        return undefined;
    const relativeTimeFormatOptions = { ...options };
    delete relativeTimeFormatOptions.locale;
    return relativeTimeFormatOptions;
}

export { relativeTimeFilter };
