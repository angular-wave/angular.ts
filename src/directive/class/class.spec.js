import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";
import { arrayDifference, split, toClassString } from "./class.js";

describe("ngClass", () => {
  let element;
  let $compile;
  let $rootScope;
  let injector;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular.module("test", []);
    injector = window.angular.bootstrap(document.getElementById("app"), [
      "test",
    ]);
    $compile = injector.get("$compile");
    $rootScope = injector.get("$rootScope");
  });

  it("should add new and remove old classes dynamically", async () => {
    element = $compile('<div class="existing" ng-class="dynClass"></div>')(
      $rootScope,
    );
    $rootScope.dynClass = "A";
    await wait();
    expect(element.classList.contains("existing")).toBe(true);
    expect(element.classList.contains("A")).toBe(true);

    $rootScope.dynClass = "B";
    await wait();
    expect(element.classList.contains("existing")).toBe(true);
    expect(element.classList.contains("A")).toBe(false);
    expect(element.classList.contains("B")).toBe(true);

    delete $rootScope.dynClass;
    await wait();
    expect(element.classList.contains("existing")).toBe(true);
    expect(element.classList.contains("A")).toBe(false);
    expect(element.classList.contains("B")).toBe(false);
  });

  it("should add new and remove old classes with same names as Object.prototype properties dynamically", async () => {
    element = $compile('<div class="existing" ng-class="dynClass"></div>')(
      $rootScope,
    );
    $rootScope.dynClass = {
      watch: true,
      hasOwnProperty: true,
      isPrototypeOf: true,
    };
    await wait();
    expect(element.classList.contains("existing")).toBe(true);
    expect(element.classList.contains("watch")).toBe(true);
    expect(element.classList.contains("hasOwnProperty")).toBe(true);
    expect(element.classList.contains("isPrototypeOf")).toBe(true);

    $rootScope.dynClass.watch = false;
    await wait();
    expect(element.classList.contains("existing")).toBe(true);
    expect(element.classList.contains("watch")).toBe(false);
    expect(element.classList.contains("hasOwnProperty")).toBe(true);
    expect(element.classList.contains("isPrototypeOf")).toBe(true);

    delete $rootScope.dynClass;
    await wait();
    expect(element.classList.contains("existing")).toBe(true);
    expect(element.classList.contains("watch")).toBe(false);
    expect(element.classList.contains("hasOwnProperty")).toBe(false);
    expect(element.classList.contains("isPrototypeOf")).toBe(false);
  });

  it("should support adding multiple classes via an array", async () => {
    element = $compile(
      "<div class=\"existing\" ng-class=\"['A', 'B']\"></div>",
    )($rootScope);
    await wait();
    expect(element.classList.contains("existing")).toBeTruthy();
    expect(element.classList.contains("A")).toBeTruthy();
    expect(element.classList.contains("B")).toBeTruthy();
  });

  it(
    "should support adding multiple classes conditionally via a map of class names to boolean " +
      "expressions",
    async () => {
      element = $compile(
        '<div class="existing" ' +
          'ng-class="{A: conditionA, B: conditionB, AnotB: conditionA&&!conditionB}">' +
          "</div>",
      )($rootScope);
      $rootScope.conditionA = true;
      $rootScope.conditionB = false;
      await wait();
      expect(element.classList.contains("existing")).toBeTruthy();
      expect(element.classList.contains("A")).toBeTruthy();
      expect(element.classList.contains("B")).toBeFalsy();
      expect(element.classList.contains("AnotB")).toBeTruthy();
      $rootScope.conditionB = true;
      await wait();
      expect(element.classList.contains("existing")).toBeTruthy();
      expect(element.classList.contains("A")).toBeTruthy();
      expect(element.classList.contains("B")).toBeTruthy();
      expect(element.classList.contains("AnotB")).toBeFalsy();
    },
  );

  it("should not break when passed non-string/array/object, truthy values", async () => {
    element = $compile('<div ng-class="42"></div>')($rootScope);
    await wait();
    expect(element.classList.contains("42")).toBeTruthy();
  });

  it("should support adding multiple classes via an array mixed with conditionally via a map", async () => {
    element = $compile(
      "<div class=\"existing\" ng-class=\"['A', {'B': condition}]\"></div>",
    )($rootScope);
    await wait();
    expect(element.classList.contains("existing")).toBeTruthy();
    expect(element.classList.contains("A")).toBeTruthy();
    expect(element.classList.contains("B")).toBeFalsy();
    $rootScope.condition = true;
    await wait();
    expect(element.classList.contains("B")).toBeTruthy();
  });

  it("should remove classes when the referenced object is the same but its property is changed", async () => {
    element = $compile('<div ng-class="classes"></div>')($rootScope);
    $rootScope.classes = { A: true, B: true };
    await wait();
    expect(element.classList.contains("A")).toBeTruthy();
    expect(element.classList.contains("B")).toBeTruthy();
    $rootScope.classes.A = false;
    await wait();
    expect(element.classList.contains("A")).toBeFalsy();
    expect(element.classList.contains("B")).toBeTruthy();
  });

  it("should support adding multiple classes via a space delimited string", async () => {
    element = $compile('<div class="existing" ng-class="\'A B\'"></div>')(
      $rootScope,
    );
    await wait();
    expect(element.classList.contains("existing")).toBeTruthy();
    expect(element.classList.contains("A")).toBeTruthy();
    expect(element.classList.contains("B")).toBeTruthy();
  });

  it("should support adding multiple classes via a space delimited string inside an array", async () => {
    element = $compile(
      "<div class=\"existing\" ng-class=\"['A B', 'C']\"></div>",
    )($rootScope);
    await wait();
    expect(element.classList.contains("existing")).toBeTruthy();
    expect(element.classList.contains("A")).toBeTruthy();
    expect(element.classList.contains("B")).toBeTruthy();
    expect(element.classList.contains("C")).toBeTruthy();
  });

  it("should preserve class added post compilation with pre-existing classes", async () => {
    element = $compile('<div class="existing" ng-class="dynClass"></div>')(
      $rootScope,
    );
    $rootScope.dynClass = "A";
    await wait();
    expect(element.classList.contains("existing")).toBe(true);

    // add extra class, change model and eval
    element.classList.add("newClass");
    $rootScope.dynClass = "B";
    await wait();
    expect(element.classList.contains("existing")).toBe(true);
    expect(element.classList.contains("B")).toBe(true);
    expect(element.classList.contains("newClass")).toBe(true);
  });

  it('should preserve class added post compilation without pre-existing classes"', async () => {
    element = $compile('<div ng-class="dynClass"></div>')($rootScope);
    $rootScope.dynClass = "A";
    await wait();
    expect(element.classList.contains("A")).toBe(true);

    // add extra class, change model and eval
    element.classList.add("newClass");
    $rootScope.dynClass = "B";
    await wait();
    expect(element.classList.contains("B")).toBe(true);
    expect(element.classList.contains("newClass")).toBe(true);
  });

  it('should preserve other classes with similar name"', async () => {
    element = $compile(
      '<div class="ng-panel ng-selected" ng-class="dynCls"></div>',
    )($rootScope);
    $rootScope.dynCls = "panel";
    $rootScope.dynCls = "foo";
    await wait();
    expect(element.className).toBe("ng-panel ng-selected foo");
  });

  it("should not add duplicate classes", async () => {
    element = $compile('<div class="panel bar" ng-class="dynCls"></div>')(
      $rootScope,
    );
    $rootScope.dynCls = "panel";
    await wait();
    expect(element.className).toBe("panel bar");
  });

  it("should remove classes even if it was specified via class attribute", async () => {
    element = $compile('<div class="panel bar" ng-class="dynCls"></div>')(
      $rootScope,
    );
    $rootScope.dynCls = "panel";
    await wait();
    $rootScope.dynCls = "window";
    await wait();
    expect(element.className).toBe("bar window");
  });

  it("should remove classes even if they were added by another code", async () => {
    element = $compile('<div ng-class="dynCls"></div>')($rootScope);
    await wait();
    $rootScope.dynCls = "foo";
    await wait();
    element.classList.add("foo");
    await wait();
    $rootScope.dynCls = "";
    await wait();
    expect(element.className).toBe("");
  });

  it("should convert undefined and null values to an empty string", async () => {
    element = $compile('<div ng-class="dynCls"></div>')($rootScope);
    await wait();
    $rootScope.dynCls = [undefined, null];
    expect(element.className).toBe("");
  });

  it("should ngClass odd/even", async () => {
    element = $compile(
      '<ul><li ng-repeat="i in [0,1]" class="existing" ng-class-odd="\'odd\'" ng-class-even="\'even\'"></li><ul>',
    )($rootScope);
    await wait();
    const e1 = element.childNodes[1];
    const e2 = element.childNodes[2];
    expect(e1.classList.contains("existing")).toBeTruthy();
    expect(e1.classList.contains("odd")).toBeTruthy();
    expect(e2.classList.contains("existing")).toBeTruthy();
    expect(e2.classList.contains("even")).toBeTruthy();
  });

  it("should allow both ngClass and ngClassOdd/Even on the same element", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in [0,1]" ng-class="\'plainClass\'" ' +
        "ng-class-odd=\"'odd'\" ng-class-even=\"'even'\"></li>" +
        "<ul>",
    )($rootScope);
    await wait();
    const e1 = element.childNodes[1];
    const e2 = element.childNodes[2];

    expect(e1.classList.contains("plainClass")).toBeTruthy();
    expect(e1.classList.contains("odd")).toBeTruthy();
    expect(e1.classList.contains("even")).toBeFalsy();
    expect(e2.classList.contains("plainClass")).toBeTruthy();
    expect(e2.classList.contains("even")).toBeTruthy();
    expect(e2.classList.contains("odd")).toBeFalsy();
  });

  it("should allow ngClassOdd/Even on the same element with overlapping classes", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in [0,1,2]" ' +
        "ng-class-odd=\"'same odd'\" " +
        "ng-class-even=\"'same even'\">" +
        "</li>" +
        "<ul>",
    )($rootScope);
    await wait();
    const e1 = element.children[0];
    const e2 = element.children[1];
    const e3 = element.children[2];

    expect(e1).toHaveClass("same");
    expect(e1).toHaveClass("odd");
    expect(e1).not.toHaveClass("even");
    expect(e2).toHaveClass("same");
    expect(e2).not.toHaveClass("odd");
    expect(e2).toHaveClass("even");
    expect(e3).toHaveClass("same");
    expect(e3).toHaveClass("odd");
    expect(e3).not.toHaveClass("even");
  });

  it("should allow ngClass with overlapping classes", async () => {
    element = $compile(
      "<div ng-class=\"{'same yes': test, 'same no': !test}\"></div>",
    )($rootScope);
    await wait();
    expect(element).toHaveClass("same");
    expect(element).not.toHaveClass("yes");
    expect(element).toHaveClass("no");

    $rootScope.$apply("test = true");
    await wait();

    expect(element).toHaveClass("same");
    expect(element).toHaveClass("yes");
    expect(element).not.toHaveClass("no");
  });

  it("should allow both ngClass and ngClassOdd/Even with multiple classes", async () => {
    element = $compile(
      "<ul>" +
        "<li ng-repeat=\"i in [0,1]\" ng-class=\"['A', 'B']\" " +
        "ng-class-odd=\"['C', 'D']\" ng-class-even=\"['E', 'F']\"></li>" +
        "<ul>",
    )($rootScope);
    await wait();
    const e1 = element.childNodes[1];
    const e2 = element.childNodes[2];

    expect(e1.classList.contains("A")).toBeTruthy();
    expect(e1.classList.contains("B")).toBeTruthy();
    expect(e1.classList.contains("C")).toBeTruthy();
    expect(e1.classList.contains("D")).toBeTruthy();
    expect(e1.classList.contains("E")).toBeFalsy();
    expect(e1.classList.contains("F")).toBeFalsy();

    expect(e2.classList.contains("A")).toBeTruthy();
    expect(e2.classList.contains("B")).toBeTruthy();
    expect(e2.classList.contains("E")).toBeTruthy();
    expect(e2.classList.contains("F")).toBeTruthy();
    expect(e2.classList.contains("C")).toBeFalsy();
    expect(e2.classList.contains("D")).toBeFalsy();
  });

  it("should apply ngClass with interpolated class attributes", async () => {
    element = $compile(
      "<div>" +
        '<div class="one {{two}} three" ng-class="{five: five}"></div>' +
        '<div class="one {{two}} three {{four}}" ng-class="{five: five}"></div>' +
        "</div>",
    )($rootScope);
    await wait();
    const e1 = element.children[0];
    const e2 = element.children[1];

    $rootScope.$apply('two = "two"; five = true');
    await wait();
    expect(e1).toHaveClass("one");
    expect(e1).toHaveClass("two");
    expect(e1).toHaveClass("three");
    expect(e1).not.toHaveClass("four");
    expect(e1).toHaveClass("five");
    expect(e2).toHaveClass("one");
    expect(e2).toHaveClass("two");
    expect(e2).toHaveClass("three");
    expect(e2).not.toHaveClass("four");
    expect(e2).toHaveClass("five");
  });

  it("should not mess up class value due to observing an interpolated class attribute", async () => {
    $rootScope.foo = true;
    $rootScope.$watch("anything", () => {
      $rootScope.foo = false;
    });
    element = $compile('<div ng-class="{foo:foo}"></div>')($rootScope);
    await wait();
    expect(element.classList.contains("foo")).toBe(false);
  });

  it("should update ngClassOdd/Even when an item is added to the model", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in items" ' +
        "ng-class-odd=\"'odd'\" ng-class-even=\"'even'\">i</li>" +
        "<ul>",
    )($rootScope);
    $rootScope.items = ["b", "c", "d"];
    $rootScope.items.unshift("a");
    await wait();
    const e1 = element.childNodes[1];
    const e4 = element.childNodes[2];

    expect(e1.classList.contains("odd")).toBeTruthy();
    expect(e1.classList.contains("even")).toBeFalsy();

    expect(e4.classList.contains("even")).toBeTruthy();
    expect(e4.classList.contains("odd")).toBeFalsy();
  });

  it("should update ngClassOdd/Even when model is changed by filtering", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in items" ' +
        "ng-class-odd=\"'odd'\" ng-class-even=\"'even'\"></li>" +
        "</ul>",
    )($rootScope);
    $rootScope.items = ["a", "b", "c"];
    await wait();
    $rootScope.items = ["a", "c"];
    await wait();

    const e1 = element.childNodes[1];
    const e2 = element.childNodes[2];

    expect(e1.classList.contains("odd")).toBeTruthy();
    expect(e1.classList.contains("even")).toBeFalsy();

    expect(e2.classList.contains("even")).toBeTruthy();
    expect(e2.classList.contains("odd")).toBeFalsy();
  });

  it("should update ngClassOdd/Even when model is changed by sorting", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="i in items" ' +
        "ng-class-odd=\"'odd'\" ng-class-even=\"'even'\">i</li>" +
        "</ul>",
    )($rootScope);
    $rootScope.items = ["a", "b"];
    await wait();
    const e1 = element.children[0];
    const e2 = element.children[1];

    expect(e1.classList.contains("odd")).toBeTruthy();
    expect(e1.classList.contains("even")).toBeFalsy();

    expect(e2.classList.contains("even")).toBeTruthy();
    expect(e2.classList.contains("odd")).toBeFalsy();
  });

  it("should add/remove the correct classes when the expression and `$index` change simultaneously", async () => {
    element = $compile(
      "<div>" +
        '<div ng-class-odd="foo"></div>' +
        '<div ng-class-even="foo"></div>' +
        "</div>",
    )($rootScope);
    await wait();
    const odd = element.children[0];
    const even = element.children[1];

    $rootScope.$apply('$index = 0; foo = "class1"');
    await wait();
    expect(odd).toHaveClass("class1");
    expect(odd).not.toHaveClass("class2");
    expect(even).not.toHaveClass("class1");
    expect(even).not.toHaveClass("class2");

    $rootScope.$apply('$index = 1; foo = "class2"');
    await wait();
    expect(odd).not.toHaveClass("class1");
    expect(odd).not.toHaveClass("class2");
    expect(even).not.toHaveClass("class1");
    expect(even).toHaveClass("class2");

    $rootScope.$apply('foo = "class1"');
    await wait();
    expect(odd).not.toHaveClass("class1");
    expect(odd).not.toHaveClass("class2");
    expect(even).toHaveClass("class1");
    expect(even).not.toHaveClass("class2");

    $rootScope.$apply("$index = 2");
    await wait();
    expect(odd).toHaveClass("class1");
    expect(odd).not.toHaveClass("class2");
    expect(even).not.toHaveClass("class1");
    expect(even).not.toHaveClass("class2");
  });

  it("should support mixed array/object variable with a mutating object", async () => {
    element = $compile('<div ng-class="classVar"></div>')($rootScope);

    $rootScope.classVar = [{ orange: true }];
    await wait();
    expect(element).toHaveClass("orange");

    $rootScope.classVar.pop();
    await wait();
    expect(element).not.toHaveClass("orange");
  });

  // // https://github.com/angular/angular.js/issues/15905
  it("should support a mixed literal-array/object variable", async () => {
    element = $compile('<div ng-class="[classVar]"></div>')($rootScope);

    $rootScope.classVar = { orange: true };
    await wait();
    expect(element).toHaveClass("orange");

    $rootScope.classVar.orange = false;
    await wait();
    expect(element).not.toHaveClass("orange");
  });

  it("should track changes of mutating object inside an array", async () => {
    $rootScope.classVar = [{ orange: true }];
    element = $compile('<div ng-class="classVar"></div>')($rootScope);
    await wait();
    expect(element).toHaveClass("orange");
    $rootScope.classVar.pop();
    await wait();
    expect(element).not.toHaveClass("orange");
  });

  // https://github.com/angular/angular.js/issues/15960#issuecomment-299109412
  it("should always reevaluate filters with non-primitive inputs within literals", async () => {
    document.getElementById("app").ng = undefined;
    injector = window.angular.bootstrap(document.getElementById("app"), [
      "test",
      ($filterProvider) => {
        $filterProvider.register("foo", () => (o) => o.a || o.b);
      },
    ]);

    injector.invoke(async ($rootScope, $compile) => {
      $rootScope.testObj = {};
      element = $compile('<div ng-class="{x: (testObj | foo)}">')($rootScope);

      expect(element).not.toHaveClass("x");

      $rootScope.$apply("testObj.a = true");
      await wait();
      expect(element).toHaveClass("x");
    });
  });

  describe("large objects", () => {
    let getProp;
    let veryLargeObj;

    beforeEach(() => {
      getProp = jasmine.createSpy("getProp");
      veryLargeObj = {};
    });

    it("should be copied when using an expression", async () => {
      element = $compile('<div ng-class="fooClass"></div>')($rootScope);
      $rootScope.fooClass = { foo: veryLargeObj };
      await wait();
      expect(element).toHaveClass("foo");
    });

    it("should be copied when using a literal", async () => {
      element = $compile('<div ng-class="{foo: veryLargeObj}"></div>')(
        $rootScope,
      );
      $rootScope.veryLargeObj = veryLargeObj;
      await wait();
      expect(element).toHaveClass("foo");
    });

    it("should be copied when inside an array", async () => {
      element = $compile('<div ng-class="[{foo: veryLargeObj}]"></div>')(
        $rootScope,
      );
      $rootScope.veryLargeObj = veryLargeObj;
      await wait();
      expect(element).toHaveClass("foo");
    });
  });
});

