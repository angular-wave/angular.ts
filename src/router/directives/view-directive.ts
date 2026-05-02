import {
  _anchorScroll,
  _compile,
  _controller,
  _injector,
  _interpolate,
  _parse,
  _state,
  _transitions,
  _view,
} from "../../injection-tokens.ts";
import {
  arrayFrom,
  assign,
  isArray,
  isDefined,
  isFunction,
  isInstanceOf,
  isString,
} from "../../shared/utils.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import {
  dealoc,
  getCacheData,
  getInheritedData,
  removeElement,
  setCacheData,
} from "../../shared/dom.ts";
import { getLocals } from "../state/state-registry.ts";
import {
  getViewTemplate,
  type _ViewConfig,
  type ActiveNgView,
  type ViewContext,
  type ViewService,
} from "../view/view.ts";
import type { PathNode } from "../path/path-node.ts";
import { TargetState } from "../state/target-state.ts";

type PromiseResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

function getFirstElementFromClone(
  clone: Node | Node[] | NodeList | DocumentFragment | null | undefined,
): HTMLElement | null {
  if (!clone) return null;

  if (isInstanceOf(clone, HTMLElement)) {
    return clone;
  }

  if (isInstanceOf(clone, DocumentFragment)) {
    const firstElement = clone.firstElementChild;

    return isInstanceOf(firstElement, HTMLElement) ? firstElement : null;
  }

  if (isInstanceOf(clone, NodeList) || isArray(clone)) {
    for (let i = 0, l = clone.length; i < l; i++) {
      const node = clone[i];

      if (isInstanceOf(node, HTMLElement)) {
        return node;
      }
    }

    return null;
  }

  return isInstanceOf(clone, Element) ? (clone as HTMLElement) : null;
}

function getRootNodesFromClone(
  clone: Node | Node[] | NodeList | DocumentFragment | null | undefined,
): Node[] {
  if (!clone) {
    return [];
  }

  if (isInstanceOf(clone, DocumentFragment)) {
    return arrayFrom(clone.childNodes);
  }

  return isInstanceOf(clone, NodeList) || isArray(clone)
    ? arrayFrom(clone)
    : [clone];
}

type NgViewAnimData = {
  $animEnter: Promise<void>;
  $animLeave: Promise<void>;
  $$animLeave: PromiseResolvers<void>;
};

type NgViewData = {
  $cfg?: _ViewConfig;
  $ngView: ActiveNgView;
};

type ActiveNgViewRootData = {
  $cfg: { viewDecl: { $context: ViewContext } };
  $ngView: Partial<ActiveNgView>;
};

type ViewControllerInstance = Record<string, unknown> & {
  $onInit?: () => void;
  ngOnParamsChanged?: (
    params: Record<string, unknown>,
    trans: ng.Transition,
  ) => void;
  ngCanExit?: (trans: ng.Transition) => unknown;
};

type NgCanExitTransition = ng.Transition & {
  _ngCanExitIds?: Record<number, boolean>;
};

function withResolvers<T>(): PromiseResolvers<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;

  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((resolveParam, rejectParam) => {
    resolve = resolveParam;
    reject = rejectParam;
  });

  return { promise, resolve, reject: reject! };
}

const controllerRegisteredScopes = new WeakMap<
  ViewControllerInstance,
  WeakSet<object>
>();

const controllerLastParamsChangedTransition = new WeakMap<
  ViewControllerInstance,
  ng.Transition
>();

type ParamSchemaEntry = {
  id: string | number;
  type: { equals: (a: unknown, b: unknown) => boolean };
};

function appendParamSchema(
  nodes: PathNode[],
  schema: ParamSchemaEntry[],
): void {
  for (let i = 0; i < nodes.length; i++) {
    const nodeSchema = nodes[i].paramSchema;

    for (let j = 0; j < nodeSchema.length; j++) {
      schema.push(nodeSchema[j]);
    }
  }
}

function controllerKeyData(
  element: Element,
  key: string,
): ViewControllerInstance | undefined {
  return (
    (getCacheData(element, key) as ViewControllerInstance | undefined) ||
    (getInheritedData(element, key) as ViewControllerInstance | undefined)
  );
}

function getComponentController(
  element: HTMLElement,
  componentName: string,
  tagRegexp: RegExp,
): ViewControllerInstance | undefined {
  const candidates = element.querySelectorAll("*");

  let directiveEl: Element | undefined;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    if (candidate.tagName && tagRegexp.exec(candidate.tagName)) {
      directiveEl = candidate;
      break;
    }
  }

  if (!directiveEl) return undefined;

  const camelNameFromTag = directiveEl.tagName
    .toLowerCase()
    .replace(/-([a-z])/g, (_all, letter: string) => letter.toUpperCase());

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
    controllerKeyData(directiveEl, `$${componentName}Controller`) ||
    controllerKeyData(directiveEl, `$${camelNameFromTag}Controller`) ||
    controllerKeyData(directiveEl, "$ngControllerController") ||
    scopeWithCtrl?.$ctrl
  );
}

