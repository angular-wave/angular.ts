// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { browserTrigger, wait, waitUntil } from "../../shared/test-utils.ts";

describe("http directive attribute reads", () => {
  let $compile;
  let $rootScope;
  let app: HTMLElement;

  beforeEach(() => {
    app = document.getElementById("app") as HTMLElement;
    dealoc(app);
    app.innerHTML = "";

    const angular = new Angular();

    angular.bootstrap(app, []).invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(() => {
    dealoc(app);
  });

  it("reads data-trigger from the host element", async () => {
    app.innerHTML =
      '<button ng-get="/mock/hello" data-trigger="mouseover">Load</button>';

    $compile(app)($rootScope.$new());

    browserTrigger(app.querySelector("button")!, "click");
    await wait();
    expect(app.innerText).toBe("Load");

    browserTrigger(app.querySelector("button")!, "mouseover");
    await waitUntil(() => app.innerText === "Hello");
    expect(app.innerText).toBe("Hello");
  });

  it("reads data-target and data-swap from the host element", async () => {
    app.innerHTML =
      '<button ng-get="/mock/hello" data-target="#target" data-swap="textContent">Load</button>' +
      '<div id="target"></div>';

    $compile(app)($rootScope.$new());

    browserTrigger(app.querySelector("button")!, "click");
    await waitUntil(
      () => app.querySelector("#target")!.textContent === "Hello",
    );
    expect(app.querySelector("#target")!.textContent).toBe("Hello");
  });

  it("reads data-loading-class while mutating through $attrs", async () => {
    app.innerHTML =
      '<button ng-get="/mock/now" data-loading-class="pending">Load</button>';

    $compile(app)($rootScope.$new());

    const button = app.querySelector("button")!;

    browserTrigger(button, "click");
    await waitUntil(() => button.classList.contains("pending"));
    expect(button.classList.contains("pending")).toBeTrue();

    await waitUntil(() => !button.classList.contains("pending"));
    expect(button.classList.contains("pending")).toBeFalse();
  });
});
