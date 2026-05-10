import { isNullOrUndefined } from "../shared/utils.ts";

export type NumberFilterOptions = Intl.NumberFormatOptions & {
  locale?: string;
};

export type CurrencyFilterOptions = Omit<
  Intl.NumberFormatOptions,
  "currency" | "style"
> & {
  locale?: string;
};

const DEFAULT_LOCALE = "en-US";

/** Creates a locale-aware number formatting filter backed by Intl.NumberFormat. */
export function numberFilter() {
  return function (
    input: number | string | null | undefined,
    options?: NumberFilterOptions,
    locale = DEFAULT_LOCALE,
  ): string {
    const value = parseNumberInput(input);

    if (isNullOrUndefined(value)) return "";

    return new Intl.NumberFormat(
      options?.locale ?? locale,
      stripLocale(options),
    ).format(value);
  };
}

/** Creates a locale-aware currency formatting filter backed by Intl.NumberFormat. */
export function currencyFilter() {
  return function (
    input: number | string | null | undefined,
    currency = "USD",
    options?: CurrencyFilterOptions,
    locale = DEFAULT_LOCALE,
  ): string {
    const value = parseNumberInput(input);

    if (isNullOrUndefined(value)) return "";

    return new Intl.NumberFormat(options?.locale ?? locale, {
      ...stripLocale(options),
      style: "currency",
      currency,
    }).format(value);
  };
}

/** Creates a locale-aware percentage formatting filter backed by Intl.NumberFormat. */
export function percentFilter() {
  return function (
    input: number | string | null | undefined,
    options?: NumberFilterOptions,
    locale = DEFAULT_LOCALE,
  ): string {
    const value = parseNumberInput(input);

    if (isNullOrUndefined(value)) return "";

    return new Intl.NumberFormat(options?.locale ?? locale, {
      ...stripLocale(options),
      style: "percent",
    }).format(value);
  };
}

function parseNumberInput(
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

  const numberFormatOptions = { ...options };

  delete numberFormatOptions.locale;

  return numberFormatOptions as Omit<T, "locale">;
}
