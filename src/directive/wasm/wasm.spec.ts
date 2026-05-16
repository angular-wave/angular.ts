// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngWasm", () => {
  let $compile;
  let $rootScope;
  let element;

  beforeEach(() => {
    const app = document.getElementById("app") as HTMLElement;

    dealoc(app);
    window.angular = new Angular();
    const injector = window.angular.bootstrap(app, []);

    injector.invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should read data-src and data-as from the host element", async () => {
    element = $compile(
      '<ng-wasm data-src="/src/directive/wasm/math.wasm" data-as="math"></ng-wasm>',
    )($rootScope);

    await wait(100);

    expect($rootScope.$target.math.add(2, 3)).toBe(5);
  });

  it("should do nothing when src is missing", async () => {
    element = $compile('<ng-wasm data-as="math"></ng-wasm>')($rootScope);

    await wait();

    expect($rootScope.$target.math).toBeUndefined();
  });
});