/**
 * `ng-view`: A viewport directive which is filled in by a view from the active state.
 *
 * ### Attributes
 *
 * - `name`: (Optional) A view name.
 *   Named views are targeted from [[StateDeclaration.views]] entries.
 *
 * - `autoscroll`: an expression. When it evaluates to true, the `ng-view` will be scrolled into view when it is activated.
 *   Uses [[$anchorScroll]] to do the scrolling.
 *
 * - `onload`: Expression to evaluate whenever the view updates.
 *
 * #### Example:
 * A state can render into the unnamed `$default` view, or target named views.
 *
 * ```html
 * <div ng-view></div>
 * <div ng-view="messagelist"></div>
 * ```
 *
 * ```js
 * $stateProvider.state("home", {
 *   template: "<h1>HELLO!</h1>"
 * })
 *
 * $stateProvider.state("messages", {
 *   views: {
 *     messagelist: "messageList"
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
 * The resolved data from the state's `resolve` block is placed on the scope as `$resolve`.
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

ViewDirective.$inject = [_view, _state, _anchorScroll, _interpolate, _parse];

/**
 * Renders and updates the currently active view configuration.
 */
export function ViewDirective(
  $view: ViewService,
  $state: ng.StateService,
  $anchorScroll: ng.AnchorScrollService,
  $interpolate: ng.InterpolateService,
  $parse: ng.ParseService,
): ng.Directive {
  void $state;

  const rootData: ActiveNgViewRootData = {
    $cfg: { viewDecl: { $context: $view._rootViewContext() as ViewContext } },
    $ngView: {},
  };

  const directive: ng.Directive & { count: number } = {
    count: 0,
    terminal: true,
    priority: 400,
    transclude: "element",
    compile(
      _tElement: Element,
      _tAttrs: ng.Attributes,
      $transclude?: ng.TranscludeFn,
    ) {
      const transclude = $transclude as ng.TranscludeFn;

      return function (
        scope: ng.Scope,
        $element: HTMLElement,
        attrs: ng.Attributes,
      ) {
        const onloadExp = attrs.onload || "",
          autoScrollExp = attrs.autoscroll,
          inherited =
            (getInheritedData($element, "$ngView") as
              | ActiveNgViewRootData
              | undefined) || rootData,
          name =
            (
              $interpolate(
                attrs.ngView || attrs.name || "",
              ) as ng.InterpolationFunction
            )(scope) || "$default";

        const onloadFn = onloadExp ? $parse(onloadExp) : undefined;

        const autoScrollFn = autoScrollExp ? $parse(autoScrollExp) : undefined;

        let currentEl: HTMLElement | null = null;

        let currentScope: ng.Scope | null = null;

        let viewConfig: _ViewConfig | undefined;

        let configUpdateVersion = 0;

        const parentFqn =
          inherited.$cfg.viewDecl.$context.name || inherited.$ngView.fqn;

        const activeNgView: ActiveNgView = {
          id: directive.count++, // Global sequential ID for ng-view tags added to DOM
          element: $element,
          name, // ng-view name, retained internally for nested view matching
          fqn: parentFqn ? `${parentFqn}.${name}` : name, // fully qualified name, describes location in DOM
          config: null,
          configUpdated: configUpdatedCallback,
          get creationContext(): ViewContext {
            // Inherit the parent view context for nested ng-view elements.
            const fromParentTag = inherited.$ngView.creationContext as
              | ViewContext
              | undefined;

            return (
              inherited.$cfg.viewDecl.$context ||
              fromParentTag ||
              rootData.$cfg.viewDecl.$context
            );
          },
        };

        function configUpdatedCallback(config: _ViewConfig | undefined): void {
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

              activeNgView.config = null;
              updateView(undefined);
            });

            viewConfig = undefined;
            activeNgView.config = null;

            return;
          }

          if (viewConfig === config) return;

          activeNgView.config = config || null;
          viewConfig = config;
          updateView(config);
        }

        setCacheData($element, "$ngView", { $ngView: activeNgView });
        updateView();
        const unregister = $view._registerNgView(activeNgView);

        scope.$on("$destroy", function () {
          unregister();
        });

        function cleanupLastView(): void {
          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentEl) {
            const _viewData = getCacheData(currentEl, "$ngViewAnim") as
              | NgViewAnimData
              | undefined;

            removeElement(currentEl);
            _viewData?.$$animLeave.resolve();
            currentEl = null;
          }
        }

        function updateView(config?: _ViewConfig): void {
          const newScope = scope.$new();

          const animEnter = withResolvers<void>();

          const animLeave = withResolvers<void>();

          const $ngViewData: NgViewData = {
            $cfg: config,
            $ngView: activeNgView,
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
          let enteredElement: HTMLElement | null = null;

          transclude(newScope, (clone) => {
            const elementClone = getFirstElementFromClone(clone);

            const cloneNodes = getRootNodesFromClone(clone);

            if (!elementClone) {
              return;
            }

            for (let i = 0; i < cloneNodes.length; i++) {
              const node = cloneNodes[i];

              setCacheData(node, "$ngViewAnim", $ngViewAnim);
              setCacheData(node, "$ngView", $ngViewData);
            }
            enteredElement = elementClone;
            $element.after(elementClone);
            animEnter.resolve(undefined);
            cleanupLastView();

            if (
              (isDefined(autoScrollExp) && !autoScrollExp) ||
              (autoScrollExp && autoScrollFn?.(scope))
            ) {
              $anchorScroll(elementClone);
            }
          });

          currentEl = enteredElement;

          currentScope = newScope;
          currentScope.$emit("$viewContentAnimationEnded");
          /**
           * Fired once the view is **loaded**, *after* the DOM is rendered.
           *
           * @param event Event object.
           */
          currentScope!.$emit("$viewContentLoaded", config || viewConfig);
          onloadFn?.(currentScope);
        }
      };
    },
  };

  return directive;
}

