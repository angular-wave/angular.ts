import { deProxy, isDate, isNullOrUndefined } from "../shared/utils.ts";

export type DateFilterOptions = Intl.DateTimeFormatOptions;

/** Creates a locale-aware date formatting filter backed by Intl.DateTimeFormat. */
export function dateFilter() {
  return function (
    input: Date | number | string | null | undefined,
    locales?: Intl.LocalesArgument,
    options?: DateFilterOptions,
  ): string {
    if (isNullOrUndefined(input)) return "";

    const rawInput = deProxy(input);

    const date = isDate(rawInput) ? rawInput : new Date(rawInput);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(locales, options).format(date);
  };
}
