// @ts-nocheck
/// <reference types="jasmine" />
import { StateBuilder } from "./state-builder.ts";
import { StateObject } from "./state-object.ts";
import { createResolveInvocationLocals } from "../resolve/resolve-context.ts";
import type { ResolvableToken } from "../resolve/interface.ts";
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
    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      "default",
    ]);

    $stateRegistry = $injector.get("$stateRegistry");
    builder = $stateRegistry._builder;
  });

  it("expect it to be configured by state registry", () => {
    expect($stateRegistry).toBeDefined();
    expect($stateRegistry._builder).toBeDefined();
    expect($stateRegistry.root().name).toBe("");
  });

  it("should build a single default view from state-level view properties", function () {
    const config = builder._build({
      name: "foo",
      self: {},
      url: "/foo",
      templateUrl: "/foo.html",
      controller: "FooController",
      parent,
    });

    expect(config._views.$default).not.toEqual(config);
    expect(config._views.$default).toEqual(
      jasmine.objectContaining({
        templateUrl: "/foo.html",
        controller: "FooController",
      }),
    );
  });

  it("should build named views from the views object", function () {
    const built = builder._build({
      name: "foo",
      self: {},
      parent,
      views: {
        main: { template: "hello", controller: "FooController" },
        sidebar: "SidebarComponent",
      },
    });

    expect(built._views.main.template).toBe("hello");
    expect(built._views.main.controller).toBe("FooController");
    expect(built._views.main._ngViewName).toBe("main");
    expect(built._views.sidebar.component).toBe("SidebarComponent");
    expect(built._views.sidebar._ngViewName).toBe("sidebar");
  });

  it("should normalize inline route components to generated component names", function () {
    const inlineComponent = { template: "inline" };
    const built = builder._build({
      name: "foo",
      self: {},
      parent,
      component: inlineComponent,
    });

    expect(typeof built._views.$default.component).toBe("string");
    expect(built._views.$default.component).toMatch(
      /^ngRouteFooDefaultComponent/,
    );
    expect(built._views.$default.component).not.toBe(inlineComponent);
  });

  it("should normalize inline route components in named views", function () {
    const built = builder._build({
      name: "foo",
      self: {},
      parent,
      views: {
        sidebar: { component: { template: "inline" } },
      },
    });

    expect(typeof built._views.sidebar.component).toBe("string");
    expect(built._views.sidebar.component).toMatch(
      /^ngRouteFooSidebarComponent/,
    );
  });

  it("should copy state-level view fields into the default view", function () {
    const built = builder._build({
      name: "foo",
      self: {},
      parent,
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
        parent,
        template: "hello",
        views: { main: { controller: "FooController" } },
      }),
    ).toThrow();
  });

  it("should reject removed templateProvider view declarations", function () {
    expect(() =>
      builder._build({
        name: "foo",
        self: {},
        parent,
        templateProvider: () => "hello",
      }),
    ).toThrowError(/unsupported view properties: templateProvider/);

    expect(() =>
      builder._build({
        name: "foo",
        self: {},
        parent,
        views: {
          main: { templateProvider: () => "hello" },
        },
      }),
    ).toThrowError(/unsupported view properties: templateProvider/);
  });

  it("should not allow a view config with both component and template keys", function () {
    const config = {
      name: "foo",
      self: {},
      url: "/foo",
      template: "<h1>hey</h1>",
      controller: "FooController",
      parent,
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
        parent,
        resolve: { foo: "bar" },
      }),
    ).toThrow();
  });

  it("should reject provider-style resolvables in a resolve array", function () {
    expect(() =>
      builder._build({
        name: "foo",
        self: {},
        parent,
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
      parent,
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

  describe("StateObject", () => {
    it("identifies state declarations and built state objects", () => {
      const declaration = { name: "app" };
      const state = new StateObject(declaration);

      expect(StateObject.isStateDeclaration(declaration)).toBeTrue();
      expect(StateObject.isStateDeclaration({ name: "other" })).toBeFalse();
      expect(StateObject.isState(state)).toBeTrue();
      expect(StateObject.isState(declaration)).toBeFalse();
      expect(state._state()).toBe(state);
    });

    it("matches by instance, declaration, and path name", () => {
      const root = new StateObject({ name: "" });
      const parent = new StateObject({ name: "app" });
      const state = new StateObject({ name: "detail" });

      parent.parent = root;
      parent.path = [root, parent];
      state.parent = parent;
      state.path = [root, parent, state];

      expect(state.is(state)).toBeTrue();
      expect(state.is(state.self)).toBeTrue();
      expect(state.is("app.detail")).toBeTrue();
      expect(state.is("detail")).toBeFalse();
      expect(state.fqn()).toBe("app.detail");
      expect(String(state)).toBe("app.detail");
      expect(state.root()).toBe(root);
    });

    it("returns inherited and filtered parameters", () => {
      const parentParam = { id: "parent" };
      const childParam = { id: "child" };
      const parent = new StateObject({ name: "parent" });
      const child = new StateObject({ name: "child" });

      parent.params = { parent: parentParam };
      child.parent = parent;
      child.params = { child: childParam };

      expect(child.parameters()).toEqual([parentParam, childParam]);
      expect(child.parameters({ inherit: false })).toEqual([childParam]);
      expect(child.parameters({ matchingKeys: { child: true } })).toEqual([
        childParam,
      ]);
      expect(child.parameter("child")).toBe(childParam);
      expect(child.parameter("parent", { inherit: true })).toBe(parentParam);
      expect(child.parameter("missing", { inherit: true })).toBeUndefined();
    });

    it("prefers URL parameters over state params", () => {
      const urlParam = { id: "id", source: "url" };
      const stateParam = { id: "id", source: "state" };
      const state = new StateObject({ name: "item" });

      state.params = { id: stateParam };
      state._url = {
        _parameter: jasmine.createSpy("_parameter").and.returnValue(urlParam),
      };

      expect(state.parameter("id")).toBe(urlParam);
    });
  });

  describe("StateRegistryRuntime", () => {
    it("queues child states until their parent is registered", () => {
      const events = [];

      $stateRegistry.onStatesChanged((event, states) => {
        events.push({ event, names: states.map((state) => state.name) });
      });

      const child = $stateRegistry._register({
        name: "queued.child",
        template: "child",
      });

      expect($stateRegistry.get("queued.child")).toBeNull();
      expect($stateRegistry._isQueued("queued.child")).toBeTrue();
      expect($stateRegistry._queue).toContain(child);

      $stateRegistry.register({ name: "queued", template: "parent" });

      expect($stateRegistry.get("queued")).toBeDefined();
      expect($stateRegistry.get("queued.child")).toBeDefined();
      expect($stateRegistry._isQueued("queued.child")).toBeFalse();
      expect(events.some((event) => event.names.includes("queued.child"))).toBe(
        true,
      );
    });

    it("deregisters a state tree and notifies listeners", () => {
      const events = [];

      $stateRegistry.register({ name: "removeMe", template: "parent" });
      $stateRegistry.register({ name: "removeMe.child", template: "child" });
      $stateRegistry.onStatesChanged((event, states) => {
        events.push({ event, names: states.map((state) => state.name) });
      });

      const deregistered = $stateRegistry.deregister("removeMe");

      expect(deregistered.map((state) => state.name)).toEqual([
        "removeMe.child",
        "removeMe",
      ]);
      expect($stateRegistry.get("removeMe")).toBeNull();
      expect($stateRegistry.get("removeMe.child")).toBeNull();
      expect(events).toEqual([
        {
          event: "deregistered",
          names: ["removeMe.child", "removeMe"],
        },
      ]);
    });

    it("throws when deregistering missing states by name or object", () => {
      expect(() => $stateRegistry.deregister("missing")).toThrowError(
        "Can't deregister state; not found: missing",
      );
      expect(() =>
        $stateRegistry.deregister({ name: "missingObject" }),
      ).toThrowError("Can't deregister state; not found: missingObject");
    });

    it("returns all declarations when get is called without arguments", () => {
      $stateRegistry.register({ name: "listMe", template: "list" });

      expect(
        $stateRegistry.get().some((state) => state.name === "listMe"),
      ).toBe(true);
    });

    it("returns all declarations from getAll", () => {
      $stateRegistry.register({ name: "listAll", template: "list" });

      expect(
        $stateRegistry.getAll().some((state) => state.name === "listAll"),
      ).toBe(true);
    });
  });

  describe("createResolveInvocationLocals", () => {
    it("returns locals for string tokens only", () => {
      const symbolToken = Symbol("ignored");
      const ctx = {
        getTokens: () => ["user", symbolToken, "count"],
        getResolvable: (token: ResolvableToken) => ({
          data: token === "user" ? "Ada" : 2,
        }),
      };

      expect(createResolveInvocationLocals(ctx)).toEqual({
        user: "Ada",
        count: 2,
      });
    });
  });
});
