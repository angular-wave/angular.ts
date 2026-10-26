/// <reference types="jasmine" />
import { StateObject } from "./state-object.ts";
import { StateRegistryRuntime } from "./state-registry.ts";
import type { StateBuilder } from "./state-builder.ts";
import type { StateDeclaration } from "./interface.ts";
import { defined, instance } from "../../shared/test-fixtures.spec.ts";
import { createResolveInvocationLocals } from "../resolve/resolve-context.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import type { ResolvableToken } from "../resolve/interface.ts";
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";

describe("StateBuilder", function () {
  let builder: StateBuilder;

  let $stateRegistry: StateRegistryRuntime;

  beforeEach(function () {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular.createModule("default", []);
    const $injector = window.angular.bootstrap(
      defined(document.getElementById("app")),
      ["default"],
    );

    $stateRegistry = instance(
      $injector.get("$stateRegistry"),
      StateRegistryRuntime,
    );
    builder = $stateRegistry._builder;
  });

  function build(declaration: StateDeclaration): StateObject {
    return defined(builder._build(new StateObject(declaration)));
  }

  it("expect it to be configured by state registry", () => {
    expect($stateRegistry).toBeDefined();
    expect($stateRegistry._builder).toBeDefined();
    expect($stateRegistry.root().name).toBe("");
  });

  it("should build a single default view from state-level view properties", function () {
    const config = build({
      name: "foo",
      url: "/foo",
      templateUrl: "/foo.html",
      controller: "FooController",
    });

    expect<unknown>(defined(config._views).$default).not.toEqual(config);
    expect(defined(config._views).$default).toEqual(
      jasmine.objectContaining({
        templateUrl: "/foo.html",
        controller: "FooController",
      }),
    );
  });

  it("should build named views from the views object", function () {
    const built = build({
      name: "foo",
      views: {
        main: { template: "hello", controller: "FooController" },
        sidebar: "SidebarComponent",
      },
    });

    expect(defined(built._views).main.template).toBe("hello");
    expect(defined(built._views).main.controller).toBe("FooController");
    expect(defined(built._views).main._ngViewName).toBe("main");
    expect(defined(built._views).sidebar.component).toBe("SidebarComponent");
    expect(defined(built._views).sidebar._ngViewName).toBe("sidebar");
  });

  it("should normalize inline route components to generated component names", function () {
    const inlineComponent = { template: "inline" };
    const built = build({
      name: "foo",
      component: inlineComponent,
    });

    expect(typeof defined(built._views).$default.component).toBe("string");
    expect(defined(built._views).$default.component).toMatch(
      /^ngRouteFooDefaultComponent/,
    );
    expect(defined(built._views).$default.component).not.toBe(inlineComponent);
  });

  it("should normalize inline route components in named views", function () {
    const built = build({
      name: "foo",
      views: {
        sidebar: { component: { template: "inline" } },
      },
    });

    expect(typeof defined(built._views).sidebar.component).toBe("string");
    expect(defined(built._views).sidebar.component).toMatch(
      /^ngRouteFooSidebarComponent/,
    );
  });

  it("should copy state-level view fields into the default view", function () {
    const built = build({
      name: "foo",
      template: "hello",
      controller: "FooController",
    });

    expect(defined(built._views).$default.template).toBe("hello");
    expect(defined(built._views).$default.controller).toBe("FooController");
  });

  it("should not allow state-level view fields together with views", function () {
    expect(() =>
      build({
        name: "foo",
        template: "hello",
        views: { main: { controller: "FooController" } },
      }),
    ).toThrow();
  });

  it("should reject removed templateProvider view declarations", function () {
    expect(() =>
      build({
        name: "foo",
        // @ts-expect-error Removed provider-style templates are rejected at runtime too.
        templateProvider: () => "hello",
      }),
    ).toThrowError(/unsupported view properties: templateProvider/);

    expect(() =>
      build({
        name: "foo",
        views: {
          // @ts-expect-error Removed named-view providers are rejected at runtime too.
          main: { templateProvider: () => "hello" },
        },
      }),
    ).toThrowError(/unsupported view properties: templateProvider/);
  });

  it("should not allow a view config with both component and template keys", function () {
    const config = {
      name: "foo",
      url: "/foo",
      template: "<h1>hey</h1>",
      controller: "FooController",
    };

    expect(() => build(Object.assign({}, config))).not.toThrow();
    expect(() =>
      build(Object.assign({ component: "fooComponent" }, config)),
    ).toThrow();
    expect(() => build(Object.assign({ bindings: {} }, config))).toThrow();
  });

  it("should not expose the old generic builder decorator API", function () {
    expect("builder" in $stateRegistry).toBeFalse();
    expect("builder" in builder).toBeFalse();
    expect("decorator" in $stateRegistry).toBeFalse();
  });

  it("should reject string shorthand in object-style resolves", function () {
    expect(() =>
      build({
        name: "foo",
        // @ts-expect-error String shorthand is no longer a supported resolve declaration.
        resolve: { foo: "bar" },
      }),
    ).toThrow();
  });

  it("rejects contradictory public navigation policy fields", () => {
    expect(() =>
      build({
        name: "public",
        policy: {
          navigation: {
            public: true,
            // @ts-expect-error Public navigation cannot also require authentication.
            authenticated: true,
            // @ts-expect-error Public navigation cannot require permissions.
            permissions: ["admin"],
          },
        },
      }),
    ).toThrowError(
      "State 'public' public navigation policy cannot declare: authenticated, permissions",
    );
  });

  it("should reject provider-style resolvables in a resolve array", function () {
    expect(() =>
      build({
        name: "foo",
        resolve: [
          // @ts-expect-error Provider-style resolve recipes have been removed.
          { provide: "factoryDep", useFactory: () => "ok", deps: ["dep"] },
        ],
      }),
    ).toThrow();
  });

  it("should build explicit resolvable literals from a resolve array", function () {
    const config = build({
      name: "foo",
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

    expect(defined(config.resolvables)[0].token).toBe("factoryDep");
    expect(defined(config.resolvables)[0].deps).toEqual(["dep"]);
    expect(defined(config.resolvables)[0].eager).toBe(true);

    expect(defined(config.resolvables)[1].token).toBe("prefetched");
    expect(defined(config.resolvables)[1].data).toBe(false);
    expect(defined(config.resolvables)[1].resolved).toBe(true);
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
      expect(state.name).toBe("detail");
      expect(state.qualifiedName).toBe("app.detail");
      expect(String(state)).toBe("app.detail");
      expect(state.root()).toBe(root);
    });

    it("returns inherited and filtered parameters", () => {
      const parentParam = builder._paramFactory.fromConfig("parent", null, {
        name: "parent",
      });
      const childParam = builder._paramFactory.fromConfig("child", null, {
        name: "child",
      });
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
      const state = build({ name: "item", url: "/item/{id}" });
      const urlParam = defined(defined(state._url)._parameter("id"));
      const stateParam = builder._paramFactory.fromConfig(
        "id",
        null,
        state.self,
      );

      state.params = { id: stateParam };
      expect(urlParam).not.toBe(stateParam);

      expect(state.parameter("id")).toBe(urlParam);
    });
  });

  describe("StateRegistryRuntime", () => {
    it("queues child states until their parent is registered", () => {
      const events: {
        event: "registered" | "deregistered";
        names: string[];
      }[] = [];

      $stateRegistry.onStatesChanged((event, states) => {
        events.push({ event, names: states.map((state) => state.name) });
      });

      const child = $stateRegistry._register({
        name: "queued.child",
        template: "child",
      });

      expect($stateRegistry.getState("queued.child")).toBeNull();
      expect($stateRegistry._isQueued("queued.child")).toBeTrue();
      expect($stateRegistry._queue).toContain(child);

      $stateRegistry.register({ name: "queued", template: "parent" });

      expect($stateRegistry.getState("queued")).toBeDefined();
      expect($stateRegistry.getState("queued.child")).toBeDefined();
      expect($stateRegistry._isQueued("queued.child")).toBeFalse();
      expect(events.some((event) => event.names.includes("queued.child"))).toBe(
        true,
      );
    });

    it("deregisters a state tree and notifies listeners", () => {
      const events: {
        event: "registered" | "deregistered";
        names: string[];
      }[] = [];

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
      expect($stateRegistry.getState("removeMe")).toBeNull();
      expect($stateRegistry.getState("removeMe.child")).toBeNull();
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
        $stateRegistry.getStates().some((state) => state.name === "listMe"),
      ).toBe(true);
    });

    it("returns all declarations from getAll", () => {
      $stateRegistry.register({ name: "listAll", template: "list" });

      expect(
        $stateRegistry.getStates().some((state) => state.name === "listAll"),
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

    it("requires a token when a resolve function is supplied", () => {
      expect(() => new Resolvable(undefined, () => undefined)).toThrowError(
        "Resolvable token argument is required",
      );
    });
  });
});
