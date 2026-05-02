import { dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { StateMatcher } from "../state/state-matcher.ts";
import { StateBuilder } from "../state/state-builder.ts";
import { StateObject } from "../state/state-object.ts";
import { ViewService } from "./view.ts";
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
        fqn: "$default",
        name: "$default",
        creationContext: root,
      };
      const viewConfig = {
        viewDecl: {
          $ngViewName: "$default",
          $ngViewContextAnchor: "",
          $context: root,
        },
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
        fqn: "parent.sidebar",
        name: "sidebar",
        creationContext: parentContext,
      };
      const viewConfig = {
        viewDecl: {
          $ngViewName: "sidebar",
          $ngViewContextAnchor: "parent",
          $context: childContext,
        },
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
        fqn: "parent.sidebar",
        name: "sidebar",
        creationContext: parentContext,
      };
      const viewConfig = {
        viewDecl: {
          $ngViewName: "sidebar",
          $ngViewContextAnchor: "parent",
          $context: childContext,
        },
      };
      const childNgViewsByFqn = {
        "parent.sidebar.sidebar": {
          fqn: "parent.sidebar.sidebar",
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
      expect(path[1]._views[0].path).toEqual(jasmine.arrayContaining(path));
      expect(path[1]._views[0].viewDecl).toBe(state._views.$default);
    });
  });
});
