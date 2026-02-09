import { tail, unnestR } from "../../shared/common.js";
import { hasAnimate, isDefined, isFunction } from "../../shared/utils.js";
import { parse } from "../../shared/hof.js";
import { ResolveContext } from "../resolve/resolve-context.js";
import { trace } from "../common/trace.js";
import { ViewConfig } from "../state/views.js";
import {
  dealoc,
  getCacheData,
  getInheritedData,
  setCacheData,
} from "../../shared/dom.js";
import { getLocals } from "../state/state-registry.js";
import { $injectTokens } from "../../injection-tokens.js";

/**
 * `ng-view`: A viewport directive which is filled in by a view from the active state.
 *
 * ### Attributes
 *
 * - `name`: (Optional) A view name.
 *   The name should be unique amongst the other views in the same state.
 *   You can have views of the same name that live in different states.
 *   The ng-view can be targeted in a View using the name ([[StateDeclaration.views]]).
 *
 * - `autoscroll`: an expression. When it evaluates to true, the `ng-view` will be scrolled into view when it is activated.
 *   Uses [[$anchorScroll]] to do the scrolling.
 *
 * - `onload`: Expression to evaluate whenever the view updates.
 *
 * #### Example:
 * A view can be unnamed or named.
 * ```html
 * <!-- Unnamed -->
 * <div ng-view></div>
 *
 * <!-- Named -->
 * <div ng-view="viewName"></div>
 *
 * <!-- Named (different style) -->
 * <ng-view name="viewName"></ng-view>
 * ```
 *
 * You can only have one unnamed view within any template (or root html). If you are only using a
 * single view and it is unnamed then you can populate it like so:
 *
 * ```html
 * <div ng-view></div>
 * $stateProvider.state("home", {
 *   template: "<h1>HELLO!</h1>"
 * })
 * ```
 *
 * The above is a convenient shortcut equivalent to specifying your view explicitly with the
 * [[StateDeclaration.views]] config property, by name, in this case an empty name:
 *
 * ```js
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }
 * })
 * ```
 *
 * But typically you'll only use the views property if you name your view or have more than one view
 * in the same template. There's not really a compelling reason to name a view if its the only one,
 * but you could if you wanted, like so:
 *
 * ```html
 * <div ng-view="main"></div>
 * ```
 *
 * ```js
 * $stateProvider.state("home", {
 *   views: {
 *     "main": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }
 * })
 * ```
 *
 * Really though, you'll use views to set up multiple views:
 *
 * ```html
 * <div ng-view></div>
 * <div ng-view="chart"></div>
 * <div ng-view="data"></div>
 * ```
 *
 * ```js
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     },
 *     "chart": {
 *       template: "<chart_thing/>"
 *     },
 *     "data": {
 *       template: "<data_thing/>"
 *     }
 *   }
 * })
 * ```
 *
 * #### Examples for `autoscroll`:
 * ```html
 * <!-- If autoscroll present with no expression,
 *      then scroll ng-view into view -->
 * <ng-view autoscroll/>
 *
 * <!-- If autoscroll present with valid expression,
 *      then scroll ng-view into view if expression evaluates to true -->
 * <ng-view autoscroll='true'/>
 * <ng-view autoscroll='false'/>
 * <ng-view autoscroll='scopeVariable'/>
 * ```
 *
 * Resolve data:
 *
 * The resolved data from the state's `resolve` block is placed on the scope as `$resolve` (this
 * can be customized using [[ViewDeclaration.resolveAs]]).  This can be then accessed from the template.
 *
 * Note that when `controllerAs` is being used, `$resolve` is set on the controller instance *after* the
 * controller is instantiated.  The `$onInit()` hook can be used to perform initialization code which
 * depends on `$resolve` data.
 *
 * #### Example:
 * ```js
 * $stateProvider.state('home', {
 *   template: '<my-component user="$resolve.user"></my-component>',
 *   resolve: {
 *     user: function(UserService) { return UserService.fetchUser(); }
 *   }
 * });
 * ```
 */

ViewDirective.$inject = [
  $injectTokens._view,
  $injectTokens._animate,
  $injectTokens._anchorScroll,
  $injectTokens._interpolate,
];

