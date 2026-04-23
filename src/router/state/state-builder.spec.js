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
    builder = $stateRegistry.builder;
  });

  it("expect it to be configured by state registry", () => {
    expect($stateRegistry).toBeDefined();
    expect($stateRegistry.builder).toBeDefined();
  });

  it("should use the state object to build a default view, when no `views` property is found", function () {
    const config = builder.build({
      name: "foo",
      self: {},
      url: "/foo",
      templateUrl: "/foo.html",
      controller: "FooController",
      parent: parent,
    });

    expect(config.views.$default).not.toEqual(config);
    expect(config.views.$default).toEqual(
      jasmine.objectContaining({
        templateUrl: "/foo.html",
        controller: "FooController",
        resolveAs: "$resolve",
      }),
    );
  });

  it("It should use the views object to build views, when defined", function () {
    const config = { a: { foo: "bar", controller: "FooController" } };
    const built = builder.build({
      name: "foo",
      self: {},
      parent: parent,
      views: config,
    });

    expect(built.views.a.foo).toEqual(config.a.foo);
    expect(built.views.a.controller).toEqual(config.a.controller);
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
    expect(() => builder.build(Object.assign({}, config))).not.toThrow();
    expect(() =>
      builder.build(Object.assign({ component: "fooComponent" }, config)),
    ).toThrow();
    expect(() =>
      builder.build(
        Object.assign({ componentProvider: () => "fooComponent" }, config),
      ),
    ).toThrow();
    expect(() =>
      builder.build(Object.assign({ bindings: {} }, config)),
    ).toThrow();
  });

  it("should not expose the old generic builder decorator API", function () {
    expect(builder.builder).toBeUndefined();
    expect($stateRegistry.decorator).toBeUndefined();
  });

  it("should reject string shorthand in object-style resolves", function () {
    expect(() =>
      builder.build({
        name: "foo",
        self: {},
        parent: parent,
        resolve: { foo: "bar" },
      }),
    ).toThrow();
  });

  it("should reject provider-style resolvables in a resolve array", function () {
    expect(() =>
      builder.build({
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
    const config = builder.build({
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
