import { hashKey, mergeClasses, startsWith } from "./utils.js";

describe("api", () => {
  describe("hashKey()", () => {
    it("should use an existing `$$hashKey`", () => {
      const obj = { $$hashKey: "foo" };
      expect(hashKey(obj)).toBe("foo");
    });

    it("should support a function as `$$hashKey` (and call it)", () => {
      const obj = { $$hashKey: () => "foo" };
      expect(hashKey(obj)).toBe("foo");
    });

    it("should create a new `$$hashKey` if none exists (and return it)", () => {
      const obj = {};
      expect(hashKey(obj)).toBe(obj.$$hashKey);
      expect(obj.$$hashKey).toBeDefined();
    });

    it("should create appropriate `$$hashKey`s for primitive values", () => {
      expect(hashKey(undefined)).not.toBe(hashKey(undefined));
      expect(hashKey(null)).toBe(hashKey(null));
      expect(hashKey(null)).not.toBe(hashKey(undefined));
      expect(hashKey(true)).toBe(hashKey(true));
      expect(hashKey(false)).toBe(hashKey(false));
      expect(hashKey(false)).not.toBe(hashKey(true));
      expect(hashKey(42)).toBe(hashKey(42));
      expect(hashKey(1337)).toBe(hashKey(1337));
      expect(hashKey(1337)).not.toBe(hashKey(42));
      expect(hashKey("foo")).toBe(hashKey("foo"));
      expect(hashKey("foo")).not.toBe(hashKey("bar"));
    });

    it("should create appropriate `$$hashKey`s for non-primitive values", () => {
      const fn = function () {};
      const arr = [];
      const obj = {};
      const date = new Date();

      expect(hashKey(fn)).toBe(hashKey(fn));
      expect(hashKey(fn)).not.toBe(hashKey(() => {}));
      expect(hashKey(arr)).toBe(hashKey(arr));
      expect(hashKey(arr)).not.toBe(hashKey([]));
      expect(hashKey(obj)).toBe(hashKey(obj));
      expect(hashKey(obj)).not.toBe(hashKey({}));
      expect(hashKey(date)).toBe(hashKey(date));
      expect(hashKey(date)).not.toBe(hashKey(new Date()));
    });

    it("is undefined:{nextId} for undefined", () => {
      expect(hashKey(undefined)).not.toEqual(hashKey(undefined));
    });

    it("is object:null for null", () => {
      expect(hashKey(null)).toEqual("object:null");
    });

    it("is boolean:true for true", () => {
      expect(hashKey(true)).toEqual("boolean:true");
    });
    it("is boolean:false for false", () => {
      expect(hashKey(false)).toEqual("boolean:false");
    });

    it("is number:42 for 42", () => {
      expect(hashKey(42)).toEqual("number:42");
    });

    it('is string:42 for "42"', () => {
      expect(hashKey("42")).toEqual("string:42");
    });

    it("is object:[unique id] for objects", () => {
      expect(hashKey({})).toMatch(/^object:\S+$/);
    });

    it("is the same key when asked for the same object many times", () => {
      const obj = {};
      expect(hashKey(obj)).toEqual(hashKey(obj));
    });

    it("does not change when object value changes", () => {
      const obj = { a: 42 };
      const hash1 = hashKey(obj);
      obj.a = 43;
      const hash2 = hashKey(obj);
      expect(hash1).toEqual(hash2);
    });

    it("is not the same for different objects even with the same value", () => {
      const obj1 = { a: 42 };
      const obj2 = { a: 42 };
      expect(hashKey(obj1)).not.toEqual(hashKey(obj2));
    });

    it("is function:[unique id] for functions", () => {
      const fn = function (a) {
        return a;
      };
      expect(hashKey(fn)).toMatch(/^function:\S+$/);
    });

    it("is the same key when asked for the same function many times", () => {
      const fn = () => {};
      expect(hashKey(fn)).toEqual(hashKey(fn));
    });

    it("is not the same for different identical functions", () => {
      const fn1 = () => {
        return 42;
      };
      const fn2 = () => {
        return 42;
      };
      expect(hashKey(fn1)).not.toEqual(hashKey(fn2));
    });

    it("stores the hash key in the $$hashKey attribute", () => {
      const obj = { a: 42 };
      const hash = hashKey(obj);
      expect(obj.$$hashKey).toEqual(hash.match(/^object:(\S+)$/)[0]);
    });

    it("uses preassigned $$hashKey", () => {
      expect(hashKey({ $$hashKey: "42" })).toEqual("42");
    });

    it("supports a function $$hashKey", function () {
      expect(hashKey({ $$hashKey: () => "42" })).toEqual("42");
    });

    it("calls the function $$hashKey as a method with the correct this", () => {
      expect(
        hashKey({
          myKey: "42",
          $$hashKey: function () {
            return this.myKey;
          },
        }),
      ).toEqual("42");
    });
  });

  describe("startsWith", () => {
    it("should return true when string starts with search string", () => {
      expect(startsWith("hello world", "hello")).toBe(true);
    });

    it("should return false when string does not start with search string", () => {
      expect(startsWith("hello world", "world")).toBe(false);
    });

    it("should return true when both strings are equal", () => {
      expect(startsWith("test", "test")).toBe(true);
    });

    it("should return true when search string is empty", () => {
      expect(startsWith("abc", "")).toBe(true); // matches JavaScript's native behavior
    });

    it("should return false when original string is empty and search is not", () => {
      expect(startsWith("", "a")).toBe(false);
    });

    it("should return true with special characters at the beginning", () => {
      expect(startsWith("💡 idea", "💡")).toBe(true);
    });

    it("should be case-sensitive", () => {
      expect(startsWith("Hello", "hello")).toBe(false);
    });

    it("should return false if search is longer than the string", () => {
      expect(startsWith("short", "shorter")).toBe(false);
    });
  });

  describe("mergeClasses", () => {
    it("should return empty string if both arguments are null or undefined", () => {
      expect(mergeClasses(null, null)).toBe("");
      expect(mergeClasses(undefined, undefined)).toBe("");
      expect(mergeClasses(null, undefined)).toBe("");
    });

    it("should return first argument if second is null/undefined", () => {
      expect(mergeClasses("btn", null)).toBe("btn");
      expect(mergeClasses(["btn", "primary"], undefined)).toBe("btn primary");
    });

    it("should return second argument if first is null/undefined", () => {
      expect(mergeClasses(null, "active")).toBe("active");
      expect(mergeClasses(undefined, ["active", "large"])).toBe("active large");
    });

    it("should merge two strings with a space", () => {
      expect(mergeClasses("btn", "active")).toBe("btn active");
    });

    it("should always trim merged strings", () => {
      expect(mergeClasses("btn  ", "  active")).toBe("btn active");
    });

    it("should merge two arrays of strings", () => {
      expect(mergeClasses(["btn", "primary"], ["active", "large"])).toBe(
        "btn primary active large",
      );
    });

    it("should merge string and array", () => {
      expect(mergeClasses("btn", ["active", "large"])).toBe("btn active large");
      expect(mergeClasses(["btn", "primary"], "active")).toBe(
        "btn primary active",
      );
    });

    it("should ignore empty strings, null, and undefined in arrays", () => {
      expect(
        mergeClasses(["btn", "", null, undefined], ["active", "", null]),
      ).toBe("btn active");
    });

    it("should ignore empty strings, null, and undefined in arrays if second argument is empty", () => {
      expect(mergeClasses(["btn", "", null, undefined], undefined)).toBe("btn");
    });

    it("should ignore empty strings, null, and undefined in arrays if first argument is empty", () => {
      expect(mergeClasses(undefined, ["btn", "", null, undefined])).toBe("btn");
    });

    it("should handle single argument arrays correctly", () => {
      expect(mergeClasses(["btn"], ["active"])).toBe("btn active");
    });

    it("should handle single argument arrays correctly", () => {
      expect(mergeClasses(["btn  ", "  test"], ["  active"])).toBe(
        "btn test active",
      );
    });

    it("should handle one argument as string and the other as empty array", () => {
      expect(mergeClasses("btn", [])).toBe("btn");
      expect(mergeClasses([], "active")).toBe("active");
    });
  });
});
