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

  it("should not expose views through the generic builder decorator API", function () {
    expect(builder.builder("views")).toBeUndefined();
    expect(() => $stateRegistry.decorator("views", () => ({}))).toThrow();
  });

  it("should replace a resolve: string value with a function that injects the service of the same name", function () {
    const config = { resolve: { foo: "bar" } };
    expect(builder.builder("resolvables")).toBeDefined();
    const built = builder.builder("resolvables")(config);
    expect(built[0].deps).toEqual(["bar"]);
  });
});
