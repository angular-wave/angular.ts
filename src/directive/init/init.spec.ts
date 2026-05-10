/// <reference types="jasmine" />
import { createElementFromHTML, dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import type { DirectivePrePost } from "../../interface.ts";
import { wait } from "../../shared/test-utils.ts";
import { ngInitDirective } from "./init.ts";

describe("ngInit", () => {
  let element: any;

  let $rootScope: any;

  let $compile: any;

  let $templateCache;

  let injector;

  beforeEach(() => {
    window.angular = new Angular();
    injector = createInjector(["ng"]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
    $templateCache = injector.get("$templateCache");
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should create a pre-link function that evaluates the expression", () => {
    const parse = jasmine
      .createSpy("$parse")
      .and.returnValue(jasmine.createSpy("initFn"));

    const directive = ngInitDirective(parse);

    const link = directive.compile!(document.createElement("div"), {
      ngInit: "value = 123",
    } as any) as DirectivePrePost;

    const scope = {
      value: undefined,
    };

    link.pre!(
      scope as any,
      document.createElement("div"),
      {
        ngInit: "value = 123",
      } as any,
      undefined,
    );

    expect(parse).toHaveBeenCalledWith("value = 123");
    expect(parse.calls.mostRecent().returnValue).toHaveBeenCalledWith(scope);
  });

  it("should init model", async () => {
    element = $compile('<div ng-init="a=123"></div>')($rootScope);
    await wait();
    expect($rootScope.a).toEqual(123);
  });

  it("should be evaluated before ngInclude", (done) => {
    element = createElementFromHTML(
      '<div><div ng-include="template" ' +
        "ng-init=\"template='template2.tpl'\"></div></div>",
    );
    window.angular.module("myModule", []).run(($templateCache) => {
      $templateCache.set("template1.tpl", "<span>1</span>");
      $templateCache.set("template2.tpl", "<span>2</span>");
    });
    injector = window.angular.bootstrap(element, ["myModule"]);
    $rootScope = injector.get("$rootScope");
    expect($rootScope.template).toEqual("template2.tpl");
    setTimeout(() => {
      expect(element.querySelector("span")!.textContent).toEqual("2");
      done();
    }, 200);
  });

  it("should be evaluated after ngController", async () => {
    window.angular.module("test1", ["ng"]);
    createInjector([
      "ng",
      ($controllerProvider) =>
        $controllerProvider.register("TestCtrl", () => {
          /* empty */
        }),
    ]).invoke((_$rootScope_: any, _$compile_: any) => {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
    });

    element = $compile(
      '<div><div ng-controller="TestCtrl" ' + 'ng-init="test=123"></div></div>',
    )($rootScope);
    await wait();

    expect($rootScope.test).toBeUndefined();
    expect($rootScope.$handler._children[1].test).toEqual(123);
  });
});
