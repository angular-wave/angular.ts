import { Angular } from "../../angular.js";
import { createElementFromHTML, dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("ngRepeat", () => {
  let element;
  let $compile;
  let scope;
  let $exceptionHandler;
  let $compileProvider;
  let $templateCache;
  let injector;
  let $rootScope;
  let logs = [];

  beforeEach(() => {
    const el = document.getElementById("app");
    dealoc(el);
    delete window.angular;
    logs = [];
    window.angular = new Angular();
    window.angular
      .module("defaultModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          logs.push(exception);
          console.error(exception, cause);
        };
      });

    injector = window.angular.bootstrap(el, [
      "defaultModule",
      (_$compileProvider_) => {
        $compileProvider = _$compileProvider_;
      },
    ]);
    $compile = injector.get("$compile");
    $exceptionHandler = injector.get("$exceptionHandler");
    scope = injector.get("$rootScope");
    $templateCache = injector.get("$templateCache");
  });

  afterEach(() => {
    // if ($exceptionHandler.errors.length) {
    //   dump(jasmine.getEnv().currentSpec.getFullName());
    //   dump("$exceptionHandler has errors");
    //   dump($exceptionHandler.errors);
    //   expect($exceptionHandler.errors).toBe([]);
    // }
    //dealoc(element);
  });

  it("should iterate over an array of objects", async () => {
    element = $compile(
      '<ul><li ng-repeat="item in items">{{item.name}};</li></ul>',
    )(scope);
    await wait();
    Array.prototype.extraProperty = "should be ignored";
    // INIT
    scope.items = [{ name: "misko" }, { name: "shyam" }];
    await wait();
    expect(element.querySelectorAll("li").length).toEqual(2);
    expect(element.textContent).toEqual("misko;shyam;");
    delete Array.prototype.extraProperty;

    // GROW
    scope.items.push({ name: "adam" });
    await wait();
    expect(element.querySelectorAll("li").length).toEqual(3);
    expect(element.textContent).toEqual("misko;shyam;adam;");

    // SHRINK
    scope.items.pop();
    await wait();
    expect(element.querySelectorAll("li").length).toEqual(2);

    scope.items.shift();
    await wait();
    expect(element.querySelectorAll("li").length).toEqual(1);
    expect(element.textContent).toEqual("shyam;");
  });

  it("should iterate over an array-like object", async () => {
    element = $compile(
      "<ul>" + '<li ng-repeat="item in items">{{item.name}};</li>' + "</ul>",
    )(scope);
    await wait();
    document.getElementById("app").innerHTML =
      "<a class='test' name='x'>a</a>" +
      "<a class='test' name='y'>b</a>" +
      "<a class='test' name='x'>c</a>";

    scope.items = document.getElementsByClassName("test");
    await wait();
    expect(element.querySelectorAll("li").length).toEqual(3);
    expect(element.textContent).toEqual("x;y;x;");

    // reset dummy
    document.getElementById("app").innerHTML = "";
  });

  it("should iterate over an array-like class", async () => {
    function Collection() {}
    Collection.prototype = new Array();
    Collection.prototype.length = 0;

    const collection = new Collection();
    collection.push({ name: "x" });
    collection.push({ name: "y" });
    collection.push({ name: "z" });

    element = $compile(
      "<ul>" + '<li ng-repeat="item in items">{{item.name}};</li>' + "</ul>",
    )(scope);
    await wait();
    scope.items = collection;
    await wait();
    expect(element.querySelectorAll("li").length).toEqual(3);
    expect(element.textContent).toEqual("x;y;z;");
  });

  it("should iterate over on object/map", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="(key, value) in items">{{key}}:{{value}}|</li>' +
        "</ul>",
    )(scope);
    scope.items = { misko: "swe", shyam: "set" };
    await wait();
    expect(element.textContent).toEqual("misko:swe|shyam:set|");
  });

  it("should iterate over on object/map where (key,value) contains whitespaces", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="(  key ,  value  ) in items">{{key}}:{{value}}|</li>' +
        "</ul>",
    )(scope);
    scope.items = { me: "swe", you: "set" };
    await wait();
    expect(element.textContent).toEqual("me:swe|you:set|");
  });

  it("should iterate over an object/map with identical values", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="(key, value) in items">{{key}}:{{value}}|</li>' +
        "</ul>",
    )(scope);
    await wait();
    scope.items = {
      age: 20,
      wealth: 20,
      prodname: "Bingo",
      dogname: "Bingo",
      codename: "20",
    };
    await wait();
    expect(element.textContent).toEqual(
      "age:20|wealth:20|prodname:Bingo|dogname:Bingo|codename:20|",
    );
  });

  it("should iterate over on object created using `Object.create(null)`", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="(key, value) in items">{{key}}:{{value}}|</li>' +
        "</ul>",
    )(scope);
    await wait();
    const items = Object.create(null);
    items.misko = "swe";
    items.shyam = "set";

    scope.items = items;
    await wait();
    expect(element.textContent).toEqual("misko:swe|shyam:set|");

    delete scope.items.shyam;
    await wait();
    expect(element.textContent).toEqual("misko:swe|");
  });

  describe("alias as", () => {
    it("should assigned the filtered to the target scope property if an alias is provided", async () => {
      element = $compile(
        '<div ng-repeat="item in items | filter:x as results">{{item.name}}/</div>',
      )(scope);

      scope.items = [
        { name: "red" },
        { name: "blue" },
        { name: "green" },
        { name: "black" },
        { name: "orange" },
        { name: "blonde" },
      ];

      expect(scope.results).toBeUndefined();
      scope.x = "bl";
      await wait();

      expect(scope.results[0].name).toEqual("blue");
      expect(scope.results[1].name).toEqual("black");
      expect(scope.results[2].name).toEqual("blonde");

      scope.items = [];
      await wait();
      expect(scope.results).toEqual([]);
    });

    it("should render an empty list", async () => {
      element = $compile(
        "<div>" +
          '  <div ng-repeat="item in items | filter:x as results">{{item}}</div>' +
          "</div>",
      )(scope);

      scope.items = [1, 2, 3, 4, 5, 6];
      await wait();
      expect(element.textContent.trim()).toEqual("123456");

      scope.x = "0";
      await wait();
      expect(element.textContent.trim()).toEqual("");
    });

    for (const name of ["null2", "qthis", "qthisq", "fundefined", "$$parent"]) {
      it(`should support alias identifier containing reserved word: ${name}`, async () => {
        scope.x = "bl";
        scope.items = [
          { name: "red" },
          { name: "blue" },
          { name: "green" },
          { name: "black" },
          { name: "orange" },
          { name: "blonde" },
        ];

        const expr = `item in items | filter:x as ${name}`;
        element = $compile(`<div><div ng-repeat="${expr}"></div></div>`)(scope);

        await wait();

        expect(scope[name][0].name).toEqual("blue");
        expect(scope[name][1].name).toEqual("black");
        expect(scope[name][2].name).toEqual("blonde");

        dealoc(element);
      });
    }

    for (const expr of [
      "null",
      "this",
      "undefined",
      "$parent",
      "$root",
      "$id",
      "$index",
      "$first",
      "$middle",
      "$last",
      "$even",
      "$odd",
      "obj[key]",
      'obj["key"]',
      "obj['key']",
      "obj.property",
      "foo=6",
    ]) {
      it(`should throw if alias identifier is not simple: ${expr}`, async () => {
        scope.x = "bl";
        scope.items = [
          { name: "red" },
          { name: "blue" },
          { name: "green" },
          { name: "black" },
          { name: "orange" },
          { name: "blonde" },
        ];

        const expression = `item in items | filter:x as ${expr}`.replace(
          /"/g,
          "&quot;",
        );
        element = $compile(
          `<div>
             <div ng-repeat="${expression}">{{item}}</div>
           </div>`,
        )(scope);

        await wait();

        expect(logs.shift().message).toMatch(/must be a valid JS identifier/);

        dealoc(element);
      });
    }

    it("should allow expressions over multiple lines", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="item in items\n' +
          '| filter:isTrue">{{item.name}}/</li>' +
          "</ul>",
      )(scope);

      scope.isTrue = function () {
        return true;
      };
      scope.items = [{ name: "igor" }, { name: "misko" }];
      await wait();
      expect(element.textContent).toEqual("igor/misko/");
    });

    it("should strip white space characters correctly", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="item   \t\n  \t  in  \n \t\n\n \nitems \t\t\n | filter:\n\n{' +
          "\n\t name:\n\n 'ko'\n\n}\n\n | orderBy: \t \n 'name' \n\n" +
          'track \t\n  by \n\n\t $index \t\n ">{{item.name}}/</li>' +
          "</ul>",
      )(scope);

      scope.items = [{ name: "igor" }, { name: "misko" }];
      await wait();

      expect(element.textContent).toEqual("misko/");
    });

    it("should not ngRepeat over parent properties", async () => {
      const Class = function () {};
      Class.prototype.abc = function () {};
      Class.prototype.value = "abc";

      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, value) in items">{{key}}:{{value}};</li>' +
          "</ul>",
      )(scope);
      scope.items = new Class();
      scope.items.name = "value";
      await wait();
      expect(element.textContent).toEqual("name:value;");
    });

    it("should error on wrong parsing of ngRepeat", async () => {
      element = $compile('<ul><li ng-repeat="i dont parse"></li></ul>')(scope);
      await wait();
      expect(logs.shift().message).toMatch(/i dont parse/);
    });

    it("should throw error when left-hand-side of ngRepeat can't be parsed", async () => {
      element = createElementFromHTML(
        '<ul><li ng-repeat="i dont parse in foo"></li></ul>',
      );
      $compile(element)(scope);
      await wait();
      expect(logs.shift().message).toMatch(/i dont parse/);
    });

    it("should expose iterator offset as $index when iterating over arrays", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="item in items">{{item}}:{{$index}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = ["misko", "shyam", "frodo"];
      await wait();
      expect(element.textContent).toEqual("misko:0|shyam:1|frodo:2|");
    });

    it("should expose iterator offset as $index when iterating over objects", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, val) in items">{{key}}:{{val}}:{{$index}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = { misko: "m", shyam: "s", frodo: "f" };
      await wait();
      expect(element.textContent).toEqual("misko:m:0|shyam:s:1|frodo:f:2|");
    });

    it("should expose iterator offset as $index when iterating over objects with length key value 0", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, val) in items">{{key}}:{{val}}:{{$index}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = { misko: "m", shyam: "s", frodo: "f", length: 0 };
      await wait();
      expect(element.textContent).toEqual(
        "misko:m:0|shyam:s:1|frodo:f:2|length:0:3|",
      );
    });

    it("should expose iterator position as $first, $middle and $last when iterating over arrays", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="item in items">{{item}}:{{$first}}-{{$middle}}-{{$last}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = ["misko", "shyam", "doug"];
      await wait();
      expect(element.textContent).toEqual(
        "misko:true-false-false|shyam:false-true-false|doug:false-false-true|",
      );

      scope.items.push("frodo");
      await wait();
      expect(element.textContent).toEqual(
        "misko:true-false-false|" +
          "shyam:false-true-false|" +
          "doug:false-true-false|" +
          "frodo:false-false-true|",
      );

      scope.items.pop();
      scope.items.pop();
      await wait();
      expect(element.textContent).toEqual(
        "misko:true-false-false|shyam:false-false-true|",
      );

      scope.items.pop();
      await wait();
      expect(element.textContent).toEqual("misko:true-false-true|");
    });

    it("should expose iterator position as $even and $odd when iterating over arrays", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="item in items">{{item}}:{{$even}}-{{$odd}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = ["misko", "shyam", "doug"];
      await wait();
      expect(element.textContent).toEqual(
        "misko:true-false|shyam:false-true|doug:true-false|",
      );

      scope.items.push("frodo");
      await wait();
      expect(element.textContent).toBe(
        "misko:true-false|" +
          "shyam:false-true|" +
          "doug:true-false|" +
          "frodo:false-true|",
      );

      scope.items.shift();
      scope.items.pop();
      await wait();
      expect(element.textContent).toBe("shyam:true-false|doug:false-true|");
    });

    it("should expose iterator position as $first, $middle and $last when iterating over objects", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, val) in items">{{key}}:{{val}}:{{$first}}-{{$middle}}-{{$last}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = { misko: "m", shyam: "s", doug: "d", frodo: "f" };
      await wait();
      expect(element.textContent).toEqual(
        "misko:m:true-false-false|" +
          "shyam:s:false-true-false|" +
          "doug:d:false-true-false|" +
          "frodo:f:false-false-true|",
      );

      delete scope.items.doug;
      delete scope.items.frodo;
      await wait();
      expect(element.textContent).toEqual(
        "misko:m:true-false-false|shyam:s:false-false-true|",
      );

      delete scope.items.shyam;
      await wait();
      expect(element.textContent).toEqual("misko:m:true-false-true|");
    });

    it("should expose iterator position as $even and $odd when iterating over objects", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, val) in items">{{key}}:{{val}}:{{$even}}-{{$odd}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = { misko: "m", shyam: "s", doug: "d", frodo: "f" };
      await wait();
      expect(element.textContent).toBe(
        "misko:m:true-false|" +
          "shyam:s:false-true|" +
          "doug:d:true-false|" +
          "frodo:f:false-true|",
      );

      delete scope.items.frodo;
      delete scope.items.shyam;
      await wait();
      expect(element.textContent).toBe("misko:m:true-false|doug:d:false-true|");
    });

    it("should calculate $first, $middle and $last when we filter out properties from an obj", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, val) in items">{{key}}:{{val}}:{{$first}}-{{$middle}}-{{$last}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = {
        misko: "m",
        shyam: "s",
        doug: "d",
        frodo: "f",
        $toBeFilteredOut: "xxxx",
      };
      await wait();
      expect(element.textContent).toEqual(
        "misko:m:true-false-false|" +
          "shyam:s:false-true-false|" +
          "doug:d:false-true-false|" +
          "frodo:f:false-false-true|",
      );
    });

    it("should calculate $even and $odd when we filter out properties from an obj", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, val) in items">{{key}}:{{val}}:{{$even}}-{{$odd}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = {
        misko: "m",
        shyam: "s",
        doug: "d",
        frodo: "f",
        $toBeFilteredOut: "xxxx",
      };
      await wait();
      expect(element.textContent).toEqual(
        "misko:m:true-false|" +
          "shyam:s:false-true|" +
          "doug:d:true-false|" +
          "frodo:f:false-true|",
      );
    });

    it("should ignore $ and $$ properties", async () => {
      element = $compile('<ul><li ng-repeat="i in items">{{i}}|</li></ul>')(
        scope,
      );
      scope.items = ["a", "b", "c"];
      scope.items._hashKey = "xxx";
      scope.items.$root = "yyy";
      await wait();
      expect(element.textContent).toEqual("a|b|c|");
    });

    it("should repeat over nested arrays", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="subgroup in groups">' +
          '<div ng-repeat="group in subgroup">{{group}}|</div>X' +
          "</li>" +
          "</ul>",
      )(scope);
      scope.groups = [
        ["a", "b"],
        ["c", "d"],
      ];
      await wait();
      expect(element.textContent).toEqual("a|b|Xc|d|X");
    });

    it("should ignore non-array element properties when iterating over an array", async () => {
      element = $compile(
        '<ul><li ng-repeat="item in array">{{item}}|</li></ul>',
      )(scope);
      scope.array = ["a", "b", "c"];
      scope.array.foo = "23";
      scope.array.bar = function () {};
      await wait();
      expect(element.textContent).toBe("a|b|c|");
    });

    it("should iterate over non-existent elements of a sparse array", async () => {
      element = $compile(
        '<ul><li ng-repeat="item in array">{{item}}|</li></ul>',
      )(scope);
      scope.array = ["a", "b"];
      scope.array[4] = "c";
      scope.array[6] = "d";
      await wait();
      expect(element.textContent).toBe("a|b|||c||d|");
    });

    it("should iterate over all kinds of types", async () => {
      element = $compile(
        '<ul><li ng-repeat="item in array">{{item}}|</li></ul>',
      )(scope);
      scope.array = ["a", 1, null, undefined, {}];
      await wait();
      expect(element.textContent).toMatch("a|1||{}|{}|");
    });

    it("should preserve data on move of elements", async () => {
      element = $compile(
        '<ul><li ng-repeat="item in array">{{item}}|</li></ul>',
      )(scope);
      scope.array = ["a", "b"];
      await wait();
      let lis = element.querySelectorAll("li");

      lis[0].setAttribute("mark", "a");
      lis[1].setAttribute("mark", "b");

      scope.array = ["b", "a"];
      await wait();

      lis = element.querySelectorAll("li");
      expect(lis[0].getAttribute("mark")).toEqual("b");
      expect(lis[1].getAttribute("mark")).toEqual("a");
    });
  });

  describe("nesting in replaced directive templates", () => {
    it("should work when placed on a non-root element of attr directive with SYNC replaced template", async () => {
      $compileProvider.directive("rr", () => ({
        restrict: "A",
        replace: true,
        template: '<div ng-repeat="i in items">{{i}}|</div>',
      }));
      element = $compile("<div><span rr>{{i}}|</span></div>")(scope);
      await wait();
      expect(element.textContent).toBe("");

      scope.items = [1, 2];
      await wait();
      expect(element.textContent).toBe("1|2|");

      expect(element.children[0].outerHTML).toBe(
        '<div ng-repeat="i in items" rr="">1|</div>',
      );
      expect(element.children[1].outerHTML).toBe(
        '<div ng-repeat="i in items" rr="">2|</div>',
      );
    });

    it("should work when placed on a non-root element of attr directive with ASYNC replaced template", async () => {
      $compileProvider.directive("rr", () => ({
        restrict: "A",
        replace: true,
        templateUrl: "rr.html",
      }));

      $templateCache.set("rr.html", '<div ng-repeat="i in items">{{i}}|</div>');
      element = $compile("<div><span rr>{{i}}|</span></div>")(scope);
      await wait();
      expect(element.textContent).toBe("");

      scope.items = [1, 2];
      await wait();
      expect(element.textContent).toBe("1|2|");
      expect(element.children[0].outerHTML).toBe(
        '<div ng-repeat="i in items" rr="">1|</div>',
      );
      expect(element.children[1].outerHTML).toBe(
        '<div ng-repeat="i in items" rr="">2|</div>',
      );
    });

    it("should work when placed on a root element of attr directive with SYNC replaced template", async () => {
      $compileProvider.directive("replaceMeWithRepeater", () => ({
        replace: true,
        template: '<span ng-repeat="i in items">{{log(i)}}</span>',
      }));
      element = $compile("<span replace-me-with-repeater></span>")(scope);
      await wait();
      expect(element.textContent).toBe("");
      const scopeLog = [];
      scope.log = function (t) {
        scopeLog.push(t);
      };

      // This creates one item, but it has no parent so we can't get to it
      scope.items = [1, 2];
      await wait();
      expect(scopeLog).toContain(1);
      expect(scopeLog).toContain(2);
      scopeLog.length = 0;
    });

    it("should work when placed on a root element of attr directive with ASYNC replaced template", (done) => {
      $compileProvider.directive("replaceMeWithRepeater", () => ({
        replace: true,
        templateUrl: "replace-me-with-repeater.html",
      }));
      $templateCache.set(
        "replace-me-with-repeater.html",
        '<div><div ng-repeat="i in items">{{i}}</div></div>',
      );
      element = $compile("<div>-<span replace-me-with-repeater></span>-</div>")(
        scope,
      );

      $compile(element)(scope);
      expect(element.innerText).toBe("--");

      scope.items = [1, 2];
      setTimeout(() => {
        expect(element.innerText).toBe("-12-");
        scope.items = [];
      }, 500);

      setTimeout(() => {
        expect(element.innerText).toBe("--");
        done();
      }, 1000);
    });

    it("should work when placed on a root element of element directive with SYNC replaced template", async () => {
      $compileProvider.directive("replaceMeWithRepeater", () => ({
        restrict: "E",
        replace: true,
        template: '<div ng-repeat="i in [1,2,3]">{{i}}</div>',
      }));
      element = $compile(
        "<div><replace-me-with-repeater></replace-me-with-repeater></div>",
      )(scope);
      expect(element.textContent).toBe("");
      await wait();
      expect(element.textContent).toBe("123");
    });

    it("should work when placed on a root element of element directive with ASYNC replaced template", async () => {
      $compileProvider.directive("replaceMeWithRepeater", () => ({
        restrict: "E",
        replace: true,
        templateUrl: "replace-me-with-repeater.html",
      }));
      $templateCache.set(
        "replace-me-with-repeater.html",
        '<div ng-repeat="i in [1,2,3]">{{i}}</div>',
      );
      element = $compile(
        "<div><replace-me-with-repeater></replace-me-with-repeater></div>",
      )(scope);
      expect(element.textContent).toBe("");
      await wait();
      expect(element.textContent).toBe("123");
    });

    it("should work when combined with an ASYNC template that loads after the first digest", async () => {
      $compileProvider.directive("test", () => ({
        templateUrl: "/public/test.html",
      }));
      element = createElementFromHTML(
        '<div><div ng-repeat="i in items" test></div></div>',
      );
      $compile(element)(scope);
      scope.items = [1];
      await wait();
      expect(element.textContent).toBe("");

      await wait(300);
      expect(element.textContent).toBe("hello\n");

      scope.items = [];
      await wait();
      expect(element.textContent).toBe("");
    });
  });

  describe("stability", () => {
    let a;
    let b;
    let c;
    let d;
    let lis;

    beforeEach(async () => {
      element = $compile(
        "<ul>" + '<li ng-repeat="item in items">{{item}}</li>' + "</ul>",
      )(scope);
      a = 1;
      b = 2;
      c = 3;
      d = 4;

      scope.items = [a, b, c];
      await wait();
      lis = element.querySelectorAll("li");
    });

    it("should preserve the order of elements", async () => {
      scope.items = [a, c, d];
      await wait();
      const newElements = element.querySelectorAll("li");
      expect(newElements[0]).toEqual(lis[0]);
      expect(newElements[1]).toEqual(lis[2]);
      expect(newElements[2]).not.toEqual(lis[1]);
    });

    it("should throw error on adding existing duplicates and recover", async () => {
      scope.items = [a, a, a];
      await wait();
      expect(logs.shift().message).toMatch(/Duplicate key/);

      // recover
      scope.items = [a];
      await wait();
      let newElements = element.querySelectorAll("li");
      expect(newElements.length).toEqual(1);
      expect(newElements[0]).toEqual(lis[0]);

      scope.items = [];
      await wait();
      newElements = element.querySelectorAll("li");
      expect(newElements.length).toEqual(0);
    });

    it("should throw error on new duplicates and recover", async () => {
      scope.items = [d, d, d];
      await wait();
      expect(logs.shift().message).toMatch(/Duplicate key/);

      // recover
      scope.items = [a];
      await wait();
      let newElements = element.querySelectorAll("li");
      expect(newElements.length).toEqual(1);
      expect(newElements[0]).toEqual(lis[0]);

      scope.items = [];
      await wait();
      newElements = element.querySelectorAll("li");
      expect(newElements.length).toEqual(0);
    });

    it("should reverse items when the collection is reversed", async () => {
      scope.items = [a, b, c];
      await wait();
      lis = element.querySelectorAll("li");

      scope.items = [c, b, a];
      await wait();
      const newElements = element.querySelectorAll("li");
      expect(newElements.length).toEqual(3);
      expect(newElements[0]).toEqual(lis[2]);
      expect(newElements[1]).toEqual(lis[1]);
      expect(newElements[2]).toEqual(lis[0]);
    });

    it("should reuse elements even when model is composed of primitives", async () => {
      // rebuilding repeater from scratch can be expensive, we should try to avoid it even for
      // model that is composed of primitives.

      scope.items = ["hello", "cau", "ahoj"];
      await wait();
      lis = element.querySelectorAll("li");
      lis[2].id = "yes";

      scope.items = ["ahoj", "hello", "cau"];
      await wait();
      const newLis = element.querySelectorAll("li");
      expect(newLis.length).toEqual(3);
      expect(newLis[0]).toEqual(lis[2]);
      expect(newLis[1]).toEqual(lis[0]);
      expect(newLis[2]).toEqual(lis[1]);
    });

    it("should be stable even if the collection is initially undefined", async () => {
      scope.items = undefined;
      scope.items = [{ name: "A" }, { name: "B" }, { name: "C" }];
      await wait();
      lis = element.querySelectorAll("li");
      scope.items.shift();
      await wait();
      const newLis = element.querySelectorAll("li");
      expect(newLis.length).toBe(2);
      expect(newLis[0]).toBe(lis[1]);
    });
  });

  describe("compatibility", () => {
    it("should allow mixing ngRepeat and another element transclusion directive", async () => {
      $compileProvider.directive("elmTrans", () => ({
        transclude: "element",
        controller($transclude, $scope, $element) {
          $transclude((transcludedNodes) => {
            $element.parentElement.appendChild(createElementFromHTML("[["));
            $element.parentElement.appendChild(transcludedNodes);
            $element.parentElement.appendChild(createElementFromHTML("]]"));
          });
        },
      }));

      $compile = injector.get("$compile");

      element = $compile(
        '<div><div ng-repeat="i in [1,2]" elm-trans>{{i}}</div></div>',
      )(scope);
      await wait();
      expect(element.textContent).toBe("[[1]][[2]]");
    });

    it("should allow mixing ngRepeat with ngInclude", (done) => {
      window.angular = new Angular();

      element = createElementFromHTML(
        '<div><div ng-repeat="i in [1,2]" ng-include="\'/public/test.html\'"></div></div>',
      );
      const injector = window.angular.bootstrap(element);
      scope = injector.get("$rootScope");
      $templateCache = injector.get("$templateCache");
      $templateCache.set("test.html", "hello");
      setTimeout(() => {
        expect(element.textContent).toBe("hello\nhello\n");
        done();
      }, 500);
    });

    it("should allow mixing ngRepeat with ngIf", async () => {
      element = $compile(
        '<div><div ng-repeat="i in [1,2,3,4]" ng-if="i % 2 === 0">{{i}};</div></div>',
      )(scope);
      await wait();
      expect(element.textContent).toBe("2;4;");
    });
  });

  describe("ngRepeat and transcludes", () => {
    it("should allow access to directive controller from children when used in a replace template", () => {
      let controller;
      $compileProvider
        .directive("template", () => ({
          template: '<div ng-repeat="l in [1]"><span test></span></div>',
          replace: true,
          controller() {
            this.flag = true;
          },
        }))
        .directive("test", () => ({
          require: "^template",
          link(_scope, _el, _attr, ctrl) {
            controller = ctrl;
          },
        }));

      injector.invoke(async ($compile, $rootScope) => {
        const element = $compile("<div><div template></div></div>")($rootScope);
        await wait();
        expect(controller.flag).toBe(true);
        dealoc(element);
      });
      expect().toBe();
    });

    it("should use the correct transcluded scope", async () => {
      $compileProvider.directive("iso", () => ({
        restrict: "E",
        transclude: true,
        template: '<div ng-repeat="a in [1]"><div ng-transclude></div></div>',
        scope: {},
      }));
      injector.invoke(async (_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      });

      $rootScope.val = "transcluded content";
      const element = $compile('<iso><span ng-bind="val"></span></iso>')(
        $rootScope,
      );
      await wait();
      expect(element.textContent.trim()).toEqual("transcluded content");
      dealoc(element);
    });

    it("should set the state before linking", async () => {
      $compileProvider.directive("assertA", () => (scope) => {
        // This linking function asserts that a is set.
        // If we only test this by asserting binding, it will work even if the value is set later.
        expect(scope.a).toBeDefined();
      });

      injector.invoke(async (_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      });
      const element = $compile(
        '<div><span ng-repeat="a in [1]"><span assert-a></span></span></div>',
      )($rootScope);
      await wait();
      dealoc(element);
    });

    it("should work with svg elements when the svg container is transcluded", async () => {
      $compileProvider.directive("svgContainer", () => ({
        template: "<svg ng-transclude></svg>",
        replace: true,
        transclude: true,
      }));
      injector.invoke(async ($compile, $rootScope) => {
        const element = $compile(
          '<svg-container><circle ng-repeat="r in rows"></circle></svg-container>',
        )($rootScope);
        $rootScope.rows = [1];
        await wait();

        const circle = element.querySelectorAll("circle");
        expect(circle[0].toString()).toMatch(/SVG/);
        dealoc(element);
      });
      expect().toBe();
    });
  });
});

