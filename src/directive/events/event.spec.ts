// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc } from "../../shared/dom.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";
import { createEventDirective, createWindowEventDirective } from "./events.ts";

describe("event directives", () => {
  let angular;

  let element;

  let injector;

  let $rootScope;

  let $compile;

  let $parse;

  let $exceptionHandler;

  let logs = [];

  const app = document.getElementById("app");

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    angular = window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception, cause) => {
          logs.push(exception.message);
        };
      });
    injector = createInjector(["myModule"]).invoke(
      (_$rootScope_, _$compile_, _$parse_, _$exceptionHandler_) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $parse = _$parse_;
        $exceptionHandler = _$exceptionHandler_;
      },
    );
  });

  afterEach(() => {
    dealoc(element);
    logs = [];
    document.getElementById("app").innerHTML = "";
  });

  describe("ngSubmit", () => {
    it("should get called on form submit", () => {
      app.innerHTML =
        '<form ng-submit="submitted = true">' +
        '<input type="submit" />' +
        "</form>";

      window.angular.bootstrap(app, ["myModule"]).invoke((_$rootScope_) => {
        $rootScope = _$rootScope_;
      });
      element = app.querySelector("form");

      // prevent submit within the test harness
      element.addEventListener("submit", (e) => {
        e.preventDefault();
      });

      expect($rootScope.submitted).toBeUndefined();

      element.dispatchEvent(new Event("submit"));
      expect($rootScope.submitted).toEqual(true);
    });

    it("should expose event on form submit", () => {
      app.innerHTML =
        '<form ng-submit="formSubmission($event)">' +
        '<input type="submit" />' +
        "</form>";
      window.angular.bootstrap(app, ["myModule"]).invoke((_$rootScope_) => {
        $rootScope = _$rootScope_;
      });
      element = app.querySelector("form");
      $rootScope.formSubmission = function (e) {
        if (e) {
          $rootScope.formSubmitted = "foo";
        }
      };

      // prevent submit within the test harness
      element.addEventListener("submit", (e) => {
        e.preventDefault();
      });

      expect($rootScope.formSubmitted).toBeUndefined();

      element.dispatchEvent(new Event("submit"));
      expect($rootScope.formSubmitted).toEqual("foo");
    });
  });

  describe("focus", () => {
    describe("call the listener asynchronously during reactive event delivery", () => {
      it("should call the listener with non isolate scopes", async () => {
        const scope = $rootScope.$new();

        element = $compile('<input type="text" ng-focus="focus()">')(scope);
        await wait();
        scope.focus = jasmine.createSpy("focus");

        expect(scope.focus).not.toHaveBeenCalled();
        browserTrigger(element, "focus");
        await wait();

        expect(scope.focus).toHaveBeenCalled();
      });

      it("should call the listener with isolate scopes", async () => {
        const scope = $rootScope.$newIsolate();

        element = $compile('<input type="text" ng-focus="focus()">')(scope);
        await wait();

        scope.focus = jasmine.createSpy("focus");
        browserTrigger(element, "focus");
        expect(scope.focus).toHaveBeenCalled();
      });
    });

    it("should call the listener synchronously during event delivery", async () => {
      element = $compile(
        '<input type="text" ng-focus="focus()" ng-model="value">',
      )($rootScope);
      await wait();
      $rootScope.focus = jasmine.createSpy("focus").and.callFake(() => {
        $rootScope.value = "newValue";
      });

      browserTrigger(element, "focus");
      await wait();
      expect($rootScope.focus).toHaveBeenCalled();
    });
  });

  describe("DOM event object", () => {
    it("should allow access to the $event object", async () => {
      const scope = $rootScope.$new();

      element = $compile('<button ng-click="e = $event">BTN</button>')(scope);
      await wait();
      browserTrigger(element, "click");
      await wait();
      // TODO
      // expect(scope.e.target).toBe(element);
      expect(scope.e.target).toBeDefined();
    });
  });

  it("should remove the event listener when the scope is destroyed", async () => {
    const scope = $rootScope.$new();

    const el = document.createElement("button");

    el.setAttribute("ng-click", "clicked = true");
    spyOn(el, "addEventListener").and.callThrough();
    spyOn(el, "removeEventListener").and.callThrough();

    element = $compile(el)(scope);
    await wait();

    expect(el.addEventListener).toHaveBeenCalledWith(
      "click",
      jasmine.any(Function),
    );
    const handler = el.addEventListener.calls.mostRecent().args[1];

    scope.$destroy();

    expect(el.removeEventListener).toHaveBeenCalledWith("click", handler);
  });

  describe("createEventDirective", () => {
    it("should compile an event expression and register the listener on link", () => {
      const directive = createEventDirective(
        $parse,
        $exceptionHandler,
        "ngClick",
        "click",
      );

      const link = directive.compile(null, { ngClick: "click($event)" });

      const scope = $rootScope.$new();

      const button = document.createElement("button");

      scope.click = jasmine.createSpy("click");

      spyOn(button, "addEventListener").and.callThrough();
      spyOn(button, "removeEventListener").and.callThrough();

      link(scope, button);

      expect(button.addEventListener).toHaveBeenCalledWith(
        "click",
        jasmine.any(Function),
      );

      const event = new Event("click");

      button.dispatchEvent(event);

      expect(scope.click).toHaveBeenCalledWith(event);

      const handler = button.addEventListener.calls.mostRecent().args[1];

      scope.$destroy();

      expect(button.removeEventListener).toHaveBeenCalledWith("click", handler);
    });

    it("should flush template updates after event expressions", async () => {
      const scope = $rootScope.$new();

      scope.count = 0;
      element = $compile(
        '<button ng-click="count = count + 1">{{ count }}</button>',
      )(scope);

      await wait();

      expect(element.textContent).toBe("0");

      browserTrigger(element, "click");
      await wait();

      expect(element.textContent).toBe("1");
    });

    it("should flush the scope queue after event expressions", () => {
      const directive = createEventDirective(
        $parse,
        $exceptionHandler,
        "ngClick",
        "click",
      );

      const link = directive.compile(null, { ngClick: "click($event)" });

      const scope = {
        $flushQueue: jasmine.createSpy("$flushQueue"),
        $on: jasmine.createSpy("$on"),
        click: jasmine.createSpy("click"),
      };

      const button = document.createElement("button");

      const event = new Event("click");

      link(scope, button);
      button.dispatchEvent(event);

      expect(scope.click).toHaveBeenCalledWith(event);
      expect(scope.$flushQueue).toHaveBeenCalled();
    });

    it("should flush from the root scope after child-scope event expressions", () => {
      const directive = createEventDirective(
        $parse,
        $exceptionHandler,
        "ngClick",
        "click",
      );

      const link = directive.compile(null, { ngClick: "click($event)" });

      const rootScope = {
        $flushQueue: jasmine.createSpy("$flushQueue"),
      };

      const scope = {
        $flushQueue: jasmine.createSpy("$flushQueue"),
        $on: jasmine.createSpy("$on"),
        $root: rootScope,
        click: jasmine.createSpy("click"),
      };

      const button = document.createElement("button");

      link(scope, button);
      button.dispatchEvent(new Event("click"));

      expect(rootScope.$flushQueue).toHaveBeenCalled();
      expect(scope.$flushQueue).not.toHaveBeenCalled();
    });

    it("should delegate listener errors to $exceptionHandler", () => {
      const directive = createEventDirective(
        $parse,
        $exceptionHandler,
        "ngClick",
        "click",
      );

      const link = directive.compile(null, { ngClick: "boom()" });

      const scope = $rootScope.$new();

      const button = document.createElement("button");

      scope.boom = () => {
        throw new Error("listener error");
      };

      link(scope, button);
      button.dispatchEvent(new Event("click"));

      expect(logs).toEqual(["listener error"]);
    });
  });

  it("should expose keyboard event information to handlers", async () => {
    const scope = $rootScope.$new();

    element = $compile('<input type="text" ng-keydown="lastKey = $event.key">')(
      scope,
    );
    await wait();

    browserTrigger(element, { type: "keydown", key: "Enter" });
    await wait();

    expect(scope.lastKey).toEqual("Enter");
  });

  describe("blur", () => {
    describe("call the listener asynchronously during reactive event delivery", () => {
      it("should call the listener with non isolate scopes", async () => {
        const scope = $rootScope.$new();

        element = $compile('<input type="text" ng-blur="blur()">')(scope);
        await wait();
        scope.blur = jasmine.createSpy("blur");

        expect(scope.blur).not.toHaveBeenCalled();
        browserTrigger(element, "blur");
        expect(scope.blur).toHaveBeenCalled();
      });

      it("should call the listener with isolate scopes", async () => {
        const scope = $rootScope.$new();

        element = $compile('<input type="text" ng-blur="blur()">')(scope);
        await wait();
        scope.blur = jasmine.createSpy("blur");
        expect(scope.blur).not.toHaveBeenCalled();
        browserTrigger(element, "blur");
        await wait();
        expect(scope.blur).toHaveBeenCalled();
      });
    });
  });

  it("should call the listener synchronously if the event is triggered inside of a digest", async () => {
    let watchedVal;

    element = $compile(
      '<button type="button" ng-click="click()">Button</button>',
    )($rootScope);
    $rootScope.$watch("value", (newValue) => {
      watchedVal = newValue;
    });
    $rootScope.click = jasmine.createSpy("click").and.callFake(() => {
      $rootScope.value = "newValue";
    });
    await wait();
    browserTrigger(element, "click");
    await wait();
    expect($rootScope.click).toHaveBeenCalled();
    expect(watchedVal).toEqual("newValue");
  });

  it("should call the listener synchronously if the event is triggered outside of a digest", async () => {
    let watchedVal;

    element = $compile(
      '<button type="button" ng-click="click()">Button</button>',
    )($rootScope);
    await wait();
    $rootScope.$watch("value", (newValue) => {
      watchedVal = newValue;
    });

    $rootScope.click = jasmine.createSpy("click").and.callFake(() => {
      $rootScope.value = "newValue";
    });

    browserTrigger(element, "click");
    await wait();

    expect($rootScope.click).toHaveBeenCalled();
    expect(watchedVal).toEqual("newValue");
  });

  describe("throwing errors in event handlers", () => {
    it("should not stop execution if the event is triggered outside a digest", async () => {
      element = $compile('<button ng-click="click()">Click</button>')(
        $rootScope,
      );
      await wait();
      $rootScope.click = function () {
        throw new Error("listener error");
      };

      $rootScope.do = function () {
        element.click();
      };

      $rootScope.do();

      expect(logs).toEqual(["listener error"]);
    });

    it("should not stop execution if the event is triggered inside a digest", async () => {
      element = $compile('<button ng-click="click()">Click</button>')(
        $rootScope,
      );
      await wait();
      $rootScope.click = function () {
        throw new Error("listener error");
      };

      $rootScope.do = function () {
        browserTrigger(element, "click");
        logs.push("done");
      };

      $rootScope.do();

      expect(logs[0]).toEqual("listener error");
      expect(logs[1]).toEqual("done");
    });

    it("should not stop execution if the event is triggered in a watch expression function", async () => {
      element = $compile('<button ng-click="click()">Click</button>')(
        $rootScope,
      );
      await wait();
      $rootScope.click = function () {
        throw new Error("listener error");
      };

      element.click();
      logs.push("done");
      await wait();
      expect(logs[0]).toEqual("listener error");
      expect(logs[1]).toEqual("done");
    });
  });

  describe("createWindowEventDirective", () => {
    it("should register and remove window listeners", () => {
      const windowSpy = {
        addEventListener: jasmine.createSpy("addEventListener"),
        removeEventListener: jasmine.createSpy("removeEventListener"),
      };

      const directive = createWindowEventDirective(
        $parse,
        $exceptionHandler,
        windowSpy,
        "ngWindowResize",
        "resize",
      );

      const attr = { ngWindowResize: "onResize($event)" };

      const link = directive.compile(null, attr);

      const scope = $rootScope.$new();

      scope.onResize = jasmine.createSpy("onResize");

      link(scope);

      expect(windowSpy.addEventListener).toHaveBeenCalledWith(
        "resize",
        jasmine.any(Function),
      );
      const handler = windowSpy.addEventListener.calls.mostRecent().args[1];

      const event = { type: "resize" };

      handler(event);

      expect(scope.onResize).toHaveBeenCalledWith(event);

      scope.$destroy();

      expect(windowSpy.removeEventListener).toHaveBeenCalledWith(
        "resize",
        handler,
      );
    });

    it("should delegate window listener errors to $exceptionHandler", () => {
      const windowSpy = {
        addEventListener: jasmine.createSpy("addEventListener"),
        removeEventListener: jasmine.createSpy("removeEventListener"),
      };

      const directive = createWindowEventDirective(
        $parse,
        $exceptionHandler,
        windowSpy,
        "ngWindowResize",
        "resize",
      );

      const attr = { ngWindowResize: "boom()" };

      const link = directive.compile(null, attr);

      const scope = $rootScope.$new();

      scope.boom = () => {
        throw new Error("window listener error");
      };

      link(scope);

      const handler = windowSpy.addEventListener.calls.mostRecent().args[1];

      handler({ type: "resize" });

      expect(logs).toEqual(["window listener error"]);
    });
  });
});
