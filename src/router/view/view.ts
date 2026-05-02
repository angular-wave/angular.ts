import { _router, _templateFactory } from "../../injection-tokens.ts";
import { removeFrom } from "../../shared/common.ts";
import { assign, isString } from "../../shared/utils.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import type { RawParams } from "../params/interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TemplateFactoryProvider } from "../template-factory.ts";

/** @internal */
export interface ViewContext {
  name: string;
  parent?: ViewContext | null;
}

/** @internal */
export interface ActiveNgView {
  /** An auto-incremented id */
  id: number;
  /** The DOM node for the ng-view anchor */
  element: HTMLElement;
  /** The ng-view short name */
  name: string;
  /** The ng-view's fully qualified name */
  fqn: string;
  /** The internal view record currently loaded into the ng-view. */
  config: _ViewConfig | null;
  /** The state context in which the ng-view tag was created. */
  creationContext: ViewContext;
  /** Applies an internal view record or clears the ng-view when config is undefined. */
  configUpdated: (config: _ViewConfig | undefined) => void;
}

/** @internal */
export interface _ViewConfig {
  $id: number;
  path: PathNode[];
  viewDecl: ViewDeclaration;
  factory: TemplateFactoryProvider;
  component: string | undefined;
  template: string | undefined;
  loaded: boolean;
  controller: ViewDeclaration["controller"] | undefined;
}

const FQN_MULTIPLIER = 10_000;

let nextViewId = 0;

/** @internal */
export function createViewConfig(
  path: PathNode[],
  viewDecl: ViewDeclaration,
  factory: TemplateFactoryProvider,
): _ViewConfig {
  return {
    $id: nextViewId++,
    path,
    viewDecl,
    factory,
    component: undefined,
    template: undefined,
    loaded: false,
    controller: undefined,
  };
}

/** @internal */
export function getViewTemplate(
  config: _ViewConfig,
  ngView: Element,
  context: ResolveContext,
): string | undefined {
  return config.component
    ? config.factory.makeComponentTemplate(
        ngView,
        context,
        config.component,
        config.viewDecl.bindings,
      )
    : config.template;
}

/** @internal */
export async function loadViewConfig(
  config: _ViewConfig,
): Promise<_ViewConfig> {
  const params: RawParams = {};

  for (let i = 0; i < config.path.length; i++) {
    assign(params, config.path[i].paramValues);
  }

  const viewResult = await config.factory.fromConfig(config.viewDecl, params);

  config.controller = config.viewDecl.controller;
  assign(config, viewResult);

  return config;
}

/** @internal */
export function normalizeNgViewTarget(
  context: StateObject,
  rawViewName = "",
): { ngViewName: string; ngViewContextAnchor: string } {
  const viewAtContext = rawViewName.split("@");

  let ngViewName = viewAtContext[0] || "$default";

  let ngViewContextAnchor = isString(viewAtContext[1]) ? viewAtContext[1] : "^";

  const relativeViewNameSugar = /^(\^(?:\.\^)*)\.(.*$)/.exec(ngViewName);

  if (relativeViewNameSugar) {
    ngViewContextAnchor = relativeViewNameSugar[1];
    ngViewName = relativeViewNameSugar[2];
  }

  if (ngViewName.charAt(0) === "!") {
    ngViewName = ngViewName.substring(1);
    ngViewContextAnchor = "";
  }

  const relativeMatch = /^(\^(?:\.\^)*)$/;

  if (relativeMatch.exec(ngViewContextAnchor)) {
    let anchorState: StateObject | null | undefined = context;

    let hops = 0;

    for (let i = 0; i < ngViewContextAnchor.length; i++) {
      if (ngViewContextAnchor[i] === "^") {
        hops++;
      }
    }

    for (let i = 0; i < hops; i++) {
      anchorState = anchorState && anchorState.parent;
    }

    if (!anchorState) {
      anchorState = context;

      while (anchorState.parent) anchorState = anchorState.parent;
    }

    ngViewContextAnchor = anchorState.name;
  } else if (ngViewContextAnchor === ".") {
    ngViewContextAnchor = context.name;
  }

  return { ngViewName, ngViewContextAnchor };
}