// describe("ngRepeat animations", () => {
//   let body;
//   let element;
//   let $rootElement;

//   function html(content) {
//     $rootElement.html(content);
//     element = $rootElement.children()[0];
//     return element;
//   }

//   beforeEach(module("ngAnimate"));
//   beforeEach(module("ngAnimateMock"));

//   beforeEach(
//     module(
//       () =>
//         // we need to run animation on attached elements;
//         function (_$rootElement_) {
//           $rootElement = _$rootElement_;
//           body = (document.body);
//           body.append($rootElement);
//         },
//     ),
//   );

//   afterEach(() => {
//     body.empty();
//   });

//   it("should fire off the enter animation", inject((
//     $compile,
//     scope,
//     $animate,
//   ) => {
//     let item;

//     element = $compile(
//       html(
//         "<div><div " +
//           'ng-repeat="item in items">' +
//           "{{ item }}" +
//           "</div></div>",
//       ),
//     )(scope);

//     ; // re-enable the animations;

//     scope.items = ["1", "2", "3"];
//     ;

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("1");

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("2");

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("3");
//   }));

//   it("should fire off the leave animation", inject((
//     $compile,
//     scope,
//     $animate,
//   ) => {
//     let item;

//     element = $compile(
//       html(
//         "<div><div " +
//           'ng-repeat="item in items">' +
//           "{{ item }}" +
//           "</div></div>",
//       ),
//     )(scope);

