import { filter, tail, unnestR } from "../../shared/common.js";
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
 *   Uses [[$viewScroll]] to do the scrolling.
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

$ViewDirective.$inject = [
  $injectTokens._view,
  $injectTokens._animate,
  $injectTokens._viewScroll,
  $injectTokens._interpolate,
];

/**
 * @param {ng.ViewService} $view
 * @param {ng.AnimateService} $animate
 * @param {ng.AnchorScrollService} $viewScroll
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export function $ViewDirective($view, $animate, $viewScroll, $interpolate) {
  function getRenderer() {
    return {
      enter(element, target, cb) {
        if (hasAnimate(element)) {
          $animate.enter(element, null, target).then(cb);
        } else {
          target.after(element);
          cb();
        }
      },
      leave(element, cb) {
        if (hasAnimate(element)) {
          $animate.leave(element).then(cb);
        } else {
          element.parentElement.removeChild(element);
          cb();
        }
      },
    };
  }
  function configsEqual(config1, config2) {
    return config1 === config2;
  }
  const rootData = {
    $cfg: { viewDecl: { $context: $view.rootViewContext() } },
    $ngView: {},
  };

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
            $interpolate(attrs.ngView || attrs.name || "")(scope) || "$default";

        let previousEl, currentEl, currentScope, viewConfig;

        const activeUIView = {
          id: directive.count++, // Global sequential ID for ng-view tags added to DOM
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
        function configUpdatedCallback(config) {
          if (config && !(config instanceof ViewConfig)) return;

          if (configsEqual(viewConfig, config)) return;
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
          currentEl = $transclude(newScope, function (clone) {
            setCacheData(clone, "$ngViewAnim", $ngViewAnim);
            setCacheData(clone, "$ngView", $ngViewData);
            renderer.enter(clone, $element, function () {
              animEnter.resolve();

              if (currentScope)
                currentScope.$emit("$viewContentAnimationEnded");

              if (
                (isDefined(autoScrollExp) && !autoScrollExp) ||
                (autoScrollExp && scope.$eval(autoScrollExp))
              ) {
                /** @type {ng.AnchorScrollFunction} */ ($viewScroll)(clone);
              }
            });
            cleanupLastView();
          });
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

$ViewDirectiveFill.$inject = [
  $injectTokens._compile,
  $injectTokens._controller,
  $injectTokens._transitions,
];

/**
 * @param {ng.CompileService} $compile
 * @param {ng.ControllerService} $controller
 * @param {ng.TransitionService} $transitions
 * @returns
 */
export function $ViewDirectiveFill($compile, $controller, $transitions) {
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
          $compile($element.contentDocument || $element.childNodes)(scope);

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
        const link = $compile($element.contentDocument || $element.childNodes);

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

/** @ignore TODO: move these callbacks to $view and/or `/hooks/components.ts` or something */
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
    const paramsUpdated = ($transition$) => {
      // Exit early if the $transition$ is the same as the view was created within.
      // Exit early if the $transition$ will exit the state the view is for.
      if (
        $transition$ === viewCreationTrans ||
        $transition$.exiting().indexOf(viewState) !== -1
      )
        return;
      const toParams = $transition$.params("to");

      const fromParams = $transition$.params("from");

      const getNodeSchema = (node) => node.paramSchema;

      const toSchema = $transition$
        .treeChanges("to")
        .map(getNodeSchema)
        .reduce(unnestR, []);

      const fromSchema = $transition$
        .treeChanges("from")
        .map(getNodeSchema)
        .reduce(unnestR, []);

      // Find the to params that have different values than the from params
      const changedToParams = toSchema.filter((param) => {
        const idx = fromSchema.indexOf(param);

        return (
          idx === -1 ||
          !fromSchema[idx].type.equals(toParams[param.id], fromParams[param.id])
        );
      });

      // Only trigger callback if a to param has changed or is new
      if (changedToParams.length) {
        const changedKeys = changedToParams.map((x) => x.id);

        // Filter the params to only changed/new to params.  `$transition$.params()` may be used to get all params.
        const newValues = filter(
          toParams,
          (val, key) => changedKeys.indexOf(key) !== -1,
        );

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

    // Returns true if a redirect transition already answered truthy
    const prevTruthyAnswer = (trans) =>
      !!trans &&
      ((trans[cacheProp] && trans[cacheProp][id] === true) ||
        prevTruthyAnswer(trans.redirectedFrom()));

    // If a user answered yes, but the transition was later redirected, don't also ask for the new redirect transition
    const wrappedHook = (trans) => {
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
