import {
  _compile,
  _compileLifecycle,
  _controller,
  _injector,
  _router,
  _templateFactory,
  _transitions,
} from "../../injection-tokens.ts";
import { setCacheData } from "../../shared/dom.ts";
import { removeFrom } from "../../shared/common.ts";
import { assign, assertDefined, isString } from "../../shared/utils.ts";
import type {
  CompileControllerLifecycleRecord,
  CompileLifecycleProvider,
} from "../../core/compile/compile.ts";
import {
  registerViewControllerCallbacks,
  type ViewControllerInstance,
} from "../directives/view-controller-hooks.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { kebobString } from "../../shared/strings.ts";
import type { RawParams } from "../params/interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TemplateFactoryProvider } from "../router/template-factory.ts";
import type { RouterProvider } from "../router.ts";
import { getLocals } from "../state/state-registry.ts";
export { normalizeNgViewTarget } from "../state/view-target.ts";

export interface ViewContext {
  name: string;
  parent?: ViewContext | null;
}

/** @internal */
export interface ActiveNgView {
  /** An auto-incremented id */
  _id: number;
  /** The DOM node for the ng-view anchor */
  _element: HTMLElement;
  /** The ng-view short name */
  _name: string;
  /** The ng-view's fully qualified name */
  _fqn: string;
  /** The internal view record currently loaded into the ng-view. */
  _config: ViewConfig | null;
  /** The state context in which the ng-view tag was created. */
  _creationContext: ViewContext;
  /** Applies an internal view record or clears the ng-view when config is undefined. */
  _configUpdated: (config: ViewConfig | undefined) => void;
}

/** @internal */
export interface ViewConfig {
  _id: number;
  _path: PathNode[];
  _viewDecl: ViewDeclaration;
  _factory: TemplateFactoryProvider;
  _component: string | undefined;
  _template: string | undefined;
  _loaded: boolean;
  _controller: ViewDeclaration["controller"] | undefined;
  _fillPlan: ViewFillPlan;
  _targetKey: string;
  _depth: number;
}

/** @internal */
export interface ViewFillPlan {
  _kind: "component" | "template";
  _componentName: string | undefined;
  _componentElementName: string | undefined;
  _hasController: boolean;
  _needsResolveContext: boolean;
}

/** @internal */
export interface NgViewAnimData {
  $animEnter: Promise<void>;
  $animLeave: Promise<void>;
  $$animLeave: { resolve: (value: undefined) => void };
}

/** @internal */
export interface NgViewData {
  $cfg?: ViewConfig;
  $ngView: ActiveNgView;
  $filled?: boolean;
  $initial?: string;
}

interface ViewFillOptions {
  host: HTMLElement;
  rootNodes: Node[];
  scope: ng.Scope;
  config?: ViewConfig;
  initial: string;
  activeNgView: ActiveNgView;
  animation: NgViewAnimData;
}

const FQN_MULTIPLIER = 10_000;

const COMPONENT_CONTEXT_ATTR = "data-ng-view-component-context";

let nextViewId = 0;

interface ComponentViewContext {
  componentName: string;
  config: ViewConfig;
  scope: ng.Scope;
}

function createViewFillPlan(
  viewDecl: ViewDeclaration,
  componentName: string | undefined,
): ViewFillPlan {
  const resolvedComponentName = componentName ?? viewDecl.component;
  const component = isString(resolvedComponentName)
    ? resolvedComponentName
    : undefined;

  return {
    _kind: component ? "component" : "template",
    _componentName: component,
    _componentElementName: component ? kebobString(component) : undefined,
    _hasController: !!viewDecl.controller,
    _needsResolveContext: true,
  };
}

function viewDeclTargetKey(viewDecl: ViewDeclaration): string {
  const viewName = viewDecl._ngViewName ?? "$default";
  const viewContext = viewDecl._ngViewContextAnchor ?? "";

  return viewContext ? `${viewContext}.${viewName}` : viewName;
}

function viewDeclDepth(viewDecl: ViewDeclaration): number {
  let context = assertDefined(viewDecl._context);

  let count = 0;

  while (++count && context.parent) {
    context = context.parent;
  }

  return count;
}

