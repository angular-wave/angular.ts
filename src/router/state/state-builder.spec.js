import { StateBuilder } from "./state-builder.ts";
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";

// TODO refactor this to url service as it is using the provider right now
describe("StateBuilder", function () {
  const parent = { name: "" };
  let builder;
  let $stateRegistry;

  beforeEach(function () {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular.module("default", []);
    let $injector = window.angular.bootstrap(document.getElementById("app"), [
      "default",
    ]);
    $stateRegistry = $injector.get("$stateRegistry");
    builder = $stateRegistry._builder;
  });

  it("expect it to be configured by state registry", () => {
    expect($stateRegistry).toBeDefined();
    expect($stateRegistry._builder).toBeDefined();
  });

  it("should build a single default view from state-level view properties", function () {
    const config = builder._build({
      name: "foo",
      self: {},
      url: "/foo",
      templateUrl: "/foo.html",
      controller: "FooController",
      parent: parent,
    });

    expect(config._views.$default).not.toEqual(config);
    expect(config._views.$default).toEqual(
      jasmine.objectContaining({
        templateUrl: "/foo.html",
        controller: "FooController",
        resolveAs: "$resolve",
      }),
    );
  });

  it("should build named views from the views object", function () {
    const built = builder._build({
      name: "foo",
      self: {},
      parent: parent,
      views: {
        main: { template: "hello", controller: "FooController" },
        sidebar: "SidebarComponent",
      },
    });

    expect(built._views.main.template).toBe("hello");
    expect(built._views.main.controller).toBe("FooController");
    expect(built._views.main.$ngViewName).toBe("main");
    expect(built._views.sidebar.component).toBe("SidebarComponent");
    expect(built._views.sidebar.$ngViewName).toBe("sidebar");
  });

  it("should copy state-level view fields into the default view", function () {
    const built = builder._build({
      name: "foo",
      self: {},
      parent: parent,
      template: "hello",
      controller: "FooController",
    });

    expect(built._views.$default.template).toBe("hello");
    expect(built._views.$default.controller).toBe("FooController");
  });

  it("should not allow state-level view fields together with views", function () {
    expect(() =>
      builder._build({
        name: "foo",
        self: {},
        parent: parent,
        template: "hello",
        views: { main: { controller: "FooController" } },
      }),
    ).toThrow();
  });

  it("should not allow a view config with both component and template keys", function () {
    const config = {
      name: "foo",
      self: {},
      url: "/foo",
      template: "<h1>hey</h1>",
      controller: "FooController",
      parent: parent,
    };
    expect(() => builder._build(Object.assign({}, config))).not.toThrow();
    expect(() =>
      builder._build(Object.assign({ component: "fooComponent" }, config)),
    ).toThrow();
    expect(() =>
      builder._build(Object.assign({ bindings: {} }, config)),
    ).toThrow();
  });

  it("should not expose the old generic builder decorator API", function () {
    expect($stateRegistry.builder).toBeUndefined();
    expect(builder.builder).toBeUndefined();
    expect($stateRegistry.decorator).toBeUndefined();
  });

  it("should reject string shorthand in object-style resolves", function () {
    expect(() =>
      builder._build({
        name: "foo",
        self: {},
        parent: parent,
        resolve: { foo: "bar" },
      }),
    ).toThrow();
  });

  it("should reject provider-style resolvables in a resolve array", function () {
    expect(() =>
      builder._build({
        name: "foo",
        self: {},
        parent: parent,
        resolve: [
          { provide: "factoryDep", useFactory: () => "ok", deps: ["dep"] },
        ],
      }),
    ).toThrow();
  });

  it("should build explicit resolvable literals from a resolve array", function () {
    const config = builder._build({
      name: "foo",
      self: {},
      parent: parent,
      resolve: [
        {
          token: "factoryDep",
          resolveFn: () => "ok",
          deps: ["dep"],
          eager: true,
        },
        { token: "prefetched", data: false },
      ],
    });

    expect(config.resolvables[0].token).toBe("factoryDep");
    expect(config.resolvables[0].deps).toEqual(["dep"]);
    expect(config.resolvables[0].eager).toBe(true);

    expect(config.resolvables[1].token).toBe("prefetched");
    expect(config.resolvables[1].data).toBe(false);
    expect(config.resolvables[1].resolved).toBe(true);
  });
});