ViewDirectiveFill.$inject = [_compile, _controller, _transitions, _injector];

/**
 * Instantiates the active view template and wires its controller lifecycle.
 */
export function ViewDirectiveFill(
  $compile: ng.CompileService,
  $controller: ng.ControllerService,
  $transitions: ng.TransitionService,
  $injector: ng.InjectorService,
): ng.Directive {
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
        }) as Pick<_ViewConfig, "viewDecl" | "controller"> &
          Partial<
            Pick<_ViewConfig, "path" | "component" | "factory" | "template">
          >;

        const resolveCtx = cfg.path && new ResolveContext(cfg.path, $injector);

        $element.innerHTML = data.$cfg
          ? getViewTemplate(
              data.$cfg,
              $element,
              resolveCtx as ResolveContext,
            ) || initial
          : initial;
        const link = $compile(
          ($element as HTMLIFrameElement).contentDocument ||
            $element.childNodes,
        );

        const { controller } = cfg;

        const locals = resolveCtx ? getLocals(resolveCtx) : undefined;

        const targetScope = scope.$target as Record<string, unknown>;

        targetScope.$resolve = locals;

        if (controller) {
          const controllerInstance = $controller(
            controller,
            assign({}, locals, { $scope: scope, $element }),
          ) as ViewControllerInstance;

          // TODO: Use $view service as a central point for registering component-level hooks
          // Then, when a component is created, tell the $view service, so it can invoke hooks
          // $view.componentLoaded(controllerInstance, { $scope: scope, $element: $element });
          // scope.$on('$destroy', () => $view.componentUnloaded(controllerInstance, { $scope: scope, $element: $element }));
          setCacheData($element, "$ngControllerController", controllerInstance);
          const { children } = $element;

          for (let i = 0; i < children.length; i++) {
            setCacheData(
              children[i],
              "$ngControllerController",
              controllerInstance,
            );
          }
          registerControllerCallbacks(
            $transitions,
            controllerInstance,
            scope,
            cfg as Pick<_ViewConfig, "viewDecl" | "path">,
          );
        }
        link(scope);

        const componentName = (cfg as _ViewConfig & { component?: string })
          .component;

        const callbackConfig = cfg as Pick<_ViewConfig, "viewDecl" | "path"> &
          Partial<Pick<_ViewConfig, "factory">>;

        if (isString(componentName)) {
          const kebobName = componentName
            .replace(/([A-Z])/g, "-$1")
            .replace(/^-/, "")
            .toLowerCase();

          const tagRegexp = new RegExp(`^${kebobName}$`, "i");

          const registerComponentCallbacks = (attempt = 0) => {
            if (scope.$handler._destroyed) {
              return;
            }

            const componentCtrl = getComponentController(
              $element,
              componentName,
              tagRegexp,
            );

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
let _ngCanExitId = 0;

/**
 * @ignore TODO: move these callbacks to $view and/or `/hooks/components.ts` or something
 */
function registerControllerCallbacks(
  $transitions: ng.TransitionService,
  controllerInstance: ViewControllerInstance,
  $scope: ng.Scope,
  cfg: Pick<_ViewConfig, "viewDecl" | "path"> &
    Partial<Pick<_ViewConfig, "factory">>,
): void {
  let registeredScopes = controllerRegisteredScopes.get(controllerInstance);

  if (!registeredScopes) {
    registeredScopes = new WeakSet<object>();
    controllerRegisteredScopes.set(controllerInstance, registeredScopes);
  }

  if (registeredScopes.has($scope as object)) {
    return;
  }

  registeredScopes.add($scope as object);

  // Call $onInit() ASAP
  const onInit = controllerInstance.$onInit;

  if (isFunction(onInit) && !cfg.viewDecl.component) {
    onInit();
  }
  const viewState = cfg.path[cfg.path.length - 1].state.self;

  const hookOptions = { bind: controllerInstance };

  // Add component-level hook for ngOnParamsChanged
  if (isFunction(controllerInstance.ngOnParamsChanged)) {
    const onParamsChanged = controllerInstance.ngOnParamsChanged as (
      params: Record<string, unknown>,
      trans: ng.Transition,
    ) => void;

    const resolveContext = new ResolveContext(cfg.path, cfg.factory?._injector);

    const viewCreationTrans = resolveContext.getResolvable("$transition$")
      .data as ng.Transition;

    // Fire callback on any successful transition
    const paramsUpdated = ($transition$: ng.Transition | undefined) => {
      if (!$transition$) return;

      if (
        controllerLastParamsChangedTransition.get(controllerInstance) ===
        $transition$
      ) {
        return;
      }

      controllerLastParamsChangedTransition.set(
        controllerInstance,
        $transition$,
      );

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

      const toNodes = ($transition$._treeChanges.to || []) as PathNode[];

      const fromNodes = ($transition$._treeChanges.from || []) as PathNode[];

      const toSchema: ParamSchemaEntry[] = [];

      appendParamSchema(toNodes, toSchema);

      const fromSchema: ParamSchemaEntry[] = [];

      appendParamSchema(fromNodes, fromSchema);

      // Find the to params that have different values than the from params
      const changedToParams: ParamSchemaEntry[] = [];

      for (let i = 0; i < toSchema.length; i++) {
        const param = toSchema[i];

        const idx = fromSchema.indexOf(param);

        if (
          idx === -1 ||
          !fromSchema[idx].type.equals(toParams[param.id], fromParams[param.id])
        ) {
          changedToParams.push(param);
        }
      }

      // Only trigger callback if a to param has changed or is new
      if (changedToParams.length) {
        // Filter the params to only changed/new to params.  `$transition$.params()` may be used to get all params.
        const newValues: Record<string | number, unknown> = {};

        for (let i = 0; i < changedToParams.length; i++) {
          const param = changedToParams[i];

          const key = param.id;

          if (key in toParams) newValues[key] = toParams[key];
        }
        onParamsChanged.call(controllerInstance, newValues, $transition$);
      }
    };

    const hookRegistryKey = [
      viewState?.name || "",
      cfg.viewDecl.$ngViewName || "$default",
      cfg.viewDecl.$ngViewContextAnchor || "^",
    ].join("::");

    const rootScope = $scope.$root as ng.Scope &
      Record<string, Map<string, () => void> | undefined>;

    const registryProp = "__ngRouterParamsChangedHooks__";

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

  // Add component-level hook for ngCanExit
  if (isFunction(controllerInstance.ngCanExit)) {
    const ngCanExit = controllerInstance.ngCanExit as (
      trans: ng.Transition,
    ) => boolean | void | TargetState;

    const id = _ngCanExitId++;

    /**
     * Returns true if any transition in the redirect chain already answered truthy.
     */
    const prevTruthyAnswer = (trans: ng.Transition | null): boolean => {
      if (!trans) return false;

      const cache = (trans as NgCanExitTransition)._ngCanExitIds;

      return (
        cache?.[id] === true ||
        prevTruthyAnswer(trans._options.redirectedFrom || null)
      );
    };

    // If a user answered yes, but the transition was later redirected, don't also ask for the new redirect transition
    const wrappedHook = (trans: ng.Transition) => {
      let promise: Promise<boolean | void | TargetState> | undefined;

      const cacheTrans = trans as NgCanExitTransition;

      const ids = (cacheTrans._ngCanExitIds = cacheTrans._ngCanExitIds || {});

      if (!prevTruthyAnswer(trans)) {
        promise = Promise.resolve(ngCanExit.call(controllerInstance, trans));
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
