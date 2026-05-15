// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { browserTrigger, wait, waitUntil } from "../../shared/test-utils.ts";
import { dealoc } from "../../shared/dom.ts";

describe("ng-post", () => {
  let $compile, $rootScope, $log, el;

  async function waitForText(text) {
    await waitUntil(() => el.innerText === text || el.textContent === text);
  }

  async function waitForNumericResponse(previous?: number) {
    await waitUntil(() => {
      const value = parseInt(el.innerText);

      return (
        Number.isFinite(value) && (previous === undefined || value > previous)
      );
    });

    return parseInt(el.innerText);
  }

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";
    const angular = new Angular();

    angular.module("default", []).config([
      "$stateProvider",
      "$locationProvider",
      ($stateProvider) => {
        $stateProvider
          .state({
            name: "success",
            url: "/success",
            template: `success`,
          })
          .state({
            name: "error",
            url: "/error",
            template: `error`,
          });
      },
    ]);
    angular
      .bootstrap(el, ["default"])
      .invoke((_$compile_, _$rootScope_, _$log_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $log = _$log_;
      });
  });

  it("should replace innerHTML (default) on click", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-post="/mock/hello">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await waitForText("Hello");
    expect(el.innerText).toBe("Hello");
  });

  it("should replace innerHTML (default) on click when used with expression", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-post="/mock/{{a}}">Load</button>';
    scope.a = "hello";
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await waitUntil(() => el.firstChild.innerHTML === "<div>Hello</div>");
    expect(el.firstChild.innerHTML).toBe("<div>Hello</div>");
  });

  it("should attach parameters of a form and replace innerHTML (default) on click", async () => {
    const scope = $rootScope.$new();

    el.innerHTML =
      '<form ng-post="/mock/posthtml"><input name="name" value="Bob" /><button type="submit">Load</button></form>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("form"), "submit");
    await waitForText("Bob");
    expect(el.innerText).toBe("Bob");
  });

  it("should use json encoding by default", async () => {
    const scope = $rootScope.$new();

    el.innerHTML =
      '<form ng-post="/mock/json"> {{ name }} <input name="name" value="Bob" /><button type="submit">Load</button></form>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("form"), "submit");
    await waitForText("Bob Load");
    expect(el.innerText).toBe("Bob Load");
  });

  it("should use encoding in enctype", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = `
      <form ng-post="/mock/urlencoded" enctype="application/x-www-form-urlencoded">
        <input type="text" name="name" value="Bob"/>
        <button type="submit">Load</button>
      </form>`;
    $compile(el)(scope);
    browserTrigger(el.querySelector("form"), "submit");
    await waitForText("Form data: Bob");
    expect(el.innerText).toBe("Form data: Bob");
  });

  it("should compile and swap streamed HTML responses", async () => {
    const scope = $rootScope.$new();

    scope.first = "A";
    scope.second = "B";
    el.innerHTML =
      '<button ng-post="/mock/stream-html" response-type="stream" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await waitUntil(() => el.querySelector("#found").textContent === "AB");
    expect(el.querySelector("#found").textContent).toBe("AB");
  });

  it("should accept data-response-stream as a responseType shortcut", async () => {
    const scope = $rootScope.$new();

    scope.first = "C";
    scope.second = "D";
    el.innerHTML =
      '<button ng-post="/mock/stream-html" data-response-stream data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await waitUntil(() => el.querySelector("#found").textContent === "CD");
    expect(el.querySelector("#found").textContent).toBe("CD");
  });

  it("should attach parameters of a form and replace innerHTML (default) on click in case of error", async () => {
    const scope = $rootScope.$new();

    el.innerHTML =
      '<form ng-post="/mock/posterror"><input name="name" value="Bob"><button type="submit">Load</button></form>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("form"), "submit");
    await waitForText("Error");

    expect(el.innerText).toBe("Error");
  });

  it("should replace innerHTML on error", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-post="/mock/422">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await waitForText("Invalid data");

    expect(el.innerText).toBe("Invalid data");
  });

  it("should not trigger request if element is disabled", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-post="/mock/hello" disabled>Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait();

    expect(el.innerText).toBe("Load");
  });

  it("should replace innerHTML on status error without a body", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-post="/mock/401">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await waitForText("Unauthorized");

    expect(el.innerText).toBe("Unauthorized");
  });

  describe("data-trigger", () => {
    it("should not trigger request on click if element has trigger attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-trigger="mouseover">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait();

      expect(el.innerText).toBe("Load");
    });

    it("should trigger request on new event name if element has trigger attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-trigger="mouseover">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "mouseover");
      await waitForText("Hello");

      expect(el.innerText).toBe("Hello");
    });
  });

  describe("data-latch", () => {
    it("should trigger request on latch change", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/now" data-latch="{{ latch }}">Load</button>';
      $compile(el)(scope);
      await wait();
      expect(el.innerText).toBe("Load");

      scope.latch = true;
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      scope.latch = !scope.latch;
      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);

      scope.latch = !scope.latch;
      const thirdRes = await waitForNumericResponse(secondRes);

      expect(thirdRes).toBeGreaterThan(secondRes);
    });

    it("should still work with events with latch change", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/now" data-latch="{{ latch }}">Load</button>';
      $compile(el)(scope);
      await wait();
      expect(el.innerText).toBe("Load");

      scope.latch = true;
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(el.querySelector("button"), "click");
      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);
    });

    it("should still work with custom events with latch change", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/now" data-latch="{{ latch }}" data-trigger="mouseover">Load</button>';
      $compile(el)(scope);
      await wait();
      expect(el.innerText).toBe("Load");

      scope.latch = true;
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(el.querySelector("button"), "mouseover");
      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);
    });

    it("should still work with ng-event directives with latch change", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/now" data-latch="{{ latch }}" ng-mouseover="latch = !latch">Load</button>';
      $compile(el)(scope);
      await wait();
      expect(el.innerText).toBe("Load");

      browserTrigger(el.querySelector("button"), "mouseover");
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(el.querySelector("button"), "mouseover");
      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);
    });
  });

  describe("data-swap", () => {
    it("should not change anything if swap is 'none'", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/div" data-swap="none" data-target="#found">Load</button><div id="found">Original</div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait();

      expect(el.querySelector("#found").textContent).toBe("Original");
    });

    it("should replace outerHTML on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-swap="outerHTML">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitForText("Hello");

      expect(el.innerText).toBe("Hello");
    });

    it("should replace textcontent on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-swap="textContent">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => el.textContent === "<div>Hello</div>");

      expect(el.textContent).toBe("<div>Hello</div>");
    });

    it("should replace beforebegin on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/div" data-swap="beforebegin">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => el.firstChild.innerText === "Hello");

      expect(el.firstChild.innerText).toBe("Hello");
    });

    it("should replace beforeend on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/div" data-swap="beforeend">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => el.firstChild.lastChild.innerText === "Hello");

      expect(el.firstChild.lastChild.innerText).toBe("Hello");
    });

    it("should delete the target on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-swap="delete" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => el.querySelector("#found") === null);

      expect(el.querySelector("#found")).toBeNull();
    });
  });

  describe("data-target", () => {
    it("should remain unchanged if target is not found and log a warning", async () => {
      const scope = $rootScope.$new();

      spyOn($log, "warn");
      el.innerHTML =
        '<button ng-post="/mock/hello" data-target="#missing">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => $log.warn.calls.any());

      expect(el.firstChild.innerText).toBe("Load");
      expect($log.warn).toHaveBeenCalled();
    });

    it("should replace target innerHTML (default) on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => el.lastChild.innerHTML === "<div>Hello</div>");

      expect(el.lastChild.innerHTML).toBe("<div>Hello</div>");
    });

    it("should replace textcontent on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-swap="textContent" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => el.lastChild.textContent === "<div>Hello</div>");

      expect(el.lastChild.textContent).toBe("<div>Hello</div>");
    });

    it("should replace beforebegin on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/div" data-swap="beforebegin" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(
        () =>
          el.querySelector("#found")?.previousSibling?.textContent === "Hello",
      );

      const found = el.querySelector("#found");

      const prevSibling = found.previousSibling;

      expect(prevSibling.textContent).toBe("Hello");
      expect(found.textContent).toBe("");
    });

    it("should replace beforeend on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/div" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(
        () => el.querySelector("#found")?.textContent === "Hello",
      );

      expect(el.querySelector("#found").textContent).toBe("Hello");
    });

    it("should insert afterbegin on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/div" data-swap="afterbegin" data-target="#found">Load</button><div id="found"><div>World</div></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(
        () => el.querySelector("#found")?.textContent === "HelloWorld",
      );

      expect(el.querySelector("#found").textContent).toBe("HelloWorld");
    });

    it("should insert afterend on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/div" data-swap="afterend" data-target="#found">Load</button><div id="found"><div>World</div></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => el.lastChild.textContent === "Hello");

      expect(el.lastChild.textContent).toBe("Hello");
    });
  });

  describe("data-delay", () => {
    it("should accept delay as a data attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-delay="1000">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.innerText).toBe("Load");

      await wait(1000);
      await waitForText("Hello");
      expect(el.innerText).toBe("Hello");
    });
  });

  describe("data-throttle", () => {
    it("should accept throttle as a data attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/now" data-throttle="1000">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const secondRes = parseInt(el.innerText);

      expect(secondRes).toBe(firstRes);

      await wait(900);
      browserTrigger(el.querySelector("button"), "click");
      const thirdRes = await waitForNumericResponse(firstRes);

      expect(thirdRes).toBeGreaterThan(firstRes);
    });
  });

  describe("data-interval", () => {
    it("should accept delay as a data attribute and should stop on $destroy", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/now" data-interval="100">Load</button>';
      $compile(el)(scope);

      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);

      const thirdRes = await waitForNumericResponse(secondRes);

      expect(thirdRes).toBeGreaterThan(secondRes);

      scope.$broadcast("$destroy");

      await wait();
      const finalRes = parseInt(el.innerText);

      await wait(1000);
      await wait(200);
      expect(parseInt(el.innerText)).toEqual(finalRes);
    });
  });

  describe("data-loading", () => {
    it("should update loading data attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML = '<button ng-post="/mock/now" data-loading>Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");

      expect(el.querySelector("button").dataset.loading).toEqual("true");
      await waitUntil(
        () => el.querySelector("button").dataset.loading === "false",
      );
      expect(el.querySelector("button").dataset.loading).toEqual("false");
    });
  });

  describe("data-loading-class", () => {
    it("should update class from data-loading-class attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/now" data-loading-class="red">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");

      expect(el.querySelector("button").classList.contains("red")).toBeTrue();
      await waitUntil(
        () => !el.querySelector("button").classList.contains("red"),
      );
      expect(el.querySelector("button").classList.contains("red")).toBeFalse();
    });
  });

  describe("data-success", () => {
    it("should evaluate expression passing result", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-success="res = $res">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => scope.res === "<div>Hello</div>");

      expect(scope.res).toEqual("<div>Hello</div>");
    });
  });

  describe("data-state-success", () => {
    it("should call stateService with success state", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/hello" data-state-success="success">Load</button><ng-view id="view"></ng-view>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(
        () => document.getElementById("view").innerHTML === "success",
      );

      expect(document.getElementById("view").innerHTML).toEqual("success");
    });
  });

  describe("data-state-error", () => {
    it("should call stateService with error state", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/422" data-state-success="success" data-state-error="error">Load</button><ng-view id="view"></ng-view>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(
        () => document.getElementById("view").innerHTML === "error",
      );

      expect(document.getElementById("view").innerHTML).toEqual("error");
    });
  });

  describe("data-error", () => {
    it("should evaluate expression passing result", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-post="/mock/422" data-error="res = $res">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await waitUntil(() => scope.res === "Invalid data");

      expect(scope.res).toEqual("Invalid data");
    });
  });
});
