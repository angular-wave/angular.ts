import {
  createElementFromHTML,
  dealoc,
  getCacheData,
} from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngView", () => {
  window.location.hash = "";
  let $stateProvider,
    scope,
    $compile,
    elem = document.getElementById("app"),
    log,
    app,
    $injector,
    $state,
    $anchorScroll,
    errorLog = [];

  const aState = {
      name: "a",
      template: "aState template",
    },
    bState = {
      name: "b",
      template: "bState template",
    },
    cState = {
      name: "c",
      views: {
        cview: {
          template: "cState cview template",
        },
      },
    },
    dState = {
      name: "d",
      views: {
        dview1: {
          template: "dState dview1 template",
        },
        dview2: {
          template: "dState dview2 template",
        },
      },
    },
    eState = {
      name: "e",
      template: '<div ng-view="eview" class="eview"></div>',
    },
    fState = {
      name: "e.f",
      views: {
        eview: {
          template: "fState eview template",
        },
      },
    },
    gState = {
      name: "g",
      template: '<div ng-view="inner"><span>{{content}}</span></div>',
    },
    hState = {
      name: "g.h",
      views: {
        inner: {
          template: "hState inner template",
        },
      },
    },
    iState = {
      name: "i",
      template:
        "<div ng-view>" +
        '<ul><li ng-repeat="item in items">{{item}}</li></ul>' +
        "</div>",
    },
    jState = {
      name: "j",
      template: "jState",
    },
    kState = {
      name: "k",
      controller: function () {
        this.someProperty = "value";
      },
      template: "{{vm.someProperty}}",
      controllerAs: "vm",
    },
    lState = {
      name: "l",
      views: {
        view1: {
          template: "view1",
        },
        view2: {
          template: "view2",
        },
        view3: {
          template: "view3",
        },
      },
    },
    mState = {
      name: "m",
      template: "mState",
      controller: function ($scope, $element) {
        $scope.elementId = $element.getAttribute("id");
      },
    },
    nState = {
      name: "n",
      template: "nState",
      controller: function ($scope, $element) {
        const data = getCacheData($element, "$ngViewAnim");
        $scope.$on("$destroy", () => {
          log += "destroy;";
        });
        data.$animEnter.then(() => {
          log += "animEnter;";
        });
        data.$animLeave.then(() => {
          log += "animLeave;";
        });
      },
    };

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    log = "";
    app = window.angular
      .module("defaultModule", [])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          errorLog.push(exception.message);
        };
      })
      .config(($provide, _$stateProvider_) => {
        $provide.decorator("$anchorScroll", () => {
          return jasmine.createSpy("$anchorScroll");
        });

        _$stateProvider_
          .state(aState)
          .state(bState)
          .state(cState)
          .state(dState)
          .state(eState)
          .state(fState)
          .state(gState)
          .state(hState)
          .state(iState)
          .state(jState)
          .state(kState)
          .state(lState)
          .state(mState)
          .state(nState);

        $stateProvider = _$stateProvider_;
      });

    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$state_, $rootScope, _$compile_, _$anchorScroll_) => {
      scope = $rootScope.$new();
      $compile = _$compile_;
      $state = _$state_;
      $anchorScroll = _$anchorScroll_;
    });
  });

  describe("linking ng-directive", () => {
    it("anonymous ng-view should be replaced with the template of the current $state", async () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      expect(elem.querySelector("ng-view").textContent).toBe("");

      $state.transitionTo(aState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(aState.template);
    });

    it("ng-view should be updated after transition to another state", async () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);
      expect(elem.querySelector("ng-view").textContent).toBe("");

      $state.transitionTo(aState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(aState.template);

      $state.transitionTo(bState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(bState.template);
    });

    it("named ng-view should be replaced with a named view declaration", async () => {
      elem.innerHTML = '<div><ng-view name="cview"></ng-view></div>';
      $compile(elem)(scope);

      $state.transitionTo(cState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(
        cState.views.cview.template,
      );
    });

    it("should handle sibling named ng-views", async () => {
      elem.innerHTML =
        '<div><ng-view name="dview1"></ng-view><ng-view name="dview2"></ng-view></div>';
      $compile(elem)(scope);

      $state.transitionTo(dState);
      await wait(100);

      const ngViews = elem.querySelectorAll("ng-view");

      expect(ngViews[0].textContent).toBe(dState.views.dview1.template);
      expect(ngViews[1].textContent).toBe(dState.views.dview2.template);
    });

    it("should handle nested ng-views (testing two levels deep)", async () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);
      expect(elem.querySelector("ng-view").textContent).toBe("");

      $state.transitionTo(fState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(
        fState.views.eview.template,
      );
    });

    it("should support named and relative view targets", async () => {
      $stateProvider
        .state({
          name: "app",
          template: '<ng-view name="mymessages"></ng-view>',
        })
        .state({
          name: "app.mymessages",
          views: {
            mymessages: {
              template:
                '<section><ng-view name="messagelist"></ng-view><ng-view name="messagecontent"></ng-view></section>',
            },
          },
        })
        .state({
          name: "app.mymessages.messagelist",
          views: {
            messagelist: {
              template: "message list",
            },
          },
        })
        .state({
          name: "app.mymessages.messagelist.message",
          views: {
            "^.^.messagecontent": {
              template: "message content",
            },
          },
        });

      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo("app.mymessages.messagelist.message");
      await wait(100);

      expect(elem.textContent).toContain("message list");
      expect(elem.textContent).toContain("message content");
    });
  });

  describe("handling initial view", () => {
    it("initial view should be compiled if the view is empty", async () => {
      const content = "inner content";
      scope.content = content;
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo(gState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(content);
    });

    it("initial view should be put back after removal of the view", async () => {
      const content = "inner content";
      scope.content = content;
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      $state.go(hState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(
        hState.views.inner.template,
      );

      // going to the parent state which makes the inner view empty
      $state.go(gState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(content);
    });

    // related to issue #435
    it("initial view should be transcluded once to prevent breaking other directives", async () => {
      scope.items = ["I", "am", "a", "list", "of", "items"];
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);
      await wait();
      // transition to state that has an initial view
      $state.transitionTo(iState);
      await wait(100);

      // verify if ng-repeat has been compiled
      expect(elem.querySelectorAll("li").length).toBe(scope.items.length);

      // transition to another state that replace the initial content
      $state.transitionTo(jState);
      await wait(100);
      expect(elem.querySelector("ng-view").innerText).toBe(jState.template);

      // transition back to the state with empty subview and the initial view
      $state.transitionTo(iState);
      await wait(100);

      // verify if the initial view is correct
      expect(elem.querySelectorAll("li").length).toBe(scope.items.length);

      // change scope properties
      scope.items.push(".", "Working?");
      await wait();
      // verify if the initial view has been updated
      expect(elem.querySelectorAll("li").length).toBe(scope.items.length);
    });
  });

  describe("autoscroll attribute", () => {
    it("should NOT autoscroll when unspecified", async () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo(aState);
      await wait(100);
      expect($anchorScroll).not.toHaveBeenCalled();
    });

    it("should autoscroll when expression is missing", async () => {
      elem.innerHTML = "<div><ng-view autoscroll></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo(aState);
      await wait(20);

      // animateFlush($animate);

      expect($anchorScroll).toHaveBeenCalledWith(elem.querySelector("ng-view"));
    });

    it("should autoscroll based on expression", async () => {
      scope.doScroll = false;

      elem.innerHTML = "<div><ng-view autoscroll='doScroll'></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo(aState);
      await wait(100);

      expect($anchorScroll).not.toHaveBeenCalled();

      scope.doScroll = true;
      $state.transitionTo(bState);
      await wait(100);
      expect($anchorScroll).toHaveBeenCalledWith(elem.querySelector("ng-view"));
    });
  });

  it("should instantiate a controller with controllerAs", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state.transitionTo(kState);
    await wait(100);
    expect(elem.textContent).toBe("value");
  });

  it("should instantiate a controller with both $scope and $element injections", async () => {
    elem.innerHTML = '<div><ng-view id="mState">{{elementId}}</ng-view></div>';
    $compile(elem)(scope);
    $state.transitionTo(mState);
    await wait(100);

    expect(elem.textContent).toBe("mState");
  });

  it("should do transition animations", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("n");
    await wait(100);
    expect(elem.querySelector("ng-view").textContent).toBe(nState.template);

    await $state.transitionTo("a");
    await wait(100);
    expect(elem.querySelector("ng-view").textContent).toBe(aState.template);
    expect(log).toContain("animEnter;");
    expect(log).toContain("animLeave;");
  });

  it("should expose real ngView animation promises to controllers", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("n");
    await wait(100);
    expect(log).toContain("animEnter;");

    await $state.transitionTo("a");
    await wait(100);
    expect(log).toContain("destroy;");
    expect(log).toContain("animLeave;");
  });

  it("should do ngClass animations", async () => {
    scope.classOn = false;
    elem.innerHTML =
      '<div><ng-view ng-class="{ yay: classOn }">Initial Content</ng-view></div>';
    $compile(elem)(scope);

    scope.classOn = true;
    await wait(100);
    expect(elem.querySelector("ng-view").classList.contains("yay")).toBeTrue();

    scope.classOn = false;
    await wait(100);
    expect(elem.querySelector("ng-view").classList.contains("yay")).toBeFalse();
  });

  it("should do ngIf animations", async () => {
    scope.shouldShow = false;
    elem.innerHTML =
      '<div><ng-view ng-if="shouldShow">Initial Content</ng-view></div>';
    $compile(elem)(scope);

    scope.shouldShow = true;
    await wait(100);
    expect(elem.querySelector("ng-view").textContent).toBe("Initial Content");

    scope.shouldShow = false;
    await wait(100);
    expect(elem.querySelector("ng-view")).toBeNull();
  });

  describe("(resolved data)", () => {
    let _scope;
    function controller($scope) {
      _scope = $scope;
    }
    let _state;
    beforeEach(() => {
      _state = {
        name: "resolve",
        resolve: {
          user: function () {
            return wait(100).then(() => {
              return "joeschmoe";
            });
          },
        },
      };
    });

    it("should put the resolved data on the controllerAs", async () => {
      const state = Object.assign(_state, {
        template: "{{$ctrl.$resolve.user}}",
        controllerAs: "$ctrl",
        controller: function ($scope) {
          _scope = $scope;
        },
      });
      $stateProvider.state(state);
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo("resolve");
      await wait(100);

      expect(elem.textContent).toBe("joeschmoe");
      expect(_scope.$resolve).toBeDefined();
      expect(_scope.$ctrl).toBeDefined();
      expect(_scope.$ctrl.$resolve).toBeDefined();
      expect(_scope.$ctrl.$resolve.user).toBe("joeschmoe");
    });

    it("should provide the resolved data on the $scope", async () => {
      const state = Object.assign(_state, {
        template: "{{$resolve.user}}",
        controller: controller,
      });

      $stateProvider.state(state);
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo("resolve");
      await wait(100);

      expect(elem.textContent).toBe("joeschmoe");
      expect(_scope.$resolve).toBeDefined();
      expect(_scope.$resolve.user).toBe("joeschmoe");
    });

    // Test for #2626
    it("should provide the resolved data on the $scope even if there is no controller", async () => {
      const state = Object.assign(_state, {
        template: "{{$resolve.user}}",
      });
      $stateProvider.state(state);
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);
      expect(elem.textContent).toBe("");

      await $state.transitionTo("resolve");
      await wait(100);

      expect(elem.textContent).toBe("joeschmoe");
    });

    it("should put the resolved data on the resolveAs variable", async () => {
      const state = Object.assign(_state, {
        template: "{{$$$resolve.user}}",
        resolveAs: "$$$resolve",
        controller: controller,
      });
      $stateProvider.state(state);
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo("resolve");
      await wait(100);

      expect(elem.textContent).toBe("joeschmoe");
      expect(_scope.$$$resolve).toBeDefined();
      expect(_scope.$$$resolve.user).toBe("joeschmoe");
    });

    it("should not allow both view-level resolveAs and state-level resolveAs on the same state", async () => {
      const state = Object.assign(_state, {
        resolveAs: "foo",
        views: {
          $default: {
            controller: controller,
            template: "{{$$$resolve.user}}",
            resolveAs: "$$$resolve",
          },
        },
      });
      expect(() => $stateProvider.state(state)).toThrowError(/resolveAs/);
    });
  });

  it("should call the existing $onInit after instantiating a controller", async () => {
    const $onInit = jasmine.createSpy();
    $stateProvider.state({
      name: "onInit",
      controller: function () {
        this.$onInit = $onInit;
      },
      template: "hi",
      controllerAs: "vm",
    });
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    await $state.transitionTo("onInit");
    await wait(100);

    expect($onInit).toHaveBeenCalled();
  });

  it("should default the template to a '<ng-view>'", async () => {
    $stateProvider.state({ name: "abstract", abstract: true });
    $stateProvider.state({ name: "abstract.foo", template: "hello" });
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state.transitionTo("abstract.foo");
    await wait(100);

    expect(elem.textContent).toBe("hello");
  });

  describe("play nicely with other directives", () => {
    // related to issue #857
    it("should work with ngIf", async () => {
      scope.someBoolean = false;
      elem.innerHTML = '<div ng-if="someBoolean"><ng-view></ng-view></div>';
      $compile(elem)(scope);
      $state.transitionTo(aState);
      await wait(100);
      // Verify there is no ng-view in the DOM
      expect(elem.querySelectorAll("ng-view").length).toBe(0);

      // Turn on the div that holds the ng-view
      scope.someBoolean = true;
      await wait(100);
      expect(elem.querySelectorAll("ng-view").length).toBe(1);

      // Turn off the ng-view
      scope.someBoolean = false;
      await wait(100);
      // Verify there is no ng-view in the DOM
      expect(elem.querySelectorAll("ng-view").length).toBe(0);

      // Turn on the div that holds the ng-view once again
      scope.someBoolean = true;
      await wait(100);
      expect(elem.querySelectorAll("ng-view").length).toBe(1);
    });

    it("should work with ngClass", async () => {
      scope.showClass = false;
      elem.innerHTML =
        "<div><ng-view ng-class=\"{'someClass': showClass}\"></ng-view></div>";
      $compile(elem)(scope);
      await wait();
      expect(elem.querySelector("ng-view").classList).not.toContain(
        "someClass",
      );

      scope.showClass = true;
      await wait();
      expect(elem.querySelector("ng-view").classList).toContain("someClass");

      scope.showClass = false;
      await wait();
      expect(elem.querySelector("ng-view").classList).not.toContain(
        "someClass",
      );
    });

    describe("working with ngRepeat", () => {
      it("should have correct number of ngViews", async () => {
        elem.innerHTML =
          '<div><ng-view ng-repeat="view in views"></ng-view></div>';
        $compile(elem)(scope);
        await wait();
        // Should be no ng-views in DOM
        expect(elem.querySelectorAll("ng-view").length).toBe(0);

        // Lets add 3
        scope.views = ["view1", "view2", "view3"];
        await wait(100);
        // Should be 3 ng-views in the DOM
        expect(elem.querySelectorAll("ng-view").length).toBe(
          scope.views.length,
        );

        // Lets add one more - yay two-way binding
        scope.views.push("view4");
        await wait(100);
        // Should have 4 ng-views

        expect(elem.querySelectorAll("ng-view").length).toBe(
          scope.views.length,
        );

        // Lets remove 2 ng-views from the DOM
        scope.views.pop();
        scope.views.pop();
        await wait(100);
        expect(elem.querySelectorAll("ng-view").length).toBeGreaterThanOrEqual(
          scope.views.length,
        );
      });
    });
  });
});