function contextDepth(context: ViewContext): number {
  let cursor: ViewContext | undefined = context;

  let depth = 1;

  while (cursor && cursor.parent) {
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
    ngView.fqn.split(".").length * FQN_MULTIPLIER +
    contextDepth(ngView.creationContext);

  cache.set(ngView, computed);

  return computed;
}

function viewConfigDepth(
  cache: Map<_ViewConfig, number>,
  config: _ViewConfig,
): number {
  const cached = cache.get(config);

  if (cached !== undefined) return cached;

  let context = config.viewDecl.$context as ViewContext;

  let count = 0;

  while (++count && context.parent) {
    context = context.parent;
  }

  cache.set(config, count);

  return count;
}

/**
 * Tracks active `ng-view` instances and matches them with registered
 * view configs produced during state transitions.
 */
export class ViewService {
  /** @internal */
  _ngViews: ActiveNgView[];
  /** @internal */
  _viewConfigs: _ViewConfig[];
  /** @internal */
  _templateFactory: TemplateFactoryProvider | undefined;
  /** @internal */
  _rootContext: StateObject | null | undefined;

  /**
   * Creates an empty view registry ready to track active `ng-view` instances.
   */
  constructor() {
    this._ngViews = [];
    this._viewConfigs = [];
    this._templateFactory = undefined;
    this._rootContext = undefined;
  }

  /**
   * Returns the singleton view service instance.
   */
  $get = [
    _templateFactory,
    _router,
    (
      $templateFactory: TemplateFactoryProvider,
      $routerState: ng._RouterProvider,
    ): ViewService => {
      this._templateFactory = $templateFactory;
      this._rootViewContext($routerState._currentState || null);

      return this;
    },
  ];

  /**
   * Gets or sets the root view context used for relative `ng-view` targeting.
   */
  /** @internal */
  _rootViewContext(
    context?: StateObject | null,
  ): StateObject | null | undefined {
    return (this._rootContext = context || this._rootContext);
  }

  /**
   * Removes a view config from the active registry.
   */
  /** @internal */
  _deactivateViewConfig(viewConfig: _ViewConfig): void {
    removeFrom(this._viewConfigs, viewConfig);
  }

  /**
   * Adds a view config to the active registry.
   */
  /** @internal */
  _activateViewConfig(viewConfig: _ViewConfig): void {
    this._viewConfigs.push(viewConfig);
  }

  /**
   * Re-matches active `ng-view` instances against currently registered view configs
   * and notifies each view when its config assignment changes.
   */
  /** @internal */
  _sync(): void {
    const ngViewsByFqn: Record<string, ActiveNgView> = {};

    for (let i = 0; i < this._ngViews.length; i++) {
      const ngView = this._ngViews[i];

      ngViewsByFqn[ngView.fqn] = ngView;
    }

    const ngViewDepthCache = new Map<ActiveNgView, number>();

    const viewConfigDepthCache = new Map<_ViewConfig, number>();

    this._ngViews.sort(
      (left, right) =>
        ngViewDepth(ngViewDepthCache, left) -
        ngViewDepth(ngViewDepthCache, right),
    );

    for (let i = 0; i < this._ngViews.length; i++) {
      const ngView = this._ngViews[i];

      let selectedViewConfig: _ViewConfig | undefined = undefined;

      let bestDepth = Number.NEGATIVE_INFINITY;

      for (let j = 0; j < this._viewConfigs.length; j++) {
        const candidate = this._viewConfigs[j];

        if (!ViewService._matches(ngViewsByFqn, ngView, candidate)) continue;

        const candidateDepth = viewConfigDepth(viewConfigDepthCache, candidate);

        if (!selectedViewConfig || candidateDepth > bestDepth) {
          selectedViewConfig = candidate;
          bestDepth = candidateDepth;
        }
      }

      if (this._ngViews.indexOf(ngView) !== -1) {
        ngView.configUpdated(selectedViewConfig);
      }
    }
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
    viewConfig: _ViewConfig,
  ): boolean {
    if (!viewConfig || !viewConfig.viewDecl) return false;

    const ngViewContext = ngView.creationContext;

    const { viewDecl } = viewConfig;

    const vcName = viewDecl.$ngViewName || "$default";

    const vcContext = viewDecl.$ngViewContextAnchor || "";

    const normalizedTarget = vcContext ? `${vcContext}.${vcName}` : vcName;

    if (normalizedTarget !== ngView.fqn) return false;

    const viewContext = viewDecl.$context as ViewContext;

    if (
      viewContext.name !== ngViewContext.name &&
      vcContext !== ngViewContext.name
    ) {
      return false;
    }

    const childViewFqn = `${normalizedTarget}.${ngView.name}`;

    return !ngViewsByFqn[childViewFqn];
  }
}
