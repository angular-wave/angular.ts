/// <reference types="jasmine" />
import {
  validate,
  validateArray,
  validateInstanceOf,
  validateIsNumber,
  validateIsString,
  validateRequired,
} from "./validate.ts";
import { isString } from "./utils.ts";

describe("validation helpers", () => {
  it("returns valid values", () => {
    class User {}

    const user = new User();

    expect(validate(isString, "ok", "name")).toBe("ok");
    expect(validateRequired(1, "count")).toBe(1);
    expect(validateArray([1], "items")).toEqual([1]);
    expect(validateIsString("x", "value")).toBe("x");
    expect(validateIsNumber(2, "value")).toBe(2);
    expect(validateInstanceOf(user, User, "user")).toBe(user);
  });

  it("throws descriptive TypeErrors for invalid values", () => {
    expect(() => validateIsString(1 as any, "name")).toThrowError(
      TypeError,
      "badarg:notstring name=1",
    );
    expect(() => validateRequired(null, "item")).toThrowError(
      TypeError,
      "badarg:required item=null",
    );
    expect(() => validateArray("x" as any, "items")).toThrowError(
      TypeError,
      'badarg:notarray items="x"',
    );
    expect(() => validateIsNumber("x" as any, "count")).toThrowError(
      TypeError,
      'badarg:fail count="x"',
    );
  });

  it("falls back to String when invalid values cannot be JSON serialized", () => {
    const circular: Record<string, unknown> = {};

    circular.self = circular;

    expect(() => validateIsString(circular as any, "value")).toThrowError(
      TypeError,
      "badarg:notstring value=[object Object]",
    );
  });
});
