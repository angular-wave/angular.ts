import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("ngInject", () => {
  let $compile, $rootScope, el, $test, $log;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";
    let angular = new Angular();
    angular
      .module("default", [])
      .value("$test", { a: 1 })
      .value("$a", { x: 1 })
      .value("$b", { y: 2 })
      .service(
        "userService",
        class {
          constructor() {
            this.name = "Bob";
          }
        },
      )
      .factory("userFactory", () => {
        return {
          name: "Fred",
        };
      });
    angular
      .bootstrap(el, ["default"])
      .invoke((_$compile_, _$rootScope_, _$test_, _$log_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $test = _$test_;
        $log = _$log_;
      });
  });

  it("should make $injectable available to scope", async () => {
    expect($test.a).toEqual(1);
    el.innerHTML = `<div ng-inject="$test"> {{ $test.a }} </div>`;
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
});
