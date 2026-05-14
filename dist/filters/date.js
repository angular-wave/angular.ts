import { isNullOrUndefined, deProxy, isDate } from '../shared/utils.js';

const DEFAULT_LOCALE = "en-US";
const DATE_FORMATS = {
    short: {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    },
    medium: {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    },
    long: {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
    },
    full: {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "long",
    },
    shortDate: {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
    },
    mediumDate: {
        year: "numeric",
        month: "short",
        day: "numeric",
    },
    longDate: {
        year: "numeric",
        month: "long",
        day: "numeric",
    },
    fullDate: {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    },
    shortTime: {
        hour: "numeric",
        minute: "2-digit",
    },
    mediumTime: {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    },
    longTime: {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
    },
    fullTime: {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "long",
    },
};
/** Creates a locale-aware date formatting filter backed by Intl.DateTimeFormat. */
function dateFilter() {
    return function (input, format = "mediumDate", timeZoneOrOptions, locale = DEFAULT_LOCALE) {
        if (isNullOrUndefined(input))
            return "";
        const rawInput = deProxy(input);
        const date = isDate(rawInput) ? rawInput : new Date(rawInput);
        if (Number.isNaN(date.getTime()))
            return "";
        const baseOptions = DATE_FORMATS[format];
        const options = typeof timeZoneOrOptions === "string"
            ? { ...baseOptions, timeZone: timeZoneOrOptions }
            : { ...baseOptions, ...timeZoneOrOptions };
        const resolvedLocale = typeof timeZoneOrOptions === "object" && timeZoneOrOptions.locale
            ? timeZoneOrOptions.locale
            : locale;
        return new Intl.DateTimeFormat(resolvedLocale, options).format(date);
    };
}

export { dateFilter };
