// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createElementFromHTML, dealoc } from "../../shared/dom.ts";
import { browserTrigger, wait, waitUntil } from "../../shared/test-utils.ts";
import { ngRepeatDirective } from "./repeat.ts";

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

  describe("compile", () => {
    it("should create a link function for a valid repeat expression", () => {
      const directive = ngRepeatDirective(injector);

      const link = directive.compile(document.createElement("li"), {
        ngRepeat: "item in items",
      });

      expect(link).toEqual(jasmine.any(Function));
    });

    it("should reject invalid repeat expressions during compile", () => {
      const directive = ngRepeatDirective(injector);

      expect(() => {
        directive.compile(document.createElement("li"), {
          ngRepeat: "item of items",
        });
      }).toThrowError(/Expected expression/);
    });
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

  it("should remove ng-click listeners before removing non-animated repeated checkboxes", async () => {
    element = $compile(
      '<ul><li ng-repeat="todo in tasks">' +
        '<input type="checkbox" ng-click="todo.done = !todo.done" />' +
        "</li></ul>",
    )(scope);

    scope.tasks = [
      { task: "first", done: false },
      { task: "second", done: false },
    ];
    await wait();

    const removedCheckbox = element.querySelectorAll("input")[0];

    spyOn(removedCheckbox, "removeEventListener").and.callThrough();

    scope.tasks.shift();
    await wait();

    expect(removedCheckbox.removeEventListener).toHaveBeenCalledWith(
      "click",
      jasmine.any(Function),
    );
  });

  it("should remove ng-click listeners before replacing non-animated repeated checkboxes with a disjoint collection", async () => {
    element = $compile(
      '<ul><li ng-repeat="todo in tasks">' +
        '<input type="checkbox" ng-click="todo.done = !todo.done" />' +
        "</li></ul>",
    )(scope);

    scope.tasks = [
      { task: "first", done: false },
      { task: "second", done: false },
    ];
    await wait();

    const removedCheckbox = element.querySelectorAll("input")[0];

    spyOn(removedCheckbox, "removeEventListener").and.callThrough();

    scope.tasks = [
      { task: "third", done: false },
      { task: "fourth", done: false },
    ];
    await wait();

    expect(removedCheckbox.removeEventListener).toHaveBeenCalledWith(
      "click",
      jasmine.any(Function),
    );
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
          '">{{item.name}}/</li>' +
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

    it("should refresh tuple key locals when leading array items are removed", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, val) in items">{{key}}:{{val}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = ["A", "B", "C"];
      await wait();

      scope.items.shift();
      await wait();

      expect(element.textContent).toEqual("0:B|1:C|");
    });

    it("should refresh tuple key locals when array items are inserted at the head", async () => {
      element = $compile(
        "<ul>" +
          '<li ng-repeat="(key, val) in items">{{key}}:{{val}}|</li>' +
          "</ul>",
      )(scope);
      scope.items = ["A", "B"];
      await wait();

      scope.items.unshift("X");
      await wait();

      expect(element.textContent).toEqual("0:X|1:A|2:B|");
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
      scope.items.$hashKey = "xxx";
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

    it("should preserve repeated row DOM when the collection is shallow-cloned with the same items", async () => {
      element = $compile(
        '<ul><li ng-repeat="item in items">{{item.name}}|</li></ul>',
      )(scope);
      const first = { name: "a" };

      const second = { name: "b" };

      scope.items = [first, second];
      await wait();

      let lis = element.querySelectorAll("li");

      const firstRow = lis[0];

      const secondRow = lis[1];

      firstRow.setAttribute("mark", "first");
      secondRow.setAttribute("mark", "second");

      scope.items = [...scope.items];
      await wait();

      lis = element.querySelectorAll("li");
      expect(lis[0]).toBe(firstRow);
      expect(lis[1]).toBe(secondRow);
      expect(lis[0].getAttribute("mark")).toBe("first");
      expect(lis[1].getAttribute("mark")).toBe("second");
      expect(element.textContent).toBe("a|b|");
    });

    it("keeps grouped interpolation bindings when archived items are removed", async () => {
      element = $compile(
        '<ul><li ng-repeat="todo in tasks">{{todo.task}} {{todo.done}}|</li></ul>',
      )(scope);
      scope.tasks = [
        { task: "Learn AngularTS", done: true },
        { task: "Build an AngularTS app", done: false },
      ];

      await wait();
      expect(element.textContent).toBe(
        "Learn AngularTS true|Build an AngularTS app false|",
      );

      scope.tasks = scope.tasks.filter((task) => !task.done);
      await wait();
      expect(element.textContent).toBe("Build an AngularTS app false|");
    });

    it("updates controller alias repeats when a method replaces the collection", async () => {
      element = $compile(
        '<section><button type="button" ng-click="$ctrl.archive()">Archive</button>' +
          '<ul><li ng-repeat="todo in $ctrl.tasks">{{todo.task}} {{todo.done}}|</li></ul></section>',
      )(scope);
      scope.$ctrl = {
        tasks: [
          { task: "Learn AngularTS", done: true },
          { task: "Build an AngularTS app", done: false },
        ],
        archive() {
          this.tasks = this.tasks.filter((task) => !task.done);
        },
      };

      await wait();
      expect(element.textContent).toBe(
        "ArchiveLearn AngularTS true|Build an AngularTS app false|",
      );

      browserTrigger(element.querySelector("button"), "click");
      await wait();

      expect(element.textContent).toBe("ArchiveBuild an AngularTS app false|");
    });

    it("updates repeated rows when an array item object is replaced by index", async () => {
      element = $compile(
        '<ul><li ng-repeat="todo in tasks">{{todo.task}} {{todo.done}}|</li></ul>',
      )(scope);
      scope.tasks = [
        { task: "First Task", done: false },
        { task: "Second Task", done: true },
      ];

      await wait();
      expect(element.textContent).toBe("First Task false|Second Task true|");

      scope.tasks[0] = { task: "New Task", done: false };
      await wait();

      expect(element.textContent).toBe("New Task false|Second Task true|");
    });

    it("uses object id as the default repeat key for fresh object instances", async () => {
      element = $compile(
        '<ul><li ng-repeat="todo in tasks">{{todo.task}}|</li></ul>',
      )(scope);
      scope.tasks = [
        { id: 1, task: "First Task" },
        { id: 2, task: "Second Task" },
      ];

      await wait();
      expect(element.textContent).toBe("First Task|Second Task|");

      scope.tasks = [
        { id: 1, task: "First Task Updated" },
        { id: 3, task: "Third Task" },
      ];
      await wait();

      expect(element.textContent).toBe("First Task Updated|Third Task|");
      expect(element.querySelectorAll("li").length).toBe(2);
    });

    it("does not write generated repeat hash keys onto item objects", async () => {
      element = $compile(
        '<ul><li ng-repeat="todo in tasks">{{todo.task}}|</li></ul>',
      )(scope);
      const first = { task: "First Task" };

      const second = { task: "Second Task" };

      scope.tasks = [first, second];
      await wait();

      expect(element.textContent).toBe("First Task|Second Task|");
      expect(first.$hashKey).toBeUndefined();
      expect(second.$hashKey).toBeUndefined();

      scope.tasks = [second, first];
      await wait();

      expect(element.textContent).toBe("Second Task|First Task|");
      expect(first.$hashKey).toBeUndefined();
      expect(second.$hashKey).toBeUndefined();
    });

    it("does not update a keyed row value when the object instance is unchanged", async () => {
      element = $compile(
        '<ul><li ng-repeat="todo in tasks">{{todo.task}}|</li></ul>',
      )(scope);
      const first = { id: 1, task: "First Task" };

      scope.tasks = [first];
      await wait();

      const row = element.querySelector("li");

      row.setAttribute("mark", "stable");

      scope.tasks = [first];
      await wait();

      expect(element.querySelector("li")).toBe(row);
      expect(element.querySelector("li").getAttribute("mark")).toBe("stable");
      expect(element.textContent).toBe("First Task|");
    });

    it("passes rows that can be found in the repeated array by identity", async () => {
      element = $compile(
        "<table><tbody>" +
          '<tr ng-repeat="row in rows">' +
          "<td>{{row.id}}</td>" +
          '<td><button type="button" ng-click="remove(row)">x</button></td>' +
          "</tr>" +
          "</tbody></table>",
      )(scope);

      scope.rows = Array.from({ length: 10 }, (_value, index) => ({
        id: index + 1,
      }));
      scope.remove = (row) => {
        const index = scope.rows.indexOf(row);

        scope.removedIndex = index;

        if (index !== -1) {
          scope.rows.splice(index, 1);
        }
      };

      await wait();

      element.querySelectorAll("button")[8].click();
      await wait();

      const ids = Array.from(
        element.querySelectorAll("tr td:first-child"),
        (cell) => cell.textContent,
      );

      expect(scope.removedIndex).toBe(8);
      expect(ids).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "10"]);
    });

    it("uses data-index as the repeat key property for fresh object instances", async () => {
      element = $compile(
        '<ul><li ng-repeat="todo in tasks" data-index="key">{{todo.task}}|</li></ul>',
      )(scope);
      scope.tasks = [
        { key: "first", task: "First Task" },
        { key: "second", task: "Second Task" },
      ];

      await wait();
      expect(element.textContent).toBe("First Task|Second Task|");

      scope.tasks = [
        { key: "second", task: "Second Task Updated" },
        { key: "third", task: "Third Task" },
      ];
      await wait();

      expect(element.textContent).toBe("Second Task Updated|Third Task|");
      expect(element.querySelectorAll("li").length).toBe(2);
    });

    it("preserves repeated row DOM nodes when proxied array items are swapped by index", async () => {
      element = $compile(
        '<ul><li ng-repeat="todo in tasks">{{todo.task}}|</li></ul>',
      )(scope);
      scope.tasks = [
        { task: "First Task" },
        { task: "Second Task" },
        { task: "Third Task" },
        { task: "Fourth Task" },
      ];

      await wait();

      const rows = element.querySelectorAll("li");

      const secondRow = rows[1];

      const fourthRow = rows[3];

      secondRow.setAttribute("data-row", "second-row");
      fourthRow.setAttribute("data-row", "fourth-row");

      const tmp = scope.tasks[1];

      scope.tasks[1] = scope.tasks[3];
      scope.tasks[3] = tmp;
      await wait();

      const currentRows = element.querySelectorAll("li");

      expect(currentRows[1]).toBe(fourthRow);
      expect(currentRows[3]).toBe(secondRow);
      expect(element.textContent).toBe(
        "First Task|Fourth Task|Third Task|Second Task|",
      );
    });

    it("refreshes positional locals when proxied array items are swapped by index", async () => {
      element = $compile(
        '<ul><li ng-repeat="todo in tasks">{{$index}}:{{todo.task}}:{{$first}}-{{$middle}}-{{$last}}|</li></ul>',
      )(scope);
      scope.tasks = [
        { task: "First Task" },
        { task: "Second Task" },
        { task: "Third Task" },
      ];

      await wait();

      const tmp = scope.tasks[0];

      scope.tasks[0] = scope.tasks[2];
      scope.tasks[2] = tmp;
      await wait();

      expect(element.textContent).toBe(
        "0:Third Task:true-false-false|" +
          "1:Second Task:false-true-false|" +
          "2:First Task:false-false-true|",
      );
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

    it("should work when placed on a root element of attr directive with ASYNC replaced template", async () => {
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
      await waitUntil(() => element.innerText === "-12-");
      expect(element.innerText).toBe("-12-");

      scope.items = [];
      await waitUntil(() => element.innerText === "--");
      expect(element.innerText).toBe("--");
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

      await waitUntil(() => element.textContent === "hello\n");
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

    it("should replace all elements when the collection shares no retained items", async () => {
      lis[0].setAttribute("mark", "first");
      lis[1].setAttribute("mark", "second");
      lis[2].setAttribute("mark", "third");

      scope.items = [d, 5];
      await wait();

      const newElements = element.querySelectorAll("li");

      expect(newElements.length).toEqual(2);
      expect(newElements[0]).not.toEqual(lis[0]);
      expect(newElements[0]).not.toEqual(lis[1]);
      expect(newElements[0]).not.toEqual(lis[2]);
      expect(newElements[1]).not.toEqual(lis[0]);
      expect(newElements[1]).not.toEqual(lis[1]);
      expect(newElements[1]).not.toEqual(lis[2]);
      expect(element.textContent).toBe("45");
    });

    it("should preserve existing elements when items are appended", async () => {
      scope.items = [a, b];
      await wait();
      lis = element.querySelectorAll("li");

      scope.items.push(d);
      await wait();

      const newLis = element.querySelectorAll("li");

      expect(newLis.length).toEqual(3);
      expect(newLis[0]).toEqual(lis[0]);
      expect(newLis[1]).toEqual(lis[1]);
    });

    it("should refresh positional locals when items are appended via array replacement", async () => {
      element = $compile(
        '<ul><li ng-repeat="item in items">{{$index}}:{{item}}:{{$first}}-{{$middle}}-{{$last}}|</li></ul>',
      )(scope);

      scope.items = [a, b];
      await wait();

      lis = element.querySelectorAll("li");

      scope.items = scope.items.concat([d]);
      await wait();

      const newLis = element.querySelectorAll("li");

      expect(newLis[0]).toEqual(lis[0]);
      expect(newLis[1]).toEqual(lis[1]);
      expect(element.textContent).toBe(
        "0:1:true-false-false|" +
          "1:2:false-true-false|" +
          "2:4:false-false-true|",
      );
    });

    it("should preserve retained elements when items are removed from the tail", async () => {
      scope.items = [a, b, c];
      await wait();
      lis = element.querySelectorAll("li");

      scope.items.pop();
      await wait();

      const newLis = element.querySelectorAll("li");

      expect(newLis.length).toEqual(2);
      expect(newLis[0]).toEqual(lis[0]);
      expect(newLis[1]).toEqual(lis[1]);
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

    it("should allow mixing ngRepeat with ngInclude", async () => {
      window.angular = new Angular();

      element = createElementFromHTML(
        '<div><div ng-repeat="i in [1,2]" ng-include="\'/public/test.html\'"></div></div>',
      );
      const injector = window.angular.bootstrap(element);

      scope = injector.get("$rootScope");
      $templateCache = injector.get("$templateCache");
      $templateCache.set("test.html", "hello");
      await waitUntil(() => element.textContent === "hello\nhello\n");
      expect(element.textContent).toBe("hello\nhello\n");
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
