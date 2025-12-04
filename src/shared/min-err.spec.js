import {
  minErr,
  isDefined,
  toDebugString,
  errorHandlingConfig,
} from "./utils.js";

describe("errors", () => {
  afterEach(() => {
    /* empty */
  });

  describe("minErr", () => {
    const supportStackTraces = function () {
      const e = new Error();
      return isDefined(e.stack);
    };
    const emptyTestError = minErr("");
    const testError = minErr("test");

    it("should return an Error factory", () => {
      const myError = testError("test", "Oops");
      expect(myError instanceof Error).toBe(true);
    });

    it("should generate stack trace at the frame where the minErr instance was called", () => {
      let myError;

      function someFn() {
        function nestedFn() {
          myError = testError("fail", "I fail!");
        }
        nestedFn();
      }

      someFn();

      // only Chrome, Firefox have stack
      if (!supportStackTraces()) return;

      expect(myError.stack).toMatch(/^[.\s\S]+nestedFn[.\s\S]+someFn.+/);
    });

    it("should interpolate string arguments without quotes", () => {
      const myError = testError("1", 'This {0} is "{1}"', "foo", "bar");
      expect(myError.message).toMatch(/^\[test:1] This foo is "bar"/);
    });

    it("should interpolate non-string arguments", () => {
      const arr = [1, 2, 3];
      const obj = { a: 123, b: "baar" };
      const anonFn = function (something) {
        return something;
      };
      const namedFn = function foo(something) {
        return something;
      };
      let myError;

      myError = testError(
        "26",
        "arr: {0}; obj: {1}; anonFn: {2}; namedFn: {3}",
        arr,
        obj,
        anonFn,
        namedFn,
      );

      expect(myError.message).toContain(
        '[test:26] arr: [1,2,3]; obj: {"a":123,"b":"baar"};',
      );
      expect(myError.message).toContain("namedFn: function foo(something)");
    });

    it("should not suppress falsy objects", () => {
      const myError = testError(
        "26",
        "false: {0}; zero: {1}; null: {2}; undefined: {3}; emptyStr: {4}",
        false,
        0,
        null,
        undefined,
        "",
      );
      expect(myError.message).toMatch(
        /^\[test:26] false: false; zero: 0; null: null; undefined: undefined; emptyStr: /,
      );
    });

    it("should handle arguments that are objects with cyclic references", () => {
      const a = { b: {} };
      a.b.a = a;

      const myError = testError("26", "a is {0}", a);
      expect(myError.message).toMatch(/a is {"b":{"a":"..."}}/);
    });

    it("should handle arguments that are objects and ignore max depth when objectMaxDepth = $prop", () => {
      [NaN, null, true, false, -1, 0].forEach((maxDepth) => {
        const a = { b: { c: { d: { e: { f: { g: 1 } } } } } };

        errorHandlingConfig({ objectMaxDepth: maxDepth });
        const myError = testError("26", "a is {0}", a);
        expect(myError.message).toMatch(
          /a is {"b":{"c":{"d":{"e":{"f":{"g":1}}}}}}/,
        );
      });
    });

    it("should preserve interpolation markers when fewer arguments than needed are provided", () => {
      // this way we can easily see if we are passing fewer args than needed

      const foo = "Fooooo";
      const myError = testError("26", "This {0} is {1} on {2}", foo);

      expect(myError.message).toMatch(
        /^\[test:26] This Fooooo is \{1\} on \{2\}/,
      );
    });

    it("should pass through the message if no interpolation is needed", () => {
      const myError = testError("26", "Something horrible happened!");
      expect(myError.message).toMatch(
        /^\[test:26] Something horrible happened!/,
      );
    });

    it("should include a namespace in the message only if it is namespaced", () => {
      const myError = emptyTestError("26", "This is a {0}", "Foo");
      const myNamespacedError = testError("26", "That is a {0}", "Bar");
      expect(myError.message).toMatch(/^\[26] This is a Foo/);
      expect(myNamespacedError.message).toMatch(/^\[test:26] That is a Bar/);
    });

    // it("should strip error reference urls from the error message parameters", () => {
    //   const firstError = testError("firstcode", "longer string and so on");

    //   const error = testError(
    //     "secondcode",
    //     "description {0}, and {1}",
    //     "a",
    //     firstError.message,
    //   );

    //   expect(error.message).toBe(
    //     "[test:secondcode] description a, and [test:firstcode] longer " +
    //       'string and so on\n\nhttps://errors.angularjs.org/"NG_VERSION_FULL"/test/' +
    //       "secondcode?p0=a&p1=%5Btest%3Afirstcode%5D%20longer%20string%20and%20so%20on%0Ahttps" +
    //       "%3A%2F%2Ferrors.angularjs.org%2F%22NG_VERSION_FULL%22%2Ftest%2Ffirstcode",
    //   );
    // });

    // it("should not generate URL query parameters when urlErrorParamsEnabled is  false", () => {
    //   errorHandlingConfig({ urlErrorParamsEnabled: false });
    //
    //   expect(testError("acode", "aproblem", "a", "b", "c").message).toBe(
    //     "[test:acode] aproblem\n" +
    //       'https://errors.angularjs.org/"NG_VERSION_FULL"/test/acode',
    //   );
    // });
  });
});

describe("toDebugString", () => {
  it("should convert its argument to a string", () => {
    expect(toDebugString("string")).toEqual("string");
    expect(toDebugString(123)).toEqual("123");
    expect(toDebugString({ a: { b: "c" } })).toEqual('{"a":{"b":"c"}}');
    expect(
      toDebugString(function fn() {
        const a = 10;
      }),
    ).toEqual("function fn()");
    expect(toDebugString()).toEqual("undefined");
    const a = {};
    a.a = a;
    expect(toDebugString(a)).toEqual('{"a":"..."}');
    expect(toDebugString([a, a])).toEqual('[{"a":"..."},"..."]');
  });
});
