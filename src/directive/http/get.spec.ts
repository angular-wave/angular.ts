// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";
import { dealoc } from "../../shared/dom.ts";

function createAnimateSpy() {
  const calls = [];

  const runner = {
    done(callback) {
      callback(true);

      return runner;
    },
  };

  return {
    calls,
    enter(node, parent, after) {
      calls.push({ event: "enter", node, parent, after });

      if (parent) {
        parent.insertBefore(node, after ? after.nextSibling : null);
      }

      return runner;
    },
    leave(node) {
      calls.push({ event: "leave", node });

      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }

      return runner;
    },
  };
}

describe("ng-get", () => {
  let $compile, $rootScope, $log, $stream, el, animateSpy;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";
    animateSpy = createAnimateSpy();
    const angular = new Angular();

    angular.module("default", []).config([
      "$provide",
      "$stateProvider",
      "$locationProvider",
      ($provide, $stateProvider) => {
        $provide.value("$animate", animateSpy);

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
      .invoke((_$compile_, _$rootScope_, _$log_, _$stream_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $log = _$log_;
        $stream = _$stream_;
      });
  });

  it("should use $animate.enter for animated element responses", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-get="/mock/div" animate="true">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(animateSpy.calls.map((call) => call.event)).toEqual(["enter"]);
    expect(el.textContent).toContain("Hello");
  });

  it("should use $animate.leave before entering an animated replacement", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-get="/mock/div" animate="true">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(animateSpy.calls.map((call) => call.event)).toEqual([
      "enter",
      "leave",
      "enter",
    ]);
    expect(el.textContent).toContain("Hello");
  });

  it("should use $animate for animated outerHTML replacements", async () => {
    const scope = $rootScope.$new();

    el.innerHTML =
      '<button ng-get="/mock/div" animate="true" data-swap="outerHTML">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(animateSpy.calls.map((call) => call.event)).toEqual([
      "leave",
      "enter",
    ]);
    expect(el.textContent).toContain("Hello");
  });

  it("should not animate text-node responses", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-get="/mock/hello" animate="true">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(animateSpy.calls).toEqual([]);
    expect(el.textContent).toBe("Hello");
  });

  it("should replace innerHTML (default) on click", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-get="/mock/hello">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(el.innerText).toBe("Hello");
  });

  it("should replace innerHTML (default) on click when used with expression", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-get="/mock/{{a}}">Load</button>';
    scope.a = "div";
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(el.firstChild.innerHTML).toBe("<div>Hello</div>");
  });

  it("should compile innerHTML", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-get="/mock/divexpr">Load</button>';
    scope.expr = "World";
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(el.innerText).toBe("World");
  });

  it("should replace innerHTML on error", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-get="/mock/422">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(el.innerText).toBe("Invalid data");
  });

  it("should not trigger request if element is disabled", async () => {
    el.innerHTML = '<button ng-get="/mock/hello" disabled>Load</button>';
    const scope = $rootScope.$new();

    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(el.innerText).toBe("Load");
  });

  it("should replace innerHTML on status error without a body", async () => {
    const scope = $rootScope.$new();

    el.innerHTML = '<button ng-get="/mock/401">Load</button>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(100);
    expect(el.innerText).toBe("Unauthorized");
  });

  describe("data-trigger", () => {
    it("should not trigger request on click if element has trigger attribute", async () => {
      el.innerHTML =
        '<button ng-get="/mock/hello" data-trigger="mouseover">Load</button>';
      const scope = $rootScope.$new();

      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.innerText).toBe("Load");
    });

    it("should trigger request on new event name if element has trigger attribute", async () => {
      el.innerHTML =
        '<button ng-get="/mock/hello" data-trigger="mouseover">Load</button>';
      const scope = $rootScope.$new();

      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "mouseover");
      await wait(100);
      expect(el.innerText).toBe("Hello");
    });
  });

  describe("data-latch", () => {
    it("should trigger request on latch change", async () => {
      el.innerHTML =
        '<button ng-get="/mock/now" data-latch="{{ latch }}">Load</button>';
      const scope = $rootScope.$new();

      $compile(el)(scope);
      await wait(100);
      expect(el.innerText).toBe("Load");
      scope.latch = true;
      await wait(100);
      expect(el.innerText).not.toBe("Load");
      const firstRes = parseInt(el.innerText);

      expect(firstRes).toBeLessThan(Date.now());

      scope.latch = !scope.latch;
      await wait(100);
      const secondRes = parseInt(el.innerText);

      expect(secondRes).toBeGreaterThan(firstRes);

      scope.latch = !scope.latch;
      await wait(100);
      const thirdRes = parseInt(el.innerText);

      expect(thirdRes).toBeGreaterThan(secondRes);
    });

    it("should still work with events with latch change", async () => {
      el.innerHTML =
        '<button ng-get="/mock/now" data-latch="{{ latch }}">Load</button>';
      const scope = $rootScope.$new();

      $compile(el)(scope);
      await wait(100);
      expect(el.innerText).toBe("Load");
      scope.latch = true;
      await wait(100);
      expect(el.innerText).not.toBe("Load");
      const firstRes = parseInt(el.innerText);

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const secondRes = parseInt(el.innerText);

      expect(secondRes).toBeGreaterThan(firstRes);
    });

    it("should still work with custom events with latch change", async () => {
      el.innerHTML =
        '<button ng-get="/mock/now" data-latch="{{ latch }}" data-trigger="mouseover">Load</button>';
      const scope = $rootScope.$new();

      $compile(el)(scope);
      await wait(100);
      expect(el.innerText).toBe("Load");
      scope.latch = true;
      await wait(100);
      expect(el.innerText).not.toBe("Load");
      const firstRes = parseInt(el.innerText);

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(el.querySelector("button"), "mouseover");
      await wait(100);
      const secondRes = parseInt(el.innerText);

      expect(secondRes).toBeGreaterThan(firstRes);
    });

    it("should still work with ng-event directives with latch change", async () => {
      el.innerHTML =
        '<button ng-get="/mock/now" data-latch="{{ latch }}" ng-mouseover="latch = !latch">Load</button>';
      const scope = $rootScope.$new();

      $compile(el)(scope);
      await wait(100);
      expect(el.innerText).toBe("Load");
      browserTrigger(el.querySelector("button"), "mouseover");
      await wait(100);
      expect(el.innerText).not.toBe("Load");
      const firstRes = parseInt(el.innerText);

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(el.querySelector("button"), "mouseover");
      await wait(100);
      const secondRes = parseInt(el.innerText);

      expect(secondRes).toBeGreaterThan(firstRes);
    });
  });

  describe("data-swap", () => {
    it("should not change anything if swap is 'none'", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="none" data-target="#found">Load</button><div id="found">Original</div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const found = el.querySelector("#found");

      expect(found.textContent).toBe("Original");
    });

    it("should replace outerHTML on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-swap="outerHTML">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.innerText).toBe("Hello");
    });

    it("should replace textcontent on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-swap="textContent">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.innerText).toBe("Hello");
    });

    it("should replace beforebegin on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="beforebegin">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.firstChild.innerText).toBe("Hello");
    });

    it("should replace beforeend on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="beforeend">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.firstChild.lastChild.innerText).toBe("Hello");
    });

    it("should delete the target on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-swap="delete" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.querySelector("#found")).toBeNull();
    });
  });

  describe("data-target", () => {
    it("should remain unchanged if target is not found and log a warning", async () => {
      const scope = $rootScope.$new();

      spyOn($log, "warn");
      el.innerHTML =
        '<button ng-get="/mock/hello" data-target="#missing">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.firstChild.innerText).toBe("Load");
      expect($log.warn).toHaveBeenCalled();
    });

    it("should replace target innerHTML (default) on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.lastChild.innerHTML).toBe("Hello");
    });

    it("should replace textcontent on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-swap="textContent" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.lastChild.innerText).toBe("Hello");
    });

    it("should replace beforebegin on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="beforebegin" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const found = el.querySelector("#found");

      // The sibling before #found should contain "Hello"
      const prevSibling = found.previousSibling;

      expect(prevSibling.textContent).toBe("Hello");
      expect(found.textContent).toBe(""); // found itself unchanged
    });

    it("should replace beforeend on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const found = el.querySelector("#found");

      expect(found.textContent).toBe("Hello");
    });

    it("should insert afterbegin on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="afterbegin" data-target="#found">Load</button><div id="found"><div>World</div></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const found = el.querySelector("#found");

      expect(found.textContent).toBe("HelloWorld");
    });

    it("should insert afterend on click", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="afterend" data-target="#found">Load</button><div id="found"><div>World</div></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const found = el.querySelector("#found");

      const next = found.nextSibling;

      expect(el.lastChild.textContent).toBe("Hello");
    });
  });

  describe("streams", () => {
    it("should compile and swap streamed HTML responses", async () => {
      const scope = $rootScope.$new();

      scope.first = "A";
      scope.second = "B";
      el.innerHTML =
        '<button ng-get="/mock/stream-html" response-type="stream" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(200);
      expect(el.querySelector("#found").textContent).toBe("AB");
    });

    it("should accept stream as a responseType shortcut", async () => {
      const scope = $rootScope.$new();

      scope.first = "C";
      scope.second = "D";
      el.innerHTML =
        '<button ng-get="/mock/stream-html" stream data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(200);
      expect(el.querySelector("#found").textContent).toBe("CD");
    });

    it("should accept data-response-stream as a responseType shortcut", async () => {
      const scope = $rootScope.$new();

      scope.first = "E";
      scope.second = "F";
      el.innerHTML =
        '<button ng-get="/mock/stream-html" data-response-stream data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(200);
      expect(el.querySelector("#found").textContent).toBe("EF");
    });

    it("should abort stream consumption when the directive scope is destroyed", async () => {
      const scope = $rootScope.$new();

      let signal;

      let resolveConsume;

      spyOn($stream, "consumeText").and.callFake((_stream, options) => {
        signal = options.signal;

        return new Promise((resolve) => {
          resolveConsume = resolve;
        });
      });

      el.innerHTML =
        '<button ng-get="/mock/stream-html" response-type="stream" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);

      expect(signal.aborted).toBe(false);

      scope.$destroy();
      resolveConsume();

      expect(signal.aborted).toBe(true);
    });
  });

  describe("ng-sse protocol", () => {
    it("should swap raw SSE message HTML", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-sse="/mock/sse-once" data-target="#feed">Start</button><div id="feed"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(150);
      expect(el.querySelector("#feed").textContent).toBe("Raw message");
      scope.$broadcast("$destroy");
    });

    it("should route structured SSE messages to their target", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-sse="/mock/sse-protocol">Start</button><div id="feed"></div><div id="side"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(250);
      expect(el.querySelector("#feed").textContent).toBe("Feed");
      expect(el.querySelector("#side").textContent).toBe("Side");
      scope.$broadcast("$destroy");
    });

    it("should use data as HTML when structured SSE messages omit html", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-sse="/mock/sse-protocol-data">Start</button><div id="feed"></div>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(150);
      expect(el.querySelector("#feed").textContent).toBe("Data fallback");
      scope.$broadcast("$destroy");
    });

    it("should support registered custom SSE events", async () => {
      const scope = $rootScope.$new();

      const received = [];

      el.innerHTML =
        '<button ng-sse="/mock/sse-custom" sse-events="notice">Start</button><div id="feed"></div>';
      $compile(el)(scope);
      el.querySelector("button").addEventListener("ng:sse:notice", (event) =>
        received.push(event.detail.data),
      );
      browserTrigger(el.querySelector("button"), "click");
      await wait(250);
      expect(received.length).toBe(1);
      expect(el.querySelector("#feed").textContent).toBe("Notice");
      scope.$broadcast("$destroy");
    });

    it("should dispatch lifecycle DOM events", async () => {
      const scope = $rootScope.$new();

      const received = [];

      el.innerHTML =
        '<button ng-sse="/mock/sse-protocol">Start</button><div id="feed"></div><div id="side"></div>';
      $compile(el)(scope);

      const button = el.querySelector("button");

      ["open", "message", "swapped", "close"].forEach((name) => {
        button.addEventListener(`ng:sse:${name}`, () => received.push(name));
      });

      browserTrigger(button, "click");
      await wait(250);
      scope.$broadcast("$destroy");
      await wait(50);

      expect(received).toContain("open");
      expect(received).toContain("message");
      expect(received).toContain("swapped");
      expect(received).toContain("close");
    });

    it("should close the stream when a message event is cancelled", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-sse="/mock/sse-protocol">Start</button><div id="feed"></div><div id="side"></div>';
      $compile(el)(scope);

      const button = el.querySelector("button");

      button.addEventListener("ng:sse:message", (event) => {
        event.preventDefault();
      });

      browserTrigger(button, "click");
      await wait(250);
      expect(el.querySelector("#feed").textContent).toBe("");
      expect(el.querySelector("#side").textContent).toBe("");
      scope.$broadcast("$destroy");
    });
  });

  describe("data-delay", () => {
    it("should accept delay as a data attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-delay="1000">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      expect(el.innerText).toBe("Load");

      await wait(1000);
      expect(el.innerText).toBe("Hello");
    });
  });

  describe("data-throttle", () => {
    it("should accept throttle as a data attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/now" data-throttle="1000">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const firstRes = parseInt(el.innerText);

      expect(firstRes).toBeLessThan(Date.now());
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const secondRes = parseInt(el.innerText);

      expect(secondRes).toBe(firstRes);

      await wait(900);
      // should release the throttle
      browserTrigger(el.querySelector("button"), "click");
      await wait(100);
      const thirdRes = parseInt(el.innerText);

      expect(thirdRes).toBeGreaterThan(firstRes);
    });
  });

  describe("data-interval", () => {
    it("should accept delay as a data attribute and should stop on $destroy", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/now" data-interval="100">Load</button>';
      $compile(el)(scope);

      await wait(200);
      await wait(200);
      const firstRes = parseInt(el.innerText);

      expect(firstRes).toBeLessThan(Date.now());
      await wait(200);
      await wait(200);
      const secondRes = parseInt(el.innerText);

      expect(secondRes).toBeGreaterThan(firstRes);
      await wait(200);
      await wait(200);
      const thirdRes = parseInt(el.innerText);

      expect(thirdRes).toBeGreaterThan(secondRes);

      scope.$broadcast("$destroy");

      await wait(200);
      await wait(200);
      const finalRes = parseInt(el.innerText);

      await wait(1000);
      await wait(200);
      expect(parseInt(el.innerText)).toEqual(finalRes);
    });
  });

  describe("data-loading", () => {
    it("should update loading data attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML = '<button ng-get="/mock/now" data-loading>Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      expect(el.querySelector("button").dataset.loading).toEqual("true");
      await wait(200);
      expect(el.querySelector("button").dataset.loading).toEqual("false");
    });
  });

  describe("data-loading-class", () => {
    it("should update class from data-loading-class attribute", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/now" data-loading-class="red">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      expect(el.querySelector("button").classList.contains("red")).toBeTrue();
      await wait(200);
      expect(el.querySelector("button").classList.contains("red")).toBeFalse();
    });
  });

  describe("data-success", () => {
    it("should evaluate expression passing result", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-success="res = $res">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(200);
      expect(scope.res).toEqual("Hello");
    });
  });

  describe("data-state-success", () => {
    it("should call stateService with success state", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-state-success="success">Load</button><ng-view id="view"></ng-view>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(200);
      expect(document.getElementById("view").innerHTML).toEqual("success");
    });
  });

  describe("data-state-error", () => {
    it("should call stateService with success state", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/422" data-state-success="success" data-state-error="error">Load</button><ng-view id="view"></ng-view>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(200);
      expect(document.getElementById("view").innerHTML).toEqual("error");
    });
  });

  describe("data-error", () => {
    it("should evaluate expression passing result", async () => {
      const scope = $rootScope.$new();

      el.innerHTML =
        '<button ng-get="/mock/422" data-error="res = $res">Load</button>';
      $compile(el)(scope);
      browserTrigger(el.querySelector("button"), "click");
      await wait(200);
      expect(scope.res).toEqual("Invalid data");
    });
  });
});
