// @ts-nocheck
/// <reference types="jasmine" />
import {
  arrayRemove,
  assert,
  assertArg,
  assertArgFn,
  assertNotHasOwnProperty,
  assign,
  baseExtend,
  bind,
  callBackAfterFirst,
  callBackOnce,
  concat,
  createErrorFactory,
  createObject,
  deProxy,
  directiveNormalize,
  entries,
  errorHandlingConfig,
  getHashKey,
  hashKey,
  hasAnimate,
  hasCustomToString,
  hasOwn,
  includes,
  inherit,
  instantiateWasm,
  isArray,
  mergeClasses,
  isArrowFunction,
  isBlob,
  isBoolean,
  isFile,
  isFormData,
  isFunction,
  isInstanceOf,
  isNull,
  isNullOrUndefined,
  isNumber,
  isNumberNaN,
  isObject,
  isObjectEmpty,
  isPromiseLike,
  isProxy,
  isProxySymbol,
  isScope,
  isString,
  isUndefined,
  isValidObjectMaxDepth,
  keys,
  lowercase,
  nextUid,
  ngAttrPrefixes,
  notNullOrUndefined,
  nullObject,
  encodeUriQuery,
  encodeUriSegment,
  equals,
  extend,
  fromJson,
  getNodeName,
  isArrayLike,
  isDate,
  isDefined,
  isError,
  isRegExp,
  isWindow,
  parseKeyValue,
  setHashKey,
  shallowCopy,
  simpleCompare,
  sliceArgs,
  snakeCase,
  startsWith,
  stringify,
  toDebugString,
  toJson,
  toKeyValue,
  trim,
  tryDecodeURIComponent,
  uppercase,
  values,
  wait,
} from "./utils.js";
import { createElementFromHTML, dealoc, startingTag } from "./dom.js";
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";

