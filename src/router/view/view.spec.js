import { dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { curry } from "../../shared/hof.ts";
import { StateMatcher } from "../state/state-matcher.ts";
import { StateBuilder } from "../state/state-builder.ts";
import { StateObject } from "../state/state-object.ts";
import { ViewService } from "./view.ts";
import { PathNode } from "../path/path-node.ts";
import { PathUtils } from "../path/path-utils.ts";
import { tail } from "../../shared/common.ts";
import { wait } from "../../shared/test-utils.ts";

describe("view", () => {
  let scope,
    $compile,
    $injector,
    elem = document.getElementById("app"),
    $controllerProvider,
    $urlProvider,
    $view,
    root,
    states;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .config(function (_$provide_, _$controllerProvider_, _$urlProvider_) {
        _$provide_.factory("foo", () => {
          return "Foo";
        });
        $controllerProvider = _$controllerProvider_;
        $urlProvider = _$urlProvider_;
      });
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke(($rootScope, _$compile_, _$injector_, _$view_) => {
      scope = $rootScope.$new();
      $compile = _$compile_;
      $injector = _$injector_;
      states = {};
      const matcher = new StateMatcher(states);
      const stateBuilder = new StateBuilder(matcher, $urlProvider);
      register = registerState(states, stateBuilder);
      root = register({ name: "" });
      $view = _$view_;
    });
  });

  let register;
  const registerState = curry(function (_states, stateBuilder, config) {
    const state = new StateObject(config);
    const built = stateBuilder._build(state);
    return (_states[built.name] = built);
  });

  describe("controller handling", () => {
    let state, path, ctrlExpression;
    beforeEach(() => {
      ctrlExpression = null;
      const stateDeclaration = {
        name: "foo",
        template: "test",
        controllerProvider: [
          "foo",
          function (/* $stateParams, */ foo) {
            // todo: reimplement localized $stateParams
            ctrlExpression =
              /* $stateParams.type + */ foo + "Controller as foo";
            return ctrlExpression;
          },
        ],
      };

      state = register(stateDeclaration);
      const $view = new ViewService();

      $view._templateFactory = $injector.get("$templateFactory");

      const _states = [root, state];
      path = _states.map((_state) => new PathNode(_state));
      PathUtils.applyViewConfigs($view, path, _states);
    });

    it("uses the controllerProvider to get controller dynamically", async () => {
      $controllerProvider.register("AcmeFooController", () => {
        /* empty */
      });
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);
      await wait();
      const view = tail(path).views[0];
      view.load();
      await wait(100);
      expect(ctrlExpression).toEqual("FooController as foo");
    });
  });

  describe("matching", () => {
    it("matches root default ng-view targets using the active ng-view fqn format", () => {
      const uiView = {
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

      expect(ViewService.matches({}, uiView)(viewConfig)).toBe(true);
    });

    it("matches named child ng-views using context.name fqn format", () => {
      const parentContext = register({ name: "parent", parent: root });
      const childContext = register({
        name: "child",
        parent: parentContext,
      });
      const uiView = {
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

      expect(ViewService.matches({}, uiView)(viewConfig)).toBe(true);
    });

    it("does not match a parent config when a more specific child ng-view exists", () => {
      const parentContext = register({ name: "parent", parent: root });
      const childContext = register({
        name: "child",
        parent: parentContext,
      });
      const uiView = {
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

      expect(ViewService.matches(childNgViewsByFqn, uiView)(viewConfig)).toBe(
        false,
      );
    });
  });

  describe("service helpers", () => {
    it("creates view configs through ViewService.createViewConfig", () => {
      const state = register({
        name: "withView",
        views: {
          $default: {
            template: "test",
          },
        },
      });
      const viewService = new ViewService();

      viewService._templateFactory = $injector.get("$templateFactory");

      spyOn(viewService, "createViewConfig").and.callThrough();

      const path = [root, state].map((_state) => new PathNode(_state));

      PathUtils.applyViewConfigs(viewService, path, [state]);

      expect(viewService.createViewConfig).toHaveBeenCalledTimes(1);
      expect(viewService.createViewConfig).toHaveBeenCalledWith(
        jasmine.arrayContaining(path),
        state.views.$default,
      );
      expect(path[1].views.length).toBe(1);
    });

    it("normalizes relative ng-view targets", () => {
      const parentContext = register({ name: "parent", parent: root });
      const childContext = register({
        name: "child",
        parent: parentContext,
      });

      expect(ViewService.normalizeUIViewTarget(childContext, "sidebar@^")).toBe(
        "sidebar@parent",
      );
    });

    it("notifies onSync listeners when views are synchronized", () => {
      const tuplesSeen = [];
      const deregister = $view.onSync((tuples) => tuplesSeen.push(tuples));
      const uiView = {
        id: 1,
        fqn: "$default",
        name: "$default",
        creationContext: root,
        config: null,
        configUpdated: () => {},
      };

      const unregister = $view.registerUIView(uiView);

      expect(tuplesSeen.length).toBeGreaterThan(0);

      unregister();
      deregister();
    });
  });
});
