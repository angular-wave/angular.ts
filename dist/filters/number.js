import { isNullOrUndefined } from '../shared/utils.js';

const DEFAULT_LOCALE = "en-US";
/** Creates a locale-aware number formatting filter backed by Intl.NumberFormat. */
function numberFilter() {
    return function (input, options, locale = DEFAULT_LOCALE) {
        const value = parseNumberInput(input);
        if (isNullOrUndefined(value))
            return "";
        return new Intl.NumberFormat(options?.locale ?? locale, stripLocale(options)).format(value);
    };
}
/** Creates a locale-aware currency formatting filter backed by Intl.NumberFormat. */
function currencyFilter() {
    return function (input, currency = "USD", options, locale = DEFAULT_LOCALE) {
        const value = parseNumberInput(input);
        if (isNullOrUndefined(value))
            return "";
        return new Intl.NumberFormat(options?.locale ?? locale, {
            ...stripLocale(options),
            style: "currency",
            currency,
        }).format(value);
    };
}
/** Creates a locale-aware percentage formatting filter backed by Intl.NumberFormat. */
function percentFilter() {
    return function (input, options, locale = DEFAULT_LOCALE) {
        const value = parseNumberInput(input);
        if (isNullOrUndefined(value))
            return "";
        return new Intl.NumberFormat(options?.locale ?? locale, {
            ...stripLocale(options),
            style: "percent",
        }).format(value);
    };
}
function parseNumberInput(input) {
    if (isNullOrUndefined(input) || input === "")
        return undefined;
    const value = Number(input);
    return Number.isFinite(value) ? value : undefined;
}
function stripLocale(options) {
    if (!options)
        return undefined;
    const numberFormatOptions = { ...options };
    delete numberFormatOptions.locale;
    return numberFormatOptions;
}

export { currencyFilter, numberFilter, percentFilter };
