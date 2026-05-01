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

    expect(type.$asArray(false, true)).toBe(type);
  });

  it("rejects auto array mode for path parameters", () => {
    const type = createType();

    expect(() => type.$asArray("auto", false)).toThrowError(
      "'auto' array mode is for query parameters only",
    );
  });
});
