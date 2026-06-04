/// <reference types="jasmine" />
import { stripLastPathElement } from "./strings.js";
import {
  fnToString,
  joinNeighborsR,
  kebobString,
  maxLength,
  stringify,
} from "./strings.js";

describe("string functions:", () => {
  describe("stripLastPathElement", () => {
    it("should strip trailing filenames from a path", () => {
      const result = stripLastPathElement("/some/path/to/file.html");

      expect(result).toBe("/some/path/to");
    });

    it("should strip a filename (with no extension) from a path ", () => {
      const result = stripLastPathElement("/some/path/to/file");

      expect(result).toBe("/some/path/to");
    });

    it("should strip trailing filenames from a root path", () => {
      const result = stripLastPathElement("/file.html");

      expect(result).toBe("");
    });

    it("should strip a filename (with no extension) from a root path", () => {
      const result = stripLastPathElement("/file");

      expect(result).toBe("");
    });

    it("should strip a trailing slash", () => {
      expect(stripLastPathElement("/path/")).toBe("/path");
      expect(stripLastPathElement("/path/foo/")).toBe("/path/foo");
    });

    it("should return empty string given an empty string", () => {
      const result = stripLastPathElement("");

      expect(result).toBe("");
    });

    it("should return an empty string given a slash", () => {
      const result = stripLastPathElement("/");

      expect(result).toBe("");
    });
  });

  describe("maxLength", () => {
    it("keeps values that fit", () => {
      expect(maxLength(5, "small")).toBe("small");
    });

    it("truncates values that are too long", () => {
      expect(maxLength(5, "angular")).toBe("an...");
    });
  });

  describe("kebobString", () => {
    it("converts camel case to kebab case", () => {
      expect(kebobString("myAngularValue")).toBe("my-angular-value");
    });

    it("lowercases leading uppercase characters", () => {
      expect(kebobString("MyValue")).toBe("my-value");
    });
  });

  describe("fnToString", () => {
    it("returns the last function from an injectable array", () => {
      function second() {
        return 2;
      }

      function first() {
        return 1;
      }

      expect(fnToString([first, second])).toContain("function second");
      expect(fnToString([first, second])).toContain("second");
    });

    it("returns undefined when no function is available", () => {
      expect(fnToString([] as [])).toBe("undefined");
    });

    it("returns undefined for non-function values", () => {
      expect(fnToString("not a function" as unknown as (() => void))).toBe(
        "undefined",
      );
    });
  });

  describe("stringify", () => {
    it("handles undefined and null values", () => {
      expect(stringify(undefined)).toBe("undefined");
      expect(stringify(null)).toBe('"null"');
    });

    it("handles promise-like values", () => {
      expect(stringify(Promise.resolve(1))).toBe('"[Promise]"');
    });

    it("handles Rejection-like objects", () => {
      function Rejection(this: unknown) {}

      const rejection = {
        _transitionRejection: "rejected",
        then: () => {},
        constructor: Rejection,
      };

      expect(stringify(rejection)).toBe('"rejected"');
    });

    it("uses toString when available on non-plain objects", () => {
      class Custom {
        toString() {
          return "custom-value";
        }
      }

      expect(stringify(new Custom())).toBe('"custom-value"');
    });

    it("formats functions into stable strings", () => {
      function sample(value: string): string {
        return `sample-${value}`;
      }

      const named = fnToString(sample);
      const anonymous = stringify((x: number) => x + 1);

      expect(named).toContain("function sample");
      expect(anonymous).toContain("=>");
    });

    it("normalizes anonymous-style named function text", () => {
      function sample(value: string): string {
        return `sample-${value}`;
      }

      const sampleAlias = sample as unknown as {
        toString: () => string;
      };
      sampleAlias.toString = () =>
        "function (value) { return `sample-${value}`; }";

      expect(sampleAlias.toString()).toBe(
        "function (value) { return `sample-${value}`; }",
      );
      expect(stringify(sampleAlias)).toContain(
        '"function sample(value) { return `sample-${value}`; }"',
      );
    });

    it("leaves non-matching function names untouched", () => {
      const sample = function sample(value: string) {
        return `sample-${value}`;
      };
      const sampleWithoutName = sample as unknown as {
        toString: () => string;
      };
      sampleWithoutName.toString = () => "(value) => value";

      expect(stringify(sampleWithoutName)).toBe('"(value) => value"');
    });

    it("detects circular references", () => {
      const root: { child?: Record<string, unknown> } = {};
      root.child = root;

      expect(stringify(root)).toContain("[circular ref]");
    });

    it("falls back when JSON.stringify returns non-string values", () => {
      const symbolValue = Symbol("token");

      // Symbol values produce a non-string serialization result after JSON.stringify
      expect(stringify(symbolValue)).toBe("undefined");
    });
  });

  describe("joinNeighborsR", () => {
    it("joins neighboring strings and preserves other values", () => {
      const reduced = ["foo", "bar", 1, "baz", "", "qux"].reduce(
        joinNeighborsR,
        [],
      );

      expect(reduced).toEqual(["foobar", 1, "bazqux"]);
    });
  });
});
