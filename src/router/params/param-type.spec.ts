/// <reference types="jasmine" />
import { ParamType } from "./param-type.ts";

function createType() {
  return new ParamType({
    encode: (value) => String(value),
    decode: (value) => value,
    is: () => true,
    equals: (left, right) => left === right,
    pattern: /.*/,
  });
}

describe("ParamType", () => {
  it("returns the original type when array mode is disabled", () => {
    const type = createType();

    expect(type.$asArray(false)).toBe(type);
  });

  it("wraps a type when array mode is enabled", () => {
    const type = createType();

    expect(type.$asArray("auto")).not.toBe(type);
  });
});
