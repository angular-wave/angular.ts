import { isNullOrUndefined } from "../shared/utils.ts";

export type CurrencyFilterOptions = Omit<Intl.NumberFormatOptions, "style">;

/** Creates a locale-aware number formatting filter backed by Intl.NumberFormat. */
export function numberFilter() {
  return function (
    input: number | string | null | undefined,
    locales?: Intl.LocalesArgument,
    options?: Intl.NumberFormatOptions,
  ): string {
    const value = parseNumberInput(input);

    if (isNullOrUndefined(value)) return "";

    return new Intl.NumberFormat(locales, options).format(value);
  };
}

/** Creates a locale-aware currency formatting filter backed by Intl.NumberFormat. */
export function currencyFilter() {
  return function (
    input: number | string | null | undefined,
    locales?: Intl.LocalesArgument,
    options?: CurrencyFilterOptions,
  ): string {
    const value = parseNumberInput(input);

    if (isNullOrUndefined(value)) return "";

    return new Intl.NumberFormat(locales, {
      ...options,
      style: "currency",
      currency: options?.currency ?? "USD",
    }).format(value);
  };
}

/** Creates a locale-aware percentage formatting filter backed by Intl.NumberFormat. */
export function percentFilter() {
  return function (
    input: number | string | null | undefined,
    locales?: Intl.LocalesArgument,
    options?: Intl.NumberFormatOptions,
  ): string {
    const value = parseNumberInput(input);

    if (isNullOrUndefined(value)) return "";

    return new Intl.NumberFormat(locales, {
      ...options,
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
