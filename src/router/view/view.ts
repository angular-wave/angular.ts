import { equals, removeFrom } from "../../shared/common.ts";
import { $injectTokens as $t } from "../../injection-tokens.ts";
import { trace } from "../common/trace.ts";
import { getViewConfigFactory, type ViewConfig } from "../state/views.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TemplateFactoryProvider } from "../template-factory.ts";

/** The context ref can be anything that has a `name` and a `parent` reference to another IContextRef */
export interface ViewContext {
  name: string;
  parent: ViewContext;
}

export interface ActiveUIView {
  /** An auto-incremented id */
  id: number;
  /** The ng-view short name */
  name: string;
  /** The ng-view's fully qualified name */
  fqn: string;
  /** The ViewConfig that is currently loaded into the ng-view */
  config: ViewConfig | null;
  /** The state context in which the ng-view tag was created. */
  creationContext: ViewContext;
  /** A callback that should apply a ViewConfig (or clear the ng-view, if config is undefined) */
  configUpdated: (config: ViewConfig | undefined) => void;
}

// An ngView and its matching viewConfig
export interface ViewTuple {
  ngView: ActiveUIView | undefined;
  viewConfig: ViewConfig | undefined;
}

export type { ViewConfig } from "../state/views.ts";

const FQN_MULTIPLIER = 10_000;

type ViewConfigFactory = (
  path: PathNode[],
  decl: ViewDeclaration,
) => ViewConfig;

/**
 * Tracks active `ng-view` instances and matches them with registered
 * view configs produced during state transitions.
 */
export class ViewService {
  /** @internal */
  _ngViews: ActiveUIView[];
  /** @internal */
  _viewConfigs: ViewConfig[];
  /** @internal */
  _listeners: Array<(tuples: ViewTuple[]) => void>;
  /** @internal */
  _viewConfigFactory: ViewConfigFactory | undefined;
  /** @internal */
  _rootContext: StateObject | null | undefined;

  /**
   * Creates an empty view registry ready to track active `ng-view` instances.
   */
  constructor() {
    this._ngViews = [];
    this._viewConfigs = [];
    this._listeners = [];
    this._viewConfigFactory = undefined;
    this._rootContext = undefined;
  }

  /**
   * Returns the singleton view service instance.
   */
  $get = [
    $t._templateFactory,
    ($templateFactory: TemplateFactoryProvider): ViewService => {
      this._viewConfigFactory = getViewConfigFactory($templateFactory);

      return this;
    },
  ];

  onSync(listener: (tuples: ViewTuple[]) => void): () => void {
    this._listeners.push(listener);

    return () => removeFrom(this._listeners, listener);
  }

  /**
   * Gets or sets the root view context used for relative `ng-view` targeting.
   */
  rootViewContext(
    context?: StateObject | null,
  ): StateObject | null | undefined {
    return (this._rootContext = context || this._rootContext);
  }

  /**
   * Builds a view config for one view declaration along the specified path.
   */
  /** @internal */
  _createViewConfig(path: PathNode[], decl: ViewDeclaration): ViewConfig {
    const cfgFactory = this._viewConfigFactory;

    if (!cfgFactory) {
      throw new Error("ViewService: No view config factory registered");
    }

    return cfgFactory(path, decl);
  }

  /**
   * Removes a view config from the active registry.
   */
  deactivateViewConfig(viewConfig: ViewConfig): void {
    trace.traceViewServiceEvent("<- Removing", viewConfig);
    removeFrom(this._viewConfigs, viewConfig);
  }

  /**
   * Adds a view config to the active registry.
   */
  activateViewConfig(viewConfig: ViewConfig): void {
    trace.traceViewServiceEvent("-> Registering", viewConfig);
    this._viewConfigs.push(viewConfig);
  }

