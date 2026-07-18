import { dealoc, removeElement, setCacheData } from "../../shared/dom.ts";
import { removeFrom } from "../../shared/common.ts";
import { assign, assertDefined, isString } from "../../shared/utils.ts";
import type { CompileControllerLifecycleRecord } from "../../core/compile/compile.ts";
import type { CompiledFragmentRecord } from "../../core/compile/incremental-fragment.ts";
import {
  registerViewControllerCallbacks,
  type ViewControllerInstance,
} from "../directives/view-controller-hooks.ts";
import {
  createResolveInvocationLocals,
  ResolveContext,
} from "../resolve/resolve-context.ts";
import { kebobString } from "../../shared/strings.ts";
import type { RawParams } from "../params/interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type {
  StateRetentionEvictionContext,
  StateRetentionEvictionPolicy,
  ViewDeclaration,
} from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TemplateFactoryService } from "../router/template-factory.ts";
import type { RouterRuntimeState } from "../router.ts";
import { createRetentionEvictionPolicyInvocationLocals } from "../invocation-context.ts";
import { createRouterViewControllerInvocationLocals } from "./invocation-context.ts";

interface CompileLifecycleSource {
  onControllerCreated(
    listener: (record: CompileControllerLifecycleRecord) => void,
  ): () => void;
}

/** Dependencies used by router composition to initialize one view service. */
export interface ViewServiceDependencies {
  compileLifecycle: CompileLifecycleSource;
  templateFactory: TemplateFactoryService;
  routerState: RouterRuntimeState;
  transitions: ng.TransitionsService;
  compile: ng.CompileService;
  controller: ng.ControllerService;
  rootScope: ng.Scope;
  injector: ng.InjectorService;
}
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
  _factory: TemplateFactoryService;
  _component: string | undefined;
  _template: string | undefined;
  _loaded: boolean;
  _controller: ViewDeclaration["controller"] | undefined;
  _fillPlan: ViewFillPlan;
  _targetKey: string;
  _depth: number;
  _retention?: ViewRetentionAssignment;
}

/** @internal */
export interface ViewRetentionAssignment {
  _mode: "destroy" | "keep-alive";
  _key: string;
  _max?: number;
  _pause?: "none" | "background" | "schedulers";
  _evict?: "lru" | "oldest" | StateRetentionEvictionPolicy;
  _state: string;
}

/** @internal */
export interface RetainedViewEntry {
  _key: string;
  _config: ViewConfig;
  _element: HTMLElement;
  _nodes: Node[];
  _fragment?: CompiledFragmentRecord;
  _scope: ng.Scope;
  _animation: NgViewAnimData;
  _createdAt: number;
  _lastUsed: number;
}

/** @internal */
export type ViewRetentionDiagnosticKind = "retained" | "restored" | "destroyed";

/** @internal */
export type ViewRetentionDestroyReason =
  | "evicted"
  | "mode-destroy"
  | "replaced"
  | "root-destroy";

/** @internal */
export interface ViewRetentionDiagnostic {
  _kind: ViewRetentionDiagnosticKind;
  _key: string;
  _state: string | undefined;
  _targetKey: string | undefined;
  _cacheSize: number;
  _max?: number;
  _reason?: ViewRetentionDestroyReason;
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
  factory: TemplateFactoryService,
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
    _retention: undefined,
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
  config._loaded = true;
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
  _templateFactory: TemplateFactoryService;
  /** @internal */
  _compile: ng.CompileService;
  /** @internal */
  _controller: ng.ControllerService;
  /** @internal */
  _injector: ng.InjectorService;
  /** @internal */
  _rootContext: StateObject | null | undefined;
  /** @internal */
  _transitions: ng.TransitionsService;
  /** @internal */
  _componentContexts: Map<string, ComponentViewContext>;
  /** @internal */
  _nextComponentContextId: number;
  /** @internal */
  _filledHosts: WeakSet<HTMLElement>;
  /** @internal */
  _deregisterCompileLifecycle: (() => void) | undefined;
  /** @internal */
  _deregisterRootDestroy: (() => void) | undefined;
  /** @internal */
  _retainedViews: Map<string, RetainedViewEntry>;
  /** @internal */
  _retainedViewClock: number;
  /** @internal */
  _retentionDiagnostics: ViewRetentionDiagnostic[];

