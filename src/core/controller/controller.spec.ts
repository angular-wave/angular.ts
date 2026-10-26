/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../di/injector.ts";
import { ControllerRegistry } from "./controller.ts";
import { instance } from "../../shared/test-fixtures.spec.ts";

/** Read dynamically registered ES5 controller fields without asserting their shape. */
function field(value: unknown, name: string): unknown {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  ) {
    throw new TypeError("Expected a controller object");
  }
  return Reflect.get(value, name);
}

describe("$controller", () => {
  let controllerRegistry: ControllerRegistry;

  let $controller: ng.ControllerService;

  let injector: ng.InjectorService;

  beforeEach(() => {
    window.angular = new Angular();
    controllerRegistry = window.angular._composition.controllerRegistry;
    injector = createInjector(["ng"]);

    injector.invoke([
      "$controller",
      (_$controller_: ng.ControllerService) => {
        $controller = _$controller_;
      },
    ]);
  });

  describe("provider", () => {
    describe("registration", () => {
      it("sets up $controller", function () {
        expect(injector.has("$controller")).toBe(true);
      });

      it("instantiates controller functions", function () {
        const $controller = injector.get("$controller");

        function MyController(this: { invoked: boolean }): undefined {
          this.invoked = true;
        }

        const controller = $controller(MyController);

        expect(controller).toBeDefined();
        expect(controller instanceof MyController).toBe(true);
        expect(field(controller, "invoked")).toBe(true);
      });

      it("instantiates controller classes", function () {
        const $controller = injector.get("$controller");

        class MyController {
          invoked = true;
        }

        const controller = instance($controller(MyController), MyController);

        expect(controller.invoked).toBe(true);
      });

      it("injects dependencies to controller functions", function () {
        window.angular
          .createModule("controllerDependency", [])
          .constant("aDep", 42);
        const injector = createInjector(["ng", "controllerDependency"]);

        const $controller = injector.get("$controller");

        function MyController(
          this: { theDep: number },
          aDep: number,
        ): undefined {
          this.theDep = aDep;
        }
        MyController.$inject = ["aDep"];

        const controller = $controller(MyController);

        expect(field(controller, "theDep")).toBe(42);
      });

      it("allows registering controllers at config time", function () {
        function MyController(): undefined {}

        window.angular
          .createModule("controllerConfig", ["ng"])
          .controller("MyController", MyController);
        const injector = createInjector(["controllerConfig"]);

        const $controller = injector.get("$controller");

        const controller = $controller("MyController");

        expect(controller).toBeDefined();
        expect(controller instanceof MyController).toBe(true);
      });

      it("allows registering several controllers in an object", function () {
        function MyController(): undefined {}
        function MyOtherController(): undefined {}

        controllerRegistry.register({ MyController, MyOtherController });
        const injector = createInjector(["ng"]);

        const $controller = injector.get("$controller");

        const controller = $controller("MyController");

        const otherController = $controller("MyOtherController");

        expect(controller instanceof MyController).toBe(true);
        expect(otherController instanceof MyOtherController).toBe(true);
      });

      it("allows registering controllers through modules", function () {
        const module = window.angular.createModule("myModule", []);

        module.controller(
          "MyController",
          function MyController(): undefined {},
        );
        const injector = createInjector(["ng", "myModule"]);

        const $controller = injector.get("$controller");

        const controller = $controller("MyController");

        expect(controller).toBeDefined();
      });

      it("does not normally look controllers up from window", function () {
        Object.assign(window, {
          MyController: function MyController(): undefined {},
        });
        const injector = createInjector(["ng"]);

        const $controller = injector.get("$controller");

        try {
          expect(function () {
            $controller("MyController");
          }).toThrow();
        } finally {
          Reflect.deleteProperty(window, "MyController");
        }
      });
    });

    it("should allow registration of controllers", () => {
      const FooCtrl = function ($scope: { foo?: string }): undefined {
        $scope.foo = "bar";
      };

      const scope: Record<string, unknown> = {};

      let ctrl;

      controllerRegistry.register("FooCtrl", ["$scope", FooCtrl]);
      ctrl = $controller("FooCtrl", { $scope: scope });

      expect(scope.foo).toBe("bar");
      expect(ctrl instanceof FooCtrl).toBe(true);
    });

    it("should allow registration of bound controller functions", () => {
      const FooCtrl = function ($scope: { foo?: string }): undefined {
        $scope.foo = "bar";
      };

      const scope: Record<string, unknown> = {};

      const BoundFooCtrl = FooCtrl.bind(null);

      controllerRegistry.register("FooCtrl", ["$scope", BoundFooCtrl]);
      $controller("FooCtrl", { $scope: scope });

      expect(scope.foo).toBe("bar");
    });

    it("should allow registration of map of controllers", () => {
      const FooCtrl = function ($scope: { foo?: string }): undefined {
        $scope.foo = "foo";
      };

      const BarCtrl = function ($scope: { bar?: string }): undefined {
        $scope.bar = "bar";
      };

      const scope: Record<string, unknown> = {};

      let ctrl;

      controllerRegistry.register({
        FooCtrl: ["$scope", FooCtrl],
        BarCtrl: ["$scope", BarCtrl],
      });

      ctrl = $controller("FooCtrl", { $scope: scope });
      expect(scope.foo).toBe("foo");
      expect(ctrl instanceof FooCtrl).toBe(true);

      ctrl = $controller("BarCtrl", { $scope: scope });
      expect(scope.bar).toBe("bar");
      expect(ctrl instanceof BarCtrl).toBe(true);
    });

    it("should allow registration of controllers annotated with arrays", () => {
      const FooCtrl = function ($scope: { foo?: string }): undefined {
        $scope.foo = "bar";
      };

      const scope: Record<string, unknown> = {};

      let ctrl;

      controllerRegistry.register("FooCtrl", ["$scope", FooCtrl]);
      ctrl = $controller("FooCtrl", { $scope: scope });

      expect(scope.foo).toBe("bar");
      expect(ctrl instanceof FooCtrl).toBe(true);
    });

    it('should throw an exception if a controller is called "hasOwnProperty"', () => {
      expect(() => {
        controllerRegistry.register("hasOwnProperty", () => undefined);
      }).toThrowError(/badname/);
    });

    it("should allow checking the availability of a controller", () => {
      controllerRegistry.register("FooCtrl", () => {
        /* empty */
      });
      controllerRegistry.register("BarCtrl", [
        "dep1",
        "dep2",
        () => {
          /* empty */
        },
      ]);
      controllerRegistry.register({
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

      expect(controllerRegistry.has("FooCtrl")).toBe(true);
      expect(controllerRegistry.has("BarCtrl")).toBe(true);
      expect(controllerRegistry.has("BazCtrl")).toBe(true);
      expect(controllerRegistry.has("QuxCtrl")).toBe(true);

      expect(controllerRegistry.has("UnknownCtrl")).toBe(false);
    });

    it("should throw ctrlfmt if name contains spaces", () => {
      expect(() => {
        $controller("ctrl doom");
      }).toThrow();
    });
  });

  it("should return instance of given controller class", () => {
    const MyClass = function (): undefined {};

    const ctrl = $controller(MyClass);

    expect(ctrl).toBeDefined();
    expect(ctrl instanceof MyClass).toBe(true);
  });

  it("should inject arguments", () => {
    const MyClass = function (
      this: { $http: ng.HttpService },
      $http: ng.HttpService,
    ): undefined {
      this.$http = $http;
    };
    MyClass.$inject = ["$http"];

    const ctrl = $controller(MyClass);

    expect(field(ctrl, "$http")).toBeTruthy();
  });

  it("should inject given scope", () => {
    const MyClass = function (
      this: { $scope: object },
      $scope: object,
    ): undefined {
      this.$scope = $scope;
    };
    MyClass.$inject = ["$scope"];

    const scope: Record<string, unknown> = {};

    const ctrl = $controller(MyClass, { $scope: scope });

    expect(field(ctrl, "$scope")).toBe(scope);
  });

  it("should not instantiate a controller defined on window", () => {
    const scope: Record<string, unknown> = {};

    const Foo = function (): undefined {};

    Object.assign(window, { a: { Foo } });

    try {
      expect(() => {
        $controller("a.Foo", { $scope: scope });
      }).toThrow();
    } finally {
      Reflect.deleteProperty(window, "a");
    }
  });

  it("should throw ctrlreg when the controller name does not match a registered controller", () => {
    expect(() => {
      $controller("IDoNotExist", { $scope: {} });
    }).toThrowError(/ctrlreg/);
  });

  describe("ctrl as syntax", () => {
    it("should publish controller instance into scope", () => {
      const scope: Record<string, unknown> = {};

      controllerRegistry.register(
        "FooCtrl",
        function (this: { mark: string }): undefined {
          this.mark = "foo";
        },
      );

      const foo = $controller("FooCtrl as foo", { $scope: scope });

      expect(scope.foo).toBe(foo);
      expect(field(scope.foo, "mark")).toBe("foo");
    });

    it("should allow controllers with dots", () => {
      const scope: Record<string, unknown> = {};

      controllerRegistry.register(
        "a.b.FooCtrl",
        function (this: { mark: string }): undefined {
          this.mark = "foo";
        },
      );

      const foo = $controller("a.b.FooCtrl as foo", { $scope: scope });

      expect(scope.foo).toBe(foo);
      expect(field(scope.foo, "mark")).toBe("foo");
    });

    it("should throw an error if $scope is not provided", () => {
      controllerRegistry.register(
        "a.b.FooCtrl",
        function (this: { mark: string }): undefined {
          this.mark = "foo";
        },
      );

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
      const scope: Record<string, unknown> = {};

      controllerRegistry.register(
        "FooCtrl",
        function (this: { mark: string }): undefined {
          this.mark = "foo";
        },
      );

      const foo = $controller("FooCtrl as $foo", { $scope: scope });

      expect(scope.$foo).toBe(foo);
      expect(field(scope.$foo, "mark")).toBe("foo");
    });
  });

  describe("additional coverage", () => {
    describe("later mode", () => {
      it("should defer controller instantiation until the returned function is invoked", () => {
        let invoked = false;

        function MyController(): undefined {
          invoked = true;
        }

        const init = $controller(MyController, {}, true);

        expect(typeof init).toBe("function");
        expect(invoked).toBe(false);

        init();
        expect(invoked).toBe(true);
      });

      it("should create the instance with the controller prototype in later mode", () => {
        function MyController(): undefined {}
        MyController.prototype.p = 1;

        const init = $controller(MyController, {}, true);

        const ctrl = init();

        expect(ctrl.p).toBe(1);
      });

      it("should use the controller return value if it returns an object in later mode", () => {
        const scope: Record<string, unknown> = {};

        function MyController() {
          return { mark: "returned" };
        }

        controllerRegistry.register("MyController", MyController);

        const init = $controller("MyController as vm", { $scope: scope }, true);

        const pre = scope.vm;

        expect(pre).toBeDefined();
        expect(field(pre, "mark")).toBeUndefined();

        const ctrl = init();

        expect<unknown>(ctrl).toBe(scope.vm);
        expect(scope.vm).not.toBe(pre);
        expect(field(scope.vm, "mark")).toBe("returned");
      });

      it("should ignore primitive return values in later mode", () => {
        const scope: Record<string, unknown> = {};

        function MyController(this: { mark: string }) {
          this.mark = "instance";

          return 123;
        }

        controllerRegistry.register("MyController", MyController);

        const init = $controller("MyController as vm", { $scope: scope }, true);

        const ctrl = init();

        expect<unknown>(ctrl).toBe(scope.vm);
        expect(field(scope.vm, "mark")).toBe("instance");
      });

      it("should propagate scopeName to locals.$scope in later mode", () => {
        const scope: Record<string, unknown> = {};

        function MyController(): undefined {}
        MyController.scopeName = "my-scope-name";

        const init = $controller(MyController, { $scope: scope }, true);

        expect(typeof init).toBe("function");
        expect(scope.scopeName).toBe("my-scope-name");
      });
    });

    describe("return value behavior (non-later)", () => {
      it("should return the object returned by a controller constructor", () => {
        function MyController(this: { instanceProp: boolean }) {
          this.instanceProp = true;

          return { returned: true };
        }

        const ctrl = $controller(MyController);

        expect(ctrl).toBeDefined();
        expect(field(ctrl, "returned")).toBe(true);
        expect(field(ctrl, "instanceProp")).toBeUndefined();
        expect(ctrl instanceof MyController).toBe(false);
      });

      it("should ignore primitive return values from controller constructors", () => {
        function MyController(this: { instanceProp: boolean }) {
          this.instanceProp = true;

          return 123;
        }

        // @ts-expect-error Runtime compatibility ignores a constructor's primitive return.
        const ctrl = $controller(MyController);

        expect(ctrl).toBeDefined();
        expect(field(ctrl, "instanceProp")).toBe(true);
        expect(ctrl instanceof MyController).toBe(true);
      });
    });

    describe("identifier behavior", () => {
      it('should let `ident` override "as" identifier in the controller string', () => {
        const scope: Record<string, unknown> = {};

        function FooCtrl(this: { mark: string }): undefined {
          this.mark = "foo";
        }

        controllerRegistry.register("FooCtrl", FooCtrl);

        const ctrl = $controller(
          "FooCtrl as foo",
          { $scope: scope },
          false,
          "bar",
        );

        expect(scope.bar).toBe(ctrl);
        expect(field(scope.bar, "mark")).toBe("foo");
        expect(scope.foo).toBeUndefined();
        expect(scope._controllerIdentifier).toBe("bar");
      });

      it("should publish identifier to scope when expression is a function and ident is provided", () => {
        const scope: Record<string, unknown> = {};

        function FooCtrl(this: { mark: string }): undefined {
          this.mark = "foo";
        }

        const ctrl = $controller(FooCtrl, { $scope: scope }, false, "foo");

        expect(scope.foo).toBe(ctrl);
        expect(field(scope.foo, "mark")).toBe("foo");
        expect(scope._controllerIdentifier).toBe("foo");
      });
    });

    describe("locals", () => {
      it("should allow creating a controller without $scope when not exporting an identifier", () => {
        function FooCtrl(this: { ok: boolean }): undefined {
          this.ok = true;
        }

        controllerRegistry.register("FooCtrl", FooCtrl);

        expect(() => {
          const ctrl = $controller("FooCtrl");

          expect(field(ctrl, "ok")).toBe(true);
        }).not.toThrow();
      });

      it("should allow locals to override injectable dependencies", () => {
        window.angular.createModule("controllerLocal", []).constant("aDep", 1);
        const injector = createInjector(["ng", "controllerLocal"]);

        const $controller = injector.get("$controller");

        function MyController(
          this: { theDep: number },
          aDep: number,
        ): undefined {
          this.theDep = aDep;
        }
        MyController.$inject = ["aDep"];

        const ctrl = $controller(MyController, { aDep: 2 });

        expect(field(ctrl, "theDep")).toBe(2);
      });
    });

    describe("registration constraints", () => {
      it("should throw when registering a non-callable controller definition", () => {
        expect(() => {
          controllerRegistry.register("BadCtrl", {});
        }).toThrowError(/ctrlreg/);
      });

      it("rejects access after registry disposal", () => {
        const registry = new ControllerRegistry();

        registry.register("Example", () => undefined);
        registry.destroy();
        registry.destroy();

        expect(() => registry.get("Example")).toThrowError(
          "Controller registry has already been disposed.",
        );
        expect(() => registry.has("Example")).toThrowError(
          "Controller registry has already been disposed.",
        );
        expect(() => registry.register("Other", () => undefined)).toThrowError(
          "Controller registry has already been disposed.",
        );
      });
    });
  });
});