describe("ngView transclusion", () => {
  let scope, $compile, elem, $injector, $rootScope, $state;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .directive("scopeObserver", () => {
        return {
          restrict: "E",
          link: function (scope) {
            scope.$emit("directiveCreated");
            scope.$on("$destroy", () => {
              scope.$emit("directiveDestroyed");
            });
          },
        };
      })
      .config(function ($stateProvider) {
        $stateProvider
          .state({
            name: "a",
            template: "<ng-view><scope-observer></scope-observer></ng-view>",
          })
          .state({ name: "a.b", template: "anything" });
      });
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$state_, _$rootScope_, _$compile_, _$anchorScroll_) => {
      $rootScope = _$rootScope_;
      scope = $rootScope.$new();
      $compile = _$compile_;
      $state = _$state_;
      elem = document.getElementById("app");
    });
  });

  it("should not link the initial view and leave its scope undestroyed when a subview is activated", async () => {
    let aliveCount = 0;
    scope.$on("directiveCreated", () => {
      aliveCount++;
    });
    scope.$on("directiveDestroyed", () => {
      aliveCount--;
    });
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state.transitionTo("a.b");
    await wait(100);
    expect(aliveCount).toBe(0);
  });
});

describe("ngView controllers or onEnter handlers", () => {
  let el, template, scope, count, $rootScope, $compile, $state, elem;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .config(function ($locationProvider, $stateProvider) {
        count = 0;
        $locationProvider.html5ModeConf.enabled = false;
        $stateProvider
          .state({
            name: "aside",
            url: "/aside",
            template: '<div class="aside"></div>',
          })
          .state({
            name: "A",
            url: "/A",
            template: '<div class="A" ng-view></div>',
          })
          .state({
            name: "A.fwd",
            url: "/fwd",
            template: '<div class="fwd" ng-view>',
            controller: function ($state) {
              if (count++ < 20 && $state.current.name == "A.fwd")
                $state.go(".nest");
            },
          })
          .state({
            name: "A.fwd.nest",
            url: "/nest",
            template: '<div class="nest"></div>',
          });
      });

    let $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$state_, _$rootScope_, _$compile_, _$anchorScroll_) => {
      $rootScope = _$rootScope_;
      scope = $rootScope.$new();
      $compile = _$compile_;
      $state = _$state_;
      elem = document.getElementById("app");
    });
  });

  it("should not go into an infinite loop when controller uses $state.go", async () => {
    el = "<div><ng-view></ng-view></div>";
    template = $compile(el)($rootScope);
    await $state.transitionTo("aside");
    await wait(100);
    expect(template.querySelector(".aside")).toBeDefined();
    expect(template.querySelector(".fwd")).toBeNull();

    await $state.transitionTo("A");
    await wait(100);
    expect(template.querySelector(".A")).not.toBeNull();
    expect(template.querySelector(".fwd")).toBeNull();

    await $state.transitionTo("A.fwd");
    await wait(100);
    expect(template.querySelector(".A")).not.toBeNull();
    expect(template.querySelector(".fwd")).not.toBeNull();
    expect(template.querySelector(".nest")).not.toBeNull();
    expect(count).toBe(1);
  });
});

