/// <reference types="jasmine" />
import {
  validate,
  validateArray,
  validateFunction,
  validateInstanceOf,
  validateIsNumber,
  validateIsString,
  validateRequired,
  validateTruthy,
} from "./validate.ts";
import { isDefined, isString } from "./utils.ts";

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
    expect(validateTruthy("value", "value")).toBe("value");
    expect(validateFunction(() => undefined, "callback")).toEqual(
      jasmine.any(Function),
    );
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
    expect(() => validate(isDefined, undefined, "value")).toThrowError(
      TypeError,
      "badarg:required value=undefined",
    );
    expect(() => validateTruthy("", "name")).toThrowError(
      TypeError,
      'badarg:required name=""',
    );
    expect(() => validateFunction({}, "callback")).toThrowError(
      TypeError,
      "badarg:notfunction callback={}",
    );
  });

  it("unwraps array-annotated functions when requested", () => {
    const callback = () => undefined;

    expect(validateFunction(["dependency", callback], "callback", true)).toBe(
      callback,
    );
  });

  it("allows custom failure reasons", () => {
    expect(() => validate(() => false, 1, "count", "positive")).toThrowError(
      TypeError,
      "badarg:positive count=1",
    );
  });

  it("throws when a value is not an instance of the expected constructor", () => {
    class User {}

    expect(() => validateInstanceOf({}, User, "user")).toThrowError(
      TypeError,
      "badarg:fail user={}",
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
