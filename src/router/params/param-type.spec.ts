/// <reference types="jasmine" />
import { ParamType } from "./param-type.ts";
import { createDefaultParamTypes } from "./param-types.ts";
import { ParamFactory } from "./param-factory.ts";

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

    expect(type._asArray(false)).toBe(type);
  });

  it("wraps a type when array mode is enabled", () => {
    const type = createType();

    expect(type._asArray("auto")).not.toBe(type as any);
  });
});

describe("Param", () => {
  it("uses a named configured type instead of a string URL type", () => {
    const paramTypes = createDefaultParamTypes();
    const factory = new ParamFactory({
      _paramTypes: paramTypes,
      _getDefaultSquash: () => false,
    });

    const param = factory.fromPath("userId", paramTypes.string, {
      name: "profile",
      params: { userId: { type: "int" } },
    });

    expect(param.type).toBe(paramTypes.int);
  });

  it("uses a ParamType instance directly", () => {
    const type = createType();
    const factory = new ParamFactory({
      _paramTypes: createDefaultParamTypes(),
      _getDefaultSquash: () => false,
    });

    const param = factory.fromConfig("userId", null, {
      name: "profile",
      params: { userId: { type } },
    });

    expect(param.type).toBe(type);
  });

  it("reports unknown configured types as route validation errors", () => {
    const factory = new ParamFactory({
      _paramTypes: createDefaultParamTypes(),
      _getDefaultSquash: () => false,
    });

    expect(() =>
      factory.fromConfig("userId", null, {
        name: "profile",
        params: { userId: { type: "missing" } },
      }),
    ).toThrowError("Param 'userId' uses unknown type 'missing'.");
  });
});
