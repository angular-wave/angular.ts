/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

class UserService {
  name = "Bob";
}

describe("ngInject", () => {
  let $compile: any, $rootScope: any, el: any, $test: any, $log: any;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";
    const angular = new Angular();

    angular
      .module("default", [])
      .value("$test", { a: 1 })
      .value("$a", { x: 1 })
      .value("$b", { y: 2 })
      .service("userService", UserService as any)
      .factory("userFactory", () => {
        return {
          name: "Fred",
        };
      });
    angular
      .bootstrap(el, ["default"])
      .invoke(
        (_$compile_: any, _$rootScope_: any, _$test_: any, _$log_: any) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $test = _$test_;
          $log = _$log_;
        },
      );
  });

  it("should make $injectable available to scope", async () => {
    expect($test.a).toEqual(1);
    el.innerHTML = `<div ng-inject="$test"> {{ $test.a }} </div>`;
    $compile(el)($rootScope);
    await wait();
    expect($rootScope.$test).toEqual($test);
    expect(el.innerText).toEqual("1");
  });

  it("should read data-ng-inject from the host element", async () => {
    expect($test.a).toEqual(1);
    el.innerHTML = `<div data-ng-inject="$test"> {{ $test.a }} </div>`;
    $compile(el)($rootScope);
    await wait();
    expect($rootScope.$test).toEqual($test);
    expect(el.innerText).toEqual("1");
  });

  it("should evaluate expressions referencing injected", async () => {
    expect($test.a).toEqual(1);
    el.innerHTML = `<div ng-inject="$test"> {{ $test.a  + 1}} </div>`;
    $compile(el)($rootScope);
    await wait();
    expect($rootScope.$test).toEqual($test);
    expect(el.innerText).toEqual("2");
  });

  it("should evaluate expressions for multiple references", async () => {
    expect($test.a).toEqual(1);
    el.innerHTML = `<div ng-inject="$test;$a;$b"> {{ $test.a + $a.x + $b.y}} </div>`;
    $compile(el)($rootScope);
    await wait();
    expect($rootScope.$test).toEqual($test);
    expect(el.innerText).toEqual("4");
  });

  it("should warn and skip missing injectables", async () => {
    const warnSpy = spyOn($log, "warn");

    el.innerHTML = `<div ng-inject="$notExisting"> {{ $notExisting }} </div>`;
    $compile(el)($rootScope);
    await wait();

    expect(warnSpy).toHaveBeenCalledWith(
      "Injectable $notExisting not found in $injector",
    );
    expect($rootScope.$notExisting).toBeUndefined();
  });

  it("should not modify scope if ng-inject is empty", async () => {
    el.innerHTML = `<div ng-inject=""> {{ 123 }} </div>`;
    $compile(el)($rootScope);
    await wait();
    expect($rootScope.$test).toBeUndefined();
    expect(el.innerText.trim()).toBe("123");
  });

  it("should inject identifiers for services", async () => {
    el.innerHTML = `<div ng-inject="userService"> {{ userService.name }} </div>`;
    $compile(el)($rootScope);
    await wait();
    expect(el.innerText.trim()).toBe("Bob");
  });

  it("should inject identifiers for factories", async () => {
    el.innerHTML = `<div ng-inject="userFactory"> {{ userFactory.name }} </div>`;
    $compile(el)($rootScope);
    await wait();
    expect(el.innerText.trim()).toBe("Fred");
  });

  it("should define references anywhere in the template", async () => {
    el.innerHTML = `<div>{{ userService.name }} <div ng-inject="userService"></div></div>`;
    $compile(el)($rootScope);
    await wait();
    expect(el.innerText.trim()).toBe("Bob");
  });

  it("should inject globals", async () => {
    el.innerHTML = `<div ng-inject="$window"></div>`;
    $compile(el)($rootScope);
    await wait();
    expect($rootScope.$window).toBe(window);
  });
});
