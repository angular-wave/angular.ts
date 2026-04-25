import { createElementFromHTML, dealoc } from "./shared/dom.ts";
import { Angular } from "./angular.ts";
import { browserTrigger, wait } from "./shared/test-utils.ts";

describe("binding", () => {
  let element,
    myModule,
    $injector,
    $rootScope,
    $compile,
    $exceptionHandler,
    errors = [];

  function childNode(element, index) {
    return element.childNodes[index];
  }

  beforeEach(function () {
    errors = [];
    window.angular = new Angular();
    myModule = window.angular.module("myModule", ["ng"]);
    myModule.decorator("$exceptionHandler", function () {
      return (exception) => {
        errors.push(exception.message);
      };
    });
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "myModule",
    ]);
    $rootScope = $injector.get("$rootScope");
    $compile = $injector.get("$compile");
    $exceptionHandler = $injector.get("$exceptionHandler");
    this.compileToHtml = async function (content) {
      $compile(content)($rootScope);
      await wait();
      return content;
    };
  });

  afterEach(() => dealoc(document.getElementById("app")));

  it("should initialize a scope property with ng-init on a self-closing element", () => {
    $compile('<div ng-init="a=123"/>')($rootScope);
    expect($rootScope.a).toBe(123);
  });

  it("should execute ng-init on a standard opening element", () => {
    $compile('<div ng-init="a=123">')($rootScope);
    expect($rootScope.a).toBe(123);
  });

  it("should execute multiple statements declared in ng-init", () => {
    $compile('<div ng-init="a=123;b=345">')($rootScope);
    expect($rootScope.a).toBe(123);
    expect($rootScope.b).toBe(345);
  });

  it("should apply ng-bind text updates when the model changes", async () => {
    element = $compile('<div ng-bind="model.a">x</div>')($rootScope);
    $rootScope.model = { a: 123 };
    await wait();
    expect(element.textContent).toBe("123");
  });

  it("should execute an ng-click handler on an input button within the current scope", () => {
    let savedCalled = false;
    element = $compile(
      '<input type="button" ng-click="person.save()" value="Apply">',
    )($rootScope);
    $rootScope.person = {};
    $rootScope.person.save = function () {
      savedCalled = true;
    };
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    expect(savedCalled).toBe(true);
  });

  it("should execute an ng-click handler on an input image element", () => {
    let log = "";
    element = $compile('<input type="image" ng-click="action()">')($rootScope);
    $rootScope.action = function () {
      log += "click;";
    };
    expect(log).toEqual("");
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    expect(log).toEqual("click;");
  });

  it("should execute an ng-click handler on a button element within the current scope", () => {
    let savedCalled = false;
    element = $compile('<button ng-click="person.save()">Apply</button>')(
      $rootScope,
    );
    $rootScope.person = {};
    $rootScope.person.save = function () {
      savedCalled = true;
    };
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    expect(savedCalled).toBe(true);
  });

  describe("ng-repeat array mutation regressions", () => {
    it("should update ng-repeat bindings when items are added and removed", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");
      $compile = $injector.get("$compile");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">B</li>' +
          "</ul>",
      );

      $rootScope.items.unshift({ a: "C" });
      await wait();
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">C</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">B</li>' +
          "</ul>",
      );

      $rootScope.items.shift();
      await wait();
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">B</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should remove the corresponding repeated row when an observed array uses splice", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }];
      await wait();
      expect(elem.querySelectorAll("li").length).toBe(3);

      $rootScope.items.splice(1, 1);
      await wait();

      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">C</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should preserve surviving repeated DOM nodes when the first observed array item is removed", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }];
      await wait();

      const originalRows = elem.querySelectorAll("li");
      const survivingFirstRow = originalRows[1];
      const survivingSecondRow = originalRows[2];

      survivingFirstRow.setAttribute("data-row", "survivor-b");
      survivingSecondRow.setAttribute("data-row", "survivor-c");

      $rootScope.items.splice(0, 1);
      await wait();

      const currentRows = elem.querySelectorAll("li");

      expect(currentRows.length).toBe(2);
      expect(currentRows[0]).toBe(survivingFirstRow);
      expect(currentRows[1]).toBe(survivingSecondRow);
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-b">B</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-c">C</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should still refresh $index bindings when the first observed array item is removed", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items"><span class="index" ng-bind="$index"></span>:<span class="label" ng-bind="item.a"></span></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }];
      await wait();

      $rootScope.items.splice(0, 1);
      await wait();

      const rows = Array.from(elem.querySelectorAll("li")).map(
        (row) => row.textContent,
      );

      expect(rows).toEqual(["0:B", "1:C"]);
      elem.remove();
    });

    it("should still refresh tuple key bindings when the first observed array item is removed", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="(key, item) in items"><span class="index" ng-bind="key"></span>:<span class="label" ng-bind="item.a"></span></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }];
      await wait();

      $rootScope.items.splice(0, 1);
      await wait();

      const rows = Array.from(elem.querySelectorAll("li")).map(
        (row) => row.textContent,
      );

      expect(rows).toEqual(["0:B", "1:C"]);
      elem.remove();
    });

    it("should preserve surviving repeated DOM nodes when leading observed array items are removed in bulk", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }, { a: "D" }];
      await wait();

      const originalRows = elem.querySelectorAll("li");
      const survivingFirstRow = originalRows[2];
      const survivingSecondRow = originalRows[3];

      survivingFirstRow.setAttribute("data-row", "survivor-c");
      survivingSecondRow.setAttribute("data-row", "survivor-d");

      $rootScope.items.splice(0, 2);
      await wait();

      const currentRows = elem.querySelectorAll("li");

      expect(currentRows.length).toBe(2);
      expect(currentRows[0]).toBe(survivingFirstRow);
      expect(currentRows[1]).toBe(survivingSecondRow);
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-c">C</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-d">D</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should preserve existing repeated DOM nodes when observed array items are appended via array replacement", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();

      const originalRows = elem.querySelectorAll("li");
      const firstRow = originalRows[0];
      const secondRow = originalRows[1];

      firstRow.setAttribute("data-row", "survivor-a");
      secondRow.setAttribute("data-row", "survivor-b");

      $rootScope.items = $rootScope.items.concat([{ a: "C" }, { a: "D" }]);
      await wait();

      const currentRows = elem.querySelectorAll("li");

      expect(currentRows.length).toBe(4);
      expect(currentRows[0]).toBe(firstRow);
      expect(currentRows[1]).toBe(secondRow);
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-b">B</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">C</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">D</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should refresh positional locals while preserving retained DOM nodes when observed array items are appended via array replacement", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items"><span class="label" ng-bind="item.a"></span>:<span class="last" ng-bind="$last"></span></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();

      const originalRows = elem.querySelectorAll("li");
      const firstRow = originalRows[0];
      const secondRow = originalRows[1];

      $rootScope.items = $rootScope.items.concat([{ a: "C" }]);
      await wait();

      const currentRows = Array.from(elem.querySelectorAll("li"));
      const rowTexts = currentRows.map((row) => row.textContent);

      expect(currentRows.length).toBe(3);
      expect(currentRows[0]).toBe(firstRow);
      expect(currentRows[1]).toBe(secondRow);
      expect(rowTexts).toEqual(["A:false", "B:false", "C:true"]);
      elem.remove();
    });

    it("should preserve existing repeated DOM nodes when observed array items are appended via push", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();

      const originalRows = elem.querySelectorAll("li");
      const firstRow = originalRows[0];
      const secondRow = originalRows[1];

      firstRow.setAttribute("data-row", "survivor-a");
      secondRow.setAttribute("data-row", "survivor-b");

      $rootScope.items.push({ a: "C" }, { a: "D" });
      await wait();

      const currentRows = elem.querySelectorAll("li");

      expect(currentRows.length).toBe(4);
      expect(currentRows[0]).toBe(firstRow);
      expect(currentRows[1]).toBe(secondRow);
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-b">B</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">C</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">D</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should preserve existing repeated table rows when observed array items are appended via push", async () => {
      let elem = createElementFromHTML(
        "<table><tbody>" +
          '<tr ng-repeat="item in items"><td ng-bind="item.a"></td></tr>' +
          "</tbody></table>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();

      const originalRows = elem.querySelectorAll("tr");
      const firstRow = originalRows[0];
      const secondRow = originalRows[1];

      firstRow.setAttribute("data-row", "survivor-a");
      secondRow.setAttribute("data-row", "survivor-b");

      $rootScope.items.push({ a: "C" }, { a: "D" });
      await wait();

      const currentRows = elem.querySelectorAll("tr");
      const rowTexts = Array.from(currentRows).map((row) => row.textContent);

      expect(currentRows.length).toBe(4);
      expect(currentRows[0]).toBe(firstRow);
      expect(currentRows[1]).toBe(secondRow);
      expect(rowTexts).toEqual(["A", "B", "C", "D"]);
      expect(currentRows[0].getAttribute("data-row")).toBe("survivor-a");
      expect(currentRows[1].getAttribute("data-row")).toBe("survivor-b");
      elem.remove();
    });

    it("should preserve repeated DOM nodes when observed array items are swapped by index", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }, { a: "D" }];
      await wait();

      const originalRows = elem.querySelectorAll("li");
      const secondRow = originalRows[1];
      const fourthRow = originalRows[3];

      secondRow.setAttribute("data-row", "survivor-b");
      fourthRow.setAttribute("data-row", "survivor-d");

      const tmp = $rootScope.items[1];

      $rootScope.items[1] = $rootScope.items[3];
      $rootScope.items[3] = tmp;
      await wait();

      const currentRows = elem.querySelectorAll("li");

      expect(currentRows[1]).toBe(fourthRow);
      expect(currentRows[3]).toBe(secondRow);
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-d">D</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">C</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-b">B</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should still refresh $index bindings when observed array items are swapped by index", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items"><span class="index" ng-bind="$index"></span>:<span class="label" ng-bind="item.a"></span></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }];
      await wait();

      const tmp = $rootScope.items[0];

      $rootScope.items[0] = $rootScope.items[2];
      $rootScope.items[2] = tmp;
      await wait();

      const rows = Array.from(elem.querySelectorAll("li")).map(
        (row) => row.textContent,
      );

      expect(rows).toEqual(["0:C", "1:B", "2:A"]);
      elem.remove();
    });

    it("should still refresh $index bindings when leading observed array items are removed in bulk", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items"><span class="index" ng-bind="$index"></span>:<span class="label" ng-bind="item.a"></span></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }, { a: "D" }];
      await wait();

      $rootScope.items.splice(0, 2);
      await wait();

      const rows = Array.from(elem.querySelectorAll("li")).map(
        (row) => row.textContent,
      );

      expect(rows).toEqual(["0:C", "1:D"]);
      elem.remove();
    });

    it("should still refresh $index bindings when observed array items are inserted at the head", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items"><span class="index" ng-bind="$index"></span>:<span class="label" ng-bind="item.a"></span></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }];
      await wait();

      $rootScope.items.splice(0, 0, { a: "X" }, { a: "Y" });
      await wait();

      const rows = Array.from(elem.querySelectorAll("li")).map(
        (row) => row.textContent,
      );

      expect(rows).toEqual(["0:X", "1:Y", "2:A", "3:B", "4:C"]);
      elem.remove();
    });

    it("should preserve surviving repeated DOM nodes when observed array items are removed from the middle", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }, { a: "D" }];
      await wait();

      const originalRows = elem.querySelectorAll("li");
      const survivingPrefixRow = originalRows[0];
      const survivingSuffixRow = originalRows[3];

      survivingPrefixRow.setAttribute("data-row", "survivor-a");
      survivingSuffixRow.setAttribute("data-row", "survivor-d");

      $rootScope.items.splice(1, 2);
      await wait();

      const currentRows = elem.querySelectorAll("li");

      expect(currentRows.length).toBe(2);
      expect(currentRows[0]).toBe(survivingPrefixRow);
      expect(currentRows[1]).toBe(survivingSuffixRow);
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-d">D</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should preserve surviving repeated DOM nodes when observed array items are removed from the tail", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }, { a: "D" }];
      await wait();

      const originalRows = elem.querySelectorAll("li");
      const survivingFirstRow = originalRows[0];
      const survivingSecondRow = originalRows[1];
      const survivingThirdRow = originalRows[2];

      survivingFirstRow.setAttribute("data-row", "survivor-a");
      survivingSecondRow.setAttribute("data-row", "survivor-b");
      survivingThirdRow.setAttribute("data-row", "survivor-c");

      $rootScope.items.pop();
      await wait();

      const currentRows = elem.querySelectorAll("li");

      expect(currentRows.length).toBe(3);
      expect(currentRows[0]).toBe(survivingFirstRow);
      expect(currentRows[1]).toBe(survivingSecondRow);
      expect(currentRows[2]).toBe(survivingThirdRow);
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-b">B</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" data-row="survivor-c">C</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should clear repeated DOM when an observed array is truncated via length assignment", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();
      expect(elem.querySelectorAll("li").length).toBe(2);

      $rootScope.items.length = 0;
      await wait();

      expect(elem.outerHTML).toBe("<ul><!----></ul>");
      elem.remove();
    });

    it("should remove extra repeated rows when an observed array is truncated to a non-zero length", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }, { a: "C" }];
      await wait();
      expect(elem.querySelectorAll("li").length).toBe(3);

      $rootScope.items.length = 1;
      await wait();

      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should render empty repeated rows when an observed array grows via length assignment", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();
      expect(elem.querySelectorAll("li").length).toBe(2);

      $rootScope.items.length = 4;
      await wait();

      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">B</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should remove empty repeated rows when a sparse observed array is shrunk back to a dense length", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();

      $rootScope.items.length = 4;
      await wait();
      expect(elem.querySelectorAll("li").length).toBe(4);

      $rootScope.items.length = 2;
      await wait();

      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">B</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should reorder repeated rows when an observed array is reversed", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "C" }, { a: "A" }, { a: "B" }];
      await wait();

      $rootScope.items.reverse();
      await wait();

      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">B</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">C</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should reorder repeated rows when an observed array is sorted", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "C" }, { a: "A" }, { a: "B" }];
      await wait();

      $rootScope.items.sort((left, right) => left.a.localeCompare(right.a));
      await wait();

      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a">A</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">B</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a">C</li>' +
          "</ul>",
      );
      elem.remove();
    });

    it("should update ng-repeat when proxied collection items are swapped directly", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      $rootScope.items = [{ a: "A" }, { a: "B" }];
      await wait();

      let lis = elem.querySelectorAll("li");
      const firstRow = lis[0];
      const secondRow = lis[1];

      firstRow.setAttribute("mark", "first");
      secondRow.setAttribute("mark", "second");

      const tmp = $rootScope.items[0];

      $rootScope.items[0] = $rootScope.items[1];
      $rootScope.items[1] = tmp;
      await wait();

      lis = elem.querySelectorAll("li");
      expect(elem.outerHTML).toBe(
        "<ul><!---->" +
          '<li ng-repeat="item in items" ng-bind="item.a" mark="second">B</li>' +
          '<li ng-repeat="item in items" ng-bind="item.a" mark="first">A</li>' +
          "</ul>",
      );
      expect(lis[0]).toBe(secondRow);
      expect(lis[1]).toBe(firstRow);
      elem.remove();
    });

    it("should keep nested child scopes alive when proxied collection items are swapped directly", async () => {
      let elem = createElementFromHTML(
        "<ul>" +
          '<li ng-repeat="item in items" ng-bind="item.a"></li>' +
          "</ul>",
      );
      document.getElementById("app").insertAdjacentElement("afterend", elem);
      $injector = window.angular.bootstrap(elem, ["myModule"]);
      $rootScope = $injector.get("$rootScope");

      const nestedA = $rootScope.$new();
      const nestedB = $rootScope.$new();
      const destroyA = jasmine.createSpy("nestedA destroy");
      const destroyB = jasmine.createSpy("nestedB destroy");

      nestedA.$on("$destroy", destroyA);
      nestedB.$on("$destroy", destroyB);

      $rootScope.items = [
        { a: "A", nested: nestedA },
        { a: "B", nested: nestedB },
      ];
      await wait();

      const tmp = $rootScope.items[0];

      $rootScope.items[0] = $rootScope.items[1];
      $rootScope.items[1] = tmp;
      await wait();

      expect(elem.textContent).toBe("BA");
      expect(destroyA).not.toHaveBeenCalled();
      expect(destroyB).not.toHaveBeenCalled();
      expect(nestedA.$handler._destroyed).toBeFalse();
      expect(nestedB.$handler._destroyed).toBeFalse();
      elem.remove();
    });
  });

  it("should update ng-repeat when proxied collection items are swapped directly", async () => {
    let elem = createElementFromHTML(
      "<ul>" + '<li ng-repeat="item in items" ng-bind="item.a"></li>' + "</ul>",
    );
    document.getElementById("app").insertAdjacentElement("afterend", elem);
    $injector = window.angular.bootstrap(elem, ["myModule"]);
    $rootScope = $injector.get("$rootScope");

    $rootScope.items = [{ a: "A" }, { a: "B" }];
    await wait();

    let lis = elem.querySelectorAll("li");
    const firstRow = lis[0];
    const secondRow = lis[1];

    firstRow.setAttribute("mark", "first");
    secondRow.setAttribute("mark", "second");

    const tmp = $rootScope.items[0];

    $rootScope.items[0] = $rootScope.items[1];
    $rootScope.items[1] = tmp;
    await wait();

    lis = elem.querySelectorAll("li");
    expect(elem.outerHTML).toBe(
      "<ul><!---->" +
        '<li ng-repeat="item in items" ng-bind="item.a" mark="second">B</li>' +
        '<li ng-repeat="item in items" ng-bind="item.a" mark="first">A</li>' +
        "</ul>",
    );
    expect(lis[0]).toBe(secondRow);
    expect(lis[1]).toBe(firstRow);
    elem.remove();
  });

  it("should keep nested child scopes alive when proxied collection items are swapped directly", async () => {
    let elem = createElementFromHTML(
      "<ul>" + '<li ng-repeat="item in items" ng-bind="item.a"></li>' + "</ul>",
    );
    document.getElementById("app").insertAdjacentElement("afterend", elem);
    $injector = window.angular.bootstrap(elem, ["myModule"]);
    $rootScope = $injector.get("$rootScope");

    const nestedA = $rootScope.$new();
    const nestedB = $rootScope.$new();
    const destroyA = jasmine.createSpy("nestedA destroy");
    const destroyB = jasmine.createSpy("nestedB destroy");

    nestedA.$on("$destroy", destroyA);
    nestedB.$on("$destroy", destroyB);

    $rootScope.items = [
      { a: "A", nested: nestedA },
      { a: "B", nested: nestedB },
    ];
    await wait();

    const tmp = $rootScope.items[0];

    $rootScope.items[0] = $rootScope.items[1];
    $rootScope.items[1] = tmp;
    await wait();

    expect(elem.textContent).toBe("BA");
    expect(destroyA).not.toHaveBeenCalled();
    expect(destroyB).not.toHaveBeenCalled();
    expect(nestedA.$handler._destroyed).toBeFalse();
    expect(nestedB.$handler._destroyed).toBeFalse();
    elem.remove();
  });

  it("should bind repeated content when the repeated collection becomes available", async () => {
    element = $compile(
      "<ul>" +
        '<LI ng-repeat="item in model.items"><span ng-bind="item.a"></span></li>' +
        "</ul>",
    )($rootScope);
    await wait();
    $rootScope.model = { items: [{ a: "A" }] };
    await wait();
    expect(element.outerHTML).toBe(
      "<ul><!---->" +
        '<li ng-repeat="item in model.items"><span ng-bind="item.a">A</span></li>' +
        "</ul>",
    );
  });

  it("should preserve a custom action attribute on a submit input", async function () {
    const html = await this.compileToHtml(
      '<input type="submit" value="Save" action="foo();">',
    );
    expect(html.indexOf('action="foo();"')).toBeGreaterThan(0);
  });

  it("should remove extra repeated children when iterating over an object that shrinks", async () => {
    element = $compile('<div><div ng-repeat="i in items">{{i}}</div></div>')(
      $rootScope,
    );
    $rootScope.items = {};

    await wait();
    expect(element.textContent).toEqual("");

    $rootScope.items.name = "misko";
    await wait();
    expect(element.textContent).toEqual("misko");

    delete $rootScope.items.name;
    await wait();
    expect(element.textContent).toEqual("");
  });

  it("should report interpolation errors from attribute bindings and recover afterward", async () => {
    $compile(
      '<div attr="before {{error.throw()}} after"></div>',
      null,
      true,
    )($rootScope);
    let count = 0;

    $rootScope.error = {
      throw: function () {
        throw new Error(`ErrorMsg${++count}`);
      },
    };
    await wait();
    expect(errors.length).not.toEqual(0);
    expect(errors.shift()).toMatch(/ErrorMsg1/);
    errors.length = 0;

    $rootScope.error.throw = function () {
      return "X";
    };
    await wait();
    expect(errors.length).toMatch("0");
  });

  it("should render nested ng-repeat blocks for nested collections", async () => {
    element = $compile(
      "<div>" +
        '<div ng-repeat="m in model" name="{{m.name}}">' +
        '<ul name="{{i}}" ng-repeat="i in m.item"></ul>' +
        "</div>" +
        "</div>",
    )($rootScope);
    $rootScope.model = [
      { name: "a", item: ["a1", "a2"] },
      { name: "b", item: ["b1", "b2"] },
    ];
    await wait();
    expect(element.outerHTML).toBe(
      `<div>` +
        `<!---->` +
        `<div ng-repeat="m in model" name="a">` +
        `<!---->` +
        `<ul name="a1" ng-repeat="i in m.item"></ul>` +
        `<ul name="a2" ng-repeat="i in m.item"></ul>` +
        `</div>` +
        `<div ng-repeat="m in model" name="b">` +
        `<!---->` +
        `<ul name="b1" ng-repeat="i in m.item"></ul>` +
        `<ul name="b2" ng-repeat="i in m.item"></ul>` +
        `</div>` +
        `</div>`,
    );
  });

  it("should toggle ng-hide from an expression result", async () => {
    element = $compile('<div ng-hide="hidden === 3"/>')($rootScope);

    $rootScope.hidden = 3;
    await wait();

    expect(element.classList.contains("ng-hide")).toBe(true);

    $rootScope.hidden = 2;
    await wait();
    expect(element.classList.contains("ng-hide")).toBe(false);
  });

  it("should apply ng-hide according to truthy and falsy values", async () => {
    element = $compile('<div ng-hide="hidden"/>')($rootScope);

    $rootScope.hidden = "true";
    await wait();
    expect(element.classList.contains("ng-hide")).toBeTrue();

    $rootScope.hidden = "false";
    await wait();
    expect(element.classList.contains("ng-hide")).toBeTrue();

    $rootScope.hidden = 0;
    await wait();
    expect(element.classList.contains("ng-hide")).toBeFalse();

    $rootScope.hidden = false;
    await wait();
    expect(element.classList.contains("ng-hide")).toBeFalse();

    $rootScope.hidden = "";
    await wait();
    expect(element.classList.contains("ng-hide")).toBeFalse();
  });

  it("should apply ng-show according to truthy and falsy values", async () => {
    element = $compile('<div ng-show="show"/>')($rootScope);

    $rootScope.show = "true";
    await wait();
    expect(element.classList.contains("ng-hide")).toBeFalse();

    $rootScope.show = "false";
    await wait();
    expect(element.classList.contains("ng-hide")).toBeFalse();

    $rootScope.show = false;
    await wait();
    expect(element.classList.contains("ng-hide")).toBeTrue();

    $rootScope.show = "";
    await wait();
    expect(element.classList.contains("ng-hide")).toBeTrue();
  });

  it("should apply ng-class values from strings and arrays", async () => {
    element = $compile('<div ng-class="clazz"/>')($rootScope);

    $rootScope.clazz = "testClass";
    await wait();

    expect(element.classList.contains("testClass")).toBeTrue();

    $rootScope.clazz = ["a", "b"];
    await wait();
    expect(element.classList.contains("a")).toBeTrue();
    expect(element.classList.contains("b")).toBeTrue();
  });

  it("should apply ng-style values from the evaluated style object", async () => {
    element = $compile('<div ng-style="style"/>')($rootScope);

    $rootScope.$eval('style={height: "10px"}');
    await wait();

    expect(element.style["height"]).toBe("10px");

    $rootScope.$eval("style={}");
    await wait();
  });

  it("should report errors thrown from an ng-click handler on a link", async () => {
    const input = $compile('<a ng-click="action()">Add Phone</a>')($rootScope);
    $rootScope.action = function () {
      throw new Error("MyError");
    };
    await wait();
    input.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );

    expect(errors[0]).toMatch(/MyError/);
  });

  it("should ignore bindings inside ng-non-bindable sections", async () => {
    element = $compile(
      "<div>{{a}}" +
        "<div ng-non-bindable>{{a}}</div>" +
        "<div ng-non-bindable=''>{{b}}</div>" +
        "<div ng-non-bindable='true'>{{c}}</div>" +
        "</div>",
    )($rootScope);
    $rootScope.a = 123;
    await wait();
    expect(element.textContent).toBe("123{{a}}{{b}}{{c}}");
  });

  it("should preserve and bind interpolation inside preformatted elements", async () => {
    element = $compile("<pre>Hello {{name}}!</pre>")($rootScope);
    $rootScope.name = "World";
    await wait();

    expect(element.outerHTML).toBe(`<pre>Hello World!</pre>`);
  });

  it("should fill in option values when an option value attribute is missing", async () => {
    element = $compile(
      '<select ng-model="foo">' +
        '<option selected="true">{{a}}</option>' +
        '<option value="">{{b}}</option>' +
        "<option>C</option>" +
        "</select>",
    )($rootScope);
    $rootScope.a = "A";
    $rootScope.b = "B";
    await wait();

    const optionA = childNode(element, 0);
    const optionB = childNode(element, 1);
    const optionC = childNode(element, 2);

    expect(optionA.getAttribute("value")).toEqual("A");
    expect(optionA.textContent).toEqual("A");

    expect(optionB.getAttribute("value")).toEqual("");
    expect(optionB.textContent).toEqual("B");

    expect(optionC.getAttribute("value")).toEqual("C");
    expect(optionC.textContent).toEqual("C");
  });

  it("should keep radio inputs synchronized with the bound model", async () => {
    const ELEMENT = document.getElementById("app");
    ELEMENT.innerHTML =
      "<div>" +
      '<input type="radio" name="sex" ng-model="sex" value="female">' +
      '<input type="radio" name="sex" ng-model="sex" value="male">' +
      "{{ sex }} " +
      "</div>";
    $compile(ELEMENT)($rootScope);
    await wait();
    const female = ELEMENT.firstChild.childNodes[0];
    const male = ELEMENT.firstChild.childNodes[1];

    female.checked = true;
    browserTrigger(female, "change");
    await wait();
    expect($rootScope.sex).toBe("female");

    male.checked = true;
    browserTrigger(male, "change");
    await wait();
    expect(female.checked).toBe(false);
    expect($rootScope.sex).toBe("male");
  });

  it("should repeat over object literals with ng-repeat", async () => {
    element = $compile(
      "<ul>" +
        '<li ng-repeat="(k,v) in {a:0,b:1}" ng-bind="k + v"></li>' +
        "</ul>",
    )($rootScope);
    await wait();
    expect(element.outerHTML).toBe(
      "<ul><!---->" +
        '<li ng-repeat="(k,v) in {a:0,b:1}" ng-bind="k + v">a0</li>' +
        '<li ng-repeat="(k,v) in {a:0,b:1}" ng-bind="k + v">b1</li>' +
        "</ul>",
    );
  });

  it("should fire change listeners before the bound DOM is updated", async () => {
    element = $compile('<div ng-bind="name"></div>')($rootScope);
    $rootScope.name = "";
    $rootScope.$watch("watched", () => {
      $rootScope.name = 123;
    });
    $rootScope.watched = "change";
    await wait();
    expect($rootScope.name).toBe(123);
    expect(element.outerHTML).toBe('<div ng-bind="name">123</div>');
  });

  it("should evaluate multiline interpolation expressions", async () => {
    element = $compile("<div>{{\n 1 \n + \n 2 \n}}</div>")($rootScope);
    await wait();
    expect(element.textContent).toBe("3");
  });
});
