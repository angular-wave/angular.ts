import { isNullOrUndefined } from '../shared/utils.js';

/** Creates a locale-aware number formatting filter backed by Intl.NumberFormat. */
function numberFilter() {
    return function (input, locales, options) {
        const value = parseNumberInput(input);
        if (isNullOrUndefined(value))
            return "";
        return new Intl.NumberFormat(locales, options).format(value);
    };
}
/** Creates a locale-aware currency formatting filter backed by Intl.NumberFormat. */
function currencyFilter() {
    return function (input, locales, options) {
        const value = parseNumberInput(input);
        if (isNullOrUndefined(value))
            return "";
        return new Intl.NumberFormat(locales, {
            ...options,
            style: "currency",
            currency: options?.currency ?? "USD",
        }).format(value);
    };
}
/** Creates a locale-aware percentage formatting filter backed by Intl.NumberFormat. */
function percentFilter() {
    return function (input, locales, options) {
        const value = parseNumberInput(input);
        if (isNullOrUndefined(value))
            return "";
        return new Intl.NumberFormat(locales, {
            ...options,
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

export { currencyFilter, numberFilter, percentFilter };
