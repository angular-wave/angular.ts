import { dealoc } from "../../shared/dom.js";
import { Angular } from "../../angular.js";
import { curry } from "../../shared/hof.js";
import { StateMatcher } from "../state/state-matcher.js";
import { StateBuilder } from "../state/state-builder.js";
import { StateObject } from "../state/state-object.js";
import { ViewService } from "./view.js";
import { PathNode } from "../path/path-node.js";
import { PathUtils } from "../path/path-utils.js";
import { tail } from "../../shared/common.js";
import { wait } from "../../shared/test-utils.js";

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
    const built = stateBuilder.build(state);
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
      const $view = new ViewService(null);

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
});