  /**
   * Creates a fully initialized view registry for one router runtime.
   */
  constructor(dependencies: ViewServiceDependencies) {
    this._ngViews = [];
    this._viewConfigs = [];
    this._viewConfigsByTarget = new Map();
    this._templateFactory = dependencies.templateFactory;
    this._compile = dependencies.compile;
    this._controller = dependencies.controller;
    this._injector = dependencies.injector;
    this._rootContext = dependencies.routerState._currentState ?? null;
    this._transitions = dependencies.transitions;
    this._componentContexts = new Map();
    this._nextComponentContextId = 0;
    this._filledHosts = new WeakSet();
    this._deregisterCompileLifecycle = undefined;
    this._deregisterRootDestroy = undefined;
    this._retainedViews = new Map();
    this._retainedViewClock = 0;
    this._retentionDiagnostics = [];
    this._deregisterCompileLifecycle =
      dependencies.compileLifecycle.onControllerCreated((record) => {
        this._componentControllerCreated(record);
      });
    this._deregisterRootDestroy = dependencies.rootScope.$on("$destroy", () => {
      this._destroyRetainedViews();
      this._deregisterCompileLifecycle?.();
      this._deregisterCompileLifecycle = undefined;
      this._deregisterRootDestroy = undefined;
    });
  }

  /** @internal */
  destroy(): void {
    this._destroyRetainedViews();
    this._deregisterCompileLifecycle?.();
    this._deregisterCompileLifecycle = undefined;
    this._deregisterRootDestroy?.();
    this._deregisterRootDestroy = undefined;
  }

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

    const locals = resolveContext
      ? createResolveInvocationLocals(resolveContext)
      : undefined;

    const targetScope = scope.$target as Record<string, unknown>;

    targetScope.$resolve = locals;

    const controller = plan?._hasController ? config?._controller : undefined;