describe("angular 1.5+ style .component()", () => {
  let el = document.getElementById("app"),
    app,
    scope,
    log,
    svcs,
    $stateProvider,
    $templateCache,
    $rootScope,
    errorLog = [];

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          errorLog.push(exception.message);
        };
      })
      .directive("ng12Directive", () => {
        return {
          restrict: "E",
          scope: { data: "=" },
          templateUrl: "/comp_tpl.html",
          controller: function ($scope) {
            this.data = $scope.data;
          },
          controllerAs: "$ctrl",
        };
      })
      .directive("ng13Directive", () => {
        return {
          scope: { data: "=" },
          templateUrl: "/comp_tpl.html",
          controller: function () {
            this.$onInit = function () {
              log += "onInit;";
            };
          },
          bindToController: true,
          controllerAs: "$ctrl",
        };
      })
      .directive("ng12DynamicDirective", () => {
        return {
          restrict: "E",
          template: "dynamic directive",
        };
      })
      .component("ngComponent", {
        bindings: { data: "<", data2: "<" },
        templateUrl: "/comp_tpl.html",
        controller: function () {
          this.$onInit = function () {
            log += "onInit;";
          };
        },
      })
      .component("header", {
        bindings: { status: "<" },
        template: "#{{ $ctrl.status }}#",
      })
      .component("bindingTypes", {
        bindings: { oneway: "<oneway", twoway: "=", attribute: "@attr" },
        template:
          "-{{ $ctrl.oneway }},{{ $ctrl.twoway }},{{ $ctrl.attribute }}-",
      })
      .component("optionalBindingTypes", {
        bindings: { oneway: "<?oneway", twoway: "=?", attribute: "@?attr" },
        template:
          "-{{ $ctrl.oneway }},{{ $ctrl.twoway }},{{ $ctrl.attribute }}-",
      })
      .component("eventComponent", {
        bindings: { evt: "&" },
        template: "eventCmp",
      })
      .component("mydataComponent", {
        bindings: { dataUser: "<" },
        template: "-{{ $ctrl.dataUser }}-",
      })
      .component("dataComponent", {
        template: "DataComponent",
      })
      .component("parentCallbackComponent", {
        controller: function ($rootScope) {
          this.handleEvent = function (foo, bar) {
            $rootScope.log.push(foo);
            $rootScope.log.push(bar);
          };
        },
        template: `
        <h1>parentCmp</h1>
        <ng-view on-event="$ctrl.handleEvent(foo, bar)"></ng-view>
        `,
      })
      .component("childEventComponent", {
        bindings: { onEvent: "&" },
        template: `
        <h1>childCmp</h1>
        <button id="eventbtn" ng-click="$ctrl.onEvent({ foo: 123, bar: 456 })">Button</button>
        `,
      })
      .component("dynamicComponent", {
        template: "dynamicComponent {{ $ctrl.param }}",
        controller: function () {
          this.ngOnParamsChanged = function (params) {
            this.param = params.param;
          };
        },
      })
      .config(function (_$stateProvider_, $locationProvider) {
        $stateProvider = _$stateProvider_;
        $locationProvider.html5ModeConf.enabled = false;
      });

    let $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$rootScope_, _$compile_, _$state_, _$templateCache_) => {
      svcs = {
        $compile: _$compile_,
        $state: _$state_,
      };
      $rootScope = _$rootScope_;
      scope = $rootScope.$new();
      log = "";
      el.innerHTML = "<div><ng-view></ng-view></div>";
      svcs.$compile(el)(scope);
      $templateCache = _$templateCache_;
    });
  });

  describe("routing using component templates", () => {
    beforeEach(() => {
      $stateProvider.state({
        name: "cmp_tpl",
        url: "/cmp_tpl",
        templateUrl: "/state_tpl.html",
        controller: function () {},
        resolve: {
          data: function () {
            return "DATA!";
          },
        },
      });
    });

    it("should work with directives which themselves have templateUrls", async () => {
      const $state = svcs.$state;

      $templateCache.set(
        "/state_tpl.html",
        'x<ng12-directive data="$resolve.data"></ng12-directive>x',
      );
      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");

      $state.transitionTo("cmp_tpl");
      await wait(100);
      expect($state.current.name).toBe("cmp_tpl");

      expect(el.querySelector("ng-view").innerHTML).toEqual(
        'x<ng12-directive data="$resolve.data">-DATA!-</ng12-directive>x',
      );
    });

    it("should work with bindToController directives", async () => {
      const $state = svcs.$state;

      $templateCache.set(
        "/state_tpl.html",
        'x<ng13-directive data="$resolve.data"></ng13-directive>x',
      );
      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");

      $state.transitionTo("cmp_tpl");
      await wait(100);

      expect($state.current.name).toBe("cmp_tpl");
      expect(el.querySelector("ng-view").innerHTML).toEqual(
        'x<ng13-directive data="$resolve.data">-DATA!-</ng13-directive>x',
      );
    });

    it("should work with .component()s", async () => {
      const $state = svcs.$state;

      $templateCache.set(
        "/state_tpl.html",
        'x<ng-component data="$resolve.data"></ng-component>x',
      );
      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");

      $state.transitionTo("cmp_tpl");
      await wait(100);

      expect($state.current.name).toBe("cmp_tpl");
      expect(el.querySelector("ng-view").innerHTML).toEqual(
        'x<ng-component data="$resolve.data">-DATA!-</ng-component>x',
      );
    });
  });

  describe("+ component: declaration", () => {
    it("should disallow controller/template configuration", () => {
      const stateDef = {
        name: "route2cmp",
        url: "/route2cmp",
        component: "ng12Directive",
        resolve: {
          data: function () {
            return "DATA!";
          },
        },
      };

      expect(() => {
        $stateProvider.state(
          Object.assign({ name: "route2cmp", template: "fail" }, stateDef),
        );
      }).toThrow();
      expect(() => {
        $stateProvider.state(
          Object.assign(
            { name: "route2cmp", templateUrl: "fail.html" },
            stateDef,
          ),
        );
      }).toThrow();
      expect(() => {
        $stateProvider.state(
          Object.assign(
            {
              name: "route2cmp",
              templateProvider: () => {
                /* empty */
              },
            },
            stateDef,
          ),
        );
      }).toThrow();
      expect(() => {
        $stateProvider.state(
          Object.assign({ name: "route2cmp", controllerAs: "fail" }, stateDef),
        );
      }).toThrow();
      expect(() => {
        $stateProvider.state(
          Object.assign(
            { name: "route2cmp", controller: "FailCtrl" },
            stateDef,
          ),
        );
      }).toThrow();
      expect(() => {
        $stateProvider.state(
          Object.assign(
            { name: "route2cmp", controllerProvider: function () {} },
            stateDef,
          ),
        );
      }).toThrow();

      expect(() => {
        $stateProvider.state(stateDef);
      }).not.toThrow();
    });

    it("should work with angular 1.2+ directives", async () => {
      $stateProvider.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ng12Directive",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      const directiveEl = el.querySelector("div ng-view ng12-directive");
      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("route2cmp");
      expect(el.textContent).toBe("-DATA!-");
    });

    it("should work with angular 1.3+ bindToComponent directives", async () => {
      $stateProvider.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ng13Directive",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      const directiveEl = el.querySelector("div ng-view ng13-directive");
      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("route2cmp");
      expect(el.textContent).toBe("-DATA!-");
    });

    it("should call $onInit() once", async () => {
      log = "";
      $stateProvider.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ng13Directive",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      expect(log).toBe("onInit;");
    });

    it("should work with angular 1.5+ .component()s", async () => {
      $stateProvider.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ngComponent",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      const directiveEl = el.querySelector("div ng-view ng-component");
      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("route2cmp");
      expect(el.textContent).toBe("-DATA!-");
    });

    it("should support string component shorthand in named views", async () => {
      $stateProvider.state({
        name: "namedComponentView",
        views: {
          header: "header",
        },
        resolve: {
          status: () => "ready",
        },
      });

      el.innerHTML = '<div><ng-view name="header"></ng-view></div>';
      svcs.$compile(el)(scope);

      await svcs.$state.transitionTo("namedComponentView");
      await wait(100);

      expect(el.textContent).toBe("#ready#");
    });

    it("should clear ng-view when routing to a component whose templateUrl was already fetched elsewhere", async () => {
      $stateProvider.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ngComponent",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      el.innerHTML =
        '<div><ng-component data="outsideData"></ng-component><ng-view>fallback content</ng-view></div>';
      scope.outsideData = "OUTSIDE";
      svcs.$compile(el)(scope);

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      await wait(100);

      expect(el.textContent).toContain("-OUTSIDE-");

      const $state = svcs.$state;

      $state.transitionTo("route2cmp");
      await wait(100);

      expect($state.current.name).toBe("route2cmp");
      expect(el.querySelector("div ng-view").textContent).toBe("-DATA!-");
      expect(el.querySelector("div ng-view").textContent).not.toContain(
        "fallback content",
      );
    });

    it("should only call $onInit() once", async () => {
      $stateProvider.state({
        name: "route2cmp",
        component: "ngComponent",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      expect(log).toBe("onInit;");
    });

    it("should only call $onInit() once with componentProvider", async () => {
      $stateProvider.state({
        name: "route2cmp",
        componentProvider: () => "ngComponent",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      expect(log).toBe("onInit;");
    });

    it('should supply resolve data to "<", "=", "@" bindings', async () => {
      $stateProvider.state({
        name: "bindingtypes",
        component: "bindingTypes",
        resolve: {
          oneway: () => {
            return "ONEWAY";
          },
          twoway: () => {
            return "TWOWAY";
          },
          attribute: () => {
            return "ATTRIBUTE";
          },
        },
        bindings: { attr: "attribute" },
      });

      const $state = svcs.$state;

      $state.transitionTo("bindingtypes");
      await wait(100);

      expect(el.textContent).toBe("-ONEWAY,TWOWAY,ATTRIBUTE-");
    });

    it('should supply resolve data to optional "<?", "=?", "@?" bindings', async () => {
      $stateProvider.state({
        name: "optionalbindingtypes",
        component: "optionalBindingTypes",
        resolve: {
          oneway: () => {
            return "ONEWAY";
          },
          twoway: () => {
            return "TWOWAY";
          },
          attribute: () => {
            return "ATTRIBUTE";
          },
        },
        bindings: { attr: "attribute" },
      });

      const $state = svcs.$state;

      $state.transitionTo("optionalbindingtypes");
      await wait(100);

      expect(el.textContent).toBe("-ONEWAY,TWOWAY,ATTRIBUTE-");
    });

    // Test for #3099
    it('should not throw when routing to a component with output "&" binding', async () => {
      $stateProvider.state({
        name: "nothrow",
        component: "eventComponent",
      });

      const $state = svcs.$state;
      $state.transitionTo("nothrow");
      await wait(100);

      expect(el.textContent).toBe("eventCmp");
    });

    // Test for #3276
    it('should route to a component that is prefixed with "data"', async () => {
      $stateProvider.state({
        name: "data",
        component: "dataComponent",
      });

      const $state = svcs.$state;
      $state.transitionTo("data");
      await wait(100);

      expect(el.textContent).toBe("DataComponent");
    });

    // Test for #3276
    it('should bind a resolve that is prefixed with "data"', async () => {
      $stateProvider.state({
        name: "data",
        component: "mydataComponent",
        resolve: { dataUser: () => "user" },
      });

      const $state = svcs.$state;
      $state.transitionTo("data");
      await wait(100);

      expect(el.textContent).toBe("-user-");
    });

    // Test for #3239
    it("should pass any bindings (wired from a parent component template via the ng-view) through to the child", async () => {
      const $state = svcs.$state;

      $stateProvider.state({
        name: "parent",
        template:
          '<ng-view oneway="data1w" twoway="data2w" attr="attrval"></ng-view>',
        controller: function ($scope) {
          $scope.data1w = "1w";
          $scope.data2w = "2w";
        },
      });

      $stateProvider.state({
        name: "parent.child",
        component: "bindingTypes",
      });

      $state.transitionTo("parent.child");
      await wait(100);
      expect(el.textContent).toEqual("-1w,2w,attrval-");
    });

    // Test for #3239
    it("should prefer ng-view bindings over resolve data", async () => {
      const $state = svcs.$state;

      $stateProvider.state({
        name: "parent",
        template:
          '<ng-view oneway="data1w" twoway="data2w" attr="attrval"></ng-view>',
        resolve: {
          oneway: () => "asfasfd",
          twoway: () => "asfasfd",
          attr: () => "asfasfd",
        },
        controller: function ($scope) {
          $scope.data1w = "1w";
          $scope.data2w = "2w";
        },
      });

      $stateProvider.state({
        name: "parent.child",
        component: "bindingTypes",
      });

      $state.transitionTo("parent.child");
      await wait(100);
      expect(el.textContent).toEqual("-1w,2w,attrval-");
    });

    // Test for #3239
    it("should prefer ng-view bindings over resolve data unless a bindings exists", async () => {
      const $state = svcs.$state;

      $stateProvider.state({
        name: "parent",
        template:
          '<ng-view oneway="data1w" twoway="data2w" attr="attrval"></ng-view>',
        resolve: {
          oneway: () => "asfasfd",
          twoway: () => "asfasfd",
          attr: () => "asfasfd",
        },
        controller: function ($scope) {
          $scope.data1w = "1w";
          $scope.data2w = "2w";
        },
      });

      $stateProvider.state({
        name: "parent.child",
        component: "bindingTypes",
        bindings: { oneway: "oneway" },
      });

      $state.transitionTo("parent.child");
      await wait(100);
      expect(el.textContent).toEqual("-asfasfd,2w,attrval-");
    });

    // Test for #3239
    it("should pass & bindings (wired from a parent component via the ng-view) through to the child", async () => {
      const $state = svcs.$state;
      $rootScope.log = [];

      $stateProvider.state({
        name: "parent",
        component: "parentCallbackComponent",
      });

      $stateProvider.state({
        name: "parent.child",
        component: "childEventComponent",
      });

      $state.transitionTo("parent.child");
      await wait(100);
      expect($rootScope.log).toEqual([]);
      expect(el.textContent.split(/\s+/).filter((x) => x)).toEqual([
        "parentCmp",
        "childCmp",
        "Button",
      ]);

      // - Click button
      // - ng-click handler calls $ctrl.onEvent({ foo: 123, bar: 456 })
      // - on-event is bound to $ctrl.handleEvent(foo, bar) on parentCallbackComponent
      // - handleEvent pushes param values to the log
      el.querySelector("button").click();
      expect($rootScope.log).toEqual([123, 456]);
    });

    // Test for #3111
    it("should bind & bindings to a resolve that returns a function", async () => {
      const $state = svcs.$state;
      log = [];

      $stateProvider.state({
        name: "resolve",
        component: "childEventComponent",
        resolve: {
          onEvent: () => (foo, bar) => {
            log.push(foo);
            log.push(bar);
          },
        },
      });

      $state.transitionTo("resolve");
      await wait(100);
      expect(log).toEqual([]);
      el.querySelector("button").click();
      expect(log).toEqual([123, 456]);
    });

    // Test for #3111
    it("should bind & bindings to a resolve that returns an array-style function", async () => {
      const $state = svcs.$state;
      log = [];

      $stateProvider.state({
        name: "resolve",
        component: "childEventComponent",
        resolve: {
          onEvent: () => [
            "foo",
            "bar",
            (foo, bar) => {
              log.push(foo);
              log.push(bar);
            },
          ],
        },
      });

      $state.transitionTo("resolve");
      await wait(100);
      expect(log).toEqual([]);
      el.querySelector("button").click();
      expect(log).toEqual([123, 456]);
    });
  });

  describe("+ bindings: declaration", () => {
    it("should provide the named component binding with data from the named resolve", async () => {
      $stateProvider.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ng12Directive",
        bindings: { data: "foo" },
        resolve: {
          foo: () => {
            return "DATA!";
          },
        },
      });

      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      const directiveEl = el.querySelector("div ng-view ng12-directive");
      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("route2cmp");
      expect(el.textContent).toBe("-DATA!-");
    });

    it("should provide default bindings for any component bindings omitted in the state.bindings map", async () => {
      $stateProvider.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ngComponent",
        bindings: { data: "foo" },
        resolve: {
          foo: () => {
            return "DATA!";
          },
          data2: () => {
            return "DATA2!";
          },
        },
      });

      const $state = svcs.$state;

      $templateCache.set(
        "/comp_tpl.html",
        "-{{ $ctrl.data }}.{{ $ctrl.data2 }}-",
      );
      $state.transitionTo("route2cmp");
      await wait(100);

      const directiveEl = el.querySelector("div ng-view ng-component");
      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("route2cmp");
      expect(el.textContent).toBe("-DATA!.DATA2!-");
    });
  });

  describe("componentProvider", () => {
    it("should work with angular 1.2+ directives", async () => {
      $stateProvider.state({
        name: "ng12-dynamic-directive",
        url: "/ng12dynamicDirective/:type",
        componentProvider: [
          "$stateParams",
          function ($stateParams) {
            return $stateParams.type;
          },
        ],
      });

      const $state = svcs.$state;

      $state.transitionTo("ng12-dynamic-directive", {
        type: "ng12DynamicDirective",
      });
      await wait(100);

      const directiveEl = el.querySelector(
        "div ng-view ng12-dynamic-directive",
      );
      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("ng12-dynamic-directive");
      expect(el.textContent).toBe("dynamic directive");
    });

    // TODO Invalid transition
    it("should load correct component when using componentProvider", async () => {
      $stateProvider.state({
        name: "dynamicComponent",
        url: "/dynamicComponent/:type",
        componentProvider: [
          "$router",
          function ($router) {
            return $router.params.type;
          },
        ],
      });

      const $state = svcs.$state;

      await $state.transitionTo("dynamicComponent", {
        type: "dynamicComponent",
      });
      await wait(100);

      const directiveEl = el.querySelector("div ng-view dynamic-component");
      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("dynamicComponent");
    });
  });

  describe("ngOnParamsChanged()", () => {
    let param;

    beforeEach(() => {
      param = null;

      $stateProvider.state({
        name: "dynamic",
        url: "/dynamic/:param",
        component: "dynamicComponent",
        params: { param: { dynamic: true } },
      });

      $stateProvider.state({
        name: "dynamic2",
        url: "/dynamic2/:param",
        componentProvider: () => "dynamicComponent",
        params: { param: { dynamic: true } },
      });
    });

    it("should not be called on the initial transition", async () => {
      const $state = svcs.$state;
      $state.go("dynamic", { param: "abc" });
      await wait(100);
      expect(el.textContent.trim()).toBe("dynamicComponent");
    });

    it("should be called when dynamic parameters change", async () => {
      const $state = svcs.$state;
      $state.go("dynamic", { param: "abc" });
      await wait(100);
      $state.go("dynamic", { param: "def" });
      await wait(100);

      expect(el.textContent.trim()).toBe("dynamicComponent def");
    });

    it("should work with componentProvider", async () => {
      const $state = svcs.$state;
      $state.go("dynamic2", { param: "abc" });
      await wait(100);
      $state.go("dynamic2", { param: "def" });
      await wait(100);

      expect(el.textContent.trim()).toBe("dynamicComponent def");
    });
  });
});