/**
 * @param {ng.ViewService} $view
 * @param {ng.AnimateService} $animate
 * @param {ng.AnchorScrollService} $anchorScroll
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export function ViewDirective($view, $animate, $anchorScroll, $interpolate) {
  function getRenderer() {
    return {
      /**
       * @param {HTMLElement} element
       * @param {HTMLElement} target
       * @param {() => void} cb
       */
      enter(element, target, cb) {
        if (hasAnimate(element)) {
          $animate.enter(element, null, target).then(cb);
        } else {
          target.after(element);
          cb();
        }
      },

      /**
       * @param {HTMLElement} element
       * @param {() => void} cb
       */
      leave(element, cb) {
        if (hasAnimate(element)) {
          $animate.leave(element).then(cb);
        } else {
          /** @type {HTMLElement} */ (element.parentElement).removeChild(
            element,
          );
          cb();
        }
      },
    };
  }

  const rootData = {
    $cfg: { viewDecl: { $context: $view.rootViewContext() } },
    $ngView: {},
  };

  /** @type {ng.Directive} */
  const directive = {
    count: 0,
    terminal: true,
    priority: 400,
    transclude: "element",
    compile(_tElement, _tAttrs, $transclude) {
      return function (scope, $element, attrs) {
        const onloadExp = attrs.onload || "",
          autoScrollExp = attrs.autoscroll,
          renderer = getRenderer(),
          inherited = getInheritedData($element, "$ngView") || rootData,
          name =
            /** @type {import("../../core/interpolate/interface.ts").InterpolationFunction} */ (
              $interpolate(attrs.ngView || attrs.name || "")
            )(scope) || "$default";

        /**
         * @type {HTMLElement | null}
         */
        let previousEl;

        /**
         * @type {HTMLElement | null}
         */
        let currentEl;

        /**
         * @type {ng.Scope | null}
         */
        let currentScope;

        /**
         * @type {any}
         */
        let viewConfig;

        /** @type {import("../view/interface.ts").ActiveUIView} */
        const activeUIView = {
          id: /** @type {number} */ (directive.count)++, // Global sequential ID for ng-view tags added to DOM
          name, // ng-view name (<div ng-view="name"></div>
          fqn: inherited.$ngView.fqn
            ? `${inherited.$ngView.fqn}.${name}`
            : name, // fully qualified name, describes location in DOM
          config: null, // The ViewConfig loaded (from a state.views definition)
          configUpdated: configUpdatedCallback, // Called when the matching ViewConfig changes
          get creationContext() {
            // The context in which this ng-view "tag" was created
            const fromParentTagConfig = parse("$cfg.viewDecl.$context")(
              inherited,
            );

            // Allow <ng-view name="foo"><ng-view name="bar"></ng-view></ng-view>
            // See https://github.com/angular-ui/ui-router/issues/3355
            const fromParentTag = parse("$ngView.creationContext")(inherited);

            return fromParentTagConfig || fromParentTag;
          },
        };

        trace.traceUIViewEvent("Linking", activeUIView);

        /**
         * @param {ViewConfig} config
         */
        function configUpdatedCallback(config) {
          if (config && !(config instanceof ViewConfig)) return;

          if (viewConfig === config) return;
          trace.traceUIViewConfigUpdated(
            activeUIView,
            config && config.viewDecl && config.viewDecl.$context,
          );
          viewConfig = config;
          updateView(config);
        }

        setCacheData($element, "$ngView", { $ngView: activeUIView });
        updateView();
        const unregister = $view.registerUIView(activeUIView);

        scope.$on("$destroy", function () {
          trace.traceUIViewEvent("Destroying/Unregistering", activeUIView);
          unregister();
        });
        function cleanupLastView() {
          if (previousEl) {
            trace.traceUIViewEvent(
              "Removing (previous) el",
              getCacheData(previousEl, "$ngView"),
            );
            previousEl.remove();
            previousEl = null;
          }

          if (currentScope) {
            trace.traceUIViewEvent("Destroying scope", activeUIView);
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentEl) {
            const _viewData = getCacheData(currentEl, "$ngViewAnim");

            trace.traceUIViewEvent("Animate out", _viewData);
            renderer.leave(currentEl, function () {
              _viewData.$$animLeave.resolve();
              previousEl = null;
            });
            previousEl = currentEl;
            currentEl = null;
          }
        }

        /**
         * @param {ViewConfig | undefined} [config]
         */
        function updateView(config) {
          const newScope = scope.$new();

          const animEnter = Promise.withResolvers();

          const animLeave = Promise.withResolvers();

          const $ngViewData = {
            $cfg: config,
            $ngView: activeUIView,
          };

          const $ngViewAnim = {
            $animEnter: animEnter.promise,
            $animLeave: animLeave.promise,
            $$animLeave: animLeave,
          };

          /**
           * Fired once the view **begins loading**, *before* the DOM is rendered.
           *
           * @param {Object} event Event object.
           * @param {string} viewName Name of the view.
           */
          newScope.$emit("$viewContentLoading", name);
          currentEl = /** @type {HTMLElement} */ (
            /** @type {ng.TranscludeFn} */ ($transclude)(newScope, (clone) => {
              setCacheData(
                /** @type {HTMLElement} */ (clone),
                "$ngViewAnim",
                $ngViewAnim,
              );
              setCacheData(
                /** @type {HTMLElement} */ (clone),
                "$ngView",
                $ngViewData,
              );
              renderer.enter(
                /** @type {HTMLElement} */ (clone),
                $element,
                () => {
                  animEnter.resolve(undefined);

                  if (currentScope)
                    currentScope.$emit("$viewContentAnimationEnded");

                  if (
                    (isDefined(autoScrollExp) && !autoScrollExp) ||
                    (autoScrollExp && scope.$eval(autoScrollExp))
                  ) {
                    $anchorScroll(/** @type {HTMLElement} */ (clone));
                  }
                },
              );
              cleanupLastView();
            })
          );

          currentScope = newScope;
          /**
           * Fired once the view is **loaded**, *after* the DOM is rendered.
           *
           * @param {Object} event Event object.
           */
          currentScope.$emit("$viewContentLoaded", config || viewConfig);
          currentScope.$eval(onloadExp);
        }
      };
    },
  };

  return directive;
}

