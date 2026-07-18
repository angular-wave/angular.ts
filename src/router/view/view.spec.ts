// @ts-nocheck
/// <reference types="jasmine" />
import { dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { StateMatcher } from "../state/state-matcher.ts";
import { StateBuilder } from "../state/state-builder.ts";
import { StateObject } from "../state/state-object.ts";
import { createViewConfig, loadViewConfig, ViewService } from "./view.ts";
import { PathNode } from "../path/path-node.ts";
import { applyViewConfigs } from "../path/path-utils.ts";

describe("view", () => {
  let $injector, routerState, root, stateService, states;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular.module("defaultModule", []).factory("foo", () => {
      return "Foo";
    });
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$injector_) => {
      $injector = _$injector_;
      stateService = $injector.get("$state");
      routerState = stateService._routerState;
      states = {};
      const matcher = new StateMatcher(states);

      const stateBuilder = new StateBuilder(matcher, routerState);

      register = registerState(states, stateBuilder);
      root = register({ name: "" });
    });
  });

  let register;

  function registerState(_states, stateBuilder) {
    return function register(config) {
      const state = new StateObject(config);

      const built = stateBuilder._build(state);

      return (_states[built.name] = built);
    };
  }

  function createTestViewService(viewRouterState = routerState) {
    return new ViewService({
      compileLifecycle: {
        onControllerCreated: () => () => undefined,
      },
      templateFactory: stateService._viewService._templateFactory,
      routerState: viewRouterState,
      transitions: $injector.get("$transitions"),
      compile: $injector.get("$compile"),
      controller: $injector.get("$controller"),
      rootScope: {
        $on: () => () => undefined,
      },
      injector: $injector,
    });
  }

  it("starts without a root context before router state initialization", () => {
    const viewService = createTestViewService({ _currentState: undefined });

    expect(viewService._rootContext).toBeNull();
  });

  describe("matching", () => {
    it("matches root default ng-view targets using the active ng-view fqn format", () => {
      const ngView = {
        _fqn: "$default",
        _name: "$default",
        _creationContext: root,
      };

      const viewConfig = {
        _viewDecl: {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: root,
        },
        _targetKey: "$default",
      };

      expect(ViewService._matches({}, ngView, viewConfig)).toBe(true);
    });

    it("matches named child ng-views using context.name fqn format", () => {
      const parentContext = register({ name: "parent", parent: root });

      const childContext = register({
        name: "child",
        parent: parentContext,
      });

      const ngView = {
        _fqn: "parent.sidebar",
        _name: "sidebar",
        _creationContext: parentContext,
      };

      const viewConfig = {
        _viewDecl: {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: childContext,
        },
        _targetKey: "parent.sidebar",
      };

      expect(ViewService._matches({}, ngView, viewConfig)).toBe(true);
    });

    it("does not match a parent config when a more specific child ng-view exists", () => {
      const parentContext = register({ name: "parent", parent: root });

      const childContext = register({
        name: "child",
        parent: parentContext,
      });

      const ngView = {
        _fqn: "parent.sidebar",
        _name: "sidebar",
        _creationContext: parentContext,
      };

      const viewConfig = {
        _viewDecl: {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: childContext,
        },
        _targetKey: "parent.sidebar",
      };

      const childNgViewsByFqn = {
        "parent.sidebar.sidebar": {
          _fqn: "parent.sidebar.sidebar",
        },
      };

      expect(ViewService._matches(childNgViewsByFqn, ngView, viewConfig)).toBe(
        false,
      );
    });
  });

  describe("service helpers", () => {
    it("creates view configs for entered states", () => {
      const state = register({
        name: "withView",
        template: "test",
      });

      const viewService = createTestViewService();

      const path = [root, state].map((_state) => new PathNode(_state));

      applyViewConfigs(viewService, path, [state]);

      expect(path[1]._views.length).toBe(1);
      expect(path[1]._views[0]._path).toEqual(jasmine.arrayContaining(path));
      expect(path[1]._views[0]._viewDecl).toBe(state._views.$default);
    });

    it("destroys retained views when the root scope is destroyed", () => {
      const viewService = stateService._viewService;
      const retainedElement = document.createElement("section");
      const retainedScope = {
        $handler: {
          _destroyed: false,
        },
        $destroy: jasmine.createSpy("$destroy").and.callFake(() => {
          retainedScope.$handler._destroyed = true;
        }),
      };

      viewService._retainedViews.set("retained", {
        _key: "retained",
        _config: {
          _targetKey: "retained.$default",
          _retention: {
            _mode: "keep-alive",
            _key: "retained",
            _state: "retained",
          },
        },
        _element: retainedElement,
        _nodes: [retainedElement],
        _scope: retainedScope,
        _animation: {},
        _createdAt: 1,
        _lastUsed: 1,
      });

      $injector.get("$rootScope").$destroy();

      expect(retainedScope.$destroy).toHaveBeenCalled();
      expect(viewService._retainedViews.size).toBe(0);
      expect(viewService._retentionDiagnostics).toEqual([
        jasmine.objectContaining({
          _kind: "destroyed",
          _key: "retained",
          _state: "retained",
          _targetKey: "retained.$default",
          _cacheSize: 1,
          _reason: "root-destroy",
        }),
      ]);
    });

    it("records retained view restore diagnostics", () => {
      const viewService = createTestViewService();
      const retainedElement = document.createElement("section");
      const retainedScope = {
        $handler: {
          _destroyed: false,
        },
        $destroy: jasmine.createSpy("$destroy"),
      };
      const config = {
        _targetKey: "retained.$default",
        _retention: {
          _mode: "keep-alive",
          _key: "retained",
          _state: "retained",
          _max: 4,
        },
      };

      viewService._retainView({
        _key: "retained",
        _config: config,
        _element: retainedElement,
        _nodes: [retainedElement],
        _scope: retainedScope,
        _animation: {},
      });

      const restored = viewService._restoreRetainedView(config);

      expect(restored?._scope).toBe(retainedScope);
      expect(viewService._retainedViews.size).toBe(0);
      expect(viewService._retentionDiagnostics).toEqual([
        jasmine.objectContaining({
          _kind: "retained",
          _key: "retained",
          _state: "retained",
          _targetKey: "retained.$default",
          _cacheSize: 1,
          _max: 4,
        }),
        jasmine.objectContaining({
          _kind: "restored",
          _key: "retained",
          _state: "retained",
          _targetKey: "retained.$default",
          _cacheSize: 0,
        }),
      ]);
    });

    it("records retained view eviction diagnostics", () => {
      const viewService = createTestViewService();
      const firstElement = document.createElement("section");
      const secondElement = document.createElement("section");
      const firstScope = {
        $handler: {
          _destroyed: false,
        },
        $destroy: jasmine.createSpy("$destroy").and.callFake(() => {
          firstScope.$handler._destroyed = true;
        }),
      };
      const secondScope = {
        $handler: {
          _destroyed: false,
        },
        $destroy: jasmine.createSpy("$destroy"),
      };
      const firstConfig = {
        _targetKey: "retainedA.$default",
        _retention: {
          _mode: "keep-alive",
          _key: "retained-a",
          _state: "retainedA",
          _max: 1,
        },
      };
      const secondConfig = {
        _targetKey: "retainedB.$default",
        _retention: {
          _mode: "keep-alive",
          _key: "retained-b",
          _state: "retainedB",
          _max: 1,
        },
      };

      viewService._retainView({
        _key: "retained-a",
        _config: firstConfig,
        _element: firstElement,
        _nodes: [firstElement],
        _scope: firstScope,
        _animation: {},
      });

      viewService._retainView({
        _key: "retained-b",
        _config: secondConfig,
        _element: secondElement,
        _nodes: [secondElement],
        _scope: secondScope,
        _animation: {},
      });

      expect(firstScope.$destroy).toHaveBeenCalled();
      expect(viewService._retainedViews.has("retained-a")).toBe(false);
      expect(viewService._retainedViews.has("retained-b")).toBe(true);
      expect(viewService._retentionDiagnostics).toEqual([
        jasmine.objectContaining({
          _kind: "retained",
          _key: "retained-a",
          _cacheSize: 1,
          _max: 1,
        }),
        jasmine.objectContaining({
          _kind: "retained",
          _key: "retained-b",
          _cacheSize: 2,
          _max: 1,
        }),
        jasmine.objectContaining({
          _kind: "destroyed",
          _key: "retained-a",
          _cacheSize: 1,
          _reason: "evicted",
        }),
      ]);
    });

    it("destroys views that are no longer configured for keep-alive retention", () => {
      const viewService = createTestViewService();
      const retainedElement = document.createElement("section");
      const retainedScope = {
        $handler: {
          _destroyed: false,
        },
        $destroy: jasmine.createSpy("$destroy").and.callFake(() => {
          retainedScope.$handler._destroyed = true;
        }),
      };

      viewService._retainView({
        _key: "destroyed-mode",
        _config: {
          _targetKey: "destroyedMode.$default",
          _retention: {
            _mode: "destroy",
            _key: "destroyed-mode",
            _state: "destroyedMode",
          },
        },
        _element: retainedElement,
        _nodes: [retainedElement],
        _scope: retainedScope,
        _animation: {},
      });

      expect(retainedScope.$destroy).toHaveBeenCalled();
      expect(viewService._retainedViews.size).toBe(0);
      expect(viewService._retentionDiagnostics).toEqual([
        jasmine.objectContaining({
          _kind: "destroyed",
          _key: "destroyed-mode",
          _reason: "mode-destroy",
        }),
      ]);
    });

    it("destroys an existing retained view when a key is replaced", () => {
      const viewService = createTestViewService();
      const firstElement = document.createElement("section");
      const secondElement = document.createElement("section");
      const firstScope = {
        $handler: {
          _destroyed: false,
        },
        $destroy: jasmine.createSpy("$destroy").and.callFake(() => {
          firstScope.$handler._destroyed = true;
        }),
      };
      const secondScope = {
        $handler: {
          _destroyed: false,
        },
        $destroy: jasmine.createSpy("$destroy"),
      };
      const config = {
        _targetKey: "replace.$default",
        _retention: {
          _mode: "keep-alive",
          _key: "replace",
          _state: "replace",
        },
      };

      viewService._retainView({
        _key: "replace",
        _config: config,
        _element: firstElement,
        _nodes: [firstElement],
        _scope: firstScope,
        _animation: {},
      });
      viewService._retainView({
        _key: "replace",
        _config: config,
        _element: secondElement,
        _nodes: [secondElement],
        _scope: secondScope,
        _animation: {},
      });

      expect(firstScope.$destroy).toHaveBeenCalled();
      expect(viewService._retainedViews.get("replace")._scope).toBe(
        secondScope,
      );
      expect(viewService._retentionDiagnostics).toContain(
        jasmine.objectContaining({
          _kind: "destroyed",
          _key: "replace",
          _reason: "replaced",
        }),
      );
    });

    it("removes retained elements that are still attached to the DOM", () => {
      const viewService = createTestViewService();
      const host = document.createElement("div");
      const retainedElement = document.createElement("section");
      const retainedScope = {
        $handler: {
          _destroyed: false,
        },
        $destroy: jasmine.createSpy("$destroy").and.callFake(() => {
          retainedScope.$handler._destroyed = true;
        }),
      };

      host.appendChild(retainedElement);
      document.body.appendChild(host);

      try {
        viewService._destroyRetainedView({
          _key: "attached",
          _config: {
            _targetKey: "attached.$default",
            _retention: {
              _mode: "keep-alive",
              _key: "attached",
              _state: "attached",
            },
          },
          _element: retainedElement,
          _scope: retainedScope,
        });

        expect(retainedScope.$destroy).toHaveBeenCalled();
        expect(host.contains(retainedElement)).toBe(false);
      } finally {
        dealoc(host);
      }
    });

    it("leaves retained views untouched when eviction is disabled", () => {
      const viewService = createTestViewService();

      viewService._retainedViews.set("disabled", {
        _key: "disabled",
        _config: {
          _targetKey: "disabled.$default",
          _retention: {
            _mode: "keep-alive",
            _key: "disabled",
            _state: "disabled",
          },
        },
        _element: document.createElement("section"),
        _nodes: [],
        _scope: {
          $handler: { _destroyed: false },
          $destroy: jasmine.createSpy("$destroy"),
        },
        _animation: {},
        _createdAt: 1,
        _lastUsed: 1,
      });

      viewService._evictRetainedViews(undefined, "lru");
      viewService._evictRetainedViews(-1, "lru");

      expect(viewService._retainedViews.has("disabled")).toBe(true);
    });

    it("leaves retained views untouched when eviction selection returns nothing", () => {
      const viewService = createTestViewService();
      const retainedScope = {
        $handler: { _destroyed: false },
        $destroy: jasmine.createSpy("$destroy"),
      };

      viewService._retainedViews.set("unselected", {
        _key: "unselected",
        _config: {
          _targetKey: "unselected.$default",
          _retention: {
            _mode: "keep-alive",
            _key: "unselected",
            _state: "unselected",
          },
        },
        _element: document.createElement("section"),
        _nodes: [],
        _scope: retainedScope,
        _animation: {},
        _createdAt: 1,
        _lastUsed: 1,
      });
      spyOn(viewService, "_selectOrderedRetainedView").and.returnValue(
        undefined,
      );

      viewService._evictRetainedViews(0, "lru");

      expect(viewService._retainedViews.has("unselected")).toBe(true);
      expect(retainedScope.$destroy).not.toHaveBeenCalled();
    });

    it("falls back when a policy eviction target is not selected", () => {
      const viewService = createTestViewService();
      const invoke = jasmine.createSpy("invoke").and.returnValue(undefined);
      viewService._injector = { invoke };
      viewService._retainedViews.set("policy", {
        _key: "policy",
        _config: {
          _targetKey: "policy.$default",
          _path: [{ state: { self: { name: "policy" } } }],
          _retention: {
            _mode: "keep-alive",
            _key: "policy",
            _state: "policy",
          },
        },
        _element: document.createElement("section"),
        _nodes: [],
        _scope: {
          $handler: { _destroyed: false },
          $destroy: jasmine.createSpy("$destroy"),
        },
        _animation: {},
        _createdAt: 1,
        _lastUsed: 1,
      });

      expect(viewService._selectPolicyRetainedView(1, "evictPolicy")).toBe(
        undefined,
      );
      expect(invoke).toHaveBeenCalled();
    });

    it("selects the least recently used retained view when ordered fallback changes", () => {
      const viewService = createTestViewService();
      const first = {
        _key: "first",
        _config: {
          _targetKey: "first.$default",
          _retention: {
            _mode: "keep-alive",
            _key: "first",
            _state: "first",
          },
        },
        _element: document.createElement("section"),
        _nodes: [],
        _scope: {
          $handler: { _destroyed: false },
          $destroy: jasmine.createSpy("$destroy"),
        },
        _animation: {},
        _createdAt: 1,
        _lastUsed: 5,
      };
      const second = {
        _key: "second",
        _config: {
          _targetKey: "second.$default",
          _retention: {
            _mode: "keep-alive",
            _key: "second",
            _state: "second",
          },
        },
        _element: document.createElement("section"),
        _nodes: [],
        _scope: {
          $handler: { _destroyed: false },
          $destroy: jasmine.createSpy("$destroy"),
        },
        _animation: {},
        _createdAt: 2,
        _lastUsed: 1,
      };

      viewService._retainedViews.set(first._key, first);
      viewService._retainedViews.set(second._key, second);

      expect(viewService._selectOrderedRetainedView("lru")).toBe(second);
    });

    it("indexes active view configs by normalized target", () => {
      const parent = register({ name: "parent", parent: root });
      const child = register({ name: "child", parent });
      const path = [root, parent, child].map((_state) => new PathNode(_state));
      const viewService = createTestViewService();
      const config = createViewConfig(
        path,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: child,
          template: "sidebar",
        },
        stateService._viewService._templateFactory,
      );

      expect(config._targetKey).toBe("parent.sidebar");
      expect(config._depth).toBe(3);

      viewService._activateViewConfig(config);

      expect(viewService._viewConfigsByTarget.get("parent.sidebar")).toEqual([
        config,
      ]);

      viewService._deactivateViewConfig(config);

      expect(viewService._viewConfigsByTarget.has("parent.sidebar")).toBe(
        false,
      );
    });

    it("syncs ng-views using only configs for the matching target", () => {
      const parent = register({ name: "parent", parent: root });
      const child = register({ name: "child", parent });
      const defaultPath = [root, parent].map((_state) => new PathNode(_state));
      const childPath = [root, parent, child].map(
        (_state) => new PathNode(_state),
      );
      const viewService = createTestViewService();
      const defaultConfig = createViewConfig(
        defaultPath,
        {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: parent,
          template: "default",
        },
        stateService._viewService._templateFactory,
      );
      const sidebarConfig = createViewConfig(
        childPath,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: child,
          template: "sidebar",
        },
        stateService._viewService._templateFactory,
      );
      const ngView = {
        _id: 0,
        _element: document.createElement("ng-view"),
        _name: "$default",
        _fqn: "$default",
        _config: null,
        _creationContext: parent,
        _configUpdated: jasmine.createSpy("_configUpdated"),
      };
      const matches = spyOn(ViewService, "_matches").and.callThrough();

      viewService._activateViewConfig(defaultConfig);
      viewService._activateViewConfig(sidebarConfig);
      viewService._ngViews.push(ngView);
      viewService._sync();

      expect(ngView._configUpdated).toHaveBeenCalledWith(defaultConfig);
      expect(ngView._config).toBe(defaultConfig);
      expect(matches.calls.allArgs().map((args) => args[2])).toEqual([
        defaultConfig,
      ]);
    });

    it("does not notify an ng-view when the selected config is unchanged", () => {
      const parent = register({ name: "parent", parent: root });
      const path = [root, parent].map((_state) => new PathNode(_state));
      const viewService = createTestViewService();
      const config = createViewConfig(
        path,
        {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: parent,
          template: "default",
        },
        stateService._viewService._templateFactory,
      );
      const ngView = {
        _id: 0,
        _element: document.createElement("ng-view"),
        _name: "$default",
        _fqn: "$default",
        _config: config,
        _creationContext: parent,
        _configUpdated: jasmine.createSpy("_configUpdated"),
      };

      viewService._activateViewConfig(config);
      viewService._ngViews.push(ngView);
      viewService._sync();

      expect(ngView._configUpdated).not.toHaveBeenCalled();
      expect(ngView._config).toBe(config);
    });

    it("notifies an ng-view when its selected config is deactivated", () => {
      const parent = register({ name: "parent", parent: root });
      const path = [root, parent].map((_state) => new PathNode(_state));
      const viewService = createTestViewService();
      const config = createViewConfig(
        path,
        {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: parent,
          template: "default",
        },
        stateService._viewService._templateFactory,
      );
      const ngView = {
        _id: 0,
        _element: document.createElement("ng-view"),
        _name: "$default",
        _fqn: "$default",
        _config: config,
        _creationContext: parent,
        _configUpdated: jasmine.createSpy("_configUpdated"),
      };

      viewService._activateViewConfig(config);
      viewService._ngViews.push(ngView);
      viewService._deactivateViewConfig(config);
      viewService._sync();

      expect(ngView._configUpdated).toHaveBeenCalledWith(undefined);
      expect(ngView._config).toBe(null);
    });

    it("does not notify an ng-view for unrelated target configs", () => {
      const parent = register({ name: "parent", parent: root });
      const child = register({ name: "child", parent });
      const path = [root, parent, child].map((_state) => new PathNode(_state));
      const viewService = createTestViewService();
      const sidebarConfig = createViewConfig(
        path,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: child,
          template: "sidebar",
        },
        stateService._viewService._templateFactory,
      );
      const ngView = {
        _id: 0,
        _element: document.createElement("ng-view"),
        _name: "$default",
        _fqn: "$default",
        _config: null,
        _creationContext: parent,
        _configUpdated: jasmine.createSpy("_configUpdated"),
      };

      viewService._activateViewConfig(sidebarConfig);
      viewService._ngViews.push(ngView);
      viewService._sync();

      expect(ngView._configUpdated).not.toHaveBeenCalled();
      expect(ngView._config).toBe(null);
    });

    it("selects the deepest config for a shared view target without recomputing depth", () => {
      const parent = register({ name: "parent", parent: root });
      const child = register({ name: "child", parent });
      const parentPath = [root, parent].map((_state) => new PathNode(_state));
      const childPath = [root, parent, child].map(
        (_state) => new PathNode(_state),
      );
      const viewService = createTestViewService();
      const parentConfig = createViewConfig(
        parentPath,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: parent,
          template: "parent",
        },
        stateService._viewService._templateFactory,
      );
      const childConfig = createViewConfig(
        childPath,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: child,
          template: "child",
        },
        stateService._viewService._templateFactory,
      );
      const ngView = {
        _id: 0,
        _element: document.createElement("ng-view"),
        _name: "sidebar",
        _fqn: "parent.sidebar",
        _config: null,
        _creationContext: parent,
        _configUpdated: jasmine.createSpy("_configUpdated"),
      };

      expect(parentConfig._targetKey).toBe("parent.sidebar");
      expect(parentConfig._depth).toBe(2);
      expect(childConfig._targetKey).toBe("parent.sidebar");
      expect(childConfig._depth).toBe(3);

      viewService._activateViewConfig(parentConfig);
      viewService._activateViewConfig(childConfig);
      viewService._ngViews.push(ngView);
      viewService._sync();

      expect(ngView._configUpdated).toHaveBeenCalledWith(childConfig);
      expect(ngView._config).toBe(childConfig);
    });

    it("replaces stale same-depth configs for the same view target", () => {
      const parent = register({ name: "parent", parent: root });
      const firstChild = register({ name: "firstChild", parent });
      const secondChild = register({ name: "secondChild", parent });
      const firstPath = [root, parent, firstChild].map(
        (_state) => new PathNode(_state),
      );
      const secondPath = [root, parent, secondChild].map(
        (_state) => new PathNode(_state),
      );
      const viewService = createTestViewService();
      const firstConfig = createViewConfig(
        firstPath,
        {
          _ngViewName: "$default",
          _ngViewContextAnchor: "parent",
          _context: firstChild,
          template: "first",
        },
        stateService._viewService._templateFactory,
      );
      const secondConfig = createViewConfig(
        secondPath,
        {
          _ngViewName: "$default",
          _ngViewContextAnchor: "parent",
          _context: secondChild,
          template: "second",
        },
        stateService._viewService._templateFactory,
      );

      expect(firstConfig._targetKey).toBe("parent.$default");
      expect(secondConfig._targetKey).toBe("parent.$default");
      expect(firstConfig._depth).toBe(secondConfig._depth);

      viewService._activateViewConfig(firstConfig);
      viewService._activateViewConfig(secondConfig);

      expect(viewService._viewConfigs).toEqual([secondConfig]);
      expect(viewService._viewConfigsByTarget.get("parent.$default")).toEqual([
        secondConfig,
      ]);
    });

    it("caches component fill details on view configs", async () => {
      const state = register({
        name: "withComponent",
        component: "myWidget",
      });

      const path = [root, state].map((_state) => new PathNode(_state));

      const config = createViewConfig(
        path,
        state._views.$default,
        stateService._viewService._templateFactory,
      );

      expect(config._fillPlan._kind).toBe("component");
      expect(config._fillPlan._componentName).toBe("myWidget");
      expect(config._fillPlan._componentElementName).toBe("my-widget");
      expect(config._fillPlan._hasController).toBe(false);

      await loadViewConfig(config);

      expect(config._fillPlan._kind).toBe("component");
      expect(config._fillPlan._componentName).toBe("myWidget");
      expect(config._fillPlan._componentElementName).toBe("my-widget");
      expect(config._fillPlan._hasController).toBe(false);
    });

    it("caches controller fill details on template view configs", async () => {
      function TestController() {}

      const state = register({
        name: "withController",
        template: "test",
        controller: TestController,
      });

      const path = [root, state].map((_state) => new PathNode(_state));

      const config = createViewConfig(
        path,
        state._views.$default,
        stateService._viewService._templateFactory,
      );

      expect(config._fillPlan._kind).toBe("template");
      expect(config._fillPlan._componentName).toBeUndefined();
      expect(config._fillPlan._componentElementName).toBeUndefined();
      expect(config._fillPlan._hasController).toBe(true);

      await loadViewConfig(config);

      expect(config._fillPlan._kind).toBe("template");
      expect(config._fillPlan._componentName).toBeUndefined();
      expect(config._fillPlan._componentElementName).toBeUndefined();
      expect(config._fillPlan._hasController).toBe(true);
    });
  });
});
