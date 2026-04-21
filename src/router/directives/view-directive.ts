import { PromiseResolvers, tail, unnestR } from "../../shared/common.ts";
import {
  hasAnimate,
  isArray,
  isDefined,
  isFunction,
} from "../../shared/utils.ts";
import { parse } from "../../shared/hof.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { trace } from "../common/trace.ts";
import { ViewConfig } from "../state/views.ts";
import {
  dealoc,
  getCacheData,
  getInheritedData,
  removeElement,
  setCacheData,
} from "../../shared/dom.ts";
import { getLocals } from "../state/state-registry.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import type { ActiveUIView, ViewContext } from "../view/view.ts";
import type { PathNode } from "../path/path-node.ts";
import { TargetState } from "../state/target-state.ts";

type Renderer = {
  enter: (element: HTMLElement, target: HTMLElement, cb: () => void) => void;
  leave: (element: HTMLElement, cb: () => void) => void;
};

function getFirstElementFromClone(
  clone: Node | Node[] | NodeList | DocumentFragment | null | undefined,
): HTMLElement | null {
  if (!clone) return null;

  if (clone instanceof HTMLElement) {
    return clone;
  }

  if (clone instanceof DocumentFragment) {
    const firstElement = clone.firstElementChild;

    return firstElement instanceof HTMLElement ? firstElement : null;
  }

  if (clone instanceof NodeList || isArray(clone)) {
    for (let i = 0, l = clone.length; i < l; i++) {
      const node = clone[i];

      if (node instanceof HTMLElement) {
        return node;
      }
    }

    return null;
  }

  return clone instanceof Element ? (clone as HTMLElement) : null;
}

type NgViewAnimData = {
  $animEnter: Promise<void>;
  $animLeave: Promise<void>;
  $$animLeave: PromiseResolvers<void>;
};

type NgViewData = {
  $cfg?: ViewConfig;
  $ngView: ActiveUIView;
};

type ActiveUIViewRootData = {
  $cfg: { viewDecl: { $context: ViewContext } };
  $ngView: Partial<ActiveUIView>;
};

type ViewControllerInstance = Record<string, any> & {
  $onInit?: () => void;
  uiOnParamsChanged?: (
    params: Record<string, unknown>,
    trans: ng.Transition,
  ) => void;
  uiCanExit?: (trans: ng.Transition) => unknown;
  /** @internal */
  __uiRouterRegisteredScopes__?: WeakSet<object>;
  /** @internal */
  __uiRouterLastParamsChangedTransition__?: ng.Transition;
};

type UiCanExitTransition = ng.Transition &
  Record<string, any> & {
    redirectedFrom(): UiCanExitTransition | null;
  };

function withResolvers<T>(): PromiseResolvers<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;

  let reject: (reason?: any) => void;

  const promise = new Promise<T>((resolveParam, rejectParam) => {
    resolve = resolveParam;
    reject = rejectParam;
  });

  return { promise, resolve, reject: reject! };
}

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
 * Renders and updates the currently active view configuration.
 */
