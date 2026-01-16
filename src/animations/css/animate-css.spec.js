import { parseMaxTime } from "./animate-css.js";

describe("parseMaxTime", () => {
  it("returns 0 for empty string", () => {
    expect(parseMaxTime("")).toBe(0);
  });

  it("returns 0 when all tokens are invalid", () => {
    expect(parseMaxTime("foo, bar, baz")).toBe(0);
  });

  it("parses seconds values (s) and returns the max", () => {
    expect(parseMaxTime("1s")).toBe(1);
    expect(parseMaxTime("1s, 2s, 1.5s")).toBe(2);
    expect(parseMaxTime("1.25s, 1.2s")).toBe(1.25);
  });

  it("parses millisecond values (ms) and converts to seconds", () => {
    expect(parseMaxTime("100ms")).toBeCloseTo(0.1, 10);
    expect(parseMaxTime("250ms")).toBeCloseTo(0.25, 10);
    expect(parseMaxTime("1500ms")).toBeCloseTo(1.5, 10);
  });

  it("handles mixed units and returns the max in seconds", () => {
    // 100ms = 0.1s -> max is 2s
    expect(parseMaxTime("100ms, 2s")).toBe(2);

    // 1200ms = 1.2s -> max is 1.2s
    expect(parseMaxTime("0.8s, 1200ms")).toBeCloseTo(1.2, 10);

    // 999ms = 0.999s -> max is 1s
    expect(parseMaxTime("999ms, 1s")).toBe(1);
  });

  it("accepts plain numbers and compares them as seconds", () => {
    expect(parseMaxTime("2")).toBe(2);
    expect(parseMaxTime("0.5, 250ms")).toBe(0.5);
  });

  it("handles whitespace around commas and tokens", () => {
    expect(parseMaxTime("  1s ,  250ms  ,  0.5s ")).toBe(1);
  });

  it("ignores invalid tokens but still returns the max of valid ones", () => {
    expect(parseMaxTime("nope, 1s, also-no, 250ms")).toBe(1);
    expect(parseMaxTime("nope, 250ms, also-no")).toBeCloseTo(0.25, 10);
  });

  it("does not return negative values as max (baseline is 0)", () => {
    expect(parseMaxTime("-1s, -250ms")).toBe(0);
  });
});
