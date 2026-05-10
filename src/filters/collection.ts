import {
  arrayFrom,
  entries,
  isFunction,
  isNullOrUndefined,
  isObject,
  keys,
  values,
} from "../shared/utils.ts";

export type EntryFilterItem = {
  key: any;
  value: any;
};

type IterableMethodName = "keys" | "values" | "entries";

type IterableRecord = Record<IterableMethodName, () => Iterable<any>>;

/** Creates a filter that returns keys from objects and native keyed collections. */
export function keysFilter() {
  return function (input: any): any[] {
    if (isNullOrUndefined(input)) return [];

    if (hasIterableMethod(input, "keys")) {
      return arrayFrom(input.keys());
    }

    if (isObject(input)) {
      return keys(input);
    }

    return [];
  };
}

/** Creates a filter that returns values from objects and native keyed collections. */
export function valuesFilter() {
  return function (input: any): any[] {
    if (isNullOrUndefined(input)) return [];

    if (hasIterableMethod(input, "values")) {
      return arrayFrom(input.values());
    }

    if (isObject(input)) {
      return values(input);
    }

    return [];
  };
}

/** Creates a filter that returns { key, value } pairs from objects and native collections. */
export function entriesFilter() {
  return function (input: any): EntryFilterItem[] {
    if (isNullOrUndefined(input)) return [];

    if (hasIterableMethod(input, "entries")) {
      return arrayFrom(input.entries()).map(([key, value]) => ({ key, value }));
    }

    if (isObject(input)) {
      return entries(input).map(([key, value]) => ({ key, value }));
    }

    return [];
  };
}

function hasIterableMethod<TMethod extends IterableMethodName>(
  input: any,
  method: TMethod,
): input is Pick<IterableRecord, TMethod> {
  return !isNullOrUndefined(input) && isFunction(input[method]);
}
