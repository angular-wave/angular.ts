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
});
