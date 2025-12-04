import { Angular } from "../angular.js";
import { createInjector } from "../core/di/injector.js";

describe("Filter: orderBy", () => {
  let orderBy;
  let orderByFilter;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    const injector = createInjector(["myModule"]);
    const $filter = injector.get("$filter");
    orderBy = orderByFilter = $filter("orderBy");
  });

  describe("(Arrays)", () => {
    it("should throw an exception if no array-like object is provided", () => {
      expect(() => {
        orderBy({});
      }).toThrowError(/notarray/);
    });

    it("should not throw an exception if a null or undefined value is provided", () => {
      expect(orderBy(null)).toEqual(null);
      expect(orderBy(undefined)).toEqual(undefined);
    });

    it("should not throw an exception if an array-like object is provided", () => {
      expect(orderBy("cba")).toEqual(["a", "b", "c"]);
    });

    it("should return sorted array if predicate is not provided", () => {
      expect(orderBy([2, 1, 3])).toEqual([1, 2, 3]);

      expect(orderBy([2, 1, 3], "")).toEqual([1, 2, 3]);
      expect(orderBy([2, 1, 3], [])).toEqual([1, 2, 3]);
      expect(orderBy([2, 1, 3], [""])).toEqual([1, 2, 3]);

      expect(orderBy([2, 1, 3], "+")).toEqual([1, 2, 3]);
      expect(orderBy([2, 1, 3], ["+"])).toEqual([1, 2, 3]);

      expect(orderBy([2, 1, 3], "-")).toEqual([3, 2, 1]);
      expect(orderBy([2, 1, 3], ["-"])).toEqual([3, 2, 1]);
    });

    it("should sort inherited from array", () => {
      function BaseCollection() {}
      BaseCollection.prototype = Array.prototype;
      const child = new BaseCollection();
      child.push({ a: 2 });
      child.push({ a: 15 });

      expect(Array.isArray(child)).toBe(false);
      expect(child instanceof Array).toBe(true);

      expect(orderBy(child, "a", true)).toEqual([{ a: 15 }, { a: 2 }]);
    });

    it("should sort array by predicate", () => {
      expect(
        orderBy(
          [
            { a: 15, b: 1 },
            { a: 2, b: 1 },
          ],
          ["a", "b"],
        ),
      ).toEqual([
        { a: 2, b: 1 },
        { a: 15, b: 1 },
      ]);
      expect(
        orderBy(
          [
            { a: 15, b: 1 },
            { a: 2, b: 1 },
          ],
          ["b", "a"],
        ),
      ).toEqual([
        { a: 2, b: 1 },
        { a: 15, b: 1 },
      ]);
      expect(
        orderBy(
          [
            { a: 15, b: 1 },
            { a: 2, b: 1 },
          ],
          ["+b", "-a"],
        ),
      ).toEqual([
        { a: 15, b: 1 },
        { a: 2, b: 1 },
      ]);
    });

    it("should sort array by date predicate", () => {
      // same dates
      expect(
        orderBy(
          [
            { a: new Date("01/01/2014"), b: 1 },
            { a: new Date("01/01/2014"), b: 3 },
            { a: new Date("01/01/2014"), b: 4 },
            { a: new Date("01/01/2014"), b: 2 },
          ],
          ["a", "b"],
        ),
      ).toEqual([
        { a: new Date("01/01/2014"), b: 1 },
        { a: new Date("01/01/2014"), b: 2 },
        { a: new Date("01/01/2014"), b: 3 },
        { a: new Date("01/01/2014"), b: 4 },
      ]);

      // one different date
      expect(
        orderBy(
          [
            { a: new Date("01/01/2014"), b: 1 },
            { a: new Date("01/01/2014"), b: 3 },
            { a: new Date("01/01/2013"), b: 4 },
            { a: new Date("01/01/2014"), b: 2 },
          ],
          ["a", "b"],
        ),
      ).toEqual([
        { a: new Date("01/01/2013"), b: 4 },
        { a: new Date("01/01/2014"), b: 1 },
        { a: new Date("01/01/2014"), b: 2 },
        { a: new Date("01/01/2014"), b: 3 },
      ]);
    });

    it("should compare timestamps when sorting dates", () => {
      expect(orderBy([new Date("01/01/2015"), new Date("01/01/2014")])).toEqual(
        [new Date("01/01/2014"), new Date("01/01/2015")],
      );
    });

    it("should use function", () => {
      expect(
        orderBy(
          [
            { a: 15, b: 1 },
            { a: 2, b: 1 },
          ],
          (value) => value.a,
        ),
      ).toEqual([
        { a: 2, b: 1 },
        { a: 15, b: 1 },
      ]);
    });

    it("should support string predicates with names containing non-identifier characters", () => {
      expect(
        orderBy(
          [{ "Tip %": 0.25 }, { "Tip %": 0.15 }, { "Tip %": 0.4 }],
          '"Tip %"',
        ),
      ).toEqual([{ "Tip %": 0.15 }, { "Tip %": 0.25 }, { "Tip %": 0.4 }]);
      expect(
        orderBy([{ 원: 76000 }, { 원: 31000 }, { 원: 156000 }], '"원"'),
      ).toEqual([{ 원: 31000 }, { 원: 76000 }, { 원: 156000 }]);
    });

    it("should throw if quoted string predicate is quoted incorrectly", () => {
      expect(() =>
        orderBy(
          [{ "Tip %": 0.15 }, { "Tip %": 0.25 }, { "Tip %": 0.4 }],
          "\"Tip %'",
        ),
      ).toThrow();
    });

    it("should not reverse array of objects with no predicate and reverse is not `true`", () => {
      const array = [{ id: 2 }, { id: 1 }, { id: 4 }, { id: 3 }];
      expect(orderBy(array)).toEqual(array);
    });

    it('should reverse array of objects with predicate of "-"', () => {
      const array = [{ id: 2 }, { id: 1 }, { id: 4 }, { id: 3 }];
      const reversedArray = [{ id: 3 }, { id: 4 }, { id: 1 }, { id: 2 }];
      expect(orderBy(array, "-")).toEqual(reversedArray);
    });

    it("should not reverse array of objects with null prototype and no predicate", () => {
      const array = [2, 1, 4, 3].map((id) => {
        const obj = Object.create(null);
        obj.id = id;
        return obj;
      });
      expect(orderBy(array)).toEqual(array);
    });

    it("should sort nulls as Array.prototype.sort", () => {
      const array = [{ id: 2 }, null, { id: 3 }, null];
      expect(orderBy(array)).toEqual([{ id: 2 }, { id: 3 }, null, null]);
    });

    it("should sort array of arrays as Array.prototype.sort", () => {
      expect(orderBy([["one"], ["two"], ["three"]])).toEqual([
        ["one"],
        ["three"],
        ["two"],
      ]);
    });

    it("should sort mixed array of objects and values in a stable way", () => {
      expect(
        orderBy([{ foo: 2 }, { foo: {} }, { foo: 3 }, { foo: 4 }], "foo"),
      ).toEqual([{ foo: 2 }, { foo: 3 }, { foo: 4 }, { foo: {} }]);
    });

    it("should perform a stable sort", () => {
      expect(
        orderBy(
          [
            { foo: 2, bar: 1 },
            { foo: 1, bar: 2 },
            { foo: 2, bar: 3 },
            { foo: 2, bar: 4 },
            { foo: 1, bar: 5 },
            { foo: 2, bar: 6 },
            { foo: 2, bar: 7 },
            { foo: 1, bar: 8 },
            { foo: 2, bar: 9 },
            { foo: 1, bar: 10 },
            { foo: 2, bar: 11 },
            { foo: 1, bar: 12 },
          ],
          "foo",
        ),
      ).toEqual([
        { foo: 1, bar: 2 },
        { foo: 1, bar: 5 },
        { foo: 1, bar: 8 },
        { foo: 1, bar: 10 },
        { foo: 1, bar: 12 },
        { foo: 2, bar: 1 },
        { foo: 2, bar: 3 },
        { foo: 2, bar: 4 },
        { foo: 2, bar: 6 },
        { foo: 2, bar: 7 },
        { foo: 2, bar: 9 },
        { foo: 2, bar: 11 },
      ]);

      expect(
        orderBy(
          [
            { foo: 2, bar: 1 },
            { foo: 1, bar: 2 },
            { foo: 2, bar: 3 },
            { foo: 2, bar: 4 },
            { foo: 1, bar: 5 },
            { foo: 2, bar: 6 },
            { foo: 2, bar: 7 },
            { foo: 1, bar: 8 },
            { foo: 2, bar: 9 },
            { foo: 1, bar: 10 },
            { foo: 2, bar: 11 },
            { foo: 1, bar: 12 },
          ],
          "foo",
          true,
        ),
      ).toEqual([
        { foo: 2, bar: 11 },
        { foo: 2, bar: 9 },
        { foo: 2, bar: 7 },
        { foo: 2, bar: 6 },
        { foo: 2, bar: 4 },
        { foo: 2, bar: 3 },
        { foo: 2, bar: 1 },
        { foo: 1, bar: 12 },
        { foo: 1, bar: 10 },
        { foo: 1, bar: 8 },
        { foo: 1, bar: 5 },
        { foo: 1, bar: 2 },
      ]);
    });

    describe("(reversing order)", () => {
      it("should not reverse collection if `reverse` param is falsy", () => {
        const items = [{ a: 2 }, { a: 15 }];
        const expr = "a";
        const sorted = [{ a: 2 }, { a: 15 }];

        expect(orderBy(items, expr, false)).toEqual(sorted);
        expect(orderBy(items, expr, 0)).toEqual(sorted);
        expect(orderBy(items, expr, "")).toEqual(sorted);
        expect(orderBy(items, expr, NaN)).toEqual(sorted);
        expect(orderBy(items, expr, null)).toEqual(sorted);
        expect(orderBy(items, expr, undefined)).toEqual(sorted);
      });

      it("should reverse collection if `reverse` param is truthy", () => {
        const items = [{ a: 2 }, { a: 15 }];
        const expr = "a";
        const sorted = [{ a: 15 }, { a: 2 }];

        expect(orderBy(items, expr, true)).toEqual(sorted);
        expect(orderBy(items, expr, 1)).toEqual(sorted);
        expect(orderBy(items, expr, "reverse")).toEqual(sorted);
        expect(orderBy(items, expr, {})).toEqual(sorted);
        expect(orderBy(items, expr, [])).toEqual(sorted);
        expect(
          orderBy(items, expr, () => {
            /* empty */
          }),
        ).toEqual(sorted);
      });

      it("should reverse collection if `reverse` param is `true`, even without an `expression`", () => {
        const originalItems = [{ id: 2 }, { id: 1 }, { id: 4 }, { id: 3 }];
        const reversedItems = [{ id: 3 }, { id: 4 }, { id: 1 }, { id: 2 }];
        expect(orderBy(originalItems, null, true)).toEqual(reversedItems);
      });
    });

    describe("(built-in comparator)", () => {
      it("should compare numbers numerically", () => {
        const items = [100, 3, 20];
        const expr = null;
        const sorted = [3, 20, 100];

        expect(orderBy(items, expr)).toEqual(sorted);
      });

      it("should compare strings alphabetically", () => {
        const items = ["100", "3", "20", "_b", "a"];
        const expr = null;
        const sorted = ["100", "20", "3", "_b", "a"];

        expect(orderBy(items, expr)).toEqual(sorted);
      });

      it("should compare strings case-insensitively", () => {
        const items = ["c", "B", "a"];
        const expr = null;
        const sorted = ["a", "B", "c"];

        expect(orderBy(items, expr)).toEqual(sorted);
      });

      it("should compare objects based on `index`", () => {
        const items = [{ c: 3 }, { b: 2 }, { a: 1 }];
        const expr = null;
        const sorted = [{ c: 3 }, { b: 2 }, { a: 1 }];

        expect(orderBy(items, expr)).toEqual(sorted);
      });

      it("should compare values of different type alphabetically by type", () => {
        const test = function () {};
        const items = [undefined, "1", {}, 999, test, false];
        const expr = null;
        const sorted = [false, test, 999, {}, "1", undefined];

        expect(orderBy(items, expr)).toEqual(sorted);
      });

      it("should consider null and undefined greater than any other value", () => {
        const items = [undefined, null, "z", {}, 999, false];
        const expr = null;
        const sorted = [false, 999, {}, "z", null, undefined];
        const reversed = [undefined, null, "z", {}, 999, false];
        expect(orderBy(items, expr)).toEqual(sorted);
        expect(orderBy(items, expr, true)).toEqual(reversed);
      });
    });

    describe("(custom comparator)", () => {
      it("should support a custom comparator", () => {
        const items = [4, 42, 2];
        const expr = null;
        const reverse = null;
        const sorted = [42, 2, 4];

        const comparator = function (o1, o2) {
          const v1 = o1.value;
          const v2 = o2.value;

          // 42 always comes first
          if (v1 === v2) return 0;
          if (v1 === 42) return -1;
          if (v2 === 42) return 1;

          // Default comparison for other values
          return v1 < v2 ? -1 : 1;
        };

        expect(orderBy(items, expr, reverse, comparator)).toEqual(sorted);
      });

      it("should support `reverseOrder` with a custom comparator", () => {
        const items = [4, 42, 2];
        const expr = null;
        const reverse = true;
        const sorted = [4, 2, 42];

        const comparator = function (o1, o2) {
          const v1 = o1.value;
          const v2 = o2.value;

          // 42 always comes first
          if (v1 === v2) return 0;
          if (v1 === 42) return -1;
          if (v2 === 42) return 1;

          // Default comparison for other values
          return v1 < v2 ? -1 : 1;
        };

        expect(orderBy(items, expr, reverse, comparator)).toEqual(sorted);
      });

      it("should pass `{value, type, index}` objects to comparators", () => {
        const noop = function () {};
        const items = [false, noop, 999, {}, "", undefined];
        const expr = null;
        const reverse = null;
        const comparator = jasmine.createSpy("comparator").and.returnValue(-1);

        orderBy(items, expr, reverse, comparator);
        const allArgsFlat = Array.prototype.concat.apply(
          [],
          comparator.calls.allArgs(),
        );

        expect(allArgsFlat).toContain({
          index: 0,
          type: "boolean",
          value: false,
        });
        expect(allArgsFlat).toContain({
          index: 1,
          type: "function",
          value: noop,
        });
        expect(allArgsFlat).toContain({ index: 2, type: "number", value: 999 });
        expect(allArgsFlat).toContain({ index: 3, type: "object", value: {} });
        expect(allArgsFlat).toContain({ index: 4, type: "string", value: "" });
        expect(allArgsFlat).toContain({
          index: 5,
          type: "undefined",
          value: undefined,
        });
      });

      it('should treat a value of `null` as type `"null"`', () => {
        const items = [null, null];
        const expr = null;
        const reverse = null;
        const comparator = jasmine.createSpy("comparator").and.returnValue(-1);

        orderBy(items, expr, reverse, comparator);
        const arg = comparator.calls.argsFor(0)[0];

        expect(arg).toEqual(
          jasmine.objectContaining({
            type: "null",
            value: null,
          }),
        );
      });

      it("should not convert strings to lower-case", () => {
        const items = ["c", "B", "a"];
        const expr = null;
        const reverse = null;
        const sorted = ["B", "a", "c"];

        const comparator = function (o1, o2) {
          return o1.value < o2.value ? -1 : 1;
        };

        expect(orderBy(items, expr, reverse, comparator)).toEqual(sorted);
      });

      it("should use `index` as `value` if no other predicate can distinguish between two items", () => {
        const items = ["foo", "bar"];
        const expr = null;
        const reverse = null;
        const comparator = jasmine.createSpy("comparator").and.returnValue(0);

        orderBy(items, expr, reverse, comparator);

        expect(comparator).toHaveBeenCalledTimes(2);
        const lastArgs = comparator.calls.mostRecent().args;

        expect(lastArgs).toContain(
          jasmine.objectContaining({ value: 0, type: "number" }),
        );
        expect(lastArgs).toContain(
          jasmine.objectContaining({ value: 1, type: "number" }),
        );
      });

      it("should support multiple predicates and per-predicate sorting direction", () => {
        const items = [
          { owner: "ownerA", type: "typeA" },
          { owner: "ownerB", type: "typeB" },
          { owner: "ownerC", type: "typeB" },
          { owner: "ownerD", type: "typeB" },
        ];
        const expr = ["type", "-owner"];
        const reverse = null;
        const sorted = [
          { owner: "ownerA", type: "typeA" },
          { owner: "ownerC", type: "typeB" },
          { owner: "ownerB", type: "typeB" },
          { owner: "ownerD", type: "typeB" },
        ];

        const comparator = function (o1, o2) {
          const v1 = o1.value;
          const v2 = o2.value;
          const isNerd1 = v1.toLowerCase().indexOf("nerd") !== -1;
          const isNerd2 = v2.toLowerCase().indexOf("nerd") !== -1;

          // Shamelessly promote "nerds"
          if (isNerd1 || isNerd2) {
            return isNerd1 && isNerd2 ? 0 : isNerd1 ? -1 : 1;
          }

          // No "nerd"; alphabetical order
          return v1 === v2 ? 0 : v1 < v2 ? -1 : 1;
        };

        expect(orderBy(items, expr, reverse, comparator)).toEqual(sorted);
      });

      it("should use the default comparator to break ties on a provided comparator", () => {
        // Some list that won't be sorted "naturally", i.e. should sort to ['a', 'B', 'c']
        const items = ["c", "a", "B"];
        const expr = null;
        function comparator() {
          return 0;
        }
        const reversed = ["B", "a", "c"];

        expect(orderBy(items, expr, false, comparator)).toEqual(items);
        expect(orderBy(items, expr, true, comparator)).toEqual(reversed);
      });
    });

    describe("(object as `value`)", () => {
      it("should use the return value of `valueOf()` (if primitive)", () => {
        const o1 = {
          k: 1,
          valueOf() {
            return 2;
          },
        };
        const o2 = {
          k: 2,
          valueOf() {
            return 1;
          },
        };

        const items = [o1, o2];
        const expr = null;
        const sorted = [o2, o1];

        expect(orderBy(items, expr)).toEqual(sorted);
      });

      it("should use the return value of `toString()` (if primitive)", () => {
        const o1 = {
          k: 1,
          toString() {
            return 2;
          },
        };
        const o2 = {
          k: 2,
          toString() {
            return 1;
          },
        };

        const items = [o1, o2];
        const expr = null;
        const sorted = [o2, o1];

        expect(orderBy(items, expr)).toEqual(sorted);
      });

      it("should ignore the `toString()` inherited from `Object`", () => {
        // The global `toString` variable (in 'src/Angular.js')
        // has already captured `Object.prototype.toString`
        const originalToString = toString;
        window.toString = jasmine
          .createSpy("toString")
          .and.callFake(originalToString);

        const o1 = Object.create({ toString });
        const o2 = Object.create({ toString });

        const items = [o1, o2];
        const expr = null;

        orderBy(items, expr);

        expect(o1.toString).not.toHaveBeenCalled();
        expect(o2.toString).not.toHaveBeenCalled();

        toString = originalToString;
      });

      it("should use the return value of `valueOf()` for subsequent steps (if non-primitive)", () => {
        const o1 = {
          k: 1,
          valueOf() {
            return o3;
          },
        };
        const o2 = {
          k: 2,
          valueOf() {
            return o4;
          },
        };
        let o3 = {
          k: 3,
          toString() {
            return 4;
          },
        };
        let o4 = {
          k: 4,
          toString() {
            return 3;
          },
        };

        const items = [o1, o2];
        const expr = null;
        const sorted = [o2, o1];

        expect(orderBy(items, expr)).toEqual(sorted);
      });

      it("should use the return value of `toString()` for subsequent steps (if non-primitive)", () => {
        const o1 = {
          k: 1,
          toString() {
            return o3;
          },
        };
        const o2 = {
          k: 2,
          toString() {
            return o4;
          },
        };
        let o3 = { k: 3 };
        let o4 = { k: 4 };

        const items = [o1, o2];
        const expr = null;
        const reverse = null;
        const comparator = jasmine.createSpy("comparator").and.returnValue(-1);

        orderBy(items, expr, reverse, comparator);
        const args = comparator.calls.argsFor(0);

        expect(args).toContain(
          jasmine.objectContaining({ value: o3, type: "object" }),
        );
        expect(args).toContain(
          jasmine.objectContaining({ value: o4, type: "object" }),
        );
      });

      it("should use the object itself as `value` if no conversion took place", () => {
        const o1 = { k: 1 };
        const o2 = { k: 2 };

        const items = [o1, o2];
        const expr = null;
        const reverse = null;
        const comparator = jasmine.createSpy("comparator").and.returnValue(-1);

        orderBy(items, expr, reverse, comparator);
        const args = comparator.calls.argsFor(0);

        expect(args).toContain(
          jasmine.objectContaining({ value: o1, type: "object" }),
        );
        expect(args).toContain(
          jasmine.objectContaining({ value: o2, type: "object" }),
        );
      });
    });
  });

  describe("(Array-Like Objects)", () => {
    function arrayLike(args) {
      const result = {};
      let i;
      for (i = 0; i < args.length; ++i) {
        result[i] = args[i];
      }
      result.length = i;
      return result;
    }

    beforeEach(() => {
      window.angular = new Angular();
      window.angular.module("myModule", ["ng"]);
      const injector = createInjector(["myModule"]);
      const $filter = injector.get("$filter");
      orderBy = function (collection) {
        const args = Array.prototype.slice.call(arguments, 0);
        args[0] = arrayLike(args[0]);
        return orderByFilter.apply(null, args);
      };
    });

    it("should return sorted array if predicate is not provided", () => {
      expect(orderBy([2, 1, 3])).toEqual([1, 2, 3]);

      expect(orderBy([2, 1, 3], "")).toEqual([1, 2, 3]);
      expect(orderBy([2, 1, 3], [])).toEqual([1, 2, 3]);
      expect(orderBy([2, 1, 3], [""])).toEqual([1, 2, 3]);

      expect(orderBy([2, 1, 3], "+")).toEqual([1, 2, 3]);
      expect(orderBy([2, 1, 3], ["+"])).toEqual([1, 2, 3]);

      expect(orderBy([2, 1, 3], "-")).toEqual([3, 2, 1]);
      expect(orderBy([2, 1, 3], ["-"])).toEqual([3, 2, 1]);
    });

    it("shouldSortArrayInReverse", () => {
      expect(orderBy([{ a: 15 }, { a: 2 }], "a", true)).toEqual([
        { a: 15 },
        { a: 2 },
      ]);
      expect(orderBy([{ a: 15 }, { a: 2 }], "a", "T")).toEqual([
        { a: 15 },
        { a: 2 },
      ]);
      expect(orderBy([{ a: 15 }, { a: 2 }], "a", "reverse")).toEqual([
        { a: 15 },
        { a: 2 },
      ]);
    });

    it("should sort array by predicate", () => {
      expect(
        orderBy(
          [
            { a: 15, b: 1 },
            { a: 2, b: 1 },
          ],
          ["a", "b"],
        ),
      ).toEqual([
        { a: 2, b: 1 },
        { a: 15, b: 1 },
      ]);
      expect(
        orderBy(
          [
            { a: 15, b: 1 },
            { a: 2, b: 1 },
          ],
          ["b", "a"],
        ),
      ).toEqual([
        { a: 2, b: 1 },
        { a: 15, b: 1 },
      ]);
      expect(
        orderBy(
          [
            { a: 15, b: 1 },
            { a: 2, b: 1 },
          ],
          ["+b", "-a"],
        ),
      ).toEqual([
        { a: 15, b: 1 },
        { a: 2, b: 1 },
      ]);
    });

    it("should sort array by date predicate", () => {
      // same dates
      expect(
        orderBy(
          [
            { a: new Date("01/01/2014"), b: 1 },
            { a: new Date("01/01/2014"), b: 3 },
            { a: new Date("01/01/2014"), b: 4 },
            { a: new Date("01/01/2014"), b: 2 },
          ],
          ["a", "b"],
        ),
      ).toEqual([
        { a: new Date("01/01/2014"), b: 1 },
        { a: new Date("01/01/2014"), b: 2 },
        { a: new Date("01/01/2014"), b: 3 },
        { a: new Date("01/01/2014"), b: 4 },
      ]);

      // one different date
      expect(
        orderBy(
          [
            { a: new Date("01/01/2014"), b: 1 },
            { a: new Date("01/01/2014"), b: 3 },
            { a: new Date("01/01/2013"), b: 4 },
            { a: new Date("01/01/2014"), b: 2 },
          ],
          ["a", "b"],
        ),
      ).toEqual([
        { a: new Date("01/01/2013"), b: 4 },
        { a: new Date("01/01/2014"), b: 1 },
        { a: new Date("01/01/2014"), b: 2 },
        { a: new Date("01/01/2014"), b: 3 },
      ]);
    });

    it("should use function", () => {
      expect(
        orderBy(
          [
            { a: 15, b: 1 },
            { a: 2, b: 1 },
          ],
          (value) => value.a,
        ),
      ).toEqual([
        { a: 2, b: 1 },
        { a: 15, b: 1 },
      ]);
    });

    it("should support string predicates with names containing non-identifier characters", () => {
      expect(
        orderBy(
          [{ "Tip %": 0.25 }, { "Tip %": 0.15 }, { "Tip %": 0.4 }],
          '"Tip %"',
        ),
      ).toEqual([{ "Tip %": 0.15 }, { "Tip %": 0.25 }, { "Tip %": 0.4 }]);
      expect(
        orderBy([{ 원: 76000 }, { 원: 31000 }, { 원: 156000 }], '"원"'),
      ).toEqual([{ 원: 31000 }, { 원: 76000 }, { 원: 156000 }]);
    });

    it("should throw if quoted string predicate is quoted incorrectly", () => {
      expect(() =>
        orderBy(
          [{ "Tip %": 0.15 }, { "Tip %": 0.25 }, { "Tip %": 0.4 }],
          "\"Tip %'",
        ),
      ).toThrow();
    });

    it("should not reverse array of objects with no predicate", () => {
      const array = [{ id: 2 }, { id: 1 }, { id: 4 }, { id: 3 }];
      expect(orderBy(array)).toEqual(array);
    });

    it("should not reverse array of objects with null prototype and no predicate", () => {
      const array = [2, 1, 4, 3].map((id) => {
        const obj = Object.create(null);
        obj.id = id;
        return obj;
      });
      expect(orderBy(array)).toEqual(array);
    });

    it("should sort nulls as Array.prototype.sort", () => {
      const array = [{ id: 2 }, null, { id: 3 }, null];
      expect(orderBy(array)).toEqual([{ id: 2 }, { id: 3 }, null, null]);
    });
  });
});
