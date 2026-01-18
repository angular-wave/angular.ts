import { Angular } from "../../angular.js";
import { createInjector } from "../di/injector.js";

describe("$controller", () => {
  let $controllerProvider;
  let $controller;
  let injector;

  beforeEach(() => {
    window.angular = new Angular();
    injector = createInjector([
      "ng",
      function (_$controllerProvider_) {
        $controllerProvider = _$controllerProvider_;
      },
    ]);

    injector.invoke((_$controller_) => {
      $controller = _$controller_;
    });
  });

  describe("provider", () => {
    describe("registration", () => {
      it("sets up $controller", function () {
        expect(injector.has("$controller")).toBe(true);
      });

      it("instantiates controller functions", function () {
        const $controller = injector.get("$controller");

        function MyController() {
          this.invoked = true;
        }

        const controller = $controller(MyController);
        expect(controller).toBeDefined();
        expect(controller instanceof MyController).toBe(true);
        expect(controller.invoked).toBe(true);
      });

      it("instantiates controller classes", function () {
        const $controller = injector.get("$controller");

        class MyController {
          constructor() {
            this.invoked = true;
          }
        }

        const controller = $controller(MyController);
        expect(controller).toBeDefined();
        expect(controller instanceof MyController).toBe(true);
        expect(controller.invoked).toBe(true);
      });

      it("injects dependencies to controller functions", function () {
        const injector = createInjector([
          "ng",
          function ($provide) {
            $provide.constant("aDep", 42);
          },
        ]);
        const $controller = injector.get("$controller");

        function MyController(aDep) {
          this.theDep = aDep;
        }

        const controller = $controller(MyController);
        expect(controller.theDep).toBe(42);
      });

      it("allows registering controllers at config time", function () {
        function MyController() {}

        const injector = createInjector([
          "ng",
          function ($controllerProvider) {
            $controllerProvider.register("MyController", MyController);
          },
        ]);
        const $controller = injector.get("$controller");
        const controller = $controller("MyController");
        expect(controller).toBeDefined();
        expect(controller instanceof MyController).toBe(true);
      });

      it("allows registering several controllers in an object", function () {
        function MyController() {}
        function MyOtherController() {}

        const injector = createInjector([
          "ng",
          function ($controllerProvider) {
            $controllerProvider.register({
              MyController: MyController,
              MyOtherController: MyOtherController,
            });
          },
        ]);
        const $controller = injector.get("$controller");
        const controller = $controller("MyController");
        const otherController = $controller("MyOtherController");
        expect(controller instanceof MyController).toBe(true);
        expect(otherController instanceof MyOtherController).toBe(true);
      });

      it("allows registering controllers through modules", function () {
        const module = window.angular.module("myModule", []);
        module.controller("MyController", function MyController() {});
        const injector = createInjector(["ng", "myModule"]);
        const $controller = injector.get("$controller");
        const controller = $controller("MyController");
        expect(controller).toBeDefined();
      });

      it("does not normally look controllers up from window", function () {
        window.MyController = function MyController() {};
        const injector = createInjector(["ng"]);
        const $controller = injector.get("$controller");
        expect(function () {
          $controller("MyController");
        }).toThrow();
      });
    });

    it("should allow registration of controllers", () => {
      const FooCtrl = function ($scope) {
        $scope.foo = "bar";
      };
      const scope = {};
      let ctrl;

      $controllerProvider.register("FooCtrl", FooCtrl);
      ctrl = $controller("FooCtrl", { $scope: scope });

      expect(scope.foo).toBe("bar");
      expect(ctrl instanceof FooCtrl).toBe(true);
    });

    it("should allow registration of bound controller functions", () => {
      const FooCtrl = function ($scope) {
        $scope.foo = "bar";
      };
      const scope = {};
      let ctrl;

      const BoundFooCtrl = FooCtrl.bind(null);

      $controllerProvider.register("FooCtrl", ["$scope", BoundFooCtrl]);
      ctrl = $controller("FooCtrl", { $scope: scope });

      expect(scope.foo).toBe("bar");
    });

    it("should allow registration of map of controllers", () => {
      const FooCtrl = function ($scope) {
        $scope.foo = "foo";
      };
      const BarCtrl = function ($scope) {
        $scope.bar = "bar";
      };
      const scope = {};
      let ctrl;

      $controllerProvider.register({ FooCtrl, BarCtrl });

      ctrl = $controller("FooCtrl", { $scope: scope });
      expect(scope.foo).toBe("foo");
      expect(ctrl instanceof FooCtrl).toBe(true);

      ctrl = $controller("BarCtrl", { $scope: scope });
      expect(scope.bar).toBe("bar");
      expect(ctrl instanceof BarCtrl).toBe(true);
    });

    it("should allow registration of controllers annotated with arrays", () => {
      const FooCtrl = function ($scope) {
        $scope.foo = "bar";
      };
      const scope = {};
      let ctrl;

      $controllerProvider.register("FooCtrl", ["$scope", FooCtrl]);
      ctrl = $controller("FooCtrl", { $scope: scope });

      expect(scope.foo).toBe("bar");
      expect(ctrl instanceof FooCtrl).toBe(true);
    });

    it('should throw an exception if a controller is called "hasOwnProperty"', () => {
      expect(() => {
        $controllerProvider.register("hasOwnProperty", ($scope) => {});
      }).toThrowError(/badname/);
    });

    it("should allow checking the availability of a controller", () => {
      $controllerProvider.register("FooCtrl", () => {
        /* empty */
      });
      $controllerProvider.register("BarCtrl", [
        "dep1",
        "dep2",
        () => {
          /* empty */
        },
      ]);
      $controllerProvider.register({
        BazCtrl: () => {
          /* empty */
        },
        QuxCtrl: [
          "dep1",
          "dep2",
          () => {
            /* empty */
          },
        ],
      });

      expect($controllerProvider.has("FooCtrl")).toBe(true);
      expect($controllerProvider.has("BarCtrl")).toBe(true);
      expect($controllerProvider.has("BazCtrl")).toBe(true);
      expect($controllerProvider.has("QuxCtrl")).toBe(true);

      expect($controllerProvider.has("UnknownCtrl")).toBe(false);
    });

    it("should throw ctrlfmt if name contains spaces", () => {
      expect(() => {
        $controller("ctrl doom");
      }).toThrow();
    });
  });

  it("should return instance of given controller class", () => {
    const MyClass = function () {};
    const ctrl = $controller(MyClass);

    expect(ctrl).toBeDefined();
    expect(ctrl instanceof MyClass).toBe(true);
  });

  it("should inject arguments", () => {
    const MyClass = function ($http) {
      this.$http = $http;
    };

    const ctrl = $controller(MyClass);
    expect(ctrl.$http).toBeTruthy();
  });

  it("should inject given scope", () => {
    const MyClass = function ($scope) {
      this.$scope = $scope;
    };

    const scope = {};
    const ctrl = $controller(MyClass, { $scope: scope });

    expect(ctrl.$scope).toBe(scope);
  });

  it("should not instantiate a controller defined on window", () => {
    const scope = {};
    const Foo = function () {};

    window.a = { Foo };

    expect(() => {
      $controller("a.Foo", { $scope: scope });
    }).toThrow();
  });

  it("should throw ctrlreg when the controller name does not match a registered controller", () => {
    expect(() => {
      $controller("IDoNotExist", { $scope: {} });
    }).toThrowError(/ctrlreg/);
  });

  describe("ctrl as syntax", () => {
    it("should publish controller instance into scope", () => {
      const scope = {};

      $controllerProvider.register("FooCtrl", function () {
        this.mark = "foo";
      });

      const foo = $controller("FooCtrl as foo", { $scope: scope });
      expect(scope.foo).toBe(foo);
      expect(scope.foo.mark).toBe("foo");
    });

    it("should allow controllers with dots", () => {
      const scope = {};

      $controllerProvider.register("a.b.FooCtrl", function () {
        this.mark = "foo";
      });

      const foo = $controller("a.b.FooCtrl as foo", { $scope: scope });
      expect(scope.foo).toBe(foo);
      expect(scope.foo.mark).toBe("foo");
    });

    it("should throw an error if $scope is not provided", () => {
      $controllerProvider.register("a.b.FooCtrl", function () {
        this.mark = "foo";
      });

      expect(() => {
        $controller("a.b.FooCtrl as foo");
      }).toThrowError(/noscp/);
    });

    it("should throw ctrlfmt if identifier contains non-ident characters", () => {
      expect(() => {
        $controller("ctrl as foo<bar");
      }).toThrowError(/ctrlfmt/);
    });

    it("should throw ctrlfmt if identifier contains spaces", () => {
      expect(() => {
        $controller("ctrl as foo bar");
      }).toThrowError(/ctrlfmt/);
    });

    it('should throw ctrlfmt if identifier missing after " as "', () => {
      expect(() => {
        $controller("ctrl as ");
      }).toThrowError(/ctrlfmt/);
      expect(() => {
        $controller("ctrl as");
      }).toThrowError(/ctrlfmt/);
    });

    it("should allow identifiers containing `$`", () => {
      const scope = {};

      $controllerProvider.register("FooCtrl", function () {
        this.mark = "foo";
      });

      const foo = $controller("FooCtrl as $foo", { $scope: scope });
      expect(scope.$foo).toBe(foo);
      expect(scope.$foo.mark).toBe("foo");
    });
  });

  // Add these tests to the existing file (e.g. near the end, before the final closing `});`).

  describe("additional coverage", () => {
    describe("later mode", () => {
      it("should defer controller instantiation until the returned function is invoked", () => {
        let invoked = false;

        function MyController() {
          invoked = true;
        }

        const init = $controller(MyController, {}, true);
        expect(typeof init).toBe("function");
        expect(invoked).toBe(false);

        init();
        expect(invoked).toBe(true);
      });

      it("should create the instance with the controller prototype in later mode", () => {
        function MyController() {}
        MyController.prototype.p = 1;

        const init = $controller(MyController, {}, true);
        const ctrl = init();

        expect(ctrl.p).toBe(1);
      });

      it("should use the controller return value if it returns an object in later mode", () => {
        const scope = {};

        function MyController() {
          return { mark: "returned" };
        }

        $controllerProvider.register("MyController", MyController);

        const init = $controller("MyController as vm", { $scope: scope }, true);
        const pre = scope.vm;

        expect(pre).toBeDefined();
        expect(pre.mark).toBeUndefined();

        const ctrl = init();

        expect(ctrl).toBe(scope.vm);
        expect(scope.vm).not.toBe(pre);
        expect(scope.vm.mark).toBe("returned");
      });

      it("should ignore primitive return values in later mode", () => {
        const scope = {};

        function MyController() {
          this.mark = "instance";
          return 123;
        }

        $controllerProvider.register("MyController", MyController);

        const init = $controller("MyController as vm", { $scope: scope }, true);
        const ctrl = init();

        expect(ctrl).toBe(scope.vm);
        expect(scope.vm.mark).toBe("instance");
      });

      it("should propagate $scopename to locals.$scope in later mode", () => {
        const scope = {};

        function MyController() {}
        MyController.$scopename = "my-scope-name";

        const init = $controller(MyController, { $scope: scope }, true);
        expect(typeof init).toBe("function");
        expect(scope.$scopename).toBe("my-scope-name");
      });
    });

    describe("return value behavior (non-later)", () => {
      it("should return the object returned by a controller constructor", () => {
        function MyController() {
          this.instanceProp = true;
          return { returned: true };
        }

        const ctrl = $controller(MyController);

        expect(ctrl).toBeDefined();
        expect(ctrl.returned).toBe(true);
        expect(ctrl.instanceProp).toBeUndefined();
        expect(ctrl instanceof MyController).toBe(false);
      });

      it("should ignore primitive return values from controller constructors", () => {
        function MyController() {
          this.instanceProp = true;
          return 123;
        }

        const ctrl = $controller(MyController);

        expect(ctrl).toBeDefined();
        expect(ctrl.instanceProp).toBe(true);
        expect(ctrl instanceof MyController).toBe(true);
      });
    });

    describe("identifier behavior", () => {
      it('should let `ident` override "as" identifier in the controller string', () => {
        const scope = {};

        function FooCtrl() {
          this.mark = "foo";
        }

        $controllerProvider.register("FooCtrl", FooCtrl);

        const ctrl = $controller(
          "FooCtrl as foo",
          { $scope: scope },
          false,
          "bar",
        );

        expect(scope.bar).toBe(ctrl);
        expect(scope.bar.mark).toBe("foo");
        expect(scope.foo).toBeUndefined();
        expect(scope.$controllerIdentifier).toBe("bar");
      });

      it("should publish identifier to scope when expression is a function and ident is provided", () => {
        const scope = {};

        function FooCtrl() {
          this.mark = "foo";
        }

        const ctrl = $controller(FooCtrl, { $scope: scope }, false, "foo");

        expect(scope.foo).toBe(ctrl);
        expect(scope.foo.mark).toBe("foo");
        expect(scope.$controllerIdentifier).toBe("foo");
      });
    });

    describe("locals", () => {
      it("should allow creating a controller without $scope when not exporting an identifier", () => {
        function FooCtrl() {
          this.ok = true;
        }

        $controllerProvider.register("FooCtrl", FooCtrl);

        expect(() => {
          const ctrl = $controller("FooCtrl");
          expect(ctrl.ok).toBe(true);
        }).not.toThrow();
      });

      it("should allow locals to override injectable dependencies", () => {
        const injector = createInjector([
          "ng",
          function ($provide) {
            $provide.constant("aDep", 1);
          },
        ]);

        const $controller = injector.get("$controller");

        function MyController(aDep) {
          this.theDep = aDep;
        }

        const ctrl = $controller(MyController, { aDep: 2 });
        expect(ctrl.theDep).toBe(2);
      });
    });

    describe("registration constraints", () => {
      it("should throw when registering a non-callable controller definition", () => {
        expect(() => {
          $controllerProvider.register("BadCtrl", {});
        }).toThrowError(/ctrlreg/);
      });
    });
  });
});
