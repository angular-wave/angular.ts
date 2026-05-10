/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { createElementFromHTML, dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("style", () => {
  let $rootScope: any;

  let $compile: any;

  let element: any;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    createInjector(["myModule"]).invoke(
      (_$rootScope_: any, _$compile_: any) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
      },
    );
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should compile style element without binding", async () => {
    element = createElementFromHTML(
      '<style type="text/css">.header{font-size:1.5em; h3{font-size:1.5em}}</style>',
    );
    $compile(element)($rootScope);
    await wait();
    expect(element.innerHTML).toBe(
      ".header{font-size:1.5em; h3{font-size:1.5em}}",
    );
  });

  it("should compile style element with one simple bind", async () => {
    element = createElementFromHTML(
      '<style type="text/css">.some-container{ width: {{elementWidth}}px; }</style>',
    );
    $compile(element)($rootScope);
    await wait();
    expect(element.innerHTML).toBe(".some-container{ width: px; }");

    $rootScope.elementWidth = 200;
    await wait();
    expect(element.innerHTML).toBe(".some-container{ width: 200px; }");
  });

  it("should compile style element with one bind", async () => {
    element = createElementFromHTML(
      '<style type="text/css">.header{ h3 { font-size: {{fontSize}}em }}</style>',
    );
    $compile(element)($rootScope);
    await wait();
    expect(element.innerHTML).toBe(".header{ h3 { font-size: em }}");

    $rootScope.fontSize = 1.5;
    await wait();
    expect(element.innerHTML).toBe(".header{ h3 { font-size: 1.5em }}");
  });

  it("should compile style element with two binds", async () => {
    element = createElementFromHTML(
      '<style type="text/css">.header{ h3 { font-size: {{fontSize}}{{unit}} }}</style>',
    );
    $compile(element)($rootScope);
    await wait();
    expect(element.innerHTML).toBe(".header{ h3 { font-size:  }}");

    $rootScope.fontSize = 1.5;
    $rootScope.unit = "em";
    await wait();

    expect(element.innerHTML).toBe(".header{ h3 { font-size: 1.5em }}");
  });

  it("should compile content of element with style attr", async () => {
    element = createElementFromHTML('<div style="some">{{bind}}</div>');
    await wait();
    $compile(element)($rootScope);

    $rootScope.bind = "value";
    await wait();
    expect(element.textContent).toBe("value");
  });
});
