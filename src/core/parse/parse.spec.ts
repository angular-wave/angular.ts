// @ts-nocheck
/// <reference types="jasmine" />
import { isFunction } from "../../shared/utils.ts";
import { createInjector } from "../di/injector.ts";
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/test-utils.ts";

describe("parser", () => {
  let $rootScope;

  let $parse;

  let scope;

  let logs = [];

  function evaluateExpression(evalScope, expr, locals) {
    const result = $parse(expr)(evalScope, locals);

    if (result == null || result === Object.hasOwnProperty) {
      return result;
    }

    if (isFunction(result)) {
      return result();
    }

    if (Number.isNaN(result)) {
      return 0;
    }

    return result;
  }

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          logs.push(exception);
          console.error(exception, cause);
        };
      });
    const injector = createInjector(["myModule"]);

    $parse = injector.get("$parse");
    $rootScope = injector.get("$rootScope");
  });

  let filterProvider;

  beforeEach(() => {
    createInjector([
      "ng",
      function ($filterProvider) {
        filterProvider = $filterProvider;
      },
    ]).invoke((_$rootScope_, _$parse_) => {
      $rootScope = _$rootScope_;
      $parse = _$parse_;
    });
  });

  [true, false].forEach((cspEnabled) => {
    describe(`csp: ${cspEnabled}`, () => {
      beforeEach(() => {
        createInjector([
          "ng",
          function ($filterProvider) {
            filterProvider = $filterProvider;
          },
        ]).invoke((_$rootScope_, _$parse_) => {
          scope = _$rootScope_;
          $parse = _$parse_;
        });
      });

      it("should parse expressions", () => {
        expect(evaluateExpression(scope, "-1")).toEqual(-1);
        expect(evaluateExpression(scope, "1 + 2.5")).toEqual(3.5);
        expect(evaluateExpression(scope, "1 + -2.5")).toEqual(-1.5);
        expect(evaluateExpression(scope, "1+2*3/4")).toEqual(1 + (2 * 3) / 4);
        expect(evaluateExpression(scope, "0-(-1)+1.5")).toEqual(0 - -1 + 1.5);
        expect(evaluateExpression(scope, "-0-(-1)+(+2)*-3/-4")).toEqual(
          -0 - -1 + (+2 * -3) / -4,
        );
        expect(evaluateExpression(scope, "1/2*3")).toEqual((1 / 2) * 3);
      });

      it("should parse unary", () => {
        expect(evaluateExpression(scope, "+1")).toEqual(+1);
        expect(evaluateExpression(scope, "-1")).toEqual(-1);
        expect(evaluateExpression(scope, "+'1'")).toEqual(+"1");
        expect(evaluateExpression(scope, "-'1'")).toEqual(-"1");
        expect(evaluateExpression(scope, "+undefined")).toEqual(0);

        // Note: don't change toEqual to toBe as toBe collapses 0 & -0.
        expect(evaluateExpression(scope, "-undefined")).toEqual(-0);
        expect(evaluateExpression(scope, "+null")).toEqual(+null);
        expect(evaluateExpression(scope, "-null")).toEqual(-null);
        expect(evaluateExpression(scope, "+false")).toEqual(+false);
        expect(evaluateExpression(scope, "-false")).toEqual(-false);
        expect(evaluateExpression(scope, "+true")).toEqual(+true);
        expect(evaluateExpression(scope, "-true")).toEqual(-true);
      });

      it("should parse comparison", () => {
        expect(evaluateExpression(scope, "false")).toBeFalsy();
        expect(evaluateExpression(scope, "!true")).toBeFalsy();
        expect(evaluateExpression(scope, "1==1")).toBeTruthy();
        expect(evaluateExpression(scope, "1==true")).toBeTruthy();
        expect(evaluateExpression(scope, "1!=true")).toBeFalsy();
        expect(evaluateExpression(scope, "1===1")).toBeTruthy();
        expect(evaluateExpression(scope, "1==='1'")).toBeFalsy();
        expect(evaluateExpression(scope, "1===true")).toBeFalsy();
        expect(evaluateExpression(scope, "'true'===true")).toBeFalsy();
        expect(evaluateExpression(scope, "1!==2")).toBeTruthy();
        expect(evaluateExpression(scope, "1!=='1'")).toBeTruthy();
        expect(evaluateExpression(scope, "1!=2")).toBeTruthy();
        expect(evaluateExpression(scope, "1<2")).toBeTruthy();
        expect(evaluateExpression(scope, "1<=1")).toBeTruthy();
        expect(evaluateExpression(scope, "1>2")).toEqual(1 > 2);
        expect(evaluateExpression(scope, "2>=1")).toEqual(2 >= 1);
        expect(evaluateExpression(scope, "true==2<3")).toEqual(2 < 3);
        expect(evaluateExpression(scope, "true===2<3")).toEqual(2 < 3);

        expect(evaluateExpression(scope, "true===3===3")).toEqual(
          (true === 3) === 3,
        );
        expect(evaluateExpression(scope, "3===3===true")).toEqual(true);
        expect(evaluateExpression(scope, "3 >= 3 > 2")).toEqual(3 >= 3 > 2);
      });

      it("should parse logical", () => {
        expect(evaluateExpression(scope, "0&&2")).toEqual(0 && 2);
        expect(evaluateExpression(scope, "0||2")).toEqual(0 || 2);
        expect(evaluateExpression(scope, "0||1&&2")).toEqual(0 || (1 && 2));
        expect(evaluateExpression(scope, "true&&a")).toEqual(undefined);
        expect(evaluateExpression(scope, "true&&a()")).toEqual(undefined);
        expect(evaluateExpression(scope, "true&&a()()")).toEqual(undefined);
        expect(evaluateExpression(scope, "true&&a.b")).toEqual(undefined);
        expect(evaluateExpression(scope, "true&&a.b.c")).toEqual(undefined);
        expect(evaluateExpression(scope, "false||a")).toEqual(undefined);
        expect(evaluateExpression(scope, "false||a()")).toEqual(undefined);
        expect(evaluateExpression(scope, "false||a()()")).toEqual(undefined);
        expect(evaluateExpression(scope, "false||a.b")).toEqual(undefined);
        expect(evaluateExpression(scope, "false||a.b.c")).toEqual(undefined);
      });

      it("should parse nullish coalescing", () => {
        scope.zero = 0;
        scope.empty = "";
        scope.falseValue = false;
        scope.nullValue = null;
        scope.undefinedValue = undefined;

        expect(evaluateExpression(scope, "nullValue ?? 'fallback'")).toEqual(
          "fallback",
        );
        expect(
          evaluateExpression(scope, "undefinedValue ?? 'fallback'"),
        ).toEqual("fallback");
        expect(evaluateExpression(scope, "zero ?? 1")).toEqual(0);
        expect(evaluateExpression(scope, "empty ?? 'fallback'")).toEqual("");
        expect(evaluateExpression(scope, "falseValue ?? true")).toEqual(false);
        expect(evaluateExpression(scope, "nullValue ?? 0 || 2")).toEqual(2);
        expect(evaluateExpression(scope, "0 || nullValue ?? 2")).toEqual(2);
        expect(evaluateExpression(scope, "zero ?? 1 ? 'yes' : 'no'")).toEqual(
          "no",
        );
      });

      it("should parse ternary", () => {
        const returnTrue = (scope.returnTrue = function () {
          return true;
        });

        const returnFalse = (scope.returnFalse = function () {
          return false;
        });

        const returnString = (scope.returnString = function () {
          return "asd";
        });

        const returnInt = (scope.returnInt = function () {
          return 123;
        });

        const identity = (scope.identity = function (x) {
          return x;
        });

        // Simple.
        expect(evaluateExpression(scope, "0?0:2")).toEqual(0 ? 0 : 2);
        expect(evaluateExpression(scope, "1?0:2")).toEqual(1 ? 0 : 2);

        // Nested on the left.
        expect(evaluateExpression(scope, "0?0?0:0:2")).toEqual(
          0 ? (0 ? 0 : 0) : 2,
        );
        expect(evaluateExpression(scope, "1?0?0:0:2")).toEqual(
          1 ? (0 ? 0 : 0) : 2,
        );
        expect(evaluateExpression(scope, "0?1?0:0:2")).toEqual(
          0 ? (1 ? 0 : 0) : 2,
        );
        expect(evaluateExpression(scope, "0?0?1:0:2")).toEqual(
          0 ? (0 ? 1 : 0) : 2,
        );
        expect(evaluateExpression(scope, "0?0?0:2:3")).toEqual(
          0 ? (0 ? 0 : 2) : 3,
        );
        expect(evaluateExpression(scope, "1?1?0:0:2")).toEqual(
          1 ? (1 ? 0 : 0) : 2,
        );
        expect(evaluateExpression(scope, "1?1?1:0:2")).toEqual(
          1 ? (1 ? 1 : 0) : 2,
        );
        expect(evaluateExpression(scope, "1?1?1:2:3")).toEqual(
          1 ? (1 ? 1 : 2) : 3,
        );
        expect(evaluateExpression(scope, "1?1?1:2:3")).toEqual(
          1 ? (1 ? 1 : 2) : 3,
        );

        // Nested on the right.
        expect(evaluateExpression(scope, "0?0:0?0:2")).toEqual(
          0 ? 0 : 0 ? 0 : 2,
        );
        expect(evaluateExpression(scope, "1?0:0?0:2")).toEqual(
          1 ? 0 : 0 ? 0 : 2,
        );
        expect(evaluateExpression(scope, "0?1:0?0:2")).toEqual(
          0 ? 1 : 0 ? 0 : 2,
        );
        expect(evaluateExpression(scope, "0?0:1?0:2")).toEqual(
          0 ? 0 : 1 ? 0 : 2,
        );
        expect(evaluateExpression(scope, "0?0:0?2:3")).toEqual(
          0 ? 0 : 0 ? 2 : 3,
        );
        expect(evaluateExpression(scope, "1?1:0?0:2")).toEqual(
          1 ? 1 : 0 ? 0 : 2,
        );
        expect(evaluateExpression(scope, "1?1:1?0:2")).toEqual(
          1 ? 1 : 1 ? 0 : 2,
        );
        expect(evaluateExpression(scope, "1?1:1?2:3")).toEqual(
          1 ? 1 : 1 ? 2 : 3,
        );
        expect(evaluateExpression(scope, "1?1:1?2:3")).toEqual(
          1 ? 1 : 1 ? 2 : 3,
        );

        // Precedence with respect to logical operators.
        expect(evaluateExpression(scope, "0&&1?0:1")).toEqual(0 && 1 ? 0 : 1);
        expect(evaluateExpression(scope, "1||0?0:0")).toEqual(1 || 0 ? 0 : 0);

        expect(evaluateExpression(scope, "0?0&&1:2")).toEqual(0 ? 0 && 1 : 2);
        expect(evaluateExpression(scope, "0?1&&1:2")).toEqual(0 ? 1 && 1 : 2);
        expect(evaluateExpression(scope, "0?0||0:1")).toEqual(0 ? 0 || 0 : 1);
        expect(evaluateExpression(scope, "0?0||1:2")).toEqual(0 ? 0 || 1 : 2);

        expect(evaluateExpression(scope, "1?0&&1:2")).toEqual(1 ? 0 && 1 : 2);
        expect(evaluateExpression(scope, "1?1&&1:2")).toEqual(1 ? 1 && 1 : 2);
        expect(evaluateExpression(scope, "1?0||0:1")).toEqual(1 ? 0 || 0 : 1);
        expect(evaluateExpression(scope, "1?0||1:2")).toEqual(1 ? 0 || 1 : 2);

        expect(evaluateExpression(scope, "0?1:0&&1")).toEqual(0 ? 1 : 0 && 1);
        expect(evaluateExpression(scope, "0?2:1&&1")).toEqual(0 ? 2 : 1 && 1);
        expect(evaluateExpression(scope, "0?1:0||0")).toEqual(0 ? 1 : 0 || 0);
        expect(evaluateExpression(scope, "0?2:0||1")).toEqual(0 ? 2 : 0 || 1);

        expect(evaluateExpression(scope, "1?1:0&&1")).toEqual(1 ? 1 : 0 && 1);
        expect(evaluateExpression(scope, "1?2:1&&1")).toEqual(1 ? 2 : 1 && 1);
        expect(evaluateExpression(scope, "1?1:0||0")).toEqual(1 ? 1 : 0 || 0);
        expect(evaluateExpression(scope, "1?2:0||1")).toEqual(1 ? 2 : 0 || 1);

        // Function calls.
        expect(
          evaluateExpression(
            scope,
            "returnTrue() ? returnString() : returnInt()",
          ),
        ).toEqual(returnTrue() ? returnString() : returnInt());
        expect(
          evaluateExpression(
            scope,
            "returnFalse() ? returnString() : returnInt()",
          ),
        ).toEqual(returnFalse() ? returnString() : returnInt());
        expect(
          evaluateExpression(
            scope,
            "returnTrue() ? returnString() : returnInt()",
          ),
        ).toEqual(returnTrue() ? returnString() : returnInt());
        expect(
          evaluateExpression(
            scope,
            "identity(returnFalse() ? returnString() : returnInt())",
          ),
        ).toEqual(identity(returnFalse() ? returnString() : returnInt()));
      });

      it("should parse string", () => {
        expect(evaluateExpression(scope, "'a' + 'b c'")).toEqual("ab c");
      });

      it("should parse filters", () => {
        filterProvider.register(
          "substring",
          () => (input, start, end) => input.substring(start, end),
        );

        expect(() => {
          evaluateExpression(scope, "1|nonexistent");
        }).toThrowError();

        scope.offset = 3;
        expect(evaluateExpression(scope, "'abcd'|substring:1:offset")).toEqual(
          "bc",
        );
      });

      it("should access scope", () => {
        scope.a = 123;
        scope.b = { c: 456 };
        expect(evaluateExpression(scope, "a", scope)).toEqual(123);
        expect(evaluateExpression(scope, "b.c", scope)).toEqual(456);
        expect(evaluateExpression(scope, "x.y.z", scope)).not.toBeDefined();
      });

      it("should handle white-spaces around dots in paths", () => {
        scope.a = { b: 4 };
        expect(evaluateExpression(scope, "a . b", scope)).toEqual(4);
        expect(evaluateExpression(scope, "a. b", scope)).toEqual(4);
        expect(evaluateExpression(scope, "a .b", scope)).toEqual(4);
        expect(evaluateExpression(scope, "a    . \nb", scope)).toEqual(4);
      });

      it("should handle white-spaces around dots in method invocations", () => {
        scope.a = {
          b() {
            return this.c;
          },
          c: 4,
        };
        expect(evaluateExpression(scope, "a . b ()", scope)).toEqual(4);
        expect(evaluateExpression(scope, "a. b ()", scope)).toEqual(4);
        expect(evaluateExpression(scope, "a .b ()", scope)).toEqual(4);
        expect(
          evaluateExpression(scope, "a  \n  . \nb   \n ()", scope),
        ).toEqual(4);
      });

      it("should throw syntax error exception for identifiers ending with a dot", () => {
        scope.a = { b: 4 };

        expect(() => {
          evaluateExpression(scope, "a.", scope);
        }).toThrowError(/ueoe/);

        expect(() => {
          evaluateExpression(scope, "a .", scope);
        }).toThrowError(/ueoe/);
      });

      it("should resolve deeply nested paths (important for CSP mode)", () => {
        scope.a = {
          b: {
            c: {
              d: {
                e: {
                  f: {
                    g: { h: { i: { j: { k: { l: { m: { n: "nooo!" } } } } } } },
                  },
                },
              },
            },
          },
        };
        expect(
          evaluateExpression(scope, "a.b.c.d.e.f.g.h.i.j.k.l.m.n", scope),
        ).toBe("nooo!");
      });

      [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 42, 99].forEach((pathLength) => {
        it(`should resolve nested paths of length ${pathLength}`, () => {
          let i;

          // Create a nested object {x2: {x3: {x4: ... {x[n]: 42} ... }}}.
          let obj = 42;

          const locals = {};

          for (i = pathLength; i >= 2; i--) {
            const newObj = {};

            newObj[`x${i}`] = obj;
            obj = newObj;
          }
          // Assign to x1 and build path 'x1.x2.x3. ... .x[n]' to access the final value.
          scope.x1 = obj;
          let path = "x1";

          for (i = 2; i <= pathLength; i++) {
            path += `.x${i}`;
          }
          expect(evaluateExpression(scope, path)).toBe(42);
          locals[`x${pathLength}`] = "not 42";
          expect(evaluateExpression(scope, path, locals)).toBe(42);
        });
      });

      it("should be forgiving", () => {
        scope.a = { b: 23 };
        expect(evaluateExpression(scope, "b")).toBeUndefined();
        expect(evaluateExpression(scope, "a.x")).toBeUndefined();
        expect(evaluateExpression(scope, "a.b.c.d")).toBeUndefined();
        scope.a = undefined;
        expect(evaluateExpression(scope, "a - b")).toBe(0);
        expect(evaluateExpression(scope, "a + b")).toBeUndefined();
        scope.a = 0;
        expect(evaluateExpression(scope, "a - b")).toBe(0);
        expect(evaluateExpression(scope, "a + b")).toBe(0);
        scope.a = undefined;
        scope.b = 0;
        expect(evaluateExpression(scope, "a - b")).toBe(0);
        expect(evaluateExpression(scope, "a + b")).toBe(0);
      });

      it("should support property names that collide with native object properties", () => {
        // regression
        scope.watch = 1;
        scope.toString = function toString() {
          return "custom toString";
        };

        expect(evaluateExpression(scope, "watch", scope)).toBe(1);
        expect(evaluateExpression(scope, "toString()", scope)).toBe(
          "custom toString",
        );
      });

      it("should not break if hasOwnProperty is referenced in an expression", () => {
        scope.obj = { value: 1 };
        // By evaluating an expression that calls hasOwnProperty, the getterFnCache
        // will store a property called hasOwnProperty.  This is effectively:
        // getterFnCache['hasOwnProperty'] = null
        evaluateExpression(scope, 'obj.hasOwnProperty("value")');
        // If we rely on this property then evaluating any expression will fail
        // because it is not able to find out if obj.value is there in the cache
        expect(evaluateExpression(scope, "obj.value")).toBe(1);
      });

      it('should not break if the expression is "hasOwnProperty"', () => {
        scope.fooExp = "barVal";
        // By evaluating hasOwnProperty, the $parse cache will store a getter for
        // the scope's own hasOwnProperty function, which will mess up future cache look ups.
        // i.e. cache['hasOwnProperty'] = (scope) => scope.hasOwnProperty;
        evaluateExpression(scope, "hasOwnProperty");
        expect(evaluateExpression(scope, "fooExp")).toBe("barVal");
      });

      it("should evaluate grouped expressions", () => {
        expect(evaluateExpression(scope, "(1+2)*3")).toEqual((1 + 2) * 3);
      });

      it("should evaluate assignments", () => {
        expect(evaluateExpression(scope, "a=12")).toEqual(12);
        expect(scope.a).toEqual(12);

        expect(evaluateExpression(scope, "x.y.z=123;")).toEqual(123);
        expect(scope.x.y.z).toEqual(123);

        expect(evaluateExpression(scope, "a=123; b=234")).toEqual(234);
        expect(scope.a).toEqual(123);
        expect(scope.b).toEqual(234);
      });

      it("should throw with invalid left-val in assignments", () => {
        expect(() => {
          evaluateExpression(scope, "1 = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "{} = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "[] = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "true = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "(a=b) = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "(1<2) = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "(1+2) = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "!v = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "this = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "+v = 1");
        }).toThrowError(/lval/);
        expect(() => {
          evaluateExpression(scope, "(1?v1:v2) = 1");
        }).toThrowError(/lval/);
      });

      it("should evaluate assignments in ternary operator", () => {
        evaluateExpression(scope, "a = 1 ? 2 : 3");
        expect(scope.a).toBe(2);

        evaluateExpression(scope, "0 ? a = 2 : a = 3");
        expect(scope.a).toBe(3);

        evaluateExpression(scope, "1 ? a = 2 : a = 3");
        expect(scope.a).toBe(2);
      });

      it("should evaluate update expressions", () => {
        scope.a = 1;

        // postfix returns old value
        expect(evaluateExpression(scope, "a++")).toBe(1);
        expect(scope.a).toBe(2);

        // prefix returns new value
        expect(evaluateExpression(scope, "++a")).toBe(3);
        expect(scope.a).toBe(3);

        // decrement forms
        expect(evaluateExpression(scope, "a--")).toBe(3);
        expect(scope.a).toBe(2);

        expect(evaluateExpression(scope, "--a")).toBe(1);
        expect(scope.a).toBe(1);
      });

      it("should evaluate update expressions on member access", () => {
        scope.obj = { n: 5 };

        expect(evaluateExpression(scope, "obj.n++")).toBe(5);
        expect(scope.obj.n).toBe(6);

        expect(evaluateExpression(scope, "++obj.n")).toBe(7);
        expect(scope.obj.n).toBe(7);

        scope.key = "n";
        expect(evaluateExpression(scope, "obj[key]--")).toBe(7);
        expect(scope.obj.n).toBe(6);

        expect(evaluateExpression(scope, "--obj[key]")).toBe(5);
        expect(scope.obj.n).toBe(5);
      });

      it("should evaluate function call without arguments", () => {
        scope.const = function (a, b) {
          return 123;
        };
        expect(evaluateExpression(scope, "const()")).toEqual(123);
      });

      it("should evaluate function call with arguments", () => {
        scope.add = function (a, b) {
          return a + b;
        };
        expect(evaluateExpression(scope, "add(1,2)")).toEqual(3);
      });

      it("should allow filter chains as arguments", () => {
        scope.concat = function (a, b) {
          return a + b;
        };
        scope.begin = 1;
        scope.limit = 2;
        expect(
          evaluateExpression(
            scope,
            "concat('abcd'|limitTo:limit:begin,'abcd'|limitTo:2:1)",
          ),
        ).toEqual("bcbc");
      });

      it("should evaluate function call from a return value", () => {
        scope.getter = function () {
          return function () {
            return 33;
          };
        };
        expect(evaluateExpression(scope, "getter()()")).toBe(33);
      });

      it("should evaluate multiplication and division", () => {
        scope.taxRate = 8;
        scope.subTotal = 100;
        expect(evaluateExpression(scope, "taxRate / 100 * subTotal")).toEqual(
          8,
        );
        expect(evaluateExpression(scope, "subTotal * taxRate / 100")).toEqual(
          8,
        );
      });

      it("should evaluate array", () => {
        expect(evaluateExpression(scope, "[]").length).toEqual(0);
        expect(evaluateExpression(scope, "[1, 2]").length).toEqual(2);
        expect(evaluateExpression(scope, "[1, 2]")[0]).toEqual(1);
        expect(evaluateExpression(scope, "[1, 2]")[1]).toEqual(2);
        expect(evaluateExpression(scope, "[1, 2,]")[1]).toEqual(2);
        expect(evaluateExpression(scope, "[1, 2,]").length).toEqual(2);
      });

      it("should evaluate array access", () => {
        expect(evaluateExpression(scope, "[1][0]")).toEqual(1);
        expect(evaluateExpression(scope, "[[1]][0][0]")).toEqual(1);
        expect(evaluateExpression(scope, "[].length")).toEqual(0);
        expect(evaluateExpression(scope, "[1, 2].length")).toEqual(2);
      });

      it("should evaluate object", () => {
        expect(evaluateExpression(scope, "{}")).toEqual({});
        expect(evaluateExpression(scope, "{a:'b'}")).toEqual({ a: "b" });
        expect(evaluateExpression(scope, "{'a':'b'}")).toEqual({ a: "b" });
        expect(evaluateExpression(scope, "{\"a\":'b'}")).toEqual({ a: "b" });
        expect(evaluateExpression(scope, "{a:'b',}")).toEqual({ a: "b" });
        expect(evaluateExpression(scope, "{'a':'b',}")).toEqual({ a: "b" });
        expect(evaluateExpression(scope, "{\"a\":'b',}")).toEqual({ a: "b" });
        expect(evaluateExpression(scope, "{'0':1}")).toEqual({ 0: 1 });
        expect(evaluateExpression(scope, "{0:1}")).toEqual({ 0: 1 });
        expect(evaluateExpression(scope, "{1:1}")).toEqual({ 1: 1 });
        expect(evaluateExpression(scope, "{null:1}")).toEqual({ null: 1 });
        expect(evaluateExpression(scope, "{'null':1}")).toEqual({ null: 1 });
        expect(evaluateExpression(scope, "{false:1}")).toEqual({ false: 1 });
        expect(evaluateExpression(scope, "{'false':1}")).toEqual({ false: 1 });
        expect(evaluateExpression(scope, "{'':1,}")).toEqual({ "": 1 });

        // ES6 object initializers.
        expect(
          evaluateExpression(scope, "{x, y}", { x: "foo", y: "bar" }),
        ).toEqual({
          x: "foo",
          y: "bar",
        });
        expect(evaluateExpression(scope, "{[x]: x}", { x: "foo" })).toEqual({
          foo: "foo",
        });
        expect(
          evaluateExpression(scope, '{[x + "z"]: x}', { x: "foo" }),
        ).toEqual({
          fooz: "foo",
        });
        expect(
          evaluateExpression(
            scope,
            "{x, 1: x, [x = x + 1]: x, 3: x + 1, [x = x + 2]: x, 5: x + 1}",
            { x: 1 },
          ),
        ).toEqual({ x: 1, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 });
      });

      it("should throw syntax error exception for non constant/identifier JSON keys", () => {
        expect(() => {
          evaluateExpression(scope, "{[:0}");
        }).toThrowError(/syntax/);
        expect(() => {
          evaluateExpression(scope, "{{:0}");
        }).toThrowError(/syntax/);
        expect(() => {
          evaluateExpression(scope, "{?:0}");
        }).toThrowError(/syntax/);
        expect(() => {
          evaluateExpression(scope, "{):0}");
        }).toThrowError(/syntax/);
      });

      it("should evaluate object access", () => {
        expect(
          evaluateExpression(scope, "{false:'WC', true:'CC'}[false]"),
        ).toEqual("WC");
      });

      it("should evaluate JSON", () => {
        expect(evaluateExpression(scope, "[{}]")).toEqual([{}]);
        expect(evaluateExpression(scope, "[{a:[]}, {b:1}]")).toEqual([
          { a: [] },
          { b: 1 },
        ]);
      });

      it("should evaluate multiple statements", () => {
        expect(evaluateExpression(scope, "a=1;b=3;a+b")).toEqual(4);
        expect(evaluateExpression(scope, ";;1;;")).toEqual(1);
      });

      it("should evaluate object methods in correct context (this)", () => {
        function C() {
          this.a = 123;
        }
        C.prototype.getA = function () {
          return this.a;
        };

        scope.obj = new C();
        expect(evaluateExpression(scope, "obj.getA()")).toEqual(123);
        expect(evaluateExpression(scope, "obj['getA']()")).toEqual(123);
      });

      it("should evaluate methods in correct context (this) in argument", () => {
        function C() {
          this.a = 123;
        }
        C.prototype.sum = function (value) {
          return this.a + value;
        };
        C.prototype.getA = function () {
          return this.a;
        };

        scope.obj = new C();
        expect(evaluateExpression(scope, "obj.sum(obj.getA())")).toEqual(246);
        expect(evaluateExpression(scope, "obj['sum'](obj.getA())")).toEqual(
          246,
        );
      });

      it("should evaluate objects on scope context", () => {
        scope.a = "abc";
        expect(evaluateExpression(scope, "{a:a}").a).toEqual("abc");
      });

      it("should evaluate field access on function call result", () => {
        scope.a = function () {
          return { name: "misko" };
        };
        expect(evaluateExpression(scope, "a().name")).toEqual("misko");
      });

      it("should evaluate field access after array access", () => {
        scope.items = [{}, { name: "misko" }];
        expect(evaluateExpression(scope, "items[1].name")).toEqual("misko");
      });

      it("should evaluate array assignment", () => {
        scope.items = [];

        expect(evaluateExpression(scope, 'items[1] = "abc"')).toEqual("abc");
        expect(evaluateExpression(scope, "items[1]")).toEqual("abc");
      });

      it("should evaluate grouped filters", () => {
        scope.name = "MISKO";
        expect(
          evaluateExpression(scope, "n = (name|limitTo:2|limitTo:1)"),
        ).toEqual("M");
        expect(evaluateExpression(scope, "n")).toEqual("M");
      });

      it("should evaluate remainder", () => {
        expect(evaluateExpression(scope, "1%2")).toEqual(1);
      });

      it("should evaluate sum with undefined", () => {
        expect(evaluateExpression(scope, "1+undefined")).toEqual(1);
        expect(evaluateExpression(scope, "undefined+1")).toEqual(1);
      });

      it("should throw exception on non-closed bracket", () => {
        expect(() => {
          evaluateExpression(scope, "[].count(");
        }).toThrowError(/ueoe/);
      });

      it("should evaluate double negation", () => {
        expect(evaluateExpression(scope, "true")).toBeTruthy();
        expect(evaluateExpression(scope, "!true")).toBeFalsy();
        expect(evaluateExpression(scope, "!!true")).toBeTruthy();
        expect(
          evaluateExpression(scope, '{true:"a", false:"b"}[!!true]'),
        ).toEqual("a");
      });

      it("should evaluate negation", () => {
        expect(evaluateExpression(scope, "!false || true")).toEqual(true);
        expect(evaluateExpression(scope, "!11 == 10")).toEqual(!11 == 10);
        expect(evaluateExpression(scope, "12/6/2")).toEqual(12 / 6 / 2);
      });

      it("should evaluate exclamation mark", () => {
        expect(evaluateExpression(scope, 'suffix = "!"')).toEqual("!");
      });

      it("should evaluate minus", () => {
        expect(evaluateExpression(scope, "{a:'-'}")).toEqual({ a: "-" });
      });

      it("should evaluate undefined", () => {
        expect(evaluateExpression(scope, "undefined")).not.toBeDefined();
        expect(evaluateExpression(scope, "a=undefined")).not.toBeDefined();
        expect(scope.a).not.toBeDefined();
      });

      it("should allow assignment after array dereference", () => {
        scope.obj = [{}];
        evaluateExpression(scope, "obj[0].name=1");
        expect(scope.obj.name).toBeUndefined();
        expect(scope.obj[0].name).toEqual(1);
      });

      it("should short-circuit AND operator", () => {
        scope.run = function () {
          throw new Error("IT SHOULD NOT HAVE RUN");
        };
        expect(evaluateExpression(scope, "false && run()")).toBe(false);
        expect(evaluateExpression(scope, "false && true && run()")).toBe(false);
      });

      it("should short-circuit OR operator", () => {
        scope.run = function () {
          throw new Error("IT SHOULD NOT HAVE RUN");
        };
        expect(evaluateExpression(scope, "true || run()")).toBe(true);
        expect(evaluateExpression(scope, "true || false || run()")).toBe(true);
      });

      it("should short-circuit nullish coalescing operator", () => {
        scope.run = function () {
          throw new Error("IT SHOULD NOT HAVE RUN");
        };
        scope.value = 0;
        scope.missing = null;
        scope.fallback = function () {
          return "fallback";
        };

        expect(evaluateExpression(scope, "value ?? run()")).toBe(0);
        expect(evaluateExpression(scope, "missing ?? fallback()")).toBe(
          "fallback",
        );
      });

      it("should throw TypeError on using a 'broken' object as a key to access a property", () => {
        scope.object = {};
        [
          { toString: 2 },
          { toString: null },
          {
            toString() {
              return {};
            },
          },
        ].forEach((brokenObject) => {
          scope.brokenObject = brokenObject;
          expect(() => {
            evaluateExpression(scope, "object[brokenObject]");
          }).toThrow();
        });
      });

      it("should support method calls on primitive types", () => {
        scope.empty = "";
        scope.zero = 0;
        scope.bool = false;

        expect(evaluateExpression(scope, "empty.substring(0)")).toBe("");
        expect(evaluateExpression(scope, "zero.toString()")).toBe("0");
        expect(evaluateExpression(scope, "bool.toString()")).toBe("false");
      });

      it("should evaluate expressions with line terminators", () => {
        scope.a = "a";
        scope.b = { c: "bc" };
        expect(
          evaluateExpression(
            scope,
            'a + \n b.c + \r "\td" + \t \r\n\r "\r\n\n"',
          ),
        ).toEqual("abc\td\r\n\n");
      });

      // https://github.com/angular/angular.js/issues/10968
      it("should evaluate arrays literals initializers left-to-right", () => {
        const s = {
          c() {
            return { b: 1 };
          },
        };

        expect($parse("e=1;[a=c(),d=a.b+1]")(s)).toEqual([{ b: 1 }, 2]);
      });

      it("should evaluate function arguments left-to-right", () => {
        const s = {
          c() {
            return { b: 1 };
          },
          i(x, y) {
            return [x, y];
          },
        };

        expect($parse("e=1;i(a=c(),d=a.b+1)")(s)).toEqual([{ b: 1 }, 2]);
      });

      it("should evaluate object properties expressions left-to-right", () => {
        const s = {
          c() {
            return { b: 1 };
          },
        };

        expect($parse("e=1;{x: a=c(), y: d=a.b+1}")(s)).toEqual({
          x: { b: 1 },
          y: 2,
        });
      });

      it("should call the function from the received instance and not from a new one", () => {
        let n = 0;

        scope.fn = function () {
          const c = n++;

          return {
            c,
            anotherFn() {
              return this.c === c;
            },
          };
        };
        expect(evaluateExpression(scope, "fn().anotherFn()")).toBe(true);
      });

      it("should call the function once when it is part of the context", () => {
        let count = 0;

        scope.fn = function () {
          count++;

          return {
            anotherFn() {
              return "lucas";
            },
          };
        };
        expect(evaluateExpression(scope, "fn().anotherFn()")).toBe("lucas");
        expect(count).toBe(1);
      });

      it("should call the function once when it is not part of the context", () => {
        let count = 0;

        scope.fn = function () {
          count++;

          return function () {
            return "lucas";
          };
        };
        expect(evaluateExpression(scope, "fn()()")).toBe("lucas");
        expect(count).toBe(1);
      });

      it("should call the function once when it is part of the context on assignments", () => {
        let count = 0;

        const element = {};

        scope.fn = function () {
          count++;

          return element;
        };
        expect(evaluateExpression(scope, 'fn().name = "lucas"')).toBe("lucas");
        expect(element.name).toBe("lucas");
        expect(count).toBe(1);
      });

      it("should call the function once when it is part of the context on array lookups", () => {
        let count = 0;

        const element = [];

        scope.fn = function () {
          count++;

          return element;
        };
        expect(evaluateExpression(scope, 'fn()[0] = "lucas"')).toBe("lucas");
        expect(element[0]).toBe("lucas");
        expect(count).toBe(1);
      });

      it("should call the function once when it is part of the context on array lookup function", () => {
        let count = 0;

        const element = [
          {
            anotherFn() {
              return "lucas";
            },
          },
        ];

        scope.fn = function () {
          count++;

          return element;
        };
        expect(evaluateExpression(scope, "fn()[0].anotherFn()")).toBe("lucas");
        expect(count).toBe(1);
      });

      it("should call the function once when it is part of the context on property lookup function", () => {
        let count = 0;

        const element = {
          name: {
            anotherFn() {
              return "lucas";
            },
          },
        };

        scope.fn = function () {
          count++;

          return element;
        };
        expect(evaluateExpression(scope, "fn().name.anotherFn()")).toBe(
          "lucas",
        );
        expect(count).toBe(1);
      });

      it("should call the function once when it is part of a sub-expression", () => {
        let count = 0;

        scope.element = [{}];
        scope.fn = function () {
          count++;

          return 0;
        };
        expect(evaluateExpression(scope, 'element[fn()].name = "lucas"')).toBe(
          "lucas",
        );
        expect(scope.element.$target[0].name).toBe("lucas");
        expect(count).toBe(1);
      });
    });
  });

  describe("assignable", () => {
    beforeEach(() => {
      createInjector([
        "ng",
        function ($filterProvider) {
          filterProvider = $filterProvider;
        },
      ]);
    });

    it("should expose assignment function", () => {
      const fn = $parse("a");

      expect(fn._assign).toBeTruthy();
      const scope = {};

      fn._assign(scope, 123);
      expect(scope).toEqual({ a: 123 });
    });

    it("should return the assigned value", () => {
      const fn = $parse("a");

      const scope = {};

      expect(fn._assign(scope, 123)).toBe(123);
      const someObject = {};

      expect(fn._assign(scope, someObject)).toBe(someObject);
    });

    it("should expose working assignment function for expressions ending with brackets", () => {
      const fn = $parse('a.b["c"]');

      expect(fn._assign).toBeTruthy();
      const scope = {};

      fn._assign(scope, 123);
      expect(scope.a.b.c).toEqual(123);
    });

    it("should expose working assignment function for expressions with brackets in the middle", () => {
      const fn = $parse('a["b"].c');

      expect(fn._assign).toBeTruthy();
      const scope = {};

      fn._assign(scope, 123);
      expect(scope.a.b.c).toEqual(123);
    });

    it("should expose working assignment function for computed member expressions", () => {
      const fn = $parse("models[field.model]");

      expect(fn._assign).toBeTruthy();
      const scope = { models: {}, field: { model: "email" } };

      fn._assign(scope, "demo@example.com");
      expect(scope.models.email).toEqual("demo@example.com");
    });

    it("should expose working assignment function for nested computed member expressions", () => {
      const fn = $parse("models[field.group][field.model]");

      expect(fn._assign).toBeTruthy();
      const scope = {
        models: { contact: {} },
        field: { group: "contact", model: "email" },
      };

      fn._assign(scope, "demo@example.com");
      expect(scope.models.contact.email).toEqual("demo@example.com");
    });

    it("should create objects when finding a null", () => {
      const fn = $parse("foo.bar");

      const scope = { foo: null };

      fn._assign(scope, 123);
      expect(scope.foo.bar).toEqual(123);
    });

    it("should create objects when finding a null", () => {
      const fn = $parse('foo["bar"]');

      const scope = { foo: null };

      fn._assign(scope, 123);
      expect(scope.foo.bar).toEqual(123);
    });

    it("should create objects when finding a null", () => {
      const fn = $parse("foo.bar.baz");

      const scope = { foo: null };

      fn._assign(scope, 123);
      expect(scope.foo.bar.baz).toEqual(123);
    });
  });

  describe("watched $parse expressions", () => {
    beforeEach(() => {
      createInjector(["ng"]).invoke((_$rootScope_) => {
        scope = _$rootScope_;
      });
    });

    it("should respect short-circuiting AND if it could have side effects", async () => {
      let bCalled = 0;

      let called = false;

      scope.b = function () {
        bCalled++;

        return true;
      };

      scope.$watch("a && b()", () => {
        called = true;
      });
      await wait();
      expect(bCalled).toBe(0);
      expect(called).toBe(false);

      scope.a = true;
      await wait();
      expect(called).toBe(true);
      expect(bCalled).toBe(1);

      scope.a = false;
      scope.a = true;
      await wait();
      expect(bCalled).toBe(3);
    });

    it("should respect short-circuiting OR if it could have side effects", async () => {
      let bCalled = false;

      scope.b = function () {
        bCalled = true;

        return true;
      };

      scope.$watch("a || b()", () => {
        /* empty */
      });
      await wait();
      expect(bCalled).toBe(false);

      scope.a = true;
      await wait();
      expect(bCalled).toBe(false);

      scope.a = false;
      await wait();
      expect(bCalled).toBe(true);
    });

    it("should respect the branching ternary operator if it could have side effects", async () => {
      let bCalled = false;

      scope.b = function () {
        bCalled = true;
      };

      scope.$watch("a ? b() : 1", () => {
        /* empty */
      });
      await wait();
      expect(bCalled).toBe(false);

      scope.a = true;
      await wait();
      expect(bCalled).toBe(true);
    });
  });

  describe("filters", () => {
    beforeEach(() => {
      createInjector([
        "ng",
        function ($filterProvider) {
          filterProvider = $filterProvider;
        },
      ]).invoke((_$rootScope_, _$parse_) => {
        scope = _$rootScope_;
        $parse = _$parse_;
      });
      logs = [];
    });

    it("should be invoked when the input/arguments change", async () => {
      let filterCalled = false;

      filterProvider.register("foo", () => (input) => {
        filterCalled = true;

        return input;
      });

      scope.$watch("a | foo:b:1", () => {
        /* empty */
      });
      await wait();
      expect(filterCalled).toBe(true);

      filterCalled = false;

      scope.a = 0;
      await wait();
      expect(filterCalled).toBe(true);

      filterCalled = false;

      scope.a++;
      await wait();
      expect(filterCalled).toBe(true);
    });

    it("should not be invoked unless the input/arguments change within literals", async () => {
      const filterCalls = [];

      filterProvider.register("foo", () => (input) => {
        filterCalls.push(input);

        return input;
      });

      scope.$watch("[(a | foo:b:1), undefined]", () => {
        /* empty */
      });

      scope.a = 0;
      await wait();
      expect(filterCalls).toEqual([0, 0]);

      scope.a++;
      await wait();
      expect(filterCalls).toEqual([0, 0, 1]);
    });

    it("should be treated as constant when input are constant", async () => {
      let filterCalls = 0;

      filterProvider.register("foo", () => (input) => {
        filterCalls++;

        return input;
      });

      const parsed = $parse("{x: 1} | foo:1");

      expect(parsed._constant).toBe(true);

      let watcherCalls = 0;

      scope.$watch("{x: 1} | foo:1", (input) => {
        expect(input).toEqual({ x: 1 });
        watcherCalls++;
      });

      // await wait();
      // expect(filterCalls).toBe(1);
      // expect(watcherCalls).toBe(1);

      // await wait();
      // expect(filterCalls).toBe(1);
      // expect(watcherCalls).toBe(1);
    });

    it("should ignore changes within nested objects", async () => {
      const watchCalls = [];

      scope.$watch("[a]", (a) => {
        watchCalls.push(a[0]);
      });
      scope.a = 0;
      await wait();
      expect(watchCalls).toEqual([0, 0]);

      scope.a++;
      await wait();
      expect(watchCalls).toEqual([0, 0, 1]);

      scope.a = {};
      await wait();
      expect(watchCalls).toEqual([0, 0, 1, {}]);

      scope.a.foo = 42;
      await wait();
      expect(watchCalls).toEqual([0, 0, 1, { foo: 42 }]);
    });
  });

  describe("with non-primitive input", () => {
    beforeEach(() => {
      createInjector([
        "ng",
        function ($filterProvider) {
          filterProvider = $filterProvider;
        },
      ]).invoke((_$rootScope_, _$parse_) => {
        scope = _$rootScope_;
        $parse = _$parse_;
      });
      logs = [];
    });

    describe("that does NOT support valueOf()", () => {
      it("should always be reevaluated", async () => {
        let filterCalls = 0;

        filterProvider.register("foo", () => (input) => {
          filterCalls++;

          return input;
        });

        scope.obj = {};

        let watcherCalls = 0;

        scope.$watch("obj | foo", (input) => {
          watcherCalls++;
        });

        await wait();
        expect(filterCalls).toBe(1);
        expect(watcherCalls).toBe(1);
      });

      it("should always be reevaluated in literals", async () => {
        filterProvider.register("foo", () => (input) => input.b > 0);

        scope.$watch("[(a | foo)]", () => {
          /* empty */
        });
        evaluateExpression(scope, "a = {b: 1}");
        await wait();
        // Would be great if filter-output was checked for changes and this didn't throw...
        expect(async () => {
          evaluateExpression(scope, "a = {b: 1}");
          await wait();
        }).not.toThrow();
      });

      it("should always be reevaluated when passed literals", () => {
        scope.$watch("[a] | filter", () => {
          /* empty */
        });

        evaluateExpression(scope, "a = 1");

        // Would be great if filter-output was checked for changes and this didn't throw...
        expect(async () => {
          evaluateExpression(scope, "a = {}");
          await wait();
        }).not.toThrow();
      });
    });

    describe("that does support valueOf()", () => {
      it("should not be reevaluated", async () => {
        let filterCalls = 0;

        filterProvider.register("foo", () => (input) => {
          filterCalls++;
          expect(input instanceof Date).toBe(true);

          return input;
        });

        const date = (scope.date = new Date());

        let watcherCalls = 0;

        scope.$watch("date | foo:a", (input) => {
          watcherCalls++;
        });

        await wait();
        expect(filterCalls).toBe(2);
        expect(watcherCalls).toBe(2);
      });

      it("should not be reevaluated in literals", async () => {
        let filterCalls = 0;

        filterProvider.register("foo", () => (input) => {
          filterCalls++;

          return input;
        });

        let watcherCalls = 0;

        scope.$watch("[(date | foo)]", (input) => {
          watcherCalls++;
        });

        scope.date = new Date(1234567890123);

        await wait();

        expect(filterCalls).toBe(2);
        expect(watcherCalls).toBe(2);

        scope.date = new Date(1234567890124);

        await wait();
        expect(filterCalls).toBe(3);
        expect(watcherCalls).toBe(3);
      });

      it("should be reevaluated when valueOf() changes", async () => {
        let filterCalls = 0;

        filterProvider.register("foo", () => (input) => {
          filterCalls++;

          return input;
        });

        let watcherCalls = 0;

        scope.date = new Date();
        scope.$watch("date | foo:a", (input) => {
          watcherCalls++;
        });

        await wait();
        expect(filterCalls).toBe(2);
        expect(watcherCalls).toBe(2);

        scope.date = new Date();

        await wait();
        expect(filterCalls).toBe(3);
        expect(watcherCalls).toBe(3);
      });

      it("should be reevaluated in literals when valueOf() changes", async () => {
        let filterCalls = 0;

        filterProvider.register("foo", () => (input) => {
          filterCalls++;

          return input;
        });

        scope.date = new Date(1234567890123);

        let watcherCalls = 0;

        scope.$watch("[(date | foo)]", (input) => {
          watcherCalls++;
        });

        await wait();
        expect(filterCalls).toBe(1);
        expect(watcherCalls).toBe(1);

        scope.date = new Date(1234567890133);

        await wait();
        expect(filterCalls).toBe(2);
        expect(watcherCalls).toBe(2);
      });

      it("should not be reevaluated when the instance changes but valueOf() does not", async () => {
        let filterCalls = 0;

        filterProvider.register("foo", () => (input) => {
          filterCalls++;

          return input;
        });

        scope.date = new Date(1234567890123);

        let watcherCalls = 0;

        scope.$watch("[(date | foo)]", (input) => {
          watcherCalls++;
        });

        await wait();
        expect(watcherCalls).toBe(1);
        expect(filterCalls).toBe(1);

        scope.date = new Date(1234567890123);
        await wait();
        expect(watcherCalls).toBe(2);
        expect(filterCalls).toBe(2);
      });
    });

    it("should not be reevaluated when input is simplified via unary operators", async () => {
      let filterCalls = 0;

      filterProvider.register("foo", () => (input) => {
        filterCalls++;

        return input;
      });

      scope.obj = {};

      let watcherCalls = 0;

      scope.$watch("!obj | foo:!obj", (input) => {
        watcherCalls++;
      });

      await wait();
      expect(filterCalls).toBe(2);
      expect(watcherCalls).toBe(2);

      await wait();
      expect(filterCalls).toBe(2);
      expect(watcherCalls).toBe(2);
    });

    it("should not be reevaluated when input is simplified via non-plus/concat binary operators", async () => {
      let filterCalls = 0;

      filterProvider.register("foo", () => (input) => {
        filterCalls++;

        return input;
      });

      scope.obj = {};

      let watcherCalls = 0;

      scope.$watch("1 - obj | foo:(1 * obj)", (input) => {
        watcherCalls++;
      });

      await wait();
      expect(filterCalls).toBe(2);
      expect(watcherCalls).toBe(2);

      await wait();
      expect(filterCalls).toBe(2);
      expect(watcherCalls).toBe(2);
    });

    it("should be reevaluated when input is simplified via plus/concat", async () => {
      let filterCalls = 0;

      filterProvider.register("foo", () => (input) => {
        filterCalls++;

        return input;
      });

      scope.obj = {};

      let watcherCalls = 0;

      scope.$watch("1 + obj | foo", (input) => {
        watcherCalls++;
      });

      await wait();
      expect(filterCalls).toBe(1);
      expect(watcherCalls).toBe(1);

      await wait();
      expect(filterCalls).toBe(1);
      expect(watcherCalls).toBe(1);
    });
  });

  describe("with primitive input", () => {
    beforeEach(() => {
      createInjector([
        "ng",
        function ($filterProvider) {
          filterProvider = $filterProvider;
        },
      ]).invoke((_$rootScope_, _$parse_) => {
        scope = _$rootScope_;
        $parse = _$parse_;
      });
      logs = [];
    });

    it("should not be reevaluated when passed literals", async () => {
      let filterCalls = 0;

      filterProvider.register("foo", () => (input) => {
        filterCalls++;

        return input;
      });

      let watcherCalls = 0;

      scope.$watch("[a] | foo", (input) => {
        watcherCalls++;
      });

      evaluateExpression(scope, "a = 1");
      await wait();
      expect(filterCalls).toBe(2);
      expect(watcherCalls).toBe(2);

      evaluateExpression(scope, "a = 2");
      await wait();
      expect(filterCalls).toBe(3);
      expect(watcherCalls).toBe(3);
    });

    it("should not be reevaluated in literals", async () => {
      let filterCalls = 0;

      filterProvider.register("foo", () => (input) => {
        filterCalls++;

        return input;
      });

      scope.prim = 1234567890123;

      let watcherCalls = 0;

      scope.$watch("[(prim | foo)]", (input) => {
        watcherCalls++;
      });

      await wait();
      expect(filterCalls).toBe(1);
      expect(watcherCalls).toBe(1);

      await wait();
      expect(filterCalls).toBe(1);
      expect(watcherCalls).toBe(1);
    });
  });

  describe("literals", () => {
    beforeEach(() => {
      createInjector([
        "ng",
        function ($filterProvider) {
          filterProvider = $filterProvider;
        },
      ]).invoke((_$rootScope_, _$parse_) => {
        scope = _$rootScope_;
        $parse = _$parse_;
      });
      logs = [];
    });

    it("should mark an empty expressions as literal", () => {
      $parse("");
      expect($parse("")._literal).toBe(true);
      expect($parse("   ")._literal).toBe(true);
    });

    it("should support watching", async () => {
      let lastVal = NaN;

      let callCount = 0;

      const listener = function (val) {
        callCount++;
        lastVal = val;
      };

      scope.$watch("{val: val}", listener);
      await wait();
      expect(callCount).toBe(1);

      evaluateExpression(scope, "val = 1");
      await wait();
      expect(callCount).toBe(2);
      expect(lastVal).toEqual({ val: 1 });

      evaluateExpression(scope, "val = []");
      await wait();
      expect(callCount).toBe(3);
      expect(lastVal).toEqual({ val: [] });

      evaluateExpression(scope, "val = []");
      await wait();
      expect(callCount).toBe(4);
      expect(lastVal).toEqual({ val: [] });

      evaluateExpression(scope, "val = {}");
      await wait();
      expect(callCount).toBe(5);
      expect(lastVal).toEqual({ val: {} });
    });

    it("should only watch the direct inputs", async () => {
      let lastVal = NaN;

      let callCount = 0;

      const listener = function (val) {
        callCount++;
        lastVal = val;
      };

      scope.$watch("{val: val}", listener);
      evaluateExpression(scope, "val = 1");
      await wait();
      expect(callCount).toBe(2);
      expect(lastVal).toEqual({ val: 1 });

      evaluateExpression(scope, "val = [2]");
      await wait();
      expect(callCount).toBe(3);
      expect(lastVal).toEqual({ val: [2] });

      evaluateExpression(scope, "val.push(3)");
      await wait();
      expect(callCount).toBe(3);

      evaluateExpression(scope, "val.length = 0");
      await wait();
      expect(callCount).toBe(3);
    });

    it("should only watch the direct inputs when nested", async () => {
      let callCount = 0;

      const listener = function (val) {
        callCount++;
      };

      scope.$watch("[{val: [val]}]", listener);
      evaluateExpression(scope, "val = 1");
      await wait();
      expect(callCount).toBe(2);

      evaluateExpression(scope, "val = [2]");
      await wait();
      expect(callCount).toBe(3);

      evaluateExpression(scope, "val.push(3)");
      await wait();
      expect(callCount).toBe(3);

      evaluateExpression(scope, "val.length = 0");
      await wait();
      expect(callCount).toBe(3);
    });
  });

  describe("with non-primative input", () => {
    beforeEach(() => {
      createInjector([
        "ng",
        function ($filterProvider) {
          filterProvider = $filterProvider;
        },
      ]).invoke((_$rootScope_, _$parse_) => {
        scope = _$rootScope_;
        $parse = _$parse_;
      });
      logs = [];
    });

    describe("that does NOT support valueOf()", () => {
      it("should not be reevaluated", async () => {
        const obj = (scope.obj = {});

        let watcherCalls = 0;

        scope.$watch("[obj]", (input) => {
          watcherCalls++;
        });

        await wait();
        expect(watcherCalls).toBe(1);

        await wait();
        expect(watcherCalls).toBe(1);
      });
    });

    describe("that does support valueOf()", () => {
      it("should not be reevaluated", async () => {
        const date = (scope.date = new Date());

        let watcherCalls = 0;

        scope.$watch("[date]", () => {
          watcherCalls++;
        });

        await wait();
        expect(watcherCalls).toBe(1);

        await wait();
        expect(watcherCalls).toBe(1);
      });

      it("should be reevaluated even when valueOf() changes", async () => {
        scope.date = new Date();
        let watcherCalls = 0;

        scope.$watch("[date]", () => {
          watcherCalls++;
        });

        await wait();
        expect(watcherCalls).toBe(1);

        scope.date = new Date();

        await wait();
        expect(watcherCalls).toBe(2);
      });

      it("should be reevaluated when the instance changes but valueOf() does not", async () => {
        scope.date = new Date(1234567890123);
        let watcherCalls = 0;

        scope.$watch("[date]", (input) => {
          watcherCalls++;
        });

        await wait();
        expect(watcherCalls).toBe(1);

        scope.date = new Date(1234567890123);
        await wait();
        expect(watcherCalls).toBe(2);
      });
    });

    it("should watch ES6 object computed property changes", async () => {
      let count = 0;

      let lastValue;

      scope.$watch("{[a]: true}", (val) => {
        count++;
        lastValue = val;
      });

      await wait();
      expect(count).toBe(1);
      expect(lastValue).toEqual({ undefined: true });

      await wait();
      expect(count).toBe(1);
      expect(lastValue).toEqual({ undefined: true });

      scope.a = true;
      await wait();
      expect(count).toBe(2);
      expect(lastValue).toEqual({ true: true });

      scope.a = "abc";
      await wait();
      expect(count).toBe(3);
      expect(lastValue).toEqual({ abc: true });

      scope.a = undefined;
      await wait();
      expect(count).toBe(4);
      expect(lastValue).toEqual({ undefined: true });
    });

    it("should not shallow-watch ES6 object computed properties in case of stateful toString", async () => {
      let count = 0;

      let lastValue;

      scope.$watch("{[a]: true}", (val) => {
        count++;
        lastValue = val;
      });

      scope.a = {
        toString() {
          return this.b;
        },
      };
      scope.a.b = 1;
      await wait();

      expect(lastValue).toEqual({ 1: true });
      evaluateExpression(scope, "a.b = 2");
      await wait();
      expect(lastValue).toEqual({ 2: true });
    });

    describe("locals", () => {
      it("should expose local variables", () => {
        expect($parse("a")({ a: 0 }, { a: 1 })).toEqual(1);
        expect(
          $parse("add(a,b)")(
            {
              b: 1,
              add(a, b) {
                return a + b;
              },
            },
            { a: 2 },
          ),
        ).toEqual(3);
      });

      it("should expose traverse locals", () => {
        expect($parse("a.b")({ a: { b: 0 } }, { a: { b: 1 } })).toEqual(1);
        expect($parse("a.b")({ a: null }, { a: { b: 1 } })).toEqual(1);
        expect($parse("a.b")({ a: { b: 0 } }, { a: null })).toEqual(undefined);
        expect($parse("a.b.c")({ a: null }, { a: { b: { c: 1 } } })).toEqual(1);
      });

      it("should not use locals to resolve object properties", () => {
        expect($parse("a[0].b")({ a: [{ b: "scope" }] }, { b: "locals" })).toBe(
          "scope",
        );
        expect(
          $parse('a[0]["b"]')({ a: [{ b: "scope" }] }, { b: "locals" }),
        ).toBe("scope");
        expect(
          $parse("a[0][0].b")({ a: [[{ b: "scope" }]] }, { b: "locals" }),
        ).toBe("scope");
        expect(
          $parse("a[0].b.c")(
            { a: [{ b: { c: "scope" } }] },
            { b: { c: "locals" } },
          ),
        ).toBe("scope");
      });

      it("should assign directly to locals when the local property exists", () => {
        const s = {};

        const l = {};

        $parse("a = 1")(s, l);
        expect(s.a).toBe(1);
        expect(l.a).toBeUndefined();

        l.a = 2;
        $parse("a = 0")(s, l);
        expect(s.a).toBe(1);
        expect(l.a).toBe(0);

        $parse("toString = 1")(s, l);
        expect(isFunction(s.toString)).toBe(true);
        expect(l.toString).toBe(1);
      });

      it("should overwrite undefined / null scope properties when assigning", () => {
        let scope;

        scope = {};
        $parse("a.b = 1")(scope);
        $parse('c["d"] = 2')(scope);
        expect(scope).toEqual({ a: { b: 1 }, c: { d: 2 } });

        scope = { a: {} };
        $parse("a.b.c = 1")(scope);
        $parse('a.c["d"] = 2')(scope);
        expect(scope).toEqual({ a: { b: { c: 1 }, c: { d: 2 } } });

        scope = { a: undefined, c: undefined };
        $parse("a.b = 1")(scope);
        $parse('c["d"] = 2')(scope);
        expect(scope).toEqual({ a: { b: 1 }, c: { d: 2 } });

        scope = { a: { b: undefined, c: undefined } };
        $parse("a.b.c = 1")(scope);
        $parse('a.c["d"] = 2')(scope);
        expect(scope).toEqual({ a: { b: { c: 1 }, c: { d: 2 } } });

        scope = { a: null, c: null };
        $parse("a.b = 1")(scope);
        $parse('c["d"] = 2')(scope);
        expect(scope).toEqual({ a: { b: 1 }, c: { d: 2 } });

        scope = { a: { b: null, c: null } };
        $parse("a.b.c = 1")(scope);
        $parse('a.c["d"] = 2')(scope);
        expect(scope).toEqual({ a: { b: { c: 1 }, c: { d: 2 } } });
      });

      [0, false, "", NaN].forEach((falsyValue) => {
        it("should not overwrite $prop scope properties when assigning", () => {
          let scope;

          scope = { a: falsyValue, c: falsyValue };
          tryParseAndIgnoreException("a.b = 1");
          tryParseAndIgnoreException('c["d"] = 2');
          expect(scope).toEqual({ a: falsyValue, c: falsyValue });

          scope = { a: { b: falsyValue, c: falsyValue } };
          tryParseAndIgnoreException("a.b.c = 1");
          tryParseAndIgnoreException('a.c["d"] = 2');
          expect(scope).toEqual({ a: { b: falsyValue, c: falsyValue } });

          // Helpers
          //
          // Normally assigning property on a primitive should throw exception in strict mode
          // and silently fail in non-strict mode, IE seems to always have the non-strict-mode behavior,
          // so if we try to use 'expect(() => {$parse('a.b=1')({a:false});).toThrow()' for testing
          // the test will fail in case of IE because it will not throw exception, and if we just use
          // '$parse('a.b=1')({a:false})' the test will fail because it will throw exception in case of Chrome
          // so we use tryParseAndIgnoreException helper to catch the exception silently for all cases.
          //
          function tryParseAndIgnoreException(expression) {
            try {
              $parse(expression)(scope);
            } catch (error) {
              /* ignore exception */
            }
          }
        });
      });
    });

    describe("literal", () => {
      it("should mark scalar value expressions as literal", () => {
        expect($parse("0")._literal).toBe(true);
        expect($parse('"hello"')._literal).toBe(true);
        expect($parse("true")._literal).toBe(true);
        expect($parse("false")._literal).toBe(true);
        expect($parse("null")._literal).toBe(true);
        expect($parse("undefined")._literal).toBe(true);
      });

      it("should mark array expressions as literal", () => {
        expect($parse("[]")._literal).toBe(true);
        expect($parse("[1, 2, 3]")._literal).toBe(true);
        expect($parse("[1, identifier]")._literal).toBe(true);
      });

      it("should mark object expressions as literal", () => {
        expect($parse("{}")._literal).toBe(true);
        expect($parse("{x: 1}")._literal).toBe(true);
        expect($parse("{foo: bar}")._literal).toBe(true);
      });

      it("should not mark function calls or operator expressions as literal", () => {
        expect($parse("1 + 1")._literal).toBe(false);
        expect($parse("call()")._literal).toBe(false);
        expect($parse("[].length")._literal).toBe(false);
      });
    });

    describe("_constant", () => {
      it("should mark an empty expressions as constant", () => {
        expect($parse("")._constant).toBe(true);
        expect($parse("   ")._constant).toBe(true);
      });

      it("should mark scalar value expressions as constant", () => {
        expect($parse("12.3")._constant).toBe(true);
        expect($parse('"string"')._constant).toBe(true);
        expect($parse("true")._constant).toBe(true);
        expect($parse("false")._constant).toBe(true);
        expect($parse("null")._constant).toBe(true);
        expect($parse("undefined")._constant).toBe(true);
      });

      it("should mark arrays as constant if they only contain constant elements", () => {
        expect($parse("[]")._constant).toBe(true);
        expect($parse("[1, 2, 3]")._constant).toBe(true);
        expect($parse('["string", null]')._constant).toBe(true);
        expect($parse("[[]]")._constant).toBe(true);
        expect($parse("[1, [2, 3], {4: 5}]")._constant).toBe(true);
      });

      it("should not mark arrays as constant if they contain any non-constant elements", () => {
        expect($parse("[foo]")._constant).toBe(false);
        expect($parse("[x + 1]")._constant).toBe(false);
        expect($parse("[bar[0]]")._constant).toBe(false);
      });

      it("should mark complex expressions involving constant values as constant", () => {
        expect($parse("!true")._constant).toBe(true);
        expect($parse("-42")._constant).toBe(true);
        expect($parse("1 - 1")._constant).toBe(true);
        expect($parse('"foo" + "bar"')._constant).toBe(true);
        expect($parse("5 != null")._constant).toBe(true);
        expect($parse("{standard: 4/3, wide: 16/9}")._constant).toBe(true);
        expect($parse("{[standard]: 4/3, wide: 16/9}")._constant).toBe(false);
        expect($parse('{["key"]: 1}')._constant).toBe(true);
        expect($parse("[0].length")._constant).toBe(true);
        expect($parse("[0][0]")._constant).toBe(true);
        expect($parse("{x: 1}.x")._constant).toBe(true);
        expect($parse('{x: 1}["x"]')._constant).toBe(true);
      });

      it("should not mark any expression involving variables or function calls as constant", () => {
        expect($parse("true.toString()")._constant).toBe(false);
        expect($parse("foo(1, 2, 3)")._constant).toBe(false);
        expect($parse('"name" + id')._constant).toBe(false);
      });
    });

    describe("null/undefined in expressions", () => {
      // simpleGetterFn1
      it("should return null for `a` where `a` is null", () => {
        $rootScope.a = null;
        expect(evaluateExpression($rootScope, "a")).toBe(null);
      });

      it("should return undefined for `a` where `a` is undefined", () => {
        expect(evaluateExpression($rootScope, "a")).toBeUndefined();
      });

      // simpleGetterFn2
      it("should return undefined for properties of `null` constant", () => {
        expect(evaluateExpression($rootScope, "null.a")).toBeUndefined();
      });

      it("should return undefined for properties of `null` values", () => {
        $rootScope.a = null;
        expect(evaluateExpression($rootScope, "a.b")).toBeUndefined();
      });

      it("should return null for `a.b` where `b` is null", () => {
        $rootScope.a = { b: null };
        expect(evaluateExpression($rootScope, "a.b")).toBe(null);
      });

      // cspSafeGetter && pathKeys.length < 6 || pathKeys.length > 2
      it("should return null for `a.b.c.d.e` where `e` is null", () => {
        $rootScope.a = { b: { c: { d: { e: null } } } };
        expect(evaluateExpression($rootScope, "a.b.c.d.e")).toBe(null);
      });

      it("should return undefined for `a.b.c.d.e` where `d` is null", () => {
        $rootScope.a = { b: { c: { d: null } } };
        expect(evaluateExpression($rootScope, "a.b.c.d.e")).toBeUndefined();
      });

      // cspSafeGetter || pathKeys.length > 6
      it("should return null for `a.b.c.d.e.f.g` where `g` is null", () => {
        $rootScope.a = { b: { c: { d: { e: { f: { g: null } } } } } };
        expect(evaluateExpression($rootScope, "a.b.c.d.e.f.g")).toBe(null);
      });

      it("should return undefined for `a.b.c.d.e.f.g` where `f` is null", () => {
        $rootScope.a = { b: { c: { d: { e: { f: null } } } } };
        expect(evaluateExpression($rootScope, "a.b.c.d.e.f.g")).toBeUndefined();
      });

      it("should return undefined if the return value of a function invocation is undefined", () => {
        $rootScope.fn = function () {};
        expect(evaluateExpression($rootScope, "fn()")).toBeUndefined();
      });

      it("should ignore undefined values when doing addition/concatenation", () => {
        $rootScope.fn = function () {};
        expect(evaluateExpression($rootScope, 'foo + "bar" + fn()')).toBe(
          "bar",
        );
      });

      it("should treat properties named null/undefined as normal properties", () => {
        expect(
          evaluateExpression($rootScope, "a.null.undefined.b", {
            a: { null: { undefined: { b: 1 } } },
          }),
        ).toBe(1);
      });

      it("should not allow overriding null/undefined keywords", () => {
        expect(
          evaluateExpression($rootScope, "null.a", { null: { a: 42 } }),
        ).toBeUndefined();
      });

      it("should allow accessing null/undefined properties on `this`", () => {
        $rootScope.null = { a: 42 };
        expect(evaluateExpression($rootScope, "this.null.a")).toBe(42);
      });

      it("should allow accessing $locals", () => {
        $rootScope.foo = "foo";
        $rootScope.bar = "bar";
        $rootScope.$locals = "foo";
        const locals = { foo: 42 };

        expect(evaluateExpression($rootScope, "$locals")).toBeUndefined();
        expect(evaluateExpression($rootScope, "$locals.foo")).toBeUndefined();
        expect(evaluateExpression($rootScope, "this.$locals")).toBe("foo");
        expect(() => {
          evaluateExpression($rootScope, "$locals = {}");
        }).toThrow();
        expect(() => {
          evaluateExpression($rootScope, "$locals.bar = 23");
        }).toThrow();
        expect(evaluateExpression($rootScope, "$locals", locals)).toBe(locals);
        expect(evaluateExpression($rootScope, "$locals.foo", locals)).toBe(42);
        expect(evaluateExpression($rootScope, "this.$locals", locals)).toBe(
          "foo",
        );
        expect(() => {
          evaluateExpression($rootScope, "$locals = {}", locals);
        }).toThrow();
        expect(
          evaluateExpression($rootScope, "$locals.bar = 23", locals),
        ).toEqual(23);
        expect(locals.bar).toBe(23);
      });
    });
  });
});
