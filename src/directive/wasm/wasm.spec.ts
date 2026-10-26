/// <reference types="jasmine" />
import { defined, htmlNode } from "../../shared/test-fixtures.spec.ts";

import { Angular } from "../../angular.ts";
import { wasmModule } from "../../runtime/wasm.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngWasm", () => {
  let $compile: ng.CompileService;
  let $rootScope: FixtureScope;
  let element: HTMLElement;

  beforeEach(() => {
    const app = defined(document.getElementById("app"));

    dealoc(app);
    window.angular = new Angular();
    const installedWasmModule = wasmModule(window.angular);
    const injector = window.angular.bootstrap(app, [installedWasmModule.name]);

    injector.invoke([
      "$compile",
      "$rootScope",
      (_$compile_: ng.CompileService, _$rootScope_: FixtureScope) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should read data-src and data-as from the host element", async () => {
    element = htmlNode(
      $compile(
        '<ng-wasm data-src="/src/directive/wasm/math.wasm" data-as="math"></ng-wasm>',
      )($rootScope),
    );

    await wait(100);

    expect(add($rootScope.math, 2, 3)).toBe(5);
  });

  it("publishes resources under the default wasm alias", async () => {
    element = htmlNode(
      $compile('<ng-wasm data-src="/src/directive/wasm/math.wasm"></ng-wasm>')(
        $rootScope,
      ),
    );

    await $rootScope.wasm.ready;

    expect(add($rootScope.wasm, 3, 4)).toBe(7);
  });

  it("should propagate resource lifecycle state into the DOM", async () => {
    const instantiateStreaming = WebAssembly.instantiateStreaming;
    let releaseInstantiation = (): void => undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseInstantiation = resolve;
    });

    spyOn(WebAssembly, "instantiateStreaming").and.callFake(
      async (source, imports) => {
        await blocked;

        return instantiateStreaming(source, imports);
      },
    );

    element = htmlNode(
      $compile(
        '<div><ng-wasm data-src="/src/directive/wasm/math.wasm" data-as="math"></ng-wasm><span ng-bind="math.status"></span></div>',
      )($rootScope),
    );

    await wait();

    expect(defined(element.querySelector("span")).textContent).toBe("loading");

    releaseInstantiation();
    await $rootScope.math.ready;
    await wait();

    expect(defined(element.querySelector("span")).textContent).toBe("ready");
  });

  it("should reject aliases that can mutate object prototypes", () => {
    expect(() => {
      element = htmlNode(
        $compile(
          '<ng-wasm data-src="/src/directive/wasm/math.wasm" data-as="__proto__"></ng-wasm>',
        )($rootScope),
      );
    }).toThrowError("ng-wasm cannot publish the reserved alias '__proto__'.");
  });

  it("contains resource loading failures", async () => {
    element = htmlNode(
      $compile(
        '<ng-wasm data-src="/missing-resource.wasm" data-as="missing"></ng-wasm>',
      )($rootScope),
    );

    await expectAsync($rootScope.missing.ready).toBeRejected();
    await wait();

    expect($rootScope.missing.status).toBe("error");
  });

  it("should do nothing when src is missing", async () => {
    element = htmlNode(
      $compile('<ng-wasm data-as="math"></ng-wasm>')($rootScope),
    );

    await wait();

    expect($rootScope._target.math).toBeUndefined();
  });
});

interface FixtureScope extends ng.Scope {
  math: ng.WasmResource;
  wasm: ng.WasmResource;
  missing: ng.WasmResource;
}
function add(resource: ng.WasmResource, a: number, b: number): unknown {
  const add = defined(resource.exports).add;
  if (typeof add !== "function") throw new TypeError("Missing wasm add export");
  return add(a, b);
}