describe("utility functions", () => {
  let element, document, module, injector, $rootScope, $compile, angular;

  beforeEach(() => {
    angular = new Angular();
    module = angular.module("defaultModule", ["ng"]);
    injector = createInjector(["ng", "defaultModule"]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
  });

  beforeEach(() => {
    document = window.document;
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("hashKey()", () => {
    it("should use an existing `$hashKey`", () => {
      const obj = { $hashKey: "foo" };

      expect(hashKey(obj)).toBe("foo");
    });

    it("should support a function as `$hashKey` (and call it)", () => {
      const obj = { $hashKey: () => "foo" };

      expect(hashKey(obj)).toBe("foo");
    });

    it("should create a generated hash key if none exists without mutating the object", () => {
      const obj = {};

      const key = hashKey(obj);

      expect(key).toMatch(/^object:\S+$/);
      expect(getHashKey(obj)).toBe(key);
      expect(obj.$hashKey).toBeUndefined();
    });

    it("should store generated hash keys against deproxied targets", () => {
      const target = {};

      const proxy = { [isProxySymbol]: true, $target: target };

      const key = hashKey(proxy);

      expect(hashKey(target)).toBe(key);
      expect(getHashKey(proxy)).toBe(key);
      expect(proxy.$hashKey).toBeUndefined();
      expect(target.$hashKey).toBeUndefined();
    });

    it("should create appropriate `$hashKey`s for primitive values", () => {
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

    it("should create appropriate `$hashKey`s for non-primitive values", () => {
      const fn = () => {};

      const arr = [];

      const obj = {};

      const date = new Date();

      expect(hashKey(fn)).toBe(hashKey(fn));
      expect(hashKey(fn)).not.toBe(
        hashKey(() => {
          /* empty */
        }),
      );
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
      const fn = (a) => a;

      expect(hashKey(fn)).toMatch(/^function:\S+$/);
    });

    it("is the same key when asked for the same function many times", () => {
      const fn = () => {
        /* empty */
      };

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

    it("does not store generated hash keys in the $hashKey attribute", () => {
      const obj = { a: 42 };

      const hash = hashKey(obj);

      expect(hash).toMatch(/^object:\S+$/);
      expect(obj.$hashKey).toBeUndefined();
    });

    it("uses preassigned $hashKey", () => {
      expect(hashKey({ $hashKey: "42" })).toEqual("42");
    });

    it("supports a function $hashKey", function () {
      expect(hashKey({ $hashKey: () => "42" })).toEqual("42");
    });

    it("calls the function $hashKey as a method with the correct this", () => {
      expect(
        hashKey({
          myKey: "42",
          $hashKey() {
            return this.myKey;
          },
        }),
      ).toEqual("42");
    });
  });

  describe("baseExtend", () => {
    it("should extend objects shallowly", () => {
      const dst = { a: 1 };

      const src = { b: 2 };

      const result = baseExtend(dst, [src], false);

      expect(result).toEqual({ a: 1, b: 2 });
      expect(result).toBe(dst); // should mutate dst
    });

    it("should extend objects deeply", () => {
      const dst = { a: { x: 1 } };

      const src = { a: { y: 2 }, b: 3 };

      const result = baseExtend(dst, [src], true);

      expect(result).toEqual({ a: { x: 1, y: 2 }, b: 3 });
    });

    it("should copy arrays when deep extending", () => {
      const dst = {};

      const src = { arr: [1, 2] };

      const result = baseExtend(dst, [src], true);

      expect(result.arr).toEqual([1, 2]);
      expect(result.arr).not.toBe(src.arr); // cloned
    });

    it("should clone Date and RegExp objects", () => {
      const date = new Date();

      const regex = /abc/g;

      const dst = {};

      const src = { date, regex };

      const result = baseExtend(dst, [src], true);

      expect(result.date).toEqual(date);
      expect(result.date).not.toBe(date); // cloned
      expect(result.regex).toEqual(regex);
      expect(result.regex).not.toBe(regex); // cloned
    });

    it("should clone DOM nodes", () => {
      const node = document.createElement("div");

      node.textContent = "hello";

      const dst = {};

      const src = { el: node };

      const result = baseExtend(dst, [src], true);

      expect(result.el.tagName).toBe("DIV");
      expect(result.el.textContent).toBe("hello");
      expect(result.el).not.toBe(node); // cloned node
    });

    it("should skip non-object values", () => {
      const dst = { a: 1 };

      const src = null;

      const result = baseExtend(dst, [src], true);

      expect(result).toEqual({ a: 1 });
    });

    it("should prevent prototype pollution", () => {
      const dst = {};

      const src = JSON.parse('{"__proto__": {"polluted": true}}');

      baseExtend(dst, [src], true);

      // Ensure Object.prototype was not polluted
      expect({}.polluted).toBeUndefined();
      expect(Object.prototype.polluted).toBeUndefined();

      // Ensure dst itself does not have a __proto__ property
      expect(Object.hasOwn(dst, "__proto__")).toBe(false);
    });

    it("should preserve $hashKey", () => {
      const dst = { $hashKey: "abc" };

      const src = { a: 1 };

      const result = baseExtend(dst, [src], false);

      expect(result.$hashKey).toBe("abc");
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

  describe("case", () => {
    it("should change case", () => {
      expect(lowercase("ABC90")).toEqual("abc90");
      expect(uppercase("abc90")).toEqual("ABC90");
    });

    it("should change case of non-ASCII letters", () => {
      expect(lowercase("Ω")).toEqual("ω");
      expect(uppercase("ω")).toEqual("Ω");
    });
  });

  describe("extend", () => {
    it("should not copy the private $hashKey", () => {
      let src;

      let dst;

      src = { $hashKey: "src" };
      dst = {};
      dst = extend(dst, src);
      expect(dst.$hashKey).toBeUndefined();
      expect(hashKey(dst)).not.toEqual("src");
    });

    it("should copy the properties of the source object onto the destination object", () => {
      let destination;

      let source;

      destination = {};
      source = { foo: true };
      destination = extend(destination, source);
      expect(isDefined(destination.foo)).toBe(true);
    });

    it("ISSUE #4751 - should copy the length property of an object source to the destination object", () => {
      let destination;

      let source;

      destination = {};
      source = { radius: 30, length: 0 };
      destination = extend(destination, source);
      expect(isDefined(destination.length)).toBe(true);
      expect(isDefined(destination.radius)).toBe(true);
    });

    it("should retain the previous $hashKey", () => {
      let src;

      let dst;

      let h;

      src = {};
      dst = {};
      h = hashKey(dst);
      hashKey(src);
      dst = extend(dst, src);
      // make sure we don't copy the key
      expect(hashKey(dst)).not.toEqual(hashKey(src));
      // make sure we retain the old key
      expect(hashKey(dst)).toEqual(h);
    });

    it("should work when extending with itself", () => {
      let src;

      let dst;

      let h;

      dst = src = {};
      h = hashKey(dst);
      dst = extend(dst, src);
      // make sure we retain the old key
      expect(hashKey(dst)).toEqual(h);
    });

    it("should copy dates by reference", () => {
      const src = { date: new Date() };

      const dst = {};

      extend(dst, src);

      expect(dst.date).toBe(src.date);
    });

    it("should copy elements by reference", () => {
      const src = {
        element: document.createElement("div"),
        jqObject: createElementFromHTML(
          "<p><span>s1</span><span>s2</span></p>",
        ).querySelectorAll("span"),
      };

      const dst = {};

      extend(dst, src);

      expect(dst.element).toBe(src.element);
      expect(dst.jqObject).toBe(src.jqObject);
    });
  });

  describe("shallow copy", () => {
    it("should make a copy", () => {
      const original = { key: {} };

      const copy = shallowCopy(original);

      expect(copy).toEqual(original);
      expect(copy.key).toBe(original.key);
    });

    it('should omit "$$"-prefixed properties', () => {
      const original = { $$some: true, $$: true };

      const clone = {};

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone.$$some).toBeUndefined();
      expect(clone.$$).toBeUndefined();
    });

    it('should copy "$"-prefixed properties from copy', () => {
      const original = { $some: true };

      const clone = {};

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone.$some).toBe(original.$some);
    });

    it("should handle arrays", () => {
      const original = [{}, 1];

      const clone = [];

      const aCopy = shallowCopy(original);

      expect(aCopy).not.toBe(original);
      expect(aCopy).toEqual(original);
      expect(aCopy[0]).toBe(original[0]);

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone).toEqual(original);
    });

    it("should handle primitives", () => {
      expect(shallowCopy("test")).toBe("test");
      expect(shallowCopy(3)).toBe(3);
      expect(shallowCopy(true)).toBe(true);
    });
  });

  describe("elementHTML", () => {
    it("should dump element", () => {
      expect(
        startingTag('<div attr="123">something<span></span></div>'),
      ).toEqual('<div attr="123">');
    });
  });

  describe("equals", () => {
    it("should return true if same object", () => {
      const o = {};

      expect(equals(o, o)).toEqual(true);
      expect(equals(o, {})).toEqual(true);
      expect(equals(1, "1")).toEqual(false);
      expect(equals(1, "2")).toEqual(false);
    });

    it("should recurse into object", () => {
      expect(equals({}, {})).toEqual(true);
      expect(equals({ name: "misko" }, { name: "misko" })).toEqual(true);
      expect(equals({ name: "misko", age: 1 }, { name: "misko" })).toEqual(
        false,
      );
      expect(equals({ name: "misko" }, { name: "misko", age: 1 })).toEqual(
        false,
      );
      expect(equals({ name: "misko" }, { name: "adam" })).toEqual(false);
      expect(equals(["misko"], ["misko"])).toEqual(true);
      expect(equals(["misko"], ["adam"])).toEqual(false);
      expect(equals(["misko"], ["misko", "adam"])).toEqual(false);
    });

    it("should ignore undefined member variables during comparison", () => {
      const obj1 = { name: "misko" };

      const obj2 = { name: "misko", undefinedvar: undefined };

      expect(equals(obj1, obj2)).toBe(true);
      expect(equals(obj2, obj1)).toBe(true);
    });

    it("should ignore $ member variables", () => {
      expect(
        equals({ name: "misko", $id: 1 }, { name: "misko", $id: 2 }),
      ).toEqual(true);
      expect(equals({ name: "misko" }, { name: "misko", $id: 2 })).toEqual(
        true,
      );
      expect(equals({ name: "misko", $id: 1 }, { name: "misko" })).toEqual(
        true,
      );
    });

    it("should ignore functions", () => {
      expect(equals({ func() {} }, { bar() {} })).toEqual(true);
    });

    it("should work well with nulls", () => {
      expect(equals(null, "123")).toBe(false);
      expect(equals("123", null)).toBe(false);

      const obj = { foo: "bar" };

      expect(equals(null, obj)).toBe(false);
      expect(equals(obj, null)).toBe(false);

      expect(equals(null, null)).toBe(true);
    });

    it("should work well with undefined", () => {
      expect(equals(undefined, "123")).toBe(false);
      expect(equals("123", undefined)).toBe(false);

      const obj = { foo: "bar" };

      expect(equals(undefined, obj)).toBe(false);
      expect(equals(obj, undefined)).toBe(false);

      expect(equals(undefined, undefined)).toBe(true);
    });

    it("should treat two NaNs as equal", () => {
      expect(equals(NaN, NaN)).toBe(true);
    });

    it("should compare Scope instances only by identity", () => {
      const scope1 = $rootScope.$new();

      const scope2 = $rootScope.$new();

      expect(equals(scope1, scope1)).toBe(true);
      expect(equals(scope1, scope2)).toBe(false);
      expect(equals($rootScope, scope1)).toBe(false);
      expect(equals(undefined, scope1)).toBe(false);
    });

    it("should compare Window instances only by identity", () => {
      expect(equals(window, window)).toBe(true);
      expect(equals(window, window.document)).toBe(false);
      expect(equals(window, undefined)).toBe(false);
    });

    it("should compare dates", () => {
      expect(equals(new Date(0), new Date(0))).toBe(true);
      expect(equals(new Date(0), new Date(1))).toBe(false);
      expect(equals(new Date(0), 0)).toBe(false);
      expect(equals(0, new Date(0))).toBe(false);

      expect(equals(new Date(undefined), new Date(undefined))).toBe(true);
      expect(equals(new Date(undefined), new Date(0))).toBe(false);
      expect(equals(new Date(undefined), new Date(null))).toBe(false);
      expect(equals(new Date(undefined), new Date("wrong"))).toBe(true);
      expect(equals(new Date(), /abc/)).toBe(false);
    });

    it("should correctly test for keys that are present on Object.prototype", () => {
      expect(equals({}, { hasOwnProperty: 1 })).toBe(false);
      expect(equals({}, { toString: null })).toBe(false);
    });

    it("should compare regular expressions", () => {
      expect(equals(/abc/, /abc/)).toBe(true);
      expect(equals(/abc/i, new RegExp("abc", "i"))).toBe(true);
      expect(equals(new RegExp("abc", "i"), new RegExp("abc", "i"))).toBe(true);
      expect(equals(new RegExp("abc", "i"), new RegExp("abc"))).toBe(false);
      expect(equals(/abc/i, /abc/)).toBe(false);
      expect(equals(/abc/, /def/)).toBe(false);
      expect(equals(/^abc/, /abc/)).toBe(false);
      expect(equals(/^abc/, "/^abc/")).toBe(false);
      expect(equals(/abc/, new Date())).toBe(false);
    });

    it("should return false when comparing an object and an array", () => {
      expect(equals({}, [])).toBe(false);
      expect(equals([], {})).toBe(false);
    });

    it("should return false when comparing an object and a RegExp", () => {
      expect(equals({}, /abc/)).toBe(false);
      expect(equals({}, new RegExp("abc", "i"))).toBe(false);
    });

    it("should return false when comparing an object and a Date", () => {
      expect(equals({}, new Date())).toBe(false);
    });

    it("should safely compare objects with no prototype parent", () => {
      const o1 = extend(Object.create(null), {
        a: 1,
        b: 2,
        c: 3,
      });

      const o2 = extend(Object.create(null), {
        a: 1,
        b: 2,
        c: 3,
      });

      expect(equals(o1, o2)).toBe(true);
      o2.c = 2;
      expect(equals(o1, o2)).toBe(false);
    });

    it("should safely compare objects which shadow Object.prototype.hasOwnProperty", () => {
      const o1 = {
        hasOwnProperty: true,
        a: 1,
        b: 2,
        c: 3,
      };

      const o2 = {
        hasOwnProperty: true,
        a: 1,
        b: 2,
        c: 3,
      };

      expect(equals(o1, o2)).toBe(true);
      o1.hasOwnProperty = function () {};
      expect(equals(o1, o2)).toBe(false);
    });
  });

  describe("parseKeyValue", () => {
    it("should parse a string into key-value pairs", () => {
      expect(parseKeyValue("")).toEqual({});
      expect(parseKeyValue("simple=pair")).toEqual({ simple: "pair" });
      expect(parseKeyValue("first=1&second=2")).toEqual({
        first: "1",
        second: "2",
      });
      expect(parseKeyValue("escaped%20key=escaped%20value")).toEqual({
        "escaped key": "escaped value",
      });
      expect(parseKeyValue("emptyKey=")).toEqual({ emptyKey: "" });
      expect(parseKeyValue("flag1&key=value&flag2")).toEqual({
        flag1: true,
        key: "value",
        flag2: true,
      });
    });
    it("should ignore key values that are not valid URI components", () => {
      expect(() => {
        parseKeyValue("%");
      }).not.toThrow();
      expect(parseKeyValue("%")).toEqual({});
      expect(parseKeyValue("invalid=%")).toEqual({ invalid: undefined });
      expect(parseKeyValue("invalid=%&valid=good")).toEqual({
        invalid: undefined,
        valid: "good",
      });
    });
    it("should parse a string into key-value pairs with duplicates grouped in an array", () => {
      expect(parseKeyValue("")).toEqual({});
      expect(parseKeyValue("duplicate=pair")).toEqual({ duplicate: "pair" });
      expect(parseKeyValue("first=1&first=2")).toEqual({ first: ["1", "2"] });
      expect(
        parseKeyValue(
          "escaped%20key=escaped%20value&&escaped%20key=escaped%20value2",
        ),
      ).toEqual({ "escaped key": ["escaped value", "escaped value2"] });
      expect(parseKeyValue("flag1&key=value&flag1")).toEqual({
        flag1: [true, true],
        key: "value",
      });
      expect(parseKeyValue("flag1&flag1=value&flag1=value2&flag1")).toEqual({
        flag1: [true, "value", "value2", true],
      });
    });

    it("should ignore properties higher in the prototype chain", () => {
      expect(parseKeyValue("toString=123")).toEqual({
        toString: "123",
      });
    });

    it("should ignore badly escaped = characters", () => {
      expect(parseKeyValue("test=a=b")).toEqual({
        test: "a=b",
      });
    });
  });

  describe("toKeyValue", () => {
    it("should serialize key-value pairs into string", () => {
      expect(toKeyValue({})).toEqual("");
      expect(toKeyValue({ simple: "pair" })).toEqual("simple=pair");
      expect(toKeyValue({ first: "1", second: "2" })).toEqual(
        "first=1&second=2",
      );
      expect(toKeyValue({ "escaped key": "escaped value" })).toEqual(
        "escaped%20key=escaped%20value",
      );
      expect(toKeyValue({ emptyKey: "" })).toEqual("emptyKey=");
    });

    it("should serialize true values into flags", () => {
      expect(toKeyValue({ flag1: true, key: "value", flag2: true })).toEqual(
        "flag1&key=value&flag2",
      );
    });

    it("should serialize duplicates into duplicate param strings", () => {
      expect(toKeyValue({ key: [323, "value", true] })).toEqual(
        "key=323&key=value&key",
      );
      expect(toKeyValue({ key: [323, "value", true, 1234] })).toEqual(
        "key=323&key=value&key&key=1234",
      );
    });
  });

  describe("isArrayLike", () => {
    it("should return false if passed a number", () => {
      expect(isArrayLike(10)).toBe(false);
    });

    it("should return true if passed an array", () => {
      expect(isArrayLike([1, 2, 3, 4])).toBe(true);
    });

    it("should return true if passed an object", () => {
      expect(isArrayLike({ 0: "test", 1: "bob", 2: "tree", length: 3 })).toBe(
        true,
      );
    });

    it("should return true if passed arguments object", () => {
      function test(a, b, c) {
        expect(isArrayLike(arguments)).toBe(true);
      }
      test(1, 2, 3);
    });

    it("should return true if passed a nodelist", () => {
      const nodes1 = document.body.childNodes;

      expect(isArrayLike(nodes1)).toBe(true);

      const nodes2 = document.getElementsByTagName("nonExistingTagName");

      expect(isArrayLike(nodes2)).toBe(true);
    });

    it("should return false for objects with `length` but no matching indexable items", () => {
      const obj1 = {
        a: "a",
        b: "b",
        length: 10,
      };

      expect(isArrayLike(obj1)).toBe(false);

      const obj2 = {
        length: 0,
      };

      expect(isArrayLike(obj2)).toBe(false);
    });

    it("should return true for empty instances of an Array subclass", () => {
      function ArrayLike() {}
      ArrayLike.prototype = Array.prototype;

      const arrLike = new ArrayLike();

      expect(arrLike.length).toBe(0);
      expect(isArrayLike(arrLike)).toBe(true);

      arrLike.push(1, 2, 3);
      expect(arrLike.length).toBe(3);
      expect(isArrayLike(arrLike)).toBe(true);
    });
  });

  describe("encodeUriSegment", () => {
    it("should correctly encode uri segment and not encode chars defined as pchar set in rfc3986", () => {
      // don't encode alphanum
      expect(encodeUriSegment("asdf1234asdf")).toEqual("asdf1234asdf");

      // don't encode unreserved'
      expect(encodeUriSegment("-_.!~*'(); -_.!~*'();")).toEqual(
        "-_.!~*'();%20-_.!~*'();",
      );

      // don't encode the rest of pchar'
      expect(encodeUriSegment(":@&=+$, :@&=+$,")).toEqual(":@&=+$,%20:@&=+$,");

      // encode '/' and ' ''
      expect(encodeUriSegment("/; /;")).toEqual("%2F;%20%2F;");
    });
  });

  describe("encodeUriQuery", () => {
    it("should correctly encode uri query and not encode chars defined as pchar set in rfc3986", () => {
      // don't encode alphanum
      expect(encodeUriQuery("asdf1234asdf")).toEqual("asdf1234asdf");

      // don't encode unreserved
      expect(encodeUriQuery("-_.!~*'() -_.!~*'()")).toEqual(
        "-_.!~*'()+-_.!~*'()",
      );

      // don't encode the rest of pchar
      expect(encodeUriQuery(":@$, :@$,")).toEqual(":@$,+:@$,");

      // encode '&', ';', '=', '+', and '#'
      expect(encodeUriQuery("&;=+# &;=+#")).toEqual(
        "%26;%3D%2B%23+%26;%3D%2B%23",
      );

      // encode ' ' as '+'
      expect(encodeUriQuery("  ")).toEqual("++");

      // encode ' ' as '%20' when a flag is used
      expect(encodeUriQuery("  ", true)).toEqual("%20%20");

      // do not encode `null` as '+' when flag is used
      expect(encodeUriQuery("null", true)).toEqual("null");

      // do not encode `null` with no flag
      expect(encodeUriQuery("null")).toEqual("null");
    });
  });

  describe("isDate", () => {
    it("should return true for Date object", () => {
      expect(isDate(new Date())).toBe(true);
    });

    it("should return false for non Date objects", () => {
      expect(isDate([])).toBe(false);
      expect(isDate("")).toBe(false);
      expect(isDate(23)).toBe(false);
      expect(isDate({})).toBe(false);
    });
  });

  describe("isError", () => {
    function testErrorFromDifferentContext(createError) {
      const iframe = document.createElement("iframe");

      document.getElementById("app").appendChild(iframe);

      try {
        const error = createError(iframe.contentWindow);

        expect(isError(error)).toBe(true);
      } finally {
        iframe.parentElement.removeChild(iframe);
      }
    }

    it("should not assume objects are errors", () => {
      const fakeError = { message: "A fake error", stack: "no stack here" };

      expect(isError(fakeError)).toBe(false);
    });

    it("should detect simple error instances", () => {
      expect(isError(new Error())).toBe(true);
    });

    it("should detect errors from another context", () => {
      testErrorFromDifferentContext((win) => new win.Error());
    });

    it("should detect DOMException errors from another context", () => {
      testErrorFromDifferentContext((win) => {
        try {
          win.document.querySelectorAll("");
        } catch (e) {
          return e;
        }

        return undefined;
      });
    });
  });

  describe("isRegExp", () => {
    it("should return true for RegExp object", () => {
      expect(isRegExp(/^foobar$/)).toBe(true);
      expect(isRegExp(new RegExp("^foobar$/"))).toBe(true);
    });

    it("should return false for non RegExp objects", () => {
      expect(isRegExp([])).toBe(false);
      expect(isRegExp("")).toBe(false);
      expect(isRegExp(23)).toBe(false);
      expect(isRegExp({})).toBe(false);
      expect(isRegExp(new Date())).toBe(false);
    });
  });

  describe("isWindow", () => {
    it("should return true for the Window object", () => {
      expect(isWindow(window)).toBe(true);
    });

    it("should return false for any object that is not a Window", () => {
      expect(isWindow([])).toBe(false);
      expect(isWindow("")).toBeFalsy();
      expect(isWindow(23)).toBe(false);
      expect(isWindow({})).toBe(false);
      expect(isWindow(new Date())).toBe(false);
      expect(isWindow(document)).toBe(false);
    });
  });

  describe("getNodeName", () => {
    it('should correctly detect node name with "namespace" when xmlns is defined', () => {
      const div = createElementFromHTML(
        '<div xmlns:ngtest="http://angularjs.org/">' +
          '<ngtest:foo ngtest:attr="bar"></ngtest:foo>' +
          "</div>",
      );

      expect(getNodeName(div.childNodes[0])).toBe("ngtest:foo");
      expect(div.childNodes[0].getAttribute("ngtest:attr")).toBe("bar");
    });

    it('should correctly detect node name with "namespace" when xmlns is NOT defined', () => {
      const div = createElementFromHTML(
        '<div xmlns:ngtest="http://angularjs.org/">' +
          '<ngtest:foo ngtest:attr="bar"></ng-test>' +
          "</div>",
      );

      expect(getNodeName(div.childNodes[0])).toBe("ngtest:foo");
      expect(div.childNodes[0].getAttribute("ngtest:attr")).toBe("bar");
    });

    it("should return undefined for elements without the .nodeName property", () => {
      // some elements, like SVGElementInstance don't have .nodeName property
      expect(getNodeName({})).toBeUndefined();
    });
  });

  describe("nextUid()", () => {
    it("should return new id per call", () => {
      const seen = {};

      let count = 100;

      while (count--) {
        const current = nextUid();

        expect(typeof current).toBe("number");
        expect(seen[current]).toBeFalsy();
        seen[current] = true;
      }
    });
  });

  describe("startingElementHtml", () => {
    it("should show starting element tag only", () => {
      expect(startingTag('<ng-abc x="2A"><div>text</div></ng-abc>')).toBe(
        '<ng-abc x="2A">',
      );
    });
  });

  describe("startingTag", () => {
    it("should allow passing in Nodes instead of Elements", () => {
      const txtNode = document.createTextNode("some text");

      expect(startingTag(txtNode)).toBe("some text");
    });
  });

  describe("snakeCase", () => {
    it("should convert to snakeCase", () => {
      expect(snakeCase("ABC")).toEqual("a_b_c");
      expect(snakeCase("alanBobCharles")).toEqual("alan_bob_charles");
    });

    it("should allow separator to be overridden", () => {
      expect(snakeCase("ABC", "&")).toEqual("a&b&c");
      expect(snakeCase("alanBobCharles", "&")).toEqual("alan&bob&charles");
    });
  });

  describe("fromJson", () => {
    it("should delegate to JSON.parse", () => {
      const spy = spyOn(JSON, "parse").and.callThrough();

      expect(fromJson("{}")).toEqual({});
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("toJson", () => {
    it("should delegate to JSON.stringify", () => {
      const spy = spyOn(JSON, "stringify").and.callThrough();

      expect(toJson({})).toEqual("{}");
      expect(spy).toHaveBeenCalled();
    });

    it("should format objects pretty", () => {
      expect(toJson({ a: 1, b: 2 }, true)).toBe('{\n  "a": 1,\n  "b": 2\n}');
      expect(toJson({ a: { b: 2 } }, true)).toBe(
        '{\n  "a": {\n    "b": 2\n  }\n}',
      );
      expect(toJson({ a: 1, b: 2 }, false)).toBe('{"a":1,"b":2}');
      expect(toJson({ a: 1, b: 2 }, 0)).toBe('{"a":1,"b":2}');
      expect(toJson({ a: 1, b: 2 }, 1)).toBe('{\n "a": 1,\n "b": 2\n}');
      expect(toJson({ a: 1, b: 2 }, {})).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    it("should not serialize properties starting with $$", () => {
      expect(toJson({ $$some: "value" }, false)).toEqual("{}");
    });

    it("should serialize properties starting with $", () => {
      expect(toJson({ $few: "v" }, false)).toEqual('{"$few":"v"}');
    });

    it("should not serialize scope instances", () => {
      expect(toJson({ key: $rootScope })).toEqual('{"key":"$SCOPE"}');
    });

    it("should serialize undefined as undefined", () => {
      expect(toJson(undefined)).toEqual(undefined);
    });
  });

  describe("exported helper coverage", () => {
    it("should identify primitive and object types", () => {
      expect(isUndefined(undefined)).toBe(true);
      expect(isDefined("value")).toBe(true);
      expect(isArray([])).toBe(true);
      expect(isInstanceOf(document.createElement("div"), HTMLElement)).toBe(
        true,
      );
      expect(isObject({})).toBe(true);
      expect(isString("text")).toBe(true);
      expect(isNull(null)).toBe(true);
      expect(isNullOrUndefined(undefined)).toBe(true);
      expect(notNullOrUndefined(0)).toBe(true);
      expect(isNumber(1)).toBe(true);
      expect(isNumberNaN(NaN)).toBe(true);
      expect(isFunction(() => {})).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isPromiseLike({ then() {} })).toBe(true);
      expect(isArrowFunction(() => {})).toBe(true);
      expect(isArrowFunction(function regular() {})).toBe(false);
    });

    it("should identify browser native object types", () => {
      expect(isFile(new File(["content"], "file.txt"))).toBe(true);
      expect(isFormData(new FormData())).toBe(true);
      expect(isBlob(new Blob(["content"]))).toBe(true);
    });

    it("should identify proxies and unwrap them", () => {
      const target = { value: 1 };

      const proxy = { [isProxySymbol]: true, $target: target };

      expect(isProxy(proxy)).toBe(true);
      expect(deProxy(proxy)).toBe(target);
      expect(deProxy(target)).toBe(target);
    });

    it("should identify scope-like objects", () => {
      expect(isScope({ $watch() {} })).toBeTruthy();
      expect(isScope({})).toBeFalsy();
    });

    it("should trim strings and leave non-strings unchanged", () => {
      const obj = {};

      expect(trim("  value  ")).toBe("value");
      expect(trim(obj)).toBe(obj);
    });

    it("should set and clear internal hash keys", () => {
      const obj = {};

      setHashKey(obj, "abc");
      expect(getHashKey(obj)).toBe("abc");
      expect(obj.$hashKey).toBeUndefined();

      setHashKey(obj, null);
      expect(getHashKey(obj)).toBeUndefined();
      expect(obj.$hashKey).toBeUndefined();
    });

    it("should create inherited objects", () => {
      const parent = { inherited: true };

      const child = inherit(parent, { own: true });

      expect(child.inherited).toBe(true);
      expect(child.own).toBe(true);
      expect(Object.getPrototypeOf(child)).toBe(parent);
    });

    it("should create objects with a specified prototype", () => {
      const parent = { inherited: true };

      const child = createObject(parent);

      expect(child.inherited).toBe(true);
      expect(Object.getPrototypeOf(child)).toBe(parent);
    });

    it("should detect custom toString methods", () => {
      expect(hasCustomToString({ toString: () => "custom" })).toBe(true);
    });

    it("should check inclusion and remove array values", () => {
      const array = ["a", "b", "c"];

      expect(includes(array, "b")).toBe(true);
      expect(arrayRemove(array, "b")).toBe(1);
      expect(array).toEqual(["a", "c"]);
      expect(arrayRemove(array, "missing")).toBe(-1);
    });

    it("should compare simple values including NaN", () => {
      expect(simpleCompare(1, 1)).toBe(true);
      expect(simpleCompare(NaN, NaN)).toBe(true);
      expect(simpleCompare(1, "1")).toBe(false);
    });

    it("should reject hasOwnProperty as a public name", () => {
      expect(() =>
        assertNotHasOwnProperty("hasOwnProperty", "service"),
      ).toThrowError(/hasOwnProperty is not a valid service name/);
      expect(() => assertNotHasOwnProperty("valid", "service")).not.toThrow();
    });

    it("should stringify values for display", () => {
      expect(stringify(null)).toBe("");
      expect(stringify(12)).toBe("12");
      expect(stringify({ toString: () => "custom" })).toBe("custom");
      expect(stringify({ a: 1 })).toBe('{"a":1}');
    });

    it("should validate object max depth values", () => {
      expect(isValidObjectMaxDepth(1)).toBe(true);
      expect(isValidObjectMaxDepth(0)).toBe(false);
      expect(isValidObjectMaxDepth("1")).toBe(false);
    });

    it("should concatenate and slice array-like values", () => {
      function collect() {
        return {
          concatenated: concat(["a"], arguments, 1),
          sliced: sliceArgs(arguments, 1),
        };
      }

      expect(collect("skip", "b", "c")).toEqual({
        concatenated: ["a", "b", "c"],
        sliced: ["b", "c"],
      });
    });

    it("should bind context and curry arguments", () => {
      const context = { prefix: "a" };

      function join(first, second) {
        return `${this.prefix}-${first}-${second}`;
      }

      expect(bind(context, join, "b")("c")).toBe("a-b-c");
      expect(bind(context, /not-a-function/)).toEqual(/not-a-function/);
    });

    it("should decode URI components safely", () => {
      expect(tryDecodeURIComponent("a%20b")).toBe("a b");
      expect(tryDecodeURIComponent("%")).toBeUndefined();
    });

    it("should assert truthy arguments and functions", () => {
      const fn = () => "ok";

      expect(assert(true)).toBeUndefined();
      expect(() => assert(false, "bad")).toThrowError("bad");
      expect(assertArg("value", "name")).toBe("value");
      expect(() => assertArg("", "name")).toThrowError(/Argument 'name'/);
      expect(assertArgFn(fn, "fn")).toBe(fn);
      expect(assertArgFn(["dep", fn], "fn", true)).toBe(fn);
      expect(() => assertArgFn("x", "fn")).toThrowError(/not a function/);
    });

    it("should update and return error handling config", () => {
      const previous = { ...errorHandlingConfig() };

      errorHandlingConfig({
        objectMaxDepth: 2,
      });
      expect(errorHandlingConfig()).toEqual({
        objectMaxDepth: 2,
      });

      errorHandlingConfig(previous);
    });

    it("should create namespaced errors", () => {
      const err = createErrorFactory("mod")("code", "Value {0}", "x");

      expect(err instanceof Error).toBe(true);
      expect(err.message).toBe("[mod:code] Value x");
    });

    it("should convert values to debug strings", () => {
      expect(toDebugString(undefined)).toBe("undefined");
      expect(toDebugString("abc")).toBe("abc");
      expect(toDebugString({ a: 1 })).toBe('{"a":1}');
      expect(toDebugString(function named() {})).toBe("function named()");
    });

    it("should normalize directive names", () => {
      expect(directiveNormalize("data-ng-some-directive")).toBe(
        "ngSomeDirective",
      );
      expect(directiveNormalize("x:ng_test")).toBe("x:ng_test");
    });

    it("should detect animation attributes only on elements", () => {
      const animated = document.createElement("div");

      animated.setAttribute("animate", "true");

      const dataAnimated = document.createElement("div");

      dataAnimated.dataset.animate = "true";

      expect(hasAnimate(animated)).toBe(true);
      expect(hasAnimate(dataAnimated)).toBe(true);
      expect(hasAnimate(document.createTextNode("text"))).toBe(false);
    });

    it("should inspect object keys, values, entries, ownership, and emptiness", () => {
      const obj = createObject({ inherited: true });

      obj.a = 1;
      obj.b = 2;

      expect(hasOwn(obj, "a")).toBe(true);
      expect(hasOwn(obj, "inherited")).toBe(false);
      expect(keys(obj)).toEqual(["a", "b"]);
      expect(values(obj)).toEqual([1, 2]);
      expect(entries(obj)).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
      expect(isObjectEmpty({})).toBe(true);
      expect(isObjectEmpty(obj)).toBe(false);
    });

    it("should assign source properties to a target", () => {
      const target = { a: 1 };

      expect(assign(target, { b: 2 }, { a: 3 })).toBe(target);
      expect(target).toEqual({ a: 3, b: 2 });
    });

    it("should run callbacks once or after the first call", () => {
      const once = jasmine.createSpy("once").and.returnValue("once");

      const afterFirst = jasmine
        .createSpy("afterFirst")
        .and.returnValue("next");

      const runOnce = callBackOnce(once);

      expect(runOnce("a")).toBe("once");
      expect(runOnce("b")).toBeUndefined();
      expect(once).toHaveBeenCalledOnceWith("a");

      const runAfterFirst = callBackAfterFirst(afterFirst);

      expect(runAfterFirst("a")).toBeUndefined();
      expect(runAfterFirst("b")).toBe("next");
      expect(afterFirst).toHaveBeenCalledOnceWith("b");
    });

    it("should wait for a timeout", async () => {
      await expectAsync(wait(0)).toBeResolved();
    });

    it("should expose ng attribute prefixes", () => {
      expect(ngAttrPrefixes).toEqual(["ng-", "data-ng-"]);
    });

    it("should create null-prototype objects", () => {
      const obj = nullObject();

      obj.value = 1;
      expect(Object.getPrototypeOf(obj)).toBeNull();
      expect(obj.value).toBe(1);
    });

    it("should reject failed wasm fetches", async () => {
      const originalFetch = window.fetch;

      window.fetch = () => Promise.resolve({ ok: false });

      try {
        await expectAsync(
          instantiateWasm("/missing.wasm"),
        ).toBeRejectedWithError("fetch failed");
      } finally {
        window.fetch = originalFetch;
      }
    });
  });
});