ViewDirectiveFill.$inject = [
  $injectTokens._compile,
  $injectTokens._controller,
  $injectTokens._transitions,
];

/**
 * @param {ng.CompileService} $compile
 * @param {ng.ControllerService} $controller
 * @param {ng.TransitionService} $transitions
 * @return {ng.Directive}
 */
export function ViewDirectiveFill($compile, $controller, $transitions) {
  const getControllerAs = parse("viewDecl.controllerAs");

  const getResolveAs = parse("viewDecl.resolveAs");

  return {
    priority: -400,
    compile(tElement) {
      const initial = tElement.innerHTML;

      dealoc(tElement, true);

      return function (scope, $element) {
        const data = getCacheData($element, "$ngView");

        if (!data) {
          $element.innerHTML = initial;

          $compile(
            /** @type {HTMLIFrameElement} */ ($element).contentDocument ||
              $element.childNodes,
          )(scope);

          return;
        }
        const cfg = data.$cfg || {
          viewDecl: {},
          getTemplate: () => {
            /* empty */
          },
        };

        const resolveCtx = cfg.path && new ResolveContext(cfg.path);

        $element.innerHTML = cfg.getTemplate($element, resolveCtx) || initial;
        trace.traceUIViewFill(data.$ngView, $element.innerHTML);
        const link = $compile(
          /** @type {HTMLIFrameElement} */ ($element).contentDocument ||
            $element.childNodes,
        );

        const { controller } = cfg;

        const controllerAs = getControllerAs(cfg);

        const resolveAs = getResolveAs(cfg);

        const locals = resolveCtx && getLocals(resolveCtx);

        if (resolveAs) {
          scope.$target[resolveAs] = locals;
        }

        if (controller) {
          const controllerInstance = $controller(
            controller,
            Object.assign({}, locals, { $scope: scope, $element }),
          );

          if (controllerAs) {
            scope.$target[controllerAs] = controllerInstance;
            scope.$target[controllerAs][resolveAs] = locals;
          }
          // TODO: Use $view service as a central point for registering component-level hooks
          // Then, when a component is created, tell the $view service, so it can invoke hooks
          // $view.componentLoaded(controllerInstance, { $scope: scope, $element: $element });
          // scope.$on('$destroy', () => $view.componentUnloaded(controllerInstance, { $scope: scope, $element: $element }));
          setCacheData($element, "$ngControllerController", controllerInstance);
          Array.from($element.children).forEach((ell) => {
            setCacheData(ell, "$ngControllerController", controllerInstance);
          });
          registerControllerCallbacks(
            $transitions,
            controllerInstance,
            scope,
            cfg,
          );
        }
        // Wait for the component to appear in the DOM
        // if (isString(cfg.component)) {
        //const kebobName = kebobString(cfg.component);
        // const tagRegexp = new RegExp(`^(x-|data-)?${kebobName}$`, "i");
        // const getComponentController = () => {
        //   const directiveEl = [].slice
        //     .call($element.children)
        //     .filter((el) => el && el.tagName && tagRegexp.exec(el.tagName));
        //   return (
        //     directiveEl &&
        //     getCacheData(directiveEl, `$${cfg.component}Controller`)
        //   );
        // };
        //console.error(getComponentController());
        // const deregisterWatch = scope.$watch(
        //   getComponentController,
        //   function (ctrlInstance) {
        //     if (!ctrlInstance) return;
        //     registerControllerCallbacks(
        //       $transitions,
        //       ctrlInstance,
        //       scope,
        //       cfg,
        //     );
        //     deregisterWatch();
        //   },
        // );
        // }
        link(scope);
      };
    },
  };
}
/** @ignore */
/** @ignore incrementing id */
let _uiCanExitId = 0;

