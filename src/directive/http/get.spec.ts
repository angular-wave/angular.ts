import { AnimationHandle } from "../../animations/animate.ts";
import {
  defined,
  elementNode,
  htmlNode,
  instance,
} from "../../shared/test-fixtures.spec.ts";
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { browserTrigger, wait, waitUntil } from "../../shared/test-utils.ts";
import { dealoc } from "../../shared/dom.ts";

function createAnimateSpy(animate: ng.AnimateService) {
  const calls: {
    event: "enter" | "leave";
    node: Element;
    parent?: ParentNode | null;
    after?: Node | null;
  }[] = [];
  const runner = () => {
    const handle = new AnimationHandle(undefined);
    handle.complete(true);
    return handle;
  };
  spyOn(animate, "enter").and.callFake((node, parent, after) => {
    calls.push({ event: "enter", node, parent, after });
    parent?.insertBefore(node, after ? after.nextSibling : null);
    return runner();
  });
  spyOn(animate, "leave").and.callFake((node) => {
    calls.push({ event: "leave", node });
    node.remove();
    return runner();
  });
  return Object.assign(animate, { calls });
}

describe("ng-get", () => {
  let $compile: ng.CompileService,
    $rootScope: ng.Scope,
    $log: ng.LogService,
    $stream: ng.StreamService,
    el: HTMLElement,
    animateSpy: ReturnType<typeof createAnimateSpy>;

  async function waitForText(text: string) {
    await waitUntil(() => el.innerText === text || el.textContent === text);
  }

  async function waitForAnimateEvents(events: readonly string[]) {
    await waitUntil(
      () =>
        animateSpy.calls.map((call) => call.event).join(",") ===
        events.join(","),
    );
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
    el = defined(document.getElementById("app"));
    dealoc(el);
    el.innerHTML = "";
    const angular = new Angular();
    animateSpy = createAnimateSpy(angular.injector(["ng"]).get("$animate"));

    angular
      .createModule("default", [])
      .value("$animate", animateSpy)
      .router([
        { name: "success", url: "/success", template: "success" },
        { name: "error", url: "/error", template: "error" },
      ]);
    angular.bootstrap(el, ["default"]).invoke([
      "$compile",
      "$rootScope",
      "$log",
      "$stream",
      (
        _$compile_: ng.CompileService,
        _$rootScope_: ng.Scope,
        _$log_: ng.LogService,
        _$stream_: ng.StreamService,
      ) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $log = _$log_;
        $stream = _$stream_;
      },
    ]);
  });

  it("should use $animate.enter for animated element responses", async () => {
    const scope = $rootScope.new();

    el.innerHTML = '<button ng-get="/mock/div" animate="true">Load</button>';
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForAnimateEvents(["enter"]);
    expect(animateSpy.calls.map((call) => call.event)).toEqual(["enter"]);
    expect(el.textContent).toContain("Hello");
  });

  it("should use $animate.leave before entering an animated replacement", async () => {
    const scope = $rootScope.new();

    el.innerHTML = '<button ng-get="/mock/div" animate="true">Load</button>';
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForAnimateEvents(["enter"]);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForAnimateEvents(["enter", "leave", "enter"]);
    expect(animateSpy.calls.map((call) => call.event)).toEqual([
      "enter",
      "leave",
      "enter",
    ]);
    expect(el.textContent).toContain("Hello");
  });

  it("should use $animate for animated outerHTML replacements", async () => {
    const scope = $rootScope.new();

    el.innerHTML =
      '<button ng-get="/mock/div" animate="true" data-swap="outerHTML">Load</button>';
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForAnimateEvents(["leave", "enter"]);
    expect(animateSpy.calls.map((call) => call.event)).toEqual([
      "leave",
      "enter",
    ]);
    expect(el.textContent).toContain("Hello");
  });

  it("should not animate text-node responses", async () => {
    const scope = $rootScope.new();

    el.innerHTML = '<button ng-get="/mock/hello" animate="true">Load</button>';
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForText("Hello");
    expect(animateSpy.calls).toEqual([]);
    expect(el.textContent).toBe("Hello");
  });

  it("should animate textContent swaps without losing the target parent", async () => {
    const scope = $rootScope.new();

    el.innerHTML =
      '<button ng-get="/mock/hello" animate="true" data-swap="textContent">Load</button>';
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForAnimateEvents(["leave", "enter"]);

    expect(animateSpy.calls.map((call) => call.event)).toEqual([
      "leave",
      "enter",
    ]);
    expect(defined(el.querySelector("button")).textContent).toBe("Hello");
  });

  it("should replace innerHTML (default) on click", async () => {
    const scope = $rootScope.new();

    el.innerHTML = '<button ng-get="/mock/hello">Load</button>';
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForText("Hello");
    expect(el.innerText).toBe("Hello");
  });

  it("should replace innerHTML (default) on click when used with expression", async () => {
    const scope = $rootScope.new();

    el.innerHTML = '<button ng-get="/mock/{{a}}">Load</button>';
    scope.a = "div";
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitUntil(
      () => elementNode(el.firstChild).innerHTML === "<div>Hello</div>",
    );
    expect(elementNode(el.firstChild).innerHTML).toBe("<div>Hello</div>");
  });

  it("should compile innerHTML", async () => {
    const scope = $rootScope.new();

    el.innerHTML = '<button ng-get="/mock/divexpr">Load</button>';
    scope.expr = "World";
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForText("World");
    expect(el.innerText).toBe("World");
  });

  it("should replace innerHTML on error", async () => {
    const scope = $rootScope.new();

    el.innerHTML = '<button ng-get="/mock/422">Load</button>';
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForText("Invalid data");
    expect(el.innerText).toBe("Invalid data");
  });

  it("should not trigger request if element is disabled", async () => {
    el.innerHTML = '<button ng-get="/mock/hello" disabled>Load</button>';
    const scope = $rootScope.new();

    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await wait();
    expect(el.innerText).toBe("Load");
  });

  it("should replace innerHTML on status error without a body", async () => {
    const scope = $rootScope.new();

    el.innerHTML = '<button ng-get="/mock/401">Load</button>';
    $compile(el)(scope);
    browserTrigger(defined(el.querySelector("button")), "click");
    await waitForText("Unauthorized");
    expect(el.innerText).toBe("Unauthorized");
  });

  describe("data-trigger", () => {
    it("should not trigger request on click if element has trigger attribute", async () => {
      el.innerHTML =
        '<button ng-get="/mock/hello" data-trigger="mouseover">Load</button>';
      const scope = $rootScope.new();

      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await wait();
      expect(el.innerText).toBe("Load");
    });

    it("should trigger request on new event name if element has trigger attribute", async () => {
      el.innerHTML =
        '<button ng-get="/mock/hello" data-trigger="mouseover">Load</button>';
      const scope = $rootScope.new();

      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "mouseover");
      await waitForText("Hello");
      expect(el.innerText).toBe("Hello");
    });
  });

  describe("data-latch", () => {
    it("should trigger request on latch change", async () => {
      el.innerHTML =
        '<button ng-get="/mock/now" data-latch="{{ latch }}">Load</button>';
      const scope = $rootScope.new();

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
      el.innerHTML =
        '<button ng-get="/mock/now" data-latch="{{ latch }}">Load</button>';
      const scope = $rootScope.new();

      $compile(el)(scope);
      await wait();
      expect(el.innerText).toBe("Load");
      scope.latch = true;
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(defined(el.querySelector("button")), "click");
      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);
    });

    it("should still work with custom events with latch change", async () => {
      el.innerHTML =
        '<button ng-get="/mock/now" data-latch="{{ latch }}" data-trigger="mouseover">Load</button>';
      const scope = $rootScope.new();

      $compile(el)(scope);
      await wait();
      expect(el.innerText).toBe("Load");
      scope.latch = true;
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(defined(el.querySelector("button")), "mouseover");
      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);
    });

    it("should still work with ng-event directives with latch change", async () => {
      el.innerHTML =
        '<button ng-get="/mock/now" data-latch="{{ latch }}" ng-mouseover="latch = !latch">Load</button>';
      const scope = $rootScope.new();

      $compile(el)(scope);
      await wait();
      expect(el.innerText).toBe("Load");
      browserTrigger(defined(el.querySelector("button")), "mouseover");
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());

      browserTrigger(defined(el.querySelector("button")), "mouseover");
      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);
    });
  });

  describe("data-swap", () => {
    it("should not change anything if swap is 'none'", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="none" data-target="#found">Load</button><div id="found">Original</div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await wait();
      const found = el.querySelector("#found");

      expect(defined(found).textContent).toBe("Original");
    });

    it("should replace outerHTML on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-swap="outerHTML">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitForText("Hello");
      expect(el.innerText).toBe("Hello");
    });

    it("should replace textcontent on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-swap="textContent">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitForText("Hello");
      expect(el.innerText).toBe("Hello");
    });

    it("should replace beforebegin on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="beforebegin">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => htmlNode(el.firstChild).innerText === "Hello");
      expect(htmlNode(el.firstChild).innerText).toBe("Hello");
    });

    it("should replace beforeend on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="beforeend">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => el.firstElementChild?.lastElementChild?.textContent === "Hello",
      );
      expect(htmlNode(defined(el.firstChild).lastChild).innerText).toBe(
        "Hello",
      );
    });

    it("should delete the target on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-swap="delete" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => el.querySelector("#found") === null);
      expect(el.querySelector("#found")).toBeNull();
    });
  });

  describe("data-target", () => {
    it("should remain unchanged if target is not found and log a warning", async () => {
      const scope = $rootScope.new();

      const warn = spyOn($log, "warn");
      el.innerHTML =
        '<button ng-get="/mock/hello" data-target="#missing">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => warn.calls.any());
      expect(htmlNode(el.firstChild).innerText).toBe("Load");
      expect($log.warn).toHaveBeenCalled();
    });

    it("should replace target innerHTML (default) on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => elementNode(el.lastChild).innerHTML === "Hello");
      expect(elementNode(el.lastChild).innerHTML).toBe("Hello");
    });

    it("should replace textcontent on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-swap="textContent" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => htmlNode(el.lastChild).innerText === "Hello");
      expect(htmlNode(el.lastChild).innerText).toBe("Hello");
    });

    it("should replace beforebegin on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="beforebegin" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () =>
          el.querySelector("#found")?.previousSibling?.textContent === "Hello",
      );
      const found = el.querySelector("#found");

      // The sibling before #found should contain "Hello"
      const prevSibling = defined(found).previousSibling;

      expect(defined(prevSibling).textContent).toBe("Hello");
      expect(defined(found).textContent).toBe(""); // found itself unchanged
    });

    it("should replace beforeend on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => el.querySelector("#found")?.textContent === "Hello",
      );
      const found = el.querySelector("#found");

      expect(defined(found).textContent).toBe("Hello");
    });

    it("should insert afterbegin on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="afterbegin" data-target="#found">Load</button><div id="found"><div>World</div></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => el.querySelector("#found")?.textContent === "HelloWorld",
      );
      const found = el.querySelector("#found");

      expect(defined(found).textContent).toBe("HelloWorld");
    });

    it("should insert afterend on click", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/div" data-swap="afterend" data-target="#found">Load</button><div id="found"><div>World</div></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => defined(el.lastChild).textContent === "Hello");
      const found = el.querySelector("#found");

      expect(defined(found).textContent).toBe("World");
      expect(defined(found).nextSibling).toBe(el.lastChild);
      expect(defined(defined(found).nextSibling).textContent).toBe("Hello");
    });
  });

  describe("streams", () => {
    it("should compile and swap streamed HTML responses", async () => {
      const scope = $rootScope.new();

      scope.first = "A";
      scope.second = "B";
      el.innerHTML =
        '<button ng-get="/mock/stream-html" response-type="stream" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => defined(el.querySelector("#found")).textContent === "AB",
      );
      expect(defined(el.querySelector("#found")).textContent).toBe("AB");
    });

    it("should accept stream as a responseType shortcut", async () => {
      const scope = $rootScope.new();

      scope.first = "C";
      scope.second = "D";
      el.innerHTML =
        '<button ng-get="/mock/stream-html" stream data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => defined(el.querySelector("#found")).textContent === "CD",
      );
      expect(defined(el.querySelector("#found")).textContent).toBe("CD");
    });

    it("should accept data-response-stream as a responseType shortcut", async () => {
      const scope = $rootScope.new();

      scope.first = "E";
      scope.second = "F";
      el.innerHTML =
        '<button ng-get="/mock/stream-html" data-response-stream data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => defined(el.querySelector("#found")).textContent === "EF",
      );
      expect(defined(el.querySelector("#found")).textContent).toBe("EF");
    });

    it("should abort stream consumption when the directive scope is destroyed", async () => {
      const scope = $rootScope.new();

      let signal: AbortSignal | undefined;

      let resolveConsume: (() => void) | undefined;

      spyOn($stream, "consumeText").and.callFake((_stream, options) => {
        signal = defined(options).signal;

        return new Promise((resolve) => {
          resolveConsume = resolve;
        });
      });

      el.innerHTML =
        '<button ng-get="/mock/stream-html" response-type="stream" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => signal !== undefined);

      expect(defined(signal).aborted).toBe(false);

      scope.destroy();
      defined(resolveConsume)();

      expect(defined(signal).aborted).toBe(true);
    });
  });

  describe("ng-sse protocol", () => {
    it("should swap raw SSE message HTML", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-sse="/mock/sse-once" data-target="#feed">Start</button><div id="feed"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => defined(el.querySelector("#feed")).textContent === "Raw message",
      );
      expect(defined(el.querySelector("#feed")).textContent).toBe(
        "Raw message",
      );
      scope.broadcast("$destroy");
    });

    it("should route structured SSE messages to their target", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-sse="/mock/sse-protocol">Start</button><div id="feed"></div><div id="side"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () =>
          defined(el.querySelector("#feed")).textContent === "Feed" &&
          defined(el.querySelector("#side")).textContent === "Side",
      );
      expect(defined(el.querySelector("#feed")).textContent).toBe("Feed");
      expect(defined(el.querySelector("#side")).textContent).toBe("Side");
      scope.broadcast("$destroy");
    });

    it("should use data as HTML when structured SSE messages omit html", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-sse="/mock/sse-protocol-data">Start</button><div id="feed"></div>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () =>
          defined(el.querySelector("#feed")).textContent === "Data fallback",
      );
      expect(defined(el.querySelector("#feed")).textContent).toBe(
        "Data fallback",
      );
      scope.broadcast("$destroy");
    });

    it("should support registered custom SSE events", async () => {
      const scope = $rootScope.new();

      const received: unknown[] = [];

      el.innerHTML =
        '<button ng-sse="/mock/sse-custom" sse-events="notice">Start</button><div id="feed"></div>';
      $compile(el)(scope);
      defined(el.querySelector("button")).addEventListener(
        "ng:sse:notice",
        (event) =>
          received.push(messageData(instance(event, CustomEvent).detail)),
      );
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () =>
          received.length === 1 &&
          defined(el.querySelector("#feed")).textContent === "Notice",
      );
      expect(received.length).toBe(1);
      expect(defined(el.querySelector("#feed")).textContent).toBe("Notice");
      scope.broadcast("$destroy");
    });

    it("should dispatch lifecycle DOM events", async () => {
      const scope = $rootScope.new();

      const received: unknown[] = [];

      el.innerHTML =
        '<button ng-sse="/mock/sse-protocol">Start</button><div id="feed"></div><div id="side"></div>';
      $compile(el)(scope);

      const button = el.querySelector("button");

      ["open", "message", "swapped", "close"].forEach((name) => {
        defined(button).addEventListener(`ng:sse:${name}`, () =>
          received.push(name),
        );
      });

      browserTrigger(defined(button), "click");
      await waitUntil(
        () =>
          received.includes("open") &&
          received.includes("message") &&
          received.includes("swapped"),
      );
      scope.broadcast("$destroy");
      await waitUntil(() => received.includes("close"));

      expect(received).toContain("open");
      expect(received).toContain("message");
      expect(received).toContain("swapped");
      expect(received).toContain("close");
    });

    it("should close the stream when a message event is cancelled", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-sse="/mock/sse-protocol">Start</button><div id="feed"></div><div id="side"></div>';
      $compile(el)(scope);

      const button = el.querySelector("button");

      defined(button).addEventListener("ng:sse:message", (event) => {
        event.preventDefault();
      });

      browserTrigger(defined(button), "click");
      await wait(250);
      expect(defined(el.querySelector("#feed")).textContent).toBe("");
      expect(defined(el.querySelector("#side")).textContent).toBe("");
      scope.broadcast("$destroy");
    });
  });

  describe("data-delay", () => {
    it("should accept delay as a data attribute", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-delay="1000">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await wait(100);
      expect(el.innerText).toBe("Load");

      await wait(1000);
      await waitForText("Hello");
      expect(el.innerText).toBe("Hello");
    });
  });

  describe("data-throttle", () => {
    it("should accept throttle as a data attribute", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/now" data-throttle="1000">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());
      browserTrigger(defined(el.querySelector("button")), "click");
      await wait(100);
      const secondRes = parseInt(el.innerText);

      expect(secondRes).toBe(firstRes);

      await wait(900);
      // should release the throttle
      browserTrigger(defined(el.querySelector("button")), "click");
      const thirdRes = await waitForNumericResponse(firstRes);

      expect(thirdRes).toBeGreaterThan(firstRes);
    });
  });

  describe("data-interval", () => {
    it("should accept delay as a data attribute and should stop on $destroy", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/now" data-interval="100">Load</button>';
      $compile(el)(scope);

      const firstRes = await waitForNumericResponse();

      expect(firstRes).toBeLessThan(Date.now());
      const secondRes = await waitForNumericResponse(firstRes);

      expect(secondRes).toBeGreaterThan(firstRes);
      const thirdRes = await waitForNumericResponse(secondRes);

      expect(thirdRes).toBeGreaterThan(secondRes);

      scope.broadcast("$destroy");

      await wait();
      const finalRes = parseInt(el.innerText);

      await wait(1000);
      await wait(200);
      expect(parseInt(el.innerText)).toEqual(finalRes);
    });
  });

  describe("data-loading", () => {
    it("should update loading data attribute", async () => {
      const scope = $rootScope.new();

      el.innerHTML = '<button ng-get="/mock/now" data-loading>Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      expect(defined(el.querySelector("button")).dataset.loading).toEqual(
        "true",
      );
      await waitUntil(
        () => defined(el.querySelector("button")).dataset.loading === "false",
      );
      expect(defined(el.querySelector("button")).dataset.loading).toEqual(
        "false",
      );
    });
  });

  describe("data-loading-class", () => {
    it("should update class from data-loading-class attribute", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/now" data-loading-class="red">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      expect(
        defined(el.querySelector("button")).classList.contains("red"),
      ).toBeTrue();
      await waitUntil(
        () => !defined(el.querySelector("button")).classList.contains("red"),
      );
      expect(
        defined(el.querySelector("button")).classList.contains("red"),
      ).toBeFalse();
    });
  });

  describe("on-success", () => {
    it("should evaluate expression passing result", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/hello" on-success="res = $res">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => scope.res === "Hello");
      expect(scope.res).toEqual("Hello");
    });

    it("should require explicit assignment for object responses", async () => {
      const scope = $rootScope.new();

      scope.name = "Alice";
      el.innerHTML =
        '<button ng-get="/mock/jsonobject" target="person" on-success="response = $res">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => responseName(scope.response) === "Bob");

      expect(scope.response).toEqual({ name: "Bob", age: 20 });
      expect(scope.name).toBe("Alice");
      expect(scope.age).toBeUndefined();
      expect(scope.person).toBeUndefined();
    });
  });

  describe("data-state-success", () => {
    it("should call stateService with success state", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/hello" data-state-success="success">Load</button><ng-view id="view"></ng-view>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => defined(document.getElementById("view")).innerHTML === "success",
      );
      expect(defined(document.getElementById("view")).innerHTML).toEqual(
        "success",
      );
    });
  });

  describe("data-state-error", () => {
    it("should call stateService with success state", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/422" data-state-success="success" data-state-error="error">Load</button><ng-view id="view"></ng-view>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(
        () => defined(document.getElementById("view")).innerHTML === "error",
      );
      expect(defined(document.getElementById("view")).innerHTML).toEqual(
        "error",
      );
    });
  });

  describe("on-error", () => {
    it("should evaluate expression passing result", async () => {
      const scope = $rootScope.new();

      el.innerHTML =
        '<button ng-get="/mock/422" on-error="res = $res">Load</button>';
      $compile(el)(scope);
      browserTrigger(defined(el.querySelector("button")), "click");
      await waitUntil(() => scope.res === "Invalid data");
      expect(scope.res).toEqual("Invalid data");
    });
  });
});

function responseName(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !("name" in value))
    return undefined;
  return value.name;
}

function messageData(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !("data" in value))
    throw new TypeError("Expected message detail");
  return value.data;
}