/** @internal */
export function createViewConfig(
  path: PathNode[],
  viewDecl: ViewDeclaration,
  factory: TemplateFactoryProvider,
): ViewConfig {
  return {
    _id: nextViewId++,
    _path: path,
    _viewDecl: viewDecl,
    _factory: factory,
    _component: undefined,
    _template: undefined,
    _loaded: false,
    _controller: undefined,
    _fillPlan: createViewFillPlan(viewDecl, undefined),
    _targetKey: viewDeclTargetKey(viewDecl),
    _depth: viewDeclDepth(viewDecl),
  };
}

/** @internal */
export function getViewTemplate(
  config: ViewConfig,
  ngView: Element,
  context: ResolveContext,
): string | undefined {
  const plan = config._fillPlan;

  return plan._kind === "component" && plan._componentName
    ? config._factory._makeComponentTemplate(
        ngView,
        context,
        plan._componentName,
        config._viewDecl.bindings,
      )
    : config._template;
}

/** @internal */
export async function loadViewConfig(config: ViewConfig): Promise<ViewConfig> {
  const params: RawParams = {};

  config._path.forEach((node) => {
    assign(params, node.paramValues);
  });

  const viewResult = await config._factory._fromConfig(
    config._viewDecl,
    params,
  );

  config._controller = config._viewDecl.controller;
  assign(config, viewResult);
  config._fillPlan = createViewFillPlan(config._viewDecl, config._component);

  return config;
}

function contextDepth(context: ViewContext): number {
  let cursor: ViewContext | undefined = context;

  let depth = 1;

  while (cursor.parent) {
    depth += 1;
    cursor = cursor.parent;
  }

  return depth;
}

function ngViewDepth(
  cache: Map<ActiveNgView, number>,
  ngView: ActiveNgView,
): number {
  const cached = cache.get(ngView);

  if (cached !== undefined) return cached;

  const computed =
    ngView._fqn.split(".").length * FQN_MULTIPLIER +
    contextDepth(ngView._creationContext);

  cache.set(ngView, computed);

  return computed;
}

/**
 * Tracks active `ng-view` instances and matches them with registered
 * view configs produced during state transitions.
 */
export class ViewService {
  /** @internal */
  _ngViews: ActiveNgView[];
  /** @internal */
  _viewConfigs: ViewConfig[];
  /** @internal */
  _viewConfigsByTarget: Map<string, ViewConfig[]>;
  /** @internal */
  _templateFactory: TemplateFactoryProvider | undefined;
  /** @internal */
  _compile: ng.CompileService | undefined;
  /** @internal */
  _controller: ng.ControllerService | undefined;
  /** @internal */
  _injector: ng.InjectorService | undefined;
  /** @internal */
  _rootContext: StateObject | null | undefined;
  /** @internal */
  _transitions: ng.TransitionService | undefined;
  /** @internal */
  _componentContexts: Map<string, ComponentViewContext>;
  /** @internal */
  _nextComponentContextId: number;
  /** @internal */
  _filledHosts: WeakSet<HTMLElement>;
  /** @internal */
  _deregisterCompileLifecycle: (() => void) | undefined;

  /**
   * Creates an empty view registry ready to track active `ng-view` instances.
   */
  constructor() {
    this._ngViews = [];
    this._viewConfigs = [];
    this._viewConfigsByTarget = new Map();
    this._templateFactory = undefined;
    this._compile = undefined;
    this._controller = undefined;
    this._injector = undefined;
    this._rootContext = undefined;
    this._transitions = undefined;
    this._componentContexts = new Map();
    this._nextComponentContextId = 0;
    this._filledHosts = new WeakSet();
    this._deregisterCompileLifecycle = undefined;
  }