/**
 * @ignore TODO: move these callbacks to $view and/or `/hooks/components.ts` or something
 * @param {ng.TransitionService} $transitions
 * @param {any} controllerInstance
 * @param {ng.Scope} $scope
 * @param {{ viewDecl: { component: any; componentProvider: any; }; path: import("../transition/transition.js").PathNode[]; }} cfg
 */
function registerControllerCallbacks(
  $transitions,
  controllerInstance,
  $scope,
  cfg,
) {
  // Call $onInit() ASAP
  if (
    isFunction(controllerInstance.$onInit) &&
    !(cfg.viewDecl.component || cfg.viewDecl.componentProvider)
  ) {
    controllerInstance.$onInit();
  }
  const viewState = tail(cfg.path).state.self;

  const hookOptions = { bind: controllerInstance };

  // Add component-level hook for onUiParamsChanged
  if (isFunction(controllerInstance.uiOnParamsChanged)) {
    const resolveContext = new ResolveContext(cfg.path);

    const viewCreationTrans = resolveContext.getResolvable("$transition$").data;

    // Fire callback on any successful transition
    const paramsUpdated = (
      /** @type {ng.Transition | undefined} */ $transition$,
    ) => {
      if (!$transition$) return;

      // Exit early if the $transition$ is the same as the view was created within.
      // Exit early if the $transition$ will exit the state the view is for.
      if (
        $transition$ === viewCreationTrans ||
        $transition$.exiting().indexOf(viewState) !== -1
      ) {
        return;
      }

      const toParams = $transition$.params("to");

      const fromParams = $transition$.params("from");

      const getNodeSchema = (/** @type {{ paramSchema: any }} */ node) =>
        node.paramSchema;

      const treeChanges = $transition$ && $transition$.treeChanges;

      const toNodes = isFunction(treeChanges)
        ? (treeChanges.call($transition$, "to") ?? [])
        : [];

      const fromNodes = isFunction(treeChanges)
        ? (treeChanges.call($transition$, "from") ?? [])
        : [];

      const toSchema =
        /** @type {import("../transition/transition.js").PathNode[]} */ (
          toNodes
        )
          .map(getNodeSchema)
          .reduce(unnestR, []);

      const fromSchema =
        /** @type {import("../transition/transition.js").PathNode[]} */ (
          fromNodes
        )
          .map(getNodeSchema)
          .reduce(unnestR, []);

      // Find the to params that have different values than the from params
      const changedToParams = toSchema.filter(
        (/** @type {{ id: string | number; }} */ param) => {
          const idx = fromSchema.indexOf(param);

          return (
            idx === -1 ||
            !fromSchema[idx].type.equals(
              toParams[param.id],
              fromParams[param.id],
            )
          );
        },
      );

      // Only trigger callback if a to param has changed or is new
      if (changedToParams.length) {
        const changedKeys = /** @type {any[]} */ (
          changedToParams.map((/** @type {{ id: any; }} */ x) => x.id)
        );

        // Filter the params to only changed/new to params.  `$transition$.params()` may be used to get all params.
        /** @type {Record<string, any>} */
        const newValues = {};

        changedKeys.forEach((key) => {
          if (key in toParams) newValues[key] = toParams[key];
        });
        controllerInstance.uiOnParamsChanged(newValues, $transition$);
      }
    };

    $scope.$on(
      "$destroy",
      $transitions.onSuccess({}, paramsUpdated, hookOptions),
    );
  }

  // Add component-level hook for uiCanExit
  if (isFunction(controllerInstance.uiCanExit)) {
    const id = _uiCanExitId++;

    const cacheProp = "_uiCanExitIds";

    /**
     * Returns true if any transition in the redirect chain already answered truthy
     * @param {import("../transition/transition.js").Transition | null | undefined} trans
     * @returns {boolean}
     */
    const prevTruthyAnswer = (
      /** @type {ng.Transition & Record<String, any>} */ trans,
    ) =>
      !!trans &&
      ((trans[cacheProp] && trans[cacheProp][id] === true) ||
        prevTruthyAnswer(trans.redirectedFrom()));

    // If a user answered yes, but the transition was later redirected, don't also ask for the new redirect transition
    const wrappedHook = (
      /** @type {ng.Transition & Record<String, any>} */ trans,
    ) => {
      let promise;

      const ids = (trans[cacheProp] = trans[cacheProp] || {});

      if (!prevTruthyAnswer(trans)) {
        promise = Promise.resolve(controllerInstance.uiCanExit(trans));
        promise.then((val) => (ids[id] = val !== false));
      }

      return promise;
    };

    const criteria = { exiting: viewState.name };

    $scope.$on(
      "$destroy",
      $transitions.onBefore(criteria, wrappedHook, hookOptions),
    );
  }
}