//     scope.items = ["1", "2", "3"];
//     ;

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("1");

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("2");

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("3");

//     scope.items = ["1", "3"];
//     ;

//     item = $animate.queue.shift();
//     expect(item.event).toBe("leave");
//     expect(item.element.textContent).toBe("2");
//   }));

//   it("should not change the position of the block that is being animated away via a leave animation", inject((
//     $compile,
//     scope,
//     $animate,
//
//     $sniffer,
//     $timeout,
//   ) => {
//     if (!$sniffer.transitions) return;

//     let item;
//     const ss = createMockStyleSheet($document);

//     try {
//       $animate.enabled(true);

//       ss.addRule(
//         ".animate-me div",
//         "-webkit-transition:1s linear all; transition:1s linear all;",
//       );

//       element = $compile(
//         html(
//           '<div class="animate-me">' +
//             '<div ng-repeat="item in items">{{ item }}</div>' +
//             "</div>",
//         ),
//       )(scope);

//       scope.items = ["1", "2", "3"];
//       ;
//       expect(element.textContent).toBe("123");

//       scope.items = ["1", "3"];
//       ;

//       expect(element.textContent).toBe("123"); // the original order should be preserved
//       $animate.flush();
//       $timeout.flush(1500); // 1s * 1.5 closing buffer
//       expect(element.textContent).toBe("13");
//     } finally {
//       ss.destroy();
//     }
//   }));

//   it("should fire off the move animation", () => {
//     let item;

//     element = $compile(
//       html(
//         "<div>" +
//           '<div ng-repeat="item in items">' +
//           "{{ item }}" +
//           "</div>" +
//           "</div>",
//       ),
//     )(scope);

//     scope.items = ["1", "2", "3"];
//     ;

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("1");

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("2");

//     item = $animate.queue.shift();
//     expect(item.event).toBe("enter");
//     expect(item.element.textContent).toBe("3");

//     scope.items = ["2", "3", "1"];
//     ;

//     item = $animate.queue.shift();
//     expect(item.event).toBe("move");
//     expect(item.element.textContent).toBe("2");

//     item = $animate.queue.shift();
//     expect(item.event).toBe("move");
//     expect(item.element.textContent).toBe("3");
//   });
// });
