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
export declare function validateRequired<T>(
  arg: T,
  name: string,
): NonNullable<T>;
export declare function validateArray<T>(arg: T[], name: string): T[];
export declare function validateIsString(arg: string, name: string): string;
export declare function validateIsNumber(arg: number, name: string): number;
export declare function validateInstanceOf<T>(
  arg: unknown,
  type: new (...args: any[]) => T,
  name: string,
): T;
