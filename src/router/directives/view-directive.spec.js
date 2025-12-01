import { createElementFromHTML, dealoc } from "../../shared/dom.js";
import { Angular } from "../../angular.js";
import { wait } from "../../shared/test-utils.js";

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
    $viewScroll,
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
        $provide.decorator("$viewScroll", () => {
          return jasmine.createSpy("$viewScroll");
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

    $injector.invoke((_$state_, $rootScope, _$compile_, _$viewScroll_) => {
      scope = $rootScope.$new();
      $compile = _$compile_;
      $state = _$state_;
      $viewScroll = _$viewScroll_;
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

    it("named ng-view should be replaced with the template of the current $state", async () => {
      elem.innerHTML = '<div><ng-view name="cview"></ng-view></div>';
      $compile(elem)(scope);

      $state.transitionTo(cState);
      await wait(100);

      expect(elem.querySelector("ng-view").textContent).toBe(
        cState.views.cview.template,
      );
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

    it("should handle NOT nested ng-views", async () => {
      elem.innerHTML =
        '<div><ng-view name="dview1" class="dview1"></ng-view><ng-view name="dview2" class="dview2"></ng-view></div>';
      $compile(elem)(scope);
      expect(elem.querySelectorAll("ng-view")[0].textContent).toBe("");
      expect(elem.querySelectorAll("ng-view")[1].textContent).toBe("");

      $state.transitionTo(dState);
      await wait(100);

      expect(elem.querySelectorAll("ng-view")[0].textContent).toBe(
        dState.views.dview1.template,
      );
      expect(elem.querySelectorAll("ng-view")[1].textContent).toBe(
        dState.views.dview2.template,
      );
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
      expect($viewScroll).not.toHaveBeenCalled();
    });

    it("should autoscroll when expression is missing", async () => {
      elem.innerHTML = "<div><ng-view autoscroll></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo(aState);
      await wait(20);

      // animateFlush($animate);

      expect($viewScroll).toHaveBeenCalledWith(elem.querySelector("ng-view"));
    });

    it("should autoscroll based on expression", async () => {
      scope.doScroll = false;

      elem.innerHTML = "<div><ng-view autoscroll='doScroll'></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo(aState);
      await wait(100);

      expect($viewScroll).not.toHaveBeenCalled();

      scope.doScroll = true;
      $state.transitionTo(bState);
      await wait(100);
      expect($viewScroll).toHaveBeenCalledWith(elem.querySelector("ng-view"));
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
      const views = {
        $default: {
          controller: controller,
          template: "{{$$$resolve.user}}",
          resolveAs: "$$$resolve",
        },
      };
      const state = Object.assign(_state, {
        resolveAs: "foo",
        views: views,
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
    xit("should work with ngIf", async () => {
      scope.someBoolean = false;
      elem.innerHTML = '<div ng-if="someBoolean"><ng-view></ng-view></div>';
      $compile(elem)(scope);
      $state.transitionTo(aState);
      await wait(100);
      // Verify there is no ng-view in the DOM
      expect(elem.querySelectorAll("ng-view").length).toBe(0);

      // Turn on the div that holds the ng-view
      scope.someBoolean = true;
      await wait();
      // Verify that the ng-view is there and it has the correct content
      expect(elem.querySelector("ng-view").textContent).toBe(aState.template);

      // Turn off the ng-view
      scope.someBoolean = false;
      await wait();
      // Verify there is no ng-view in the DOM
      expect(elem.querySelectorAll("ng-view").length).toBe(0);

      // Turn on the div that holds the ng-view once again
      scope.someBoolean = true;
      await wait();
      // Verify that the ng-view is there and it has the correct content
      expect(elem.querySelector("ng-view").textContent).toBe(aState.template);
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
      xit("should have correct number of ngViews", async () => {
        elem.innerHTML =
          '<div><ng-view ng-repeat="view in views" name="{{view}}"></ng-view></div>';
        $compile(elem)(scope);
        await wait();
        // Should be no ng-views in DOM
        expect(elem.querySelectorAll("ng-view").length).toBe(0);

        // Lets add 3
        scope.views = ["view1", "view2", "view3"];
        await wait();
        // Should be 3 ng-views in the DOM
        expect(elem.querySelectorAll("ng-view").length).toBe(
          scope.views.length,
        );

        // Lets add one more - yay two-way binding
        scope.views.push("view4");
        await wait();
        // Should have 4 ng-views

        expect(elem.querySelectorAll("ng-view").length).toBe(
          scope.views.length,
        );

        // Lets remove 2 ng-views from the DOM
        scope.views.pop();
        scope.views.pop();
        await wait();
        // Should have 2 ng-views
        expect(elem.querySelectorAll("ng-view").length).toBe(
          scope.views.length,
        );
      });

      xit("should populate each view with content", async () => {
        elem.innerHTML =
          '<div><ng-view ng-repeat="view in views" name="{{view}}">defaultcontent</ng-view></div>';
        $compile(elem)(scope);
        $state.transitionTo(lState);
        await wait(100);

        expect(elem.querySelectorAll("ng-view").length).toBe(0);

        scope.views = ["view1", "view2"];

        let ngViews = elem.querySelectorAll("ng-view");

        expect(ngViews[0].textContent).toBe(lState.views.view1.template);
        expect(ngViews[1].textContent).toBe(lState.views.view2.template);
        expect(ngViews[2].length).toBe(0);

        scope.views.push("view3");
        ngViews = elem.querySelector("ng-view");

        expect(ngViews[0].textContent).toBe(lState.views.view1.template);
        expect(ngViews[1].textContent).toBe(lState.views.view2.template);
        expect(ngViews[2].textContent).toBe(lState.views.view3.template);
      });

      xit("should interpolate ng-view names", async () => {
        elem.innerHTML =
          '<div ng-repeat="view in views">' +
          '<ng-view name="view{{$index + 1}}">hallo</ng-view>' +
          "</div>";
        $compile(elem)(scope);

        await wait(100);
        $state.transitionTo(lState);
        await wait(100);

        expect(elem.querySelectorAll("ng-view").length).toBe(0);

        scope.views = ["view1", "view2"];
        await wait(100);
        let ngViews = elem.querySelectorAll("ng-view");

        expect(ngViews[0].textContent).toBe(lState.views.view1.template);
        expect(ngViews[1].textContent).toBe(lState.views.view2.template);
        //expect(ngViews[2].length).toBe(0);

        scope.views.push("view3");
        await wait(100);
        ngViews = elem.querySelectorAll("ng-view");

        expect(ngViews[0].textContent).toBe(lState.views.view1.template);
        expect(ngViews[1].textContent).toBe(lState.views.view2.template);
        expect(ngViews[2].textContent).toBe(lState.views.view3.template);
      });
    });
  });

  // describe("AngularTS Animations", () => {
  //   it("should do transition animations", async () => {
  //     let content = "Initial Content",
  //       animation;
  //     elem.append(
  //       $compile("<div><ng-view>" + content + "</ng-view></div>")(scope),
  //     );

  //     // Enter Animation
  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("enter");
  //     expect(animation.element.textContent + "-1").toBe(content + "-1");

  //     $state.transitionTo(aState);
  //     await wait(100);

  //     // Enter Animation
  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("enter");
  //     expect(animation.element.textContent + "-2").toBe(aState.template + "-2");
  //     // Leave Animation
  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("leave");
  //     expect(animation.element.textContent + "-3").toBe(content + "-3");

  //     $state.transitionTo(bState);
  //     await wait(100);

  //     // Enter Animation
  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("enter");
  //     expect(animation.element.textContent + "-4").toBe(bState.template + "-4");
  //     // Leave Animation
  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("leave");
  //     expect(animation.element.textContent + "-5").toBe(aState.template + "-5");

  //     // No more animations
  //     expect($animate.queue.length).toBe(0);
  //   });

  //   it("should do ngClass animations", async () => {
  //     scope.classOn = false;
  //     let content = "Initial Content",
  //       className = "yay",
  //       animation;
  //     elem.append(
  //       $compile(
  //         "<div><ng-view ng-class=\"{'" +
  //           className +
  //           "': classOn}\">" +
  //           content +
  //           "</ng-view></div>",
  //       )(scope),
  //     );
  //     // Don't care about enter class
  //     $animate.queue.shift();

  //     scope.classOn = true;
  //     ;

  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("addClass");
  //     expect(animation.element.textContent).toBe(content);

  //     scope.classOn = false;
  //     ;

  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("removeClass");
  //     expect(animation.element.textContent).toBe(content);

  //     // No more animations
  //     expect($animate.queue.length).toBe(0);
  //   });

  //   it("should do ngIf animations", async () => {
  //     scope.shouldShow = false;
  //     let content = "Initial Content",
  //       animation;
  //     elem.append(
  //       $compile(
  //         '<div><ng-view ng-if="shouldShow">' + content + "</ng-view></div>",
  //       )(scope),
  //     );

  //     // No animations yet
  //     expect($animate.queue.length).toBe(0);

  //     scope.shouldShow = true;
  //     ;

  //     // $ViewDirective enter animation - Basically it's just the <!-- ngView --> comment
  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("enter");
  //     expect(animation.element.textContent).toBe("");

  //     // $ViewDirectiveFill enter animation - The second ngView directive that files in the content
  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("enter");
  //     expect(animation.element.textContent).toBe(content);

  //     scope.shouldShow = false;
  //     ;

  //     // ngView leave animation
  //     animation = $animate.queue.shift();
  //     expect(animation.event).toBe("leave");
  //     expect(animation.element.textContent).toBe(content);

  //     // No more animations
  //     expect($animate.queue.length).toBe(0);
  //   });

  //   it("should expose animation promises to controllers", async () => {
  //     $transitions.onStart({}, function ($transition$) {
  //       log += "start:" + $transition$.to().name + ";";
  //     });
  //     $transitions.onFinish({}, function ($transition$) {
  //       log += "finish:" + $transition$.to().name + ";";
  //     });
  //     $transitions.onSuccess({}, function ($transition$) {
  //       log += "success:" + $transition$.to().name + ";";
  //     });

  //     const content = "Initial Content";
  //     elem.append(
  //       $compile("<div><ng-view>" + content + "</ng-view></div>")(scope),
  //     );
  //     $state.transitionTo("n");
  //     await wait(100);

  //     expect($state.current.name).toBe("n");
  //     expect(log).toBe("start:n;finish:n;success:n;");

  //     // animateFlush($animate);
  //     await wait(100);
  //     expect(log).toBe("start:n;finish:n;success:n;animEnter;");

  //     $state.transitionTo("a");
  //     await wait(100);
  //     expect($state.current.name).toBe("a");
  //     expect(log).toBe(
  //       "start:n;finish:n;success:n;animEnter;start:a;finish:a;destroy;success:a;",
  //     );

  //     // animateFlush($animate);
  //     await wait(100);
  //     expect(log).toBe(
  //       "start:n;finish:n;success:n;animEnter;start:a;finish:a;destroy;success:a;animLeave;",
  //     );
  //   });
  // });
});

describe("ngView named", () => {
  let $stateProvider,
    scope,
    $compile,
    elem = document.getElementById("app"),
    log,
    app,
    $injector,
    $state,
    $rootScope,
    $viewScroll;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    log = "";
    app = window.angular
      .module("defaultModule", [])
      .config((_$stateProvider_) => {
        $stateProvider = _$stateProvider_;
        $stateProvider
          .state({ name: "main", abstract: true, views: { main: {} } })
          .state({
            name: "main.home",
            views: { content: { template: "HOME" } },
          })
          .state({ name: "test", views: { nest: { template: "TEST" } } });
      });

    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$state_, _$rootScope_, _$compile_, _$viewScroll_) => {
      $rootScope = _$rootScope_;
      scope = $rootScope.$new();
      $compile = _$compile_;
      $state = _$state_;
      $viewScroll = _$viewScroll_;
    });
  });

  // TODO targetNode not found
  it("shouldn't puke on weird nested view setups", async () => {
    elem.innerHTML = '<div ng-view="main"><div ng-view="content"></div></div>';
    $compile(elem)($rootScope);
    await $state.go("main.home");
    await wait(100);

    expect($state.current.name).toBe("main.home");
  });

  // Test for https://github.com/angular-ui/ui-router/issues/3355
  xit("should target weird nested view setups using the view's simple name", async () => {
    elem.innerHTML = `
      <div>
        <div ng-view="main">
          MAIN-DEFAULT-
          <div ng-view="content">
            <div ng-view="nest"></div>
          </div>
        </div>
      </div>
    `;
    $compile(elem)($rootScope);

    $state.go("test");
    await wait(100);

    expect($state.current.name).toBe("test");
    expect(elem.textContent.replace(/\s*/g, "")).toBe("MAIN-DEFAULT-TEST");
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

    $injector.invoke((_$state_, _$rootScope_, _$compile_, _$viewScroll_) => {
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
            template: '<div class="A" ng-view="fwd"></div>',
          })
          .state({
            name: "A.fwd",
            url: "/fwd",
            views: {
              fwd: {
                template: '<div class="fwd" ng-view>',
                controller: function ($state) {
                  if (count++ < 20 && $state.current.name == "A.fwd")
                    $state.go(".nest");
                },
              },
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

    $injector.invoke((_$state_, _$rootScope_, _$compile_, _$viewScroll_) => {
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
          this.uiOnParamsChanged = function (params) {
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
            { name: "route2cmp", templateProvider: () => {} },
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

    xit("should call $onInit() once", async () => {
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

    xit("should only call $onInit() once", async () => {
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

    xit("should only call $onInit() once with componentProvider", async () => {
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

    xit('should supply resolve data to "<", "=", "@" bindings', async () => {
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

    xit('should supply resolve data to optional "<?", "=?", "@?" bindings', async () => {
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
    xit("should prefer ng-view bindings over resolve data", async () => {
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
    xit("should prefer ng-view bindings over resolve data unless a bindings exists", async () => {
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
    xit("should pass & bindings (wired from a parent component via the ng-view) through to the child", async () => {
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
      el.querySelector("button")[0].click();
      expect($rootScope.log).toEqual([123, 456]);
    });

    // Test for #3111
    xit("should bind & bindings to a resolve that returns a function", async () => {
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
      el.querySelector("button")[0].click();
      expect(log).toEqual([123, 456]);
    });

    // Test for #3111
    xit("should bind & bindings to a resolve that returns an array-style function", async () => {
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
      el.querySelector("button")[0].click();
      expect(log).toEqual([123, 456]);
    });
  });

  describe("+ named views with component: declaration", () => {
    let stateDef;
    beforeEach(() => {
      stateDef = {
        name: "route2cmp",
        url: "/route2cmp",
        views: {
          header: { component: "header" },
          content: { component: "ngComponent" },
        },
        resolve: {
          status: () => {
            return "awesome";
          },
          data: () => {
            return "DATA!";
          },
        },
      };

      el = createElementFromHTML(
        '<div><div ng-view="header"></div><div ng-view="content"</div>',
      );
      svcs.$compile(el)(scope);
    });

    it("should disallow controller/template configuration in the view", () => {
      expect(() => {
        $stateProvider.state(stateDef);
      }).not.toThrow();
      expect(() => {
        const state = Object.assign({}, stateDef);
        state.views.header.template = "fails";
        $stateProvider.state(state);
      }).toThrow();
    });

    it("should render components as views", async () => {
      $stateProvider.state(stateDef);
      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      const header = el.querySelector("[ng-view=header]");
      const content = el.querySelector("[ng-view=content]");

      expect(header.textContent).toBe("#awesome#");
      expect(content.textContent).toBe("-DATA!-");
    });

    it("should allow a component view declaration to use a string as a shorthand", async () => {
      stateDef = {
        name: "route2cmp",
        url: "/route2cmp",
        views: { header: "header", content: "ngComponent" },
        resolve: {
          status: () => {
            return "awesome";
          },
          data: () => {
            return "DATA!";
          },
        },
      };
      $stateProvider.state(stateDef);
      const $state = svcs.$state;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await wait(100);

      const header = el.querySelector("[ng-view=header]");
      const content = el.querySelector("[ng-view=content]");

      expect(header.textContent).toBe("#awesome#");
      expect(content.textContent).toBe("-DATA!-");
    });

    // Test for https://github.com/angular-ui/ui-router/issues/3353
    it("should allow different states to reuse view declaration", () => {
      const views = {
        header: { component: "header" },
        content: { component: "ngComponent" },
      };

      const stateDef1 = { name: "def1", url: "/def1", views: views };
      const stateDef2 = { name: "def2", url: "/def2", views: views };

      $stateProvider.state(stateDef1);
      $stateProvider.state(stateDef2);
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
    xit("should load correct component when using componentProvider", async () => {
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

      await $state.transitionTo({
        name: "dynamicComponent",
        type: "dynamicComponent",
      });
      await wait(100);

      const directiveEl = el.querySelector("div ng-view dynamic-component");
      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("dynamicComponent");
      expect(el.textContent.trim()).toBe("dynamicComponent");
    });
  });

  describe("uiOnParamsChanged()", () => {
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

    xit("should be called when dynamic parameters change", async () => {
      const $state = svcs.$state;
      $state.go("dynamic", { param: "abc" });
      await wait(100);
      $state.go("dynamic", { param: "def" });
      await wait(100);

      expect(el.textContent.trim()).toBe("dynamicComponent def");
    });

    xit("should work with componentProvider", async () => {
      const $state = svcs.$state;
      $state.go("dynamic2", { param: "abc" });
      await wait(100);
      $state.go("dynamic2", { param: "def" });
      await wait(100);

      expect(el.textContent.trim()).toBe("dynamicComponent def");
    });
  });
});