// --------------------------------------------------- HELPER FUNCTIONS TESTS  --------------------------------------------------

describe("arrayDifference", () => {
  it("returns [] when tokens1 is undefined", () => {
    expect(arrayDifference(undefined, ["a"])).toEqual([]);
  });

  it("returns [] when tokens1 is null", () => {
    expect(arrayDifference(null, ["a"])).toEqual([]);
  });

  it("returns [] when tokens1 is empty", () => {
    expect(arrayDifference([], ["a"])).toEqual([]);
  });

  it("returns tokens1 when tokens2 is undefined", () => {
    const tokens1 = ["a", "b"];
    expect(arrayDifference(tokens1, undefined)).toBe(tokens1); // same reference
    expect(arrayDifference(tokens1, undefined)).toEqual(["a", "b"]);
  });

  it("returns tokens1 when tokens2 is null", () => {
    const tokens1 = ["a", "b"];
    expect(arrayDifference(tokens1, null)).toBe(tokens1); // same reference
    expect(arrayDifference(tokens1, null)).toEqual(["a", "b"]);
  });

  it("returns tokens1 when tokens2 is empty", () => {
    const tokens1 = ["a", "b"];
    expect(arrayDifference(tokens1, [])).toBe(tokens1); // same reference
    expect(arrayDifference(tokens1, [])).toEqual(["a", "b"]);
  });

  it("returns tokens from tokens1 that are not present in tokens2", () => {
    expect(arrayDifference(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });

  it("returns [] when all tokens1 are present in tokens2", () => {
    expect(arrayDifference(["a", "b"], ["a", "b", "c"])).toEqual([]);
  });

  it("preserves order of tokens from tokens1", () => {
    expect(arrayDifference(["c", "a", "b", "a"], ["a"])).toEqual(["c", "b"]);
  });

  it("keeps duplicates from tokens1 if they are not removed", () => {
    expect(arrayDifference(["a", "a", "b"], ["c"])).toEqual(["a", "a", "b"]);
  });

  it("removes duplicates from tokens1 when the token exists in tokens2", () => {
    expect(arrayDifference(["a", "a", "b"], ["a"])).toEqual(["b"]);
  });

  it("treats comparison as strict equality for strings", () => {
    // This is mostly a sanity check; with strings it's always strict anyway.
    expect(arrayDifference(["1", "2"], ["1"])).toEqual(["2"]);
  });

  it("does not mutate the input arrays", () => {
    const tokens1 = ["a", "b", "c"];
    const tokens2 = ["b"];
    const tokens1Copy = tokens1.slice();
    const tokens2Copy = tokens2.slice();

    arrayDifference(tokens1, tokens2);

    expect(tokens1).toEqual(tokens1Copy);
    expect(tokens2).toEqual(tokens2Copy);
  });
});

describe("split", () => {
  it("returns [] for empty string", () => {
    expect(split("")).toEqual([]);
  });

  it("returns [] for null/undefined", () => {
    expect(split(null)).toEqual([]);
    expect(split(undefined)).toEqual([]);
  });

  it("splits on a single space character", () => {
    expect(split("a b c")).toEqual(["a", "b", "c"]);
  });
  it("collapses multiple spaces into single separators", () => {
    expect(split("a  b")).toEqual(["a", "b"]);
  });

  it("trims leading and trailing whitespace", () => {
    expect(split(" a")).toEqual(["a"]);
    expect(split("a ")).toEqual(["a"]);
  });

  it("splits on any whitespace (tabs/newlines)", () => {
    expect(split("a\tb\nc")).toEqual(["a", "b", "c"]);
  });
});

describe("toClassString", () => {
  it("returns empty string for falsy values", () => {
    expect(toClassString(null)).toBe("");
    expect(toClassString(undefined)).toBe("");
    expect(toClassString(false)).toBe("");
    expect(toClassString(0)).toBe("");
    expect(toClassString("")).toBe("");
  });

  it("returns the input when passed a string", () => {
    expect(toClassString("a b")).toBe("a b");
  });

  it("stringifies non-string primitives", () => {
    expect(toClassString(123)).toBe("123");
    expect(toClassString(true)).toBe("true");
  });

  it("converts an array into a space-delimited string", () => {
    expect(toClassString(["a", "b", "c"])).toBe("a b c");
  });

  it("recursively converts nested arrays", () => {
    expect(toClassString(["a", ["b", "c"], "d"])).toBe("a b c d");
  });

  it("filters out empty results when mapping arrays", () => {
    // 0/false/null/"" become "" and are filtered out by Boolean
    expect(toClassString(["a", "", 0, false, null, "b"])).toBe("a b");
  });

  it("converts an object map into a space-delimited string of truthy keys", () => {
    expect(toClassString({ a: true, b: 1, c: "x", d: false, e: 0 })).toBe(
      "a b c",
    );
  });

  it("returns empty string for an object with no truthy keys", () => {
    expect(toClassString({ a: false, b: 0, c: "" })).toBe("");
  });

  it("does not include inherited properties when used with a null-proto map", () => {
    const map = Object.create(null);
    map.a = true;
    map.b = false;

    expect(toClassString(map)).toBe("a");
  });

  it("stringifies symbols (if supported)", () => {
    if (typeof Symbol === "function") {
      expect(toClassString(Symbol("x"))).toBe("Symbol(x)");
    }
  });
});

// describe("ngClass animations", () => {
//   let body;
//   let element;
//   let $rootElement;

//   afterEach(() => {
//     dealoc(element);
//   });

//   it("should avoid calling addClass accidentally when removeClass is going on", () => {
//     module("ngAnimateMock");
//     inject(($compile, $rootScope, $animate, $timeout) => {
//       element = angular.element('<div ng-class="val"></div>');
//       const body = (document.body);
//       body.append(element);
//       $compile(element)($rootScope);

//       expect($animate.queue.length).toBe(0);

//       $rootScope.val = "one";
//       ;
//       expect($animate.queue.shift().event).toBe("addClass");
//       expect($animate.queue.length).toBe(0);

//       $rootScope.val = "";
//       ;
//       expect($animate.queue.shift().event).toBe("removeClass"); // only removeClass is called
//       expect($animate.queue.length).toBe(0);

//       $rootScope.val = "one";
//       ;
//       expect($animate.queue.shift().event).toBe("addClass");
//       expect($animate.queue.length).toBe(0);

//       $rootScope.val = "two";
//       ;
//       expect($animate.queue.shift().event).toBe("addClass");
//       expect($animate.queue.shift().event).toBe("removeClass");
//       expect($animate.queue.length).toBe(0);
//     });
//   });

//   it("should combine the ngClass evaluation with the enter animation", () => {
//     // mocks are not used since the enter delegation method is called before addClass and
//     // it makes it impossible to test to see that addClass is called first
//     module("ngAnimate");
//     module("ngAnimateMock");

//     module(($animateProvider) => {
//       $animateProvider.register(".crazy", () => ({
//         enter(element, done) {
//           element.data("state", "crazy-enter");
//           done();
//         },
//       }));
//     });
//     inject(
//       ($compile, $rootScope, $browser, $rootElement, $animate, $document) => {
//         $animate.enabled(true);

//         $rootScope.val = "crazy";
//         element = angular.element('<div ng-class="val"></div>');
//         ($document[0].body).append($rootElement);

//         $compile(element)($rootScope);

//         let enterComplete = false;
//         $animate.enter(element, $rootElement, null).then(() => {
//           enterComplete = true;
//         });

//         // jquery doesn't compare both elements properly so let's use the nodes
//         expect(element.parentElement[0]).toEqual($rootElement);
//         expect(element.classList.contains("crazy")).toBe(false);
//         expect(enterComplete).toBe(false);

//         ;
//         $animate.flush();
//         ;

//         expect(element.classList.contains("crazy")).toBe(true);
//         expect(enterComplete).toBe(true);
//         expect(element.data("state")).toBe("crazy-enter");
//       },
//     );
//   });

//   it("should not remove classes if they're going to be added back right after", () => {
//     module("ngAnimateMock");

//     inject(($rootScope, $compile, $animate) => {
//       let className;

//       $rootScope.one = true;
//       $rootScope.two = true;
//       $rootScope.three = true;

//       element = angular.element(
//         '<div ng-class="{one:one, two:two, three:three}"></div>',
//       );
//       $compile(element)($rootScope);
//       ;

//       // this fires twice due to the class observer firing
//       let item = $animate.queue.shift();
//       expect(item.event).toBe("addClass");
//       expect(item.args[1]).toBe("one two three");

//       expect($animate.queue.length).toBe(0);

//       $rootScope.three = false;
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("removeClass");
//       expect(item.args[1]).toBe("three");

//       expect($animate.queue.length).toBe(0);

//       $rootScope.two = false;
//       $rootScope.three = true;
//       ;

//       item = $animate.queue.shift();
//       expect(item.event).toBe("addClass");
//       expect(item.args[1]).toBe("three");

//       item = $animate.queue.shift();
//       expect(item.event).toBe("removeClass");
//       expect(item.args[1]).toBe("two");

//       expect($animate.queue.length).toBe(0);
//     });
//   });
// });