  /**
   * Re-matches active `ng-view` instances against currently registered view configs
   * and notifies both the views and registered listeners of the new assignments.
   */
  sync(): void {
    const ngViewsByFqn: Record<string, ActiveUIView> = {};

    for (let i = 0; i < this._ngViews.length; i++) {
      const ngView = this._ngViews[i];

      ngViewsByFqn[ngView.fqn] = ngView;
    }

    const contextDepth = (context: ViewContext): number => {
      let cursor: ViewContext | undefined = context;

      let depth = 1;

      while (cursor && cursor.parent) {
        depth += 1;
        cursor = cursor.parent;
      }

      return depth;
    };

    const ngViewDepthCache = new Map<ActiveUIView, number>();

    const ngViewDepth = (ngView: ActiveUIView): number => {
      const cached = ngViewDepthCache.get(ngView);

      if (cached !== undefined) return cached;

      const computed =
        ngView.fqn.split(".").length * FQN_MULTIPLIER +
        contextDepth(ngView.creationContext);

      ngViewDepthCache.set(ngView, computed);

      return computed;
    };

    const viewConfigDepthCache = new Map<ViewConfig, number>();

    const viewConfigDepth = (config: ViewConfig): number => {
      const cached = viewConfigDepthCache.get(config);

      if (cached !== undefined) return cached;

      let context = config.viewDecl.$context as ViewContext;

      let count = 0;

      while (++count && context.parent) {
        context = context.parent;
      }

      viewConfigDepthCache.set(config, count);

      return count;
    };

    this._ngViews.sort((left, right) => ngViewDepth(left) - ngViewDepth(right));

    const matchedViewConfigs = new Set<ViewConfig>();

    const ngViewTuples: ViewTuple[] = [];

    for (let i = 0; i < this._ngViews.length; i++) {
      const ngView = this._ngViews[i];

      const matches = ViewService.matches(ngViewsByFqn, ngView);

      let selectedViewConfig: ViewConfig | undefined = undefined;

      let bestDepth = Number.NEGATIVE_INFINITY;

      for (let j = 0; j < this._viewConfigs.length; j++) {
        const candidate = this._viewConfigs[j];

        if (!matches(candidate)) continue;

        const candidateDepth = viewConfigDepth(candidate);

        if (!selectedViewConfig || candidateDepth > bestDepth) {
          selectedViewConfig = candidate;
          bestDepth = candidateDepth;
        }
      }

      if (selectedViewConfig) {
        matchedViewConfigs.add(selectedViewConfig);
      }

      ngViewTuples.push({ ngView, viewConfig: selectedViewConfig });
    }

    const unmatchedConfigTuples: ViewTuple[] = [];

    for (let i = 0; i < this._viewConfigs.length; i++) {
      const viewConfig = this._viewConfigs[i];

      if (!matchedViewConfigs.has(viewConfig)) {
        unmatchedConfigTuples.push({ ngView: undefined, viewConfig });
      }
    }

    for (let i = 0; i < ngViewTuples.length; i++) {
      const tuple = ngViewTuples[i];

      if (tuple.ngView && this._ngViews.indexOf(tuple.ngView) !== -1) {
        tuple.ngView.configUpdated(tuple.viewConfig);
      }
    }

    const allTuples = ngViewTuples.concat(unmatchedConfigTuples);

    this._listeners.forEach((cb) => cb(allTuples));
    trace.traceViewSync(allTuples);
  }

  /**
   * Registers one active `ng-view` and returns a deregistration function.
   */
  registerUIView(ngView: ActiveUIView): () => void {
    trace.traceViewServiceUIViewEvent("-> Registering", ngView);
    const ngViews = this._ngViews;

    const fqnAndTypeMatches = (uiv: ActiveUIView): boolean =>
      uiv.fqn === ngView.fqn;

    if (ngViews.filter(fqnAndTypeMatches).length) {
      trace.traceViewServiceUIViewEvent("!!!! duplicate ngView named:", ngView);
    }

    ngViews.push(ngView);
    this.sync();

    return () => {
      const idx = ngViews.indexOf(ngView);

      if (idx === -1) {
        trace.traceViewServiceUIViewEvent(
          "Tried removing non-registered ngView",
          ngView,
        );

        return;
      }

      trace.traceViewServiceUIViewEvent("<- Deregistering", ngView);
      ngViews.splice(idx, 1);
      this.sync();
    };
  }

  /**
   * Returns the currently registered view configs.
   */
  available(): ViewConfig[] {
    return this._viewConfigs;
  }

  static normalizeUIViewTarget(
    context: ViewContext,
    rawViewName = "$default",
  ): string {
    const [uiViewName, uiViewContextAnchor = "^"] = rawViewName.split("@");

    let anchor = uiViewContextAnchor;

    if (anchor === "") {
      anchor = "";
    } else if (anchor === "^") {
      anchor = context.parent ? context.parent.name : "";
    }

    return `${uiViewName || "$default"}@${anchor}`;
  }

  /**
   * Builds a predicate that determines whether a view config matches
   * a specific active `ng-view`.
   */
  static matches(
    ngViewsByFqn: Record<string, ActiveUIView>,
    uiView: ActiveUIView,
  ): (viewConfig: ViewConfig) => boolean {
    const uiViewFqn = uiView.fqn;

    const uiViewContext = uiView.creationContext;

    return (viewConfig: ViewConfig): boolean => {
      if (!viewConfig || !viewConfig.viewDecl) return false;
      const vcName = viewConfig.viewDecl.$ngViewName || "$default";

      const vcContext = viewConfig.viewDecl.$ngViewContextAnchor || "";

      const normalizedTarget = vcContext ? `${vcContext}.${vcName}` : vcName;

      if (normalizedTarget !== uiViewFqn) return false;

      const viewContext = viewConfig.viewDecl.$context as ViewContext;

      if (
        !equals(viewContext, uiViewContext) &&
        vcContext !== uiViewContext.name
      ) {
        return false;
      }

      const childViewFqn = `${normalizedTarget}.${uiView.name}`;

      return !ngViewsByFqn[childViewFqn];
    };
  }
}
