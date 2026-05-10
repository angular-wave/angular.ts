import { isNullOrUndefined } from "../shared/utils.ts";

export type RelativeTimeFilterOptions = Intl.RelativeTimeFormatOptions & {
  locale?: string;
};

const DEFAULT_LOCALE = "en-US";

/** Creates a locale-aware relative time filter backed by Intl.RelativeTimeFormat. */
export function relativeTimeFilter() {
  return function (
    input: number | string | null | undefined,
    unit: Intl.RelativeTimeFormatUnit = "day",
    options?: RelativeTimeFilterOptions,
    locale = DEFAULT_LOCALE,
  ): string {
    const value = parseRelativeTimeInput(input);

    if (isNullOrUndefined(value)) return "";

    return new Intl.RelativeTimeFormat(
      options?.locale ?? locale,
      stripLocale(options),
    ).format(value, unit);
  };
}

function parseRelativeTimeInput(
  input: number | string | null | undefined,
): number | undefined {
  if (isNullOrUndefined(input) || input === "") return undefined;

  const value = Number(input);

  return Number.isFinite(value) ? value : undefined;
}

function stripLocale<T extends { locale?: string }>(
  options: T | undefined,
): Omit<T, "locale"> | undefined {
  if (!options) return undefined;

  const relativeTimeFormatOptions = { ...options };

  delete relativeTimeFormatOptions.locale;

  return relativeTimeFormatOptions as Omit<T, "locale">;
}