export function ViewDirective(
  $view: ng.ViewService,
  $animate: ng.AnimateService,
  $anchorScroll: ng.AnchorScrollService,
  $interpolate: ng.InterpolateService,
): ng.Directive {
  function getRenderer(): Renderer {
    return {
      enter(element: HTMLElement, target: HTMLElement, cb: () => void): void {
        if (hasAnimate(element)) {
          $animate.enter(element, null, target).done(cb);
        } else {
          target.after(element);
          cb();
        }
      },

      leave(element: HTMLElement, cb: () => void): void {
        if (hasAnimate(element)) {
          $animate.leave(element).done(cb);
        } else {
          removeElement(element);
          cb();
        }
      },
    };
  }

  const rootData: ActiveUIViewRootData = {
    $cfg: { viewDecl: { $context: $view.rootViewContext() as ViewContext } },
    $ngView: {},
  };

  const directive: ng.Directive & { count: number } = {
    count: 0,
    terminal: true,
    priority: 400,
    transclude: "element",
    compile(_tElement: any, _tAttrs: any, $transclude?: ng.TranscludeFn) {
      const transclude = $transclude as ng.TranscludeFn;

      return function (
        scope: ng.Scope,
        $element: HTMLElement,
        attrs: ng.Attributes,
      ) {
        const onloadExp = attrs.onload || "",
          autoScrollExp = attrs.autoscroll,
          renderer = getRenderer(),
          inherited =
            (getInheritedData($element, "$ngView") as
              | ActiveUIViewRootData
              | undefined) || rootData,
          name =
            (
              $interpolate(
                attrs.ngView || attrs.name || "",
              ) as ng.InterpolationFunction
            )(scope) || "$default";

        let previousEl: HTMLElement | null = null;

        let currentEl: HTMLElement | null = null;

        let currentScope: ng.Scope | null = null;

        let viewConfig: ViewConfig | undefined;

        let configUpdateVersion = 0;

        const parentFqn =
          (parse("$cfg.viewDecl.$context.name")(inherited) as
            | string
            | undefined) || inherited.$ngView.fqn;

        const activeUIView: ActiveUIView = {
          id: directive.count++, // Global sequential ID for ng-view tags added to DOM
          name, // ng-view name (<div ng-view="name"></div>
          fqn: parentFqn ? `${parentFqn}.${name}` : name, // fully qualified name, describes location in DOM
          config: null, // The ViewConfig loaded (from a state.views definition)
          configUpdated: configUpdatedCallback, // Called when the matching ViewConfig changes
          get creationContext(): ViewContext {
            // The context in which this ng-view "tag" was created
            const fromParentTagConfig = parse("$cfg.viewDecl.$context")(
              inherited,
            ) as ViewContext | undefined;

            // Allow <ng-view name="foo"><ng-view name="bar"></ng-view></ng-view>
            // See https://github.com/angular-ui/ui-router/issues/3355
            const fromParentTag = parse("$ngView.creationContext")(
              inherited,
            ) as ViewContext | undefined;

            return (
              fromParentTagConfig ||
              fromParentTag ||
              rootData.$cfg.viewDecl.$context
            );
          },
        };

        trace.traceUIViewEvent("Linking", activeUIView);

        function configUpdatedCallback(config: ViewConfig | undefined): void {
          if (config && !(config instanceof ViewConfig)) return;

          const updateVersion = ++configUpdateVersion;

          if (!config) {
            if (!viewConfig) return;

            queueMicrotask(() => {
              if (
                updateVersion !== configUpdateVersion ||
                viewConfig !== undefined
              ) {
                return;
              }

              trace.traceUIViewConfigUpdated(activeUIView, undefined);
              activeUIView.config = null;
              updateView(undefined);
            });

            viewConfig = undefined;
            activeUIView.config = null;

            return;
          }

          if (viewConfig === config) return;

          trace.traceUIViewConfigUpdated(
            activeUIView,
            config && config.viewDecl && config.viewDecl.$context,
          );
          activeUIView.config = config || null;
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
        function cleanupLastView(): void {
          if (previousEl) {
            trace.traceUIViewEvent(
              "Removing (previous) el",
              getCacheData(previousEl, "$ngView") as
                | ActiveUIView
                | null
                | undefined,
            );
            removeElement(previousEl);
            previousEl = null;
          }

          if (currentScope) {
            trace.traceUIViewEvent("Destroying scope", activeUIView);
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentEl) {
            const _viewData = getCacheData(
              currentEl,
              "$ngViewAnim",
            ) as NgViewAnimData;

            trace.traceUIViewEvent("Animate out", activeUIView);
            renderer.leave(currentEl, function () {
              _viewData.$$animLeave.resolve();
              previousEl = null;
            });
            previousEl = currentEl;
            currentEl = null;
          }
        }

        function updateView(config?: ViewConfig): void {
          const newScope = scope.$new();

          const animEnter = withResolvers<void>();

          const animLeave = withResolvers<void>();

          const $ngViewData: NgViewData = {
            $cfg: config,
            $ngView: activeUIView,
          };

          const $ngViewAnim: NgViewAnimData = {
            $animEnter: animEnter.promise,
            $animLeave: animLeave.promise,
            $$animLeave: animLeave,
          };

          /**
           * Fired once the view **begins loading**, *before* the DOM is rendered.
           *
           * @param event Event object.
           * @param viewName Name of the view.
           */
          newScope.$emit("$viewContentLoading", name);
          currentEl = transclude(newScope, (clone) => {
            const elementClone = getFirstElementFromClone(clone);

            if (!elementClone) {
              return;
            }

            setCacheData(elementClone, "$ngViewAnim", $ngViewAnim);
            setCacheData(elementClone, "$ngView", $ngViewData);
            renderer.enter(elementClone, $element, () => {
              animEnter.resolve(undefined);

              if (currentScope)
                currentScope.$emit("$viewContentAnimationEnded");

              if (
                (isDefined(autoScrollExp) && !autoScrollExp) ||
                (autoScrollExp && scope.$eval(autoScrollExp))
              ) {
                $anchorScroll(elementClone);
              }
            });
            cleanupLastView();
          }) as unknown as HTMLElement;

          currentScope = newScope;
          /**
           * Fired once the view is **loaded**, *after* the DOM is rendered.
           *
           * @param event Event object.
           */
          currentScope!.$emit("$viewContentLoaded", config || viewConfig);
          currentScope!.$eval(onloadExp);
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
 * Instantiates the active view template and wires its controller lifecycle.
 */
export function ViewDirectiveFill(
  $compile: ng.CompileService,
  $controller: ng.ControllerService,
  $transitions: ng.TransitionService,
): ng.Directive {
  const getControllerAs = parse("viewDecl.controllerAs");

  const getResolveAs = parse("viewDecl.resolveAs");

  return {
    priority: -400,
    compile(tElement: HTMLElement) {
      const initial = tElement.innerHTML;

      dealoc(tElement, true);

      return function (scope: ng.Scope, $element: HTMLElement) {
        const data = getCacheData($element, "$ngView") as
          | NgViewData
          | undefined;

        if (!data) {
          $element.innerHTML = initial;

          $compile(
            ($element as HTMLIFrameElement).contentDocument ||
              $element.childNodes,
          )(scope);

          return;
        }
        const cfg = (data.$cfg || {
          viewDecl: {},
          getTemplate: () => undefined,
        }) as Pick<ViewConfig, "viewDecl" | "getTemplate" | "controller"> &
          Partial<Pick<ViewConfig, "path">>;

        const resolveCtx = cfg.path && new ResolveContext(cfg.path);

        $element.innerHTML =
          cfg.getTemplate($element, resolveCtx as ResolveContext) || initial;
        trace.traceUIViewFill(data.$ngView, $element.innerHTML);
        const link = $compile(
          ($element as HTMLIFrameElement).contentDocument ||
            $element.childNodes,
        );

        const { controller } = cfg;

        const controllerAs = getControllerAs(cfg);

        const resolveAs = getResolveAs(cfg);

        const locals = resolveCtx ? getLocals(resolveCtx) : undefined;

        const targetScope = scope.$target as Record<string, any>;

        if (resolveAs) {
          targetScope[resolveAs as string] = locals;
        }

        if (controller) {
          const controllerInstance = $controller(
            controller,
            Object.assign({}, locals, { $scope: scope, $element }),
          ) as ViewControllerInstance;

          if (controllerAs) {
            targetScope[controllerAs as string] = controllerInstance;

            if (resolveAs) {
              targetScope[controllerAs as string][resolveAs as string] = locals;
            }
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
            cfg as Pick<ViewConfig, "viewDecl" | "path">,
          );
        }
        link(scope);

        const componentName = (cfg as ViewConfig & { component?: string })
          .component;

        const callbackConfig = cfg as Pick<ViewConfig, "viewDecl" | "path">;

        if (typeof componentName === "string") {
          const kebobName = componentName
            .replace(/([A-Z])/g, "-$1")
            .replace(/^-/, "")
            .toLowerCase();

          const tagRegexp = new RegExp(`^(x-|data-)?${kebobName}$`, "i");

          const getComponentController = () => {
            const candidates = Array.from($element.querySelectorAll("*"));

            const directiveEl = candidates.find(
              (el) => el.tagName && tagRegexp.exec(el.tagName),
            );

            if (!directiveEl) {
              return undefined;
            }

            const camelNameFromTag = directiveEl.tagName
              .toLowerCase()
              .replace(/^(x-|data-)/, "")
              .replace(/-([a-z])/g, (_all, letter: string) =>
                letter.toUpperCase(),
              );

            const tryControllerKey = (key: string) =>
              (getCacheData(directiveEl, key) as
                | ViewControllerInstance
                | undefined) ||
              (getInheritedData(directiveEl, key) as
                | ViewControllerInstance
                | undefined);

            const scopeWithCtrl =
              (getCacheData(directiveEl, "$isolateScope") as
                | Record<string, ViewControllerInstance>
                | undefined) ||
              (getInheritedData(directiveEl, "$isolateScope") as
                | Record<string, ViewControllerInstance>
                | undefined) ||
              (getCacheData(directiveEl, "$scope") as
                | Record<string, ViewControllerInstance>
                | undefined) ||
              (getInheritedData(directiveEl, "$scope") as
                | Record<string, ViewControllerInstance>
                | undefined);

            return (
              tryControllerKey(`$${componentName}Controller`) ||
              tryControllerKey(`$${camelNameFromTag}Controller`) ||
              tryControllerKey("$ngControllerController") ||
              scopeWithCtrl?.$ctrl
            );
          };

          const registerComponentCallbacks = (attempt = 0) => {
            if (scope.$handler._destroyed) {
              return;
            }

            const componentCtrl = getComponentController();

            if (componentCtrl) {
              registerControllerCallbacks(
                $transitions,
                componentCtrl,
                scope,
                callbackConfig,
              );

              return;
            }

            if (attempt >= 10) {
              return;
            }

            queueMicrotask(() => registerComponentCallbacks(attempt + 1));
          };

          registerComponentCallbacks();
        }
      };
    },
  };
}
/** @ignore */
/** @ignore incrementing id */
let _uiCanExitId = 0;

/**
 * @ignore TODO: move these callbacks to $view and/or `/hooks/components.ts` or something
 */
function registerControllerCallbacks(
  $transitions: ng.TransitionService,
  controllerInstance: ViewControllerInstance,
  $scope: ng.Scope,
  cfg: Pick<ViewConfig, "viewDecl" | "path">,
): void {
  let registeredScopes = controllerInstance.__uiRouterRegisteredScopes__;

  if (!registeredScopes) {
    registeredScopes = new WeakSet<object>();
    controllerInstance.__uiRouterRegisteredScopes__ = registeredScopes;
  }

  if (registeredScopes.has($scope as object)) {
    return;
  }

  registeredScopes.add($scope as object);

  // Call $onInit() ASAP
  const onInit = controllerInstance.$onInit;

  if (
    isFunction(onInit) &&
    !(cfg.viewDecl.component || cfg.viewDecl.componentProvider)
  ) {
    onInit();
  }
  const viewState = (tail(cfg.path) as any).state.self;

  const hookOptions = { bind: controllerInstance };

  // Add component-level hook for onUiParamsChanged
  if (isFunction(controllerInstance.uiOnParamsChanged)) {
    const onParamsChanged = controllerInstance.uiOnParamsChanged as (
      params: Record<string, unknown>,
      trans: ng.Transition,
    ) => void;

    const resolveContext = new ResolveContext(cfg.path);

    const viewCreationTrans = resolveContext.getResolvable("$transition$")
      .data as ng.Transition;

    // Fire callback on any successful transition
    const paramsUpdated = ($transition$: ng.Transition | undefined) => {
      if (!$transition$) return;

      if (
        controllerInstance.__uiRouterLastParamsChangedTransition__ ===
        $transition$
      ) {
        return;
      }

      controllerInstance.__uiRouterLastParamsChangedTransition__ = $transition$;

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

      const getNodeSchema = (node: { paramSchema: any }) => node.paramSchema;

      const treeChanges = $transition$ && $transition$.treeChanges;

      const toNodes = isFunction(treeChanges)
        ? (treeChanges.call($transition$, "to") ?? [])
        : [];

      const fromNodes = isFunction(treeChanges)
        ? (treeChanges.call($transition$, "from") ?? [])
        : [];

      const toSchema = (toNodes as PathNode[])
        .map(getNodeSchema)
        .reduce(unnestR, []);

      const fromSchema = (fromNodes as PathNode[])
        .map(getNodeSchema)
        .reduce(unnestR, []);

      // Find the to params that have different values than the from params
      const changedToParams = toSchema.filter(
        (param: {
          id: string | number;
          type: { equals: (a: unknown, b: unknown) => boolean };
        }) => {
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
        const changedKeys = changedToParams.map(
          (x: { id: string | number }) => x.id,
        );

        // Filter the params to only changed/new to params.  `$transition$.params()` may be used to get all params.
        const newValues: Record<string | number, unknown> = {};

        changedKeys.forEach((key: string | number) => {
          if (key in toParams) newValues[key] = toParams[key];
        });
        $scope.$evalAsync(() => {
          onParamsChanged.call(controllerInstance, newValues, $transition$);
        });
      }
    };

    const hookRegistryKey = [
      viewState?.name || "",
      cfg.viewDecl.$ngViewName || "$default",
      cfg.viewDecl.$ngViewContextAnchor || "^",
    ].join("::");

    const rootScope = $scope.$root as ng.Scope &
      Record<string, Map<string, () => void> | undefined>;

    const registryProp = "__uiRouterParamsChangedHooks__";

    const hookRegistry =
      rootScope[registryProp] ||
      (rootScope[registryProp] = new Map<string, () => void>());

    hookRegistry.get(hookRegistryKey)?.();

    const deregisterParamsHook = $transitions.onSuccess(
      {},
      paramsUpdated,
      hookOptions,
    );

    hookRegistry.set(hookRegistryKey, deregisterParamsHook);

    $scope.$on("$destroy", () => {
      if (hookRegistry.get(hookRegistryKey) === deregisterParamsHook) {
        hookRegistry.delete(hookRegistryKey);
      }

      deregisterParamsHook();
    });
  }

  // Add component-level hook for uiCanExit
  if (isFunction(controllerInstance.uiCanExit)) {
    const uiCanExit = controllerInstance.uiCanExit as (
      trans: ng.Transition,
    ) => boolean | void | TargetState;

    const id = _uiCanExitId++;

    const cacheProp = "_uiCanExitIds";

    /**
     * Returns true if any transition in the redirect chain already answered truthy.
     */
    const prevTruthyAnswer = (trans: UiCanExitTransition | null): boolean =>
      !!trans &&
      ((trans[cacheProp] && trans[cacheProp][id] === true) ||
        prevTruthyAnswer(trans.redirectedFrom()));

    // If a user answered yes, but the transition was later redirected, don't also ask for the new redirect transition
    const wrappedHook = (trans: UiCanExitTransition) => {
      let promise: Promise<boolean | void | TargetState> | undefined;

      const ids = (trans[cacheProp] = trans[cacheProp] || {});

      if (!prevTruthyAnswer(trans)) {
        promise = Promise.resolve(uiCanExit.call(controllerInstance, trans));
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
