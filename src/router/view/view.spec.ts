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
  let $injector, routerState, root, states;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .config(function (_$provide_, _$$rProvider_) {
        _$provide_.factory("foo", () => {
          return "Foo";
        });
        routerState = _$$rProvider_;
      });
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$injector_) => {
      $injector = _$injector_;
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

      const viewService = new ViewService();

      viewService._templateFactory = $injector.get("$templateFactory");

      const path = [root, state].map((_state) => new PathNode(_state));

      applyViewConfigs(viewService, path, [state]);

      expect(path[1]._views.length).toBe(1);
      expect(path[1]._views[0]._path).toEqual(jasmine.arrayContaining(path));
      expect(path[1]._views[0]._viewDecl).toBe(state._views.$default);
    });

    it("indexes active view configs by normalized target", () => {
      const parent = register({ name: "parent", parent: root });
      const child = register({ name: "child", parent });
      const path = [root, parent, child].map((_state) => new PathNode(_state));
      const viewService = new ViewService();
      const config = createViewConfig(
        path,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: child,
          template: "sidebar",
        },
        $injector.get("$templateFactory"),
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
      const viewService = new ViewService();
      const defaultConfig = createViewConfig(
        defaultPath,
        {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: parent,
          template: "default",
        },
        $injector.get("$templateFactory"),
      );
      const sidebarConfig = createViewConfig(
        childPath,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: child,
          template: "sidebar",
        },
        $injector.get("$templateFactory"),
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
      const viewService = new ViewService();
      const config = createViewConfig(
        path,
        {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: parent,
          template: "default",
        },
        $injector.get("$templateFactory"),
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
      const viewService = new ViewService();
      const config = createViewConfig(
        path,
        {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: parent,
          template: "default",
        },
        $injector.get("$templateFactory"),
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
      const viewService = new ViewService();
      const sidebarConfig = createViewConfig(
        path,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: child,
          template: "sidebar",
        },
        $injector.get("$templateFactory"),
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
      const viewService = new ViewService();
      const parentConfig = createViewConfig(
        parentPath,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: parent,
          template: "parent",
        },
        $injector.get("$templateFactory"),
      );
      const childConfig = createViewConfig(
        childPath,
        {
          _ngViewName: "sidebar",
          _ngViewContextAnchor: "parent",
          _context: child,
          template: "child",
        },
        $injector.get("$templateFactory"),
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

    it("caches component fill details on view configs", async () => {
      const state = register({
        name: "withComponent",
        component: "myWidget",
      });

      const path = [root, state].map((_state) => new PathNode(_state));

      const config = createViewConfig(
        path,
        state._views.$default,
        $injector.get("$templateFactory"),
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
        $injector.get("$templateFactory"),
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