    if (controller) {
      const controllerConfig = assertDefined(config);
      const controllerInstance = assertDefined(this._controller)(
        controller,
        createRouterViewControllerInvocationLocals(locals, scope, host),
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

    registerViewControllerCallbacks(
      this._transitions,
      record.controller as Record<string, unknown>,
      context.scope,
      context.config,
    );
  }

  /** @internal */
  _restoreRetainedView(config: ViewConfig): RetainedViewEntry | undefined {
    const retention = config._retention;

    if (retention?._mode !== "keep-alive") return undefined;

    const retained = this._retainedViews.get(retention._key);

    if (!retained) return undefined;

    this._retainedViews.delete(retention._key);
    retained._lastUsed = ++this._retainedViewClock;
    retained._config = config;
    this._recordRetentionDiagnostic("restored", retained, {
      _cacheSize: this._retainedViews.size,
    });

    return retained;
  }

  /** @internal */
  _retainView(
    entry: Omit<RetainedViewEntry, "_createdAt" | "_lastUsed">,
  ): void {
    const retention = entry._config._retention;

    if (retention?._mode !== "keep-alive") {
      this._destroyRetainedView(entry, "mode-destroy");

      return;
    }

    const existing = this._retainedViews.get(retention._key);

    if (existing) {
      this._destroyRetainedView(existing, "replaced");
    }

    const clock = ++this._retainedViewClock;

    this._retainedViews.set(retention._key, {
      ...entry,
      _createdAt: clock,
      _lastUsed: clock,
    });
    this._recordRetentionDiagnostic("retained", entry, {
      _cacheSize: this._retainedViews.size,
      _max: retention._max,
    });

    this._evictRetainedViews(retention._max, retention._evict);
  }

  /** @internal */
  _destroyRetainedView(
    entry: Pick<RetainedViewEntry, "_element" | "_scope"> &
      Partial<Pick<RetainedViewEntry, "_key" | "_config" | "_fragment">>,
    reason?: ViewRetentionDestroyReason,
  ): void {
    if (!entry._scope.$handler._destroyed) {
      entry._scope.$destroy();
    }

    if (entry._fragment && !entry._fragment.disposed) {
      entry._fragment.dispose();
    } else if (entry._element.parentNode) {
      removeElement(entry._element);
    } else {
      dealoc(entry._element);
    }

    const key = entry._key;
    const config = entry._config;

    if (key && config) {
      this._recordRetentionDiagnostic(
        "destroyed",
        { _key: key, _config: config },
        {
          _cacheSize: this._retainedViews.size,
          _reason: reason,
        },
      );
    }
  }

  /** @internal */
  _destroyRetainedViews(): void {
    this._retainedViews.forEach((entry) => {
      this._destroyRetainedView(entry, "root-destroy");
    });
    this._retainedViews.clear();
  }

  /** @internal */
  _evictRetainedViews(
    max: number | undefined,
    evict: ViewRetentionAssignment["_evict"],
  ): void {
    if (max === undefined || max < 0) return;

    while (this._retainedViews.size > max) {
      const selected =
        this._selectPolicyRetainedView(max, evict) ??
        this._selectOrderedRetainedView(evict === "oldest" ? "oldest" : "lru");

      if (!selected) return;

      this._retainedViews.delete(selected._key);
      this._destroyRetainedView(selected, "evicted");
    }
  }

  /** @internal */
  _recordRetentionDiagnostic(
    kind: ViewRetentionDiagnosticKind,
    entry: Pick<RetainedViewEntry, "_key" | "_config">,
    options: {
      _cacheSize: number;
      _max?: number;
      _reason?: ViewRetentionDestroyReason;
    },
  ): void {
    this._retentionDiagnostics.push({
      _kind: kind,
      _key: entry._key,
      _state: entry._config._retention?._state,
      _targetKey: entry._config._targetKey,
      _cacheSize: options._cacheSize,
      _max: options._max,
      _reason: options._reason,
    });
  }

  /** @internal */
  _selectPolicyRetainedView(
    max: number,
    evict: ViewRetentionAssignment["_evict"],
  ): RetainedViewEntry | undefined {
    if (!evict || evict === "lru" || evict === "oldest") return undefined;

    for (const entry of this._retainedViews.values()) {
      const state =
        entry._config._path[entry._config._path.length - 1].state.self;

      const context: StateRetentionEvictionContext = {
        state,
        key: entry._key,
        size: this._retainedViews.size,
        max,
      };

      const result = this._injector.invoke(
        evict,
        undefined,
        createRetentionEvictionPolicyInvocationLocals(context),
        "retention eviction policy",
      );

      if (!isString(result)) continue;

      const selected = this._retainedViews.get(result);

      if (selected) return selected;
    }

    return undefined;
  }

  /** @internal */
  _selectOrderedRetainedView(
    evict: "lru" | "oldest",
  ): RetainedViewEntry | undefined {
    let selected: RetainedViewEntry | undefined;

    this._retainedViews.forEach((entry) => {
      if (!selected) {
        selected = entry;

        return;
      }

      const left = evict === "oldest" ? entry._createdAt : entry._lastUsed;
      const right =
        evict === "oldest" ? selected._createdAt : selected._lastUsed;

      if (left < right) {
        selected = entry;
      }
    });

    return selected;
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
    const existingTargetConfigs =
      this._viewConfigsByTarget.get(viewConfig._targetKey) ?? [];

    existingTargetConfigs.slice().forEach((existing) => {
      if (existing !== viewConfig && existing._depth === viewConfig._depth) {
        this._deactivateViewConfig(existing);
      }
    });

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
