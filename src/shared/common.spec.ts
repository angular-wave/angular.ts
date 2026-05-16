/// <reference types="jasmine" />
import { defaults, tail } from "./common.js";

describe("common", function () {
  describe("defaults", function () {
    it("should do left-associative object merge", function () {
      const options = { param1: "new val" };

      const result = defaults(options, {
        param1: "default val",
        param2: "default val 2",
      });

      expect(result).toEqual({ param1: "new val", param2: "default val 2" });
    });

    it("should whitelist keys present in default values", function () {
      const options = { param1: 1, param2: 2, param3: 3 };

      const result = defaults(options, {
        param1: 0,
        param2: 0,
      });

      expect(result).toEqual({ param1: 1, param2: 2 });
    });

    it("should return an object when passed an empty value", function () {
      const vals = { param1: 0, param2: 0 };

      expect(defaults(null, vals)).toEqual(vals);
      expect(defaults(undefined, vals)).toEqual(vals);
    });
  });

  describe("tail", () => {
    it("should return the last element of a non-empty array", () => {
      expect(tail([1, 2, 3])).toBe(3);
      expect(tail(["a", "b", "c"])).toBe("c");
      expect(tail([true, false])).toBe(false);
    });

    it("should return undefined for an empty array", () => {
      expect(tail([])).toBeUndefined();
    });

    it("should return the correct value even if it is falsy", () => {
      expect(tail([0])).toBe(0);
      expect(tail([""])).toBe("");
      expect(tail([null])).toBeNull();
      expect(tail([undefined])).toBeUndefined(); // still valid
      expect(tail([false])).toBe(false);
    });

    it("should work with different types", () => {
      const obj = { name: "Alice" };

      expect(tail([obj])).toBe(obj);

      const arr = [
        [1, 2],
        [3, 4],
      ];

      expect(tail(arr)).toEqual([3, 4]);
    });
  });
});
