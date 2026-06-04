// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { createElementFromHTML } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngWorker", () => {
  let RealWorker;
  let workers;
  let element;
  let root;
  let compile;
  let scope;
  let warn;
  let error;

  class MockWorker {
    constructor(scriptPath, options) {
      this.scriptPath = scriptPath;
      this.options = options;
      this.sent = [];
      this.terminated = false;
      this.onmessage = undefined;
      this.onerror = undefined;
      workers.push(this);
    }

    postMessage(data) {
      this.sent.push(data);
    }

    terminate() {
      this.terminated = true;
    }
  }

  beforeEach(() => {
    RealWorker = window.Worker;
    window.Worker = MockWorker;
    workers = [];
    warn = spyOn(window.console, "warn");
    error = spyOn(window.console, "error");

    root = document.getElementById("app");
    dealoc(root);

    new Angular().bootstrap(root, []).invoke((_$compile_, _$rootScope_) => {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  afterEach(() => {
    window.Worker = RealWorker;
    dealoc(element);
    dealoc(root);
  });

  function compileWorker(template) {
    element = createElementFromHTML(template);
    root.appendChild(element);
    return compile(element)(scope);
  }

  it("warns and skips setup when worker name is missing", async () => {
    compileWorker('<button ng-worker="">Run</button>');

    await wait();

    expect(warn).toHaveBeenCalledWith("ngWorker: missing worker name");
    expect(workers.length).toBe(0);
  });

  it("posts evaluated params and evaluates on-result", async () => {
    scope.payload = { count: 1 };
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="payload" data-on-result="received = $result">Run</button>',
    );

    element.click();
    await wait();
    workers[0].onmessage({ data: '{"ok":true}' });
    await wait();

    expect(workers[0].sent).toEqual([{ count: 1 }]);
    expect(scope.received).toEqual({ ok: true });
  });

  it("falls back to undefined params when params expression fails", async () => {
    scope.throwParams = () => {
      throw new Error("bad params");
    };
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="throwParams()">Run</button>',
    );

    element.click();
    await wait();

    expect(error).toHaveBeenCalled();
    expect(workers[0].sent).toEqual([undefined]);
  });

  it("does not post while the host is disabled", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" disabled data-params="{ ok: true }">Run</button>',
    );

    element.click();
    await wait();

    expect(workers[0].sent).toEqual([]);
  });

  it("swaps results into the host when on-result is absent", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-swap="textContent">Run</button>',
    );

    workers[0].onmessage({ data: "Done" });
    await wait();

    expect(element.textContent).toBe("Done");
  });

  it("supports insertAdjacentHTML swap strategies", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-swap="beforebegin">Run</button>',
    );

    workers[0].onmessage({ data: "<span>Before</span>" });
    await wait();

    expect(root.firstElementChild.tagName.toLowerCase()).toBe("span");
    expect(root.firstElementChild.textContent).toBe("Before");
  });

  it("replaces outerHTML when requested", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-swap="outerHTML">Run</button>',
    );

    workers[0].onmessage({ data: "<strong>Done</strong>" });
    await wait();

    expect(root.querySelector("strong")?.textContent).toBe("Done");
  });

  it("shows Error when no on-error expression is configured", async () => {
    compileWorker('<button ng-worker="/workers/echo.js">Run</button>');

    workers[0].onerror(new ErrorEvent("error"));
    await wait();

    expect(error).toHaveBeenCalled();
    expect(element.textContent).toBe("Error");
  });

  it("evaluates on-error expressions", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-on-error="failed = $error.type">Run</button>',
    );

    workers[0].onerror(new ErrorEvent("error"));
    await wait();

    expect(scope.failed).toBe("error");
  });

  it("throttles rapid events and clears throttled attribute", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-throttle="10">Run</button>',
    );

    element.click();
    element.click();
    await wait();

    expect(workers[0].sent.length).toBe(1);
    expect(element.getAttribute("throttled")).toBe("true");

    await wait(20);

    expect(element.getAttribute("throttled")).toBe("false");
  });

  it("dispatches load-triggered workers immediately", async () => {
    compileWorker(
      '<div ng-worker="/workers/echo.js" data-trigger="load" data-params="{ loaded: true }"></div>',
    );

    await wait();

    expect(workers[0].sent).toEqual([{ loaded: true }]);
  });

  it("supports all built-in swap modes", async () => {
    const afterBeginHost = createElementFromHTML(
      '<div ng-worker="/workers/echo.js" data-swap="afterbegin"><span>Base</span></div>',
    );
    const afterEndHost = createElementFromHTML(
      '<div ng-worker="/workers/echo.js" data-swap="afterend"><span>Base</span></div>',
    );
    const beforeEndHost = createElementFromHTML(
      '<div ng-worker="/workers/echo.js" data-swap="beforeend"><span>Base</span></div>',
    );
    const outerHtmlHost = createElementFromHTML(
      '<div ng-worker="/workers/echo.js" data-swap="outerHTML"><span>Base</span></div>',
    );
    const unknownHost = createElementFromHTML(
      '<div ng-worker="/workers/echo.js" data-swap="unknown"><span>Base</span></div>',
    );

    const afterBeginContainer = createElementFromHTML(
      '<div class="host-wrap"></div>',
    );
    afterBeginContainer.appendChild(afterBeginHost);
    root.appendChild(afterBeginContainer);

    const afterEndContainer = createElementFromHTML(
      '<div class="host-wrap"></div>',
    );
    afterEndContainer.appendChild(afterEndHost);
    root.appendChild(afterEndContainer);

    const beforeEndContainer = createElementFromHTML(
      '<div class="host-wrap"></div>',
    );
    beforeEndContainer.appendChild(beforeEndHost);
    root.appendChild(beforeEndContainer);

    const outerHostContainer = createElementFromHTML(
      '<div class="host-wrap"></div>',
    );
    outerHostContainer.appendChild(outerHtmlHost);
    root.appendChild(outerHostContainer);

    const unknownHostContainer = createElementFromHTML(
      '<div class="host-wrap"></div>',
    );
    unknownHostContainer.appendChild(unknownHost);
    root.appendChild(unknownHostContainer);

    compile(afterBeginHost)(scope);
    compile(afterEndHost)(scope);
    compile(beforeEndHost)(scope);
    compile(outerHtmlHost)(scope);
    compile(unknownHost)(scope);

    workers[0].onmessage({ data: "<i>Before</i>" });
    await wait();
    expect(afterBeginContainer.firstElementChild?.innerHTML).toBe(
      "<i>Before</i><span>Base</span>",
    );

    workers[1].onmessage({ data: "<i>After</i>" });
    await wait();
    expect(afterEndHost.innerHTML).toBe("<span>Base</span>");
    const afterEndSibling = afterEndHost.nextElementSibling;
    expect(afterEndSibling?.tagName.toLowerCase()).toBe("i");
    expect(afterEndSibling?.textContent).toBe("After");

    workers[2].onmessage({ data: "<i>End</i>" });
    await wait();
    expect(beforeEndHost.innerHTML).toBe("<span>Base</span><i>End</i>");

    workers[3].onmessage({ data: "<i>Outer</i>" });
    await wait();
    expect(outerHostContainer.firstElementChild?.tagName.toLowerCase()).toBe(
      "i",
    );
    expect(outerHostContainer.firstElementChild?.textContent).toBe("Outer");

    workers[4].onmessage({ data: "<i>Default</i>" });
    await wait();
    expect(unknownHost.innerHTML).toBe("<i>Default</i>");
  });

  it("uses event delay before posting to the worker", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-delay="20">Run</button>',
    );

    element.click();
    await wait(10);
    expect(workers[0].sent.length).toBe(0);

    await wait(20);
    expect(workers[0].sent.length).toBe(1);
  });

  it("supports latch-driven dispatch and reconnects on attribute changes", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-latch>Run</button>',
    );

    await wait();
    expect(workers[0].sent.length).toBe(0);

    element.setAttribute("data-latch", "enabled");

    await wait();
    expect(workers[0].sent.length).toBe(1);
  });

  it("supports interval polling and clears the interval on destroy", async () => {
    const clearSpy = spyOn(window, "clearInterval").and.callThrough();

    compileWorker(
      '<button ng-worker="/workers/echo.js" data-interval="20"></button>',
    );

    await wait(60);
    expect(workers[0].sent.length).toBeGreaterThan(0);

    scope.$destroy();
    await wait(20);

    expect(clearSpy).toHaveBeenCalled();
    expect(clearSpy.calls.first().args.length).toBe(1);
  });

  it("does not crash when outerHTML swap has no parent node", async () => {
    const detached = createElementFromHTML(
      '<div ng-worker="/workers/echo.js" data-swap="outerHTML"><span>Base</span></div>',
    );

    element = compile(detached)(scope);

    element.dispatchEvent(new Event("click"));
    await wait();
    workers[0].onmessage({ data: "<i>Replaced</i>" });
    await wait();

    expect(element.tagName.toLowerCase()).toBe("div");
    expect(element.innerHTML).toContain("Base");
  });
});
