import {
  coerceNativeAttribute,
  nativeElementDirectiveName,
} from "./native-element.ts";

describe("declarative native elements", () => {
  it("maps every public native component to an idiomatic HTML directive", async () => {
    const { nativeElements } = await import("../../runtime/native-elements.ts");
    const names = Object.keys(nativeElements);
    const directives = names.map(nativeElementDirectiveName);

    expect(new Set(directives).size).toBe(names.length);
    expect(nativeElementDirectiveName("text-field")).toBe("ngNativeTextField");
    expect(nativeElementDirectiveName("bottom-bar")).toBe("ngNativeBottomBar");
  });

  it("coerces interpolated HTML values using the generated property type", () => {
    expect(coerceNativeAttribute("true", "BOOLEAN")).toBeTrue();
    expect(coerceNativeAttribute("false", "BOOLEAN")).toBeFalse();
    expect(coerceNativeAttribute("", "BOOLEAN")).toBeTrue();
    expect(coerceNativeAttribute("42.5", "FLOAT")).toBe(42.5);
    expect(coerceNativeAttribute("42.5", "INTEGER")).toBe(42);
    expect(coerceNativeAttribute('["image/png"]', "STRING_LIST")).toEqual([
      "image/png",
    ]);
    expect(coerceNativeAttribute('{"key":"feed"}', "JSON")).toEqual({
      key: "feed",
    });
    expect(coerceNativeAttribute("Pulse", "STRING")).toBe("Pulse");
    expect(() => coerceNativeAttribute("wide", "FLOAT")).toThrowError(
      TypeError,
    );
  });
});
