import { isNullOrUndefined } from "../shared/utils.ts";

export type RelativeTimeFilterOptions = Intl.RelativeTimeFormatOptions;

/** Creates a locale-aware relative time filter backed by Intl.RelativeTimeFormat. */
export function relativeTimeFilter() {
  return function (
    input: number | string | null | undefined,
    unit: Intl.RelativeTimeFormatUnit = "day",
    locales?: Intl.LocalesArgument,
    options?: RelativeTimeFilterOptions,
  ): string {
    const value = parseRelativeTimeInput(input);

    if (isNullOrUndefined(value)) return "";

    return new Intl.RelativeTimeFormat(locales, options).format(value, unit);
  };
}

function parseRelativeTimeInput(
  input: number | string | null | undefined,
): number | undefined {
  if (isNullOrUndefined(input) || input === "") return undefined;

  const value = Number(input);

  return Number.isFinite(value) ? value : undefined;
}
