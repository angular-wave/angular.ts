import type { Validator } from "./interface.ts";
export declare const BADARG = "badarg";
export declare const BADARGKEY = "badarg: key";
export declare const BADARGVALUE = "badarg: value";
/**
 * Validate a value using a predicate function.
 * Throws if the predicate returns false.
 * IMPORTANT: use this function only for developer errors and not user/data errors.
 */
export declare function validate<T>(fn: Validator, arg: T, name: string): T;
/**
 * Validates that a value is neither `null` nor `undefined`.
 */
export declare function validateRequired<T>(
  arg: T,
  name: string,
): NonNullable<T>;
/**
 * Validates that a value is an array.
 */
export declare function validateArray<T>(arg: T[], name: string): T[];
/**
 * Validates that a value is a string.
 */
export declare function validateIsString(arg: string, name: string): string;
/**
 * Validates that a value is a number.
 */
export declare function validateIsNumber(arg: number, name: string): number;
/**
 * Validates that a value is an instance of the provided constructor.
 */
export declare function validateInstanceOf<T>(
  arg: unknown,
  type: new (...args: any[]) => T,
  name: string,
): T;
