import { createElementFromHTML, dealoc } from "./shared/dom.js";
import { Angular } from "./angular.js";
import { createInjector } from "./core/di/injector.js";
import { wait } from "./shared/test-utils.js";
import { NgModule } from "./core/di/ng-module/ng-module.js";

describe("angular", () => {
  let element, document, module, injector, $rootScope, $compile, angular;

  beforeEach(() => {
    angular = new Angular();
    module = angular.module("default", ["ng"]);
    injector = createInjector(["ng", "default"]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
  });

  beforeEach(() => {
    document = window.document;
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("angular.init", () => {
    let bootstrapSpy;
    let element = createElementFromHTML("<div></div>");

    beforeEach(() => {
      bootstrapSpy = spyOn(angular, "bootstrap").and.callThrough();
    });

    afterEach(() => {
      dealoc(element);
    });

    it("should do nothing when not found", () => {
      window.angular.init(element);
      expect(bootstrapSpy).not.toHaveBeenCalled();
    });

    it("should look for ngApp directive as attr", () => {
      window.angular.module("ABC", []);
      const appElement = createElementFromHTML('<div ng-app="ABC"></div>');

      window.angular.init(appElement);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should look for ngApp directive using querySelectorAll", () => {
      window.angular.module("ABC", []);
      element = createElementFromHTML('<div><div ng-app="ABC"></div></div>');
      window.angular.init(element);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should bootstrap anonymously", () => {
      element = createElementFromHTML("<div ng-app></div>");
      window.angular.init(element);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should bootstrap if the annotation is on the root element", () => {
      const appElement = createElementFromHTML('<div ng-app=""></div>');
      window.angular.init(appElement);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should complain if app module cannot be found", () => {
      const appElement = createElementFromHTML(
        '<div ng-app="doesntexist"></div>',
      );
      expect(() => {
        window.angular.init(appElement);
      }).toThrowError(/modulerr/);
    });

    it("should complain if an element has already been bootstrapped", () => {
      const element = createElementFromHTML("<div>bootstrap me!</div>");
      angular.bootstrap(element);

      expect(() => {
        angular.bootstrap(element);
      }).toThrowError(/btstrpd/);

      dealoc(element);
    });

    it("should complain if manually bootstrapping a document whose <html> element has already been bootstrapped", () => {
      angular.bootstrap(document.getElementsByTagName("html")[0]);
      expect(() => {
        angular.bootstrap(document);
      }).toThrowError(/btstrpd/);

      dealoc(document);
    });

    it("should bootstrap in strict mode when strict-di attribute is specified", () => {
      const appElement = createElementFromHTML(
        '<div ng-app="" strict-di></div>',
      );
      const root = createElementFromHTML("<div></div>");
      root.append(appElement);

      window.angular.init(root);
      expect(bootstrapSpy).toHaveBeenCalled();
      expect(bootstrapSpy.calls.mostRecent().args[2].strictDi).toBe(true);

      const injector = angular.getInjector(appElement);
      function testFactory($rootScope) {}
      expect(() => {
        injector.instantiate(testFactory);
      }).toThrowError(/strictdi/);

      dealoc(appElement);
    });

    it("should bootstrap in strict mode when strict-di data attribute is specified", () => {
      const appElement = createElementFromHTML(
        '<div data-ng-app="" data-strict-di></div>',
      );
      const root = createElementFromHTML("<div></div>");
      root.append(appElement);

      window.angular.init(root);
      expect(bootstrapSpy).toHaveBeenCalled();
      expect(bootstrapSpy.calls.mostRecent().args[2].strictDi).toBe(true);

      const injector = angular.getInjector(appElement);
      function testFactory($rootScope) {}
      expect(() => {
        injector.instantiate(testFactory);
      }).toThrowError(/strictdi/);

      dealoc(appElement);
    });
  });

  describe("angular.init with multiple apps", () => {
    let element;

    afterEach(() => {
      dealoc(element);
    });

    it("should bootstrap multiple apps in the same document", () => {
      element = createElementFromHTML(`<div>
             <div ng-app>{{ 2 + 2 }}</div>
             <div ng-app>{{ 3 + 3 }}</div>
        </div>`);

      window.angular.init(element);

      expect(window.angular._submodule).toBeFalse();
      expect(window.angular.submodules.length).toBe(1);
      expect(window.angular.submodules[0]).toBeDefined();
      expect(window.angular.submodules[0]._submodule).toBeTrue();
      expect(window.angular.$injector).not.toBe(
        window.angular.submodules[0].$injector,
      );
    });

    it("they should share save $eventBus", () => {
      element = createElementFromHTML(`<div>
             <div ng-app>{{ 2 + 2 }}</div>
             <div ng-app>{{ 3 + 3 }}</div>
        </div>`);

      window.angular.init(element);

      expect(window.angular.submodules[0].$eventBus).toBe(
        window.angular.$eventBus,
      );
    });
  });

  describe("AngularTS service", () => {
    it("should override services", () => {
      injector = createInjector([
        function ($provide) {
          $provide.value("fake", "old");
          $provide.value("fake", "new");
        },
      ]);
      expect(injector.get("fake")).toEqual("new");
    });

    it("should inject dependencies specified by $inject and ignore function argument name", () => {
      expect(
        angular
          .injector([
            function ($provide) {
              $provide.factory("svc1", () => "svc1");
              $provide.factory("svc2", [
                "svc1",
                function (s) {
                  return `svc2-${s}`;
                },
              ]);
            },
          ])
          .get("svc2"),
      ).toEqual("svc2-svc1");
    });
  });

  describe("compile", () => {
    it("should link to existing node and create scope", async () => {
      const template = createElementFromHTML(
        '<div>{{greeting = "hello world"}}</div>',
      );
      element = $compile(template)($rootScope);
      await wait();

      expect(template.innerHTML).toEqual("hello world");
      expect($rootScope.greeting).toEqual("hello world");
    });

    it("should link to existing node and given scope", async () => {
      const template = createElementFromHTML(
        '<div>{{greeting = "hello world"}}</div>',
      );
      element = $compile(template)($rootScope);
      await wait();
      expect(template.textContent).toEqual("hello world");
    });

    it("should link to new node and given scope", async () => {
      const template = createElementFromHTML(
        '<div>{{greeting = "hello world"}}</div>',
      );

      const compile = $compile(template);
      let templateClone = template.cloneNode(true);

      element = compile($rootScope, (clone) => {
        templateClone = clone;
      });
      await wait();
      expect(template.textContent).toEqual('{{greeting = "hello world"}}');
      expect(element.textContent).toEqual("hello world");
      expect(element).toEqual(templateClone);
      expect($rootScope.greeting).toEqual("hello world");
    });

    it("should link to cloned node and create scope", async () => {
      const template = createElementFromHTML(
        '<div>{{greeting = "hello world"}}</div>',
      );
      element = $compile(template)($rootScope, () => {
        /* empty */
      });
      await wait();
      expect(template.textContent).toEqual('{{greeting = "hello world"}}');
      expect(element.textContent).toEqual("hello world");
      expect($rootScope.greeting).toEqual("hello world");
    });
  });

  describe("bootstrap", () => {
    let module, injector, $rootScope, $compile, angular;

    beforeEach(() => {
      angular = new Angular();
      module = angular.module("default", ["ng"]);
      injector = createInjector(["default"]);
      $rootScope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should bootstrap app", () => {
      const element = createElementFromHTML("<div>{{1+2}}</div>");
      const injector = angular.bootstrap(element);
      expect(injector).toBeDefined();
      expect(angular.getInjector(element)).toBe(injector);
      // dealoc(element);
    });

    it("have a reference to inself from injector", () => {
      const element = createElementFromHTML("<div></div>");
      const injector = angular.bootstrap(element);
      expect(injector).toBeDefined();
      expect(angular.getInjector(element)).toBe(injector);
      expect(injector.get("$angular")).toBeDefined();
      expect(injector.get("$angular")).toBe(angular);
    });

    it("should complain if app module can't be found", () => {
      const element = createElementFromHTML("<div>{{1+2}}</div>");

      expect(() => {
        angular.bootstrap(element, ["doesntexist"]);
      }).toThrowError(/modulerr/);

      expect(element.innerHTML).toBe("{{1+2}}");
      dealoc(element);
    });
  });

  describe("getScopeByName", () => {
    let module, injector, $rootScope, $compile, angular;

    beforeEach(() => {
      angular = new Angular();
      module = angular.module("default", ["ng"]).controller(
        "demo",
        class Demo {
          static $scopename = "demo";
        },
      );
      injector = createInjector(["default"]);
    });

    it("should return named scope", () => {
      const element = createElementFromHTML("<div ng-scope='test'></div>");
      const injector = angular.bootstrap(element);

      expect(angular.getScopeByName("test")).toBeDefined();
      expect(angular.getScopeByName("test")).toBe(injector.get("$rootScope"));
    });

    it("should return undefined when not found", () => {
      const element = createElementFromHTML("<div ng-scope='test'></div>");
      angular.bootstrap(element);

      expect(angular.getScopeByName("fail")).toBeUndefined();
    });

    it("should return controllers with static $scopename property", () => {
      const element = createElementFromHTML("<div ng-controller='demo'></div>");
      angular.bootstrap(element, ["default"]);

      expect(angular.getScopeByName("demo")).toBeDefined();
    });

    it("should return controllers with static $scopename property registered with `as` syntax", () => {
      const element = createElementFromHTML(
        "<div ng-controller='demo as $ctrl'></div>",
      );
      angular.bootstrap(element, ["default"]);

      expect(angular.getScopeByName("demo")).toBeDefined();
    });
  });

  describe("dipatchEvent", () => {
    let module, angular;

    beforeEach(() => {
      angular = new Angular();
      module = angular
        .module("default", [])
        .service(
          "store",
          class Store {
            setName(name) {
              this.name = name;
            }
          },
        )
        .controller(
          "demo",
          class Demo {
            static $scopename = "demo";
            constructor() {}
          },
        );
    });

    it("should dispatch expressions to controllers", async () => {
      const element = createElementFromHTML(
        "<div ng-controller='demo'>{{ a }}</div>",
      );
      angular.bootstrap(element, ["default"]);

      angular.dispatchEvent(new CustomEvent("demo", { detail: "a = 1" }));
      await wait();
      expect(angular.getScopeByName("demo").a).toEqual(1);
      expect(element.innerHTML).toEqual("1");
    });

    it("should dispatch expressions to services", async () => {
      const element = createElementFromHTML("<div ng-controller='demo'></div>");
      angular.bootstrap(element, ["default"]);

      angular.dispatchEvent(new CustomEvent("store", { detail: "a = 1" }));
      await wait();
      expect(angular.$injector.get("store").a).toEqual(1);

      angular.dispatchEvent(
        new CustomEvent("store", { detail: "setName('myStore')" }),
      );
      await wait();
      expect(angular.$injector.get("store").name).toEqual("myStore");
    });
  });
});

describe("module loader", () => {
  let angular;
  beforeEach(() => {
    angular = new Angular();
  });

  it("allows registering a module", () => {
    const myModule = angular.module("myModule", []);
    expect(myModule).toBeDefined();
    expect(myModule.name).toEqual("myModule");
  });

  it("allows getting a module", () => {
    const myModule = angular.module("myModule", []);
    const gotModule = angular.module("myModule");
    expect(gotModule).toBeDefined();
    expect(gotModule).toBe(myModule);
  });

  it("allows recreating a module", () => {
    angular.module("myModule", []);
    const gotModule = angular.module("myModule");
    const myModule2 = angular.module("myModule", []);
    const gotModule2 = angular.module("myModule");
    expect(myModule2).toBeDefined();
    expect(myModule2).toBe(gotModule2);
    expect(myModule2).not.toBe(gotModule);
  });

  it("creates an instance on NgModule", () => {
    angular.module("myModule", []);
    const gotModule = angular.module("myModule");
    expect(gotModule).toBeInstanceOf(NgModule);
  });

  it("throws when trying to get a nonexistent module", () => {
    expect(() => {
      angular.module("nonexistent");
    }).toThrow();
  });

  it("does not allow a module to be called hasOwnProperty", () => {
    expect(() => {
      angular.module("hasOwnProperty", []);
    }).toThrow();
  });

  it("attaches the requires array to the registered module", () => {
    const myModule = angular.module("myModule", ["myOtherModule"]);
    expect(myModule._requires).toEqual(["myOtherModule"]);
  });

  it("replaces a module when registered with same name again", () => {
    const myModule = angular.module("myModule", []);
    const myNewModule = angular.module("myModule", []);
    expect(myNewModule).not.toBe(myModule);
  });

  it("should record calls", () => {
    const otherModule = angular.module("other", []);

    const init = () => {};
    const config = () => {};
    const init2 = () => {};
    const run = () => {};

    otherModule.config(init);

    const myModule = angular.module("my", ["other"], config);
    const filterFn = () => () => "filterFn";
    expect(
      myModule
        .decorator("dk", "dv")
        .provider("sk", "sv")
        .factory("fk", "fv")
        .service("a", "aa")
        .value("k", "v")
        .filter("f", filterFn)
        .directive("d", "dd")
        .component("c", "cc")
        .controller("ctrl", "ccc")
        .config(init2)
        .constant("abc", 123)
        .run(run),
    ).toBe(myModule);

    expect(myModule._requires).toEqual(["other"]);
    expect(myModule._invokeQueue).toEqual([
      ["$provide", "constant", jasmine.objectContaining(["abc", 123])],
      ["$provide", "provider", jasmine.objectContaining(["sk", "sv"])],
      ["$provide", "factory", jasmine.objectContaining(["fk", "fv"])],
      ["$provide", "service", jasmine.objectContaining(["a", "aa"])],
      ["$provide", "value", jasmine.objectContaining(["k", "v"])],
      [
        "$filterProvider",
        "register",
        jasmine.objectContaining(["f", filterFn]),
      ],
      ["$compileProvider", "directive", jasmine.objectContaining(["d", "dd"])],
      ["$compileProvider", "component", jasmine.objectContaining(["c", "cc"])],
      [
        "$controllerProvider",
        "register",
        jasmine.objectContaining(["ctrl", "ccc"]),
      ],
    ]);
    expect(myModule._configBlocks).toEqual([
      ["$injector", "invoke", jasmine.objectContaining([config])],
      ["$provide", "decorator", jasmine.objectContaining(["dk", "dv"])],
      ["$injector", "invoke", jasmine.objectContaining([init2])],
    ]);
    expect(myModule._runBlocks).toEqual([run]);
  });

  it("should not throw error when `module.decorator` is declared before provider that it decorates", () => {
    angular
      .module("theModule", [])
      .decorator("theProvider", ($delegate) => $delegate)
      .factory("theProvider", () => ({}));

    expect(() => {
      createInjector(["theModule"]);
    }).not.toThrow();
  });

  it("should run decorators in order of declaration, even when mixed with provider.decorator", () => {
    let log = "";

    angular
      .module("theModule", [])
      .factory("theProvider", () => ({ api: "provider" }))
      .decorator("theProvider", ($delegate) => {
        $delegate.api += "-first";
        return $delegate;
      })
      .config(($provide) => {
        $provide.decorator("theProvider", ($delegate) => {
          $delegate.api += "-second";
          return $delegate;
        });
      })
      .decorator("theProvider", ($delegate) => {
        $delegate.api += "-third";
        return $delegate;
      })
      .run((theProvider) => {
        log = theProvider.api;
      });

    createInjector(["theModule"]);
    expect(log).toBe("provider-first-second-third");
  });

  it("should decorate the last declared provider if multiple have been declared", () => {
    let log = "";

    angular
      .module("theModule", [])
      .factory("theProvider", () => ({
        api: "firstProvider",
      }))
      .decorator("theProvider", ($delegate) => {
        $delegate.api += "-decorator";
        return $delegate;
      })
      .factory("theProvider", () => ({
        api: "secondProvider",
      }))
      .run((theProvider) => {
        log = theProvider.api;
      });

    createInjector(["theModule"]);
    expect(log).toBe("secondProvider-decorator");
  });

  it("should allow module redefinition", () => {
    expect(angular.module("a", [])).not.toBe(angular.module("a", []));
  });

  it("should complain of no module", () => {
    expect(() => {
      angular.module("dontExist");
    }).toThrow();
  });

  it('should complain if a module is called "hasOwnProperty', () => {
    expect(() => {
      angular.module("hasOwnProperty", []);
    }).toThrow();
  });
});