  /**
   * Returns the singleton view service instance.
   */
  $get = [
    _templateFactory,
    _router,
    _compileLifecycle,
    _transitions,
    _compile,
    _controller,
    _injector,
    (
      $templateFactory: TemplateFactoryProvider,
      $routerState: RouterProvider,
      $compileLifecycle: CompileLifecycleProvider,
      $transitions: ng.TransitionService,
      $compile: ng.CompileService,
      $controller: ng.ControllerService,
      $injector: ng.InjectorService,
    ): ViewService => {
      this._templateFactory = $templateFactory;
      this._compile = $compile;
      this._controller = $controller;
      this._injector = $injector;
      this._rootViewContext($routerState._currentState ?? null);
      this._transitions = $transitions;
      this._deregisterCompileLifecycle?.();
      this._deregisterCompileLifecycle = $compileLifecycle.onControllerCreated(
        (record) => {
          this._componentControllerCreated(record);
        },
      );

      return this;
    },
  ];

  /** @internal */
  _fillView(options: ViewFillOptions): void {
    const { host, rootNodes, scope, config, initial, activeNgView, animation } =
      options;

    const $compile = assertDefined(this._compile);

    const viewData: NgViewData = {
      $cfg: config,
      $ngView: activeNgView,
      $filled: true,
    };

    for (let i = 0; i < rootNodes.length; i++) {
      const node = rootNodes[i];

      setCacheData(node, "$ngViewAnim", animation);
      setCacheData(node, "$ngView", viewData);
    }

    const plan = config?._fillPlan;

    const resolveContext =
      config && plan?._needsResolveContext
        ? new ResolveContext(config._path, assertDefined(this._injector))
        : undefined;

    if (host.childNodes.length || this._filledHosts.has(host)) {
      scope.$broadcast("$destroy");
    } else {
      this._filledHosts.add(host);
    }

    host.innerHTML = config
      ? (getViewTemplate(config, host, assertDefined(resolveContext)) ??
        initial)
      : initial;

    if (config && plan?._kind === "component") {
      this._markComponentView(host, config, scope);
    }

    const link = $compile(
      (host as HTMLIFrameElement).contentDocument ?? host.childNodes,
    );

    const locals = resolveContext ? getLocals(resolveContext) : undefined;

    const targetScope = scope.$target as Record<string, unknown>;

    targetScope.$resolve = locals;

    const controller = plan?._hasController ? config?._controller : undefined;

    if (controller) {
      const controllerConfig = assertDefined(config);
      const controllerInstance = assertDefined(this._controller)(
        controller,
        assign({}, locals, { $scope: scope, $element: host }),
      ) as ViewControllerInstance;

      setCacheData(host, "$ngControllerController", controllerInstance);
      const { children } = host;

      for (let i = 0; i < children.length; i++) {
        setCacheData(
          children[i],
          "$ngControllerController",
          controllerInstance,
        );
      }

      registerViewControllerCallbacks(
        assertDefined(this._transitions),
        controllerInstance,
        scope,
        controllerConfig,
      );
    }

    link(scope);

    if (scope.$handler._destroyed) {
      scope.$broadcast("$destroy");
    }
  }

  /** @internal */
  _markComponentView(
    host: HTMLElement,
    config: ViewConfig,
    scope: ng.Scope,
  ): void {
    const { _componentElementName, _componentName } = config._fillPlan;

    if (!_componentElementName || !_componentName) return;

    const componentHost = host.querySelector(_componentElementName);

    if (!componentHost) return;

    const id = `${String(config._id)}:${String(this._nextComponentContextId++)}`;

    componentHost.setAttribute(COMPONENT_CONTEXT_ATTR, id);
    this._componentContexts.set(id, {
      componentName: _componentName,
      config,
      scope,
    });

    scope.$on("$destroy", () => {
      this._componentContexts.delete(id);
    });
  }

  /** @internal */
  _componentControllerCreated(record: CompileControllerLifecycleRecord): void {
    const id = record.element.getAttribute(COMPONENT_CONTEXT_ATTR);

    if (!id) return;

    const context = this._componentContexts.get(id);

    if (record.directiveName !== context?.componentName) return;

    record.element.removeAttribute(COMPONENT_CONTEXT_ATTR);
    this._componentContexts.delete(id);

    if (!this._transitions) return;

    registerViewControllerCallbacks(
      this._transitions,
      record.controller as Record<string, unknown>,
      context.scope,
      context.config,
    );
  }

