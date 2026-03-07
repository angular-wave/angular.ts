import { isInjectable } from "./predicates.ts";
import type { Validator } from "./interface.ts";
import {
  isArray,
  isDefined,
  isNumber,
  isString,
  notNullOrUndefined,
} from "./utils.js";

export const BADARG = "badarg";
export const BADARGKEY = "badarg: key";
export const BADARGVALUE = "badarg: value";

const reasons = new Map<Validator, string>([
  [notNullOrUndefined, "required"],
  [isArray, "notarray"],
  [isInjectable, "notinjectable"],
  [isDefined, "required"],
  [isString, "notstring"],
]);

function getReason(val: Validator): string {
  return reasons.get(val) ?? "fail";
}

/**
 * Validate a value using a predicate function.
 * Throws if the predicate returns false.
 * IMPORTANT: use this function only for developer errors and not user/data errors.
 */
export function validate<T>(fn: Validator, arg: T, name: string): T {
  if (fn(arg)) {
    return arg;
  }

  let serialized: string;

  try {
    serialized = JSON.stringify(arg);
  } catch {
    serialized = String(arg);
  }

  throw new TypeError(`badarg:${getReason(fn)} ${name}=${serialized}`);
}

export function validateRequired<T>(arg: T, name: string): NonNullable<T> {
  return validate(notNullOrUndefined, arg, name) as NonNullable<T>;
}

export function validateArray<T>(arg: T[], name: string): T[] {
  return validate(isArray, arg, name);
}

export function validateIsString(arg: string, name: string): string {
  return validate(isString, arg, name);
}

export function validateIsNumber(arg: number, name: string): number {
  return validate(isNumber, arg, name);
}

export function validateInstanceOf<T>(
  arg: unknown,
  type: new (...args: any[]) => T,
  name: string,
): T {
  return validate((value) => value instanceof type, arg, name) as T;
}
