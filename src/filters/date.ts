import { isDate, isNullOrUndefined } from "../shared/utils.ts";

export type DateFilterFormat =
  | "short"
  | "medium"
  | "long"
  | "full"
  | "shortDate"
  | "mediumDate"
  | "longDate"
  | "fullDate"
  | "shortTime"
  | "mediumTime"
  | "longTime"
  | "fullTime";

export type DateFilterOptions = Intl.DateTimeFormatOptions & {
  locale?: string;
};

const DEFAULT_LOCALE = "en-US";

const DATE_FORMATS: Record<DateFilterFormat, Intl.DateTimeFormatOptions> = {
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
export function dateFilter() {
  return function (
    input: Date | number | string | null | undefined,
    format: DateFilterFormat = "mediumDate",
    timeZoneOrOptions?: string | DateFilterOptions,
    locale = DEFAULT_LOCALE,
  ): string {
    if (isNullOrUndefined(input)) return "";

    const date = isDate(input) ? input : new Date(input);

    if (Number.isNaN(date.getTime())) return "";

    const baseOptions = DATE_FORMATS[format];

    const options =
      typeof timeZoneOrOptions === "string"
        ? { ...baseOptions, timeZone: timeZoneOrOptions }
        : { ...baseOptions, ...timeZoneOrOptions };

    const resolvedLocale =
      typeof timeZoneOrOptions === "object" && timeZoneOrOptions.locale
        ? timeZoneOrOptions.locale
        : locale;

    return new Intl.DateTimeFormat(resolvedLocale, options).format(date);
  };
}
