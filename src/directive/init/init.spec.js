import { createElementFromHTML, dealoc } from "../../shared/dom.js";
import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.js";
import { wait } from "../../shared/test-utils.js";

describe("ngInit", () => {
  let element;
  let $rootScope;
  let $compile;
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
      expect(element.querySelector("span").textContent).toEqual("2");
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
    ]).invoke((_$rootScope_, _$compile_) => {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
    });

    element = $compile(
      '<div><div ng-controller="TestCtrl" ' + 'ng-init="test=123"></div></div>',
    )($rootScope);
    await wait();

    expect($rootScope.test).toBeUndefined();
    expect($rootScope.$handler.$children[1].test).toEqual(123);
  });
});