  /**
   * Gets or sets the root view context used for relative `ng-view` targeting.
   */
  /** @internal */
  _rootViewContext(
    context?: StateObject | null,
  ): StateObject | null | undefined {
    return (this._rootContext = context ?? this._rootContext);
  }

  /**
   * Removes a view config from the active registry.
   */
  /** @internal */
  _deactivateViewConfig(viewConfig: ViewConfig): void {
    removeFrom(this._viewConfigs, viewConfig);

    const targetConfigs = this._viewConfigsByTarget.get(viewConfig._targetKey);

    if (!targetConfigs) return;

    removeFrom(targetConfigs, viewConfig);

    if (!targetConfigs.length) {
      this._viewConfigsByTarget.delete(viewConfig._targetKey);
    }
  }

  /**
   * Adds a view config to the active registry.
   */
  /** @internal */
  _activateViewConfig(viewConfig: ViewConfig): void {
    this._viewConfigs.push(viewConfig);

    let targetConfigs = this._viewConfigsByTarget.get(viewConfig._targetKey);

    if (!targetConfigs) {
      targetConfigs = [];
      this._viewConfigsByTarget.set(viewConfig._targetKey, targetConfigs);
    }

    targetConfigs.push(viewConfig);
  }

  /**
   * Re-matches active `ng-view` instances against currently registered view configs
   * and notifies each view when its config assignment changes.
   */
  /** @internal */
  _sync(): void {
    const ngViewsByFqn: Record<string, ActiveNgView> = {};

    this._ngViews.forEach((ngView) => {
      ngViewsByFqn[ngView._fqn] = ngView;
    });

    const ngViewDepthCache = new Map<ActiveNgView, number>();

    this._ngViews.sort(
      (left, right) =>
        ngViewDepth(ngViewDepthCache, left) -
        ngViewDepth(ngViewDepthCache, right),
    );

    this._ngViews.forEach((ngView) => {
      let selectedViewConfig: ViewConfig | null = null;

      let bestDepth = Number.NEGATIVE_INFINITY;

      const targetConfigs = this._viewConfigsByTarget.get(ngView._fqn) ?? [];

      for (let i = 0; i < targetConfigs.length; i++) {
        const candidate = targetConfigs[i];

        if (!ViewService._matches(ngViewsByFqn, ngView, candidate)) continue;
        if (selectedViewConfig === null || candidate._depth > bestDepth) {
          selectedViewConfig = candidate;
          bestDepth = candidate._depth;
        }
      }

      if (!this._ngViews.includes(ngView)) return;

      if (ngView._config === selectedViewConfig) return;

      ngView._config = selectedViewConfig;
      ngView._configUpdated(selectedViewConfig ?? undefined);
    });
  }

  /**
   * Registers one active `ng-view` and returns a deregistration function.
   */
  /** @internal */
  _registerNgView(ngView: ActiveNgView): () => void {
    const ngViews = this._ngViews;

    ngViews.push(ngView);
    this._sync();

    return () => {
      removeFrom(ngViews, ngView);
      this._sync();
    };
  }

  /**
   * Builds a predicate that determines whether a view config matches
   * a specific active `ng-view`.
   */
  /** @internal */
  static _matches(
    ngViewsByFqn: Record<string, ActiveNgView>,
    ngView: ActiveNgView,
    viewConfig: ViewConfig,
  ): boolean {
    const ngViewContext = ngView._creationContext;

    const viewDecl = viewConfig._viewDecl;

    const normalizedTarget = viewConfig._targetKey;
    const vcContext = viewDecl._ngViewContextAnchor ?? "";

    if (normalizedTarget !== ngView._fqn) return false;

    const viewContext = assertDefined(viewDecl._context);

    if (
      viewContext.name !== ngViewContext.name &&
      vcContext !== ngViewContext.name
    ) {
      return false;
    }

    const childViewFqn = `${normalizedTarget}.${ngView._name}`;

    return !ngViewsByFqn[childViewFqn];
  }
}
