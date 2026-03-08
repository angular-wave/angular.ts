import { equals, removeFrom } from "../../shared/common.ts";
import { trace } from "../common/trace.ts";
import { getViewConfigFactory } from "../state/views.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { ViewConfig } from "../state/views.ts";
import type { ActiveUIView, ViewContext, ViewTuple } from "./interface.ts";

export type { ViewConfig } from "../state/views.ts";

const FQN_MULTIPLIER = 10_000;

type ViewConfigFactory = (
  path: PathNode[],
  decl: ViewDeclaration,
) => ViewConfig;

export class ViewService {
  _ngViews: ActiveUIView[];
  _viewConfigs: ViewConfig[];
  _listeners: Array<(tuples: ViewTuple[]) => void>;
  _viewConfigFactory: ViewConfigFactory | undefined;
  _rootContext: StateObject | null | undefined;

  constructor() {
    this._ngViews = [];
    this._viewConfigs = [];
    this._listeners = [];
    this._viewConfigFactory = getViewConfigFactory();
    this._rootContext = undefined;
  }

  $get = (): ViewService => this;

  rootViewContext(
    context?: StateObject | null,
  ): StateObject | null | undefined {
    return (this._rootContext = context || this._rootContext);
  }

  _createViewConfig(path: PathNode[], decl: ViewDeclaration): ViewConfig {
    const cfgFactory = this._viewConfigFactory;

    if (!cfgFactory) {
      throw new Error("ViewService: No view config factory registered");
    }

    return cfgFactory(path, decl);
  }

  deactivateViewConfig(viewConfig: ViewConfig): void {
    trace.traceViewServiceEvent("<- Removing", viewConfig);
    removeFrom(this._viewConfigs, viewConfig);
  }

  activateViewConfig(viewConfig: ViewConfig): void {
    trace.traceViewServiceEvent("-> Registering", viewConfig);
    this._viewConfigs.push(viewConfig);
  }

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
      let bestMatch: ViewConfig | undefined;
      let bestDepth = Number.NEGATIVE_INFINITY;

      for (let j = 0; j < this._viewConfigs.length; j++) {
        const candidate = this._viewConfigs[j];

        if (!matches(candidate)) continue;

        const candidateDepth = viewConfigDepth(candidate);

        if (!bestMatch || candidateDepth > bestDepth) {
          bestMatch = candidate;
          bestDepth = candidateDepth;
        }
      }

      if (bestMatch) {
        matchedViewConfigs.add(bestMatch);
      }

      ngViewTuples.push({ ngView, viewConfig: bestMatch });
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

  available(): ViewConfig[] {
    return this._viewConfigs;
  }

  onSync(listener: (tuples: ViewTuple[]) => void): () => void {
    this._listeners.push(listener);

    return () => removeFrom(this._listeners, listener);
  }

  static normalizeUIViewTarget(
    context?: ViewContext | null,
    rawViewName = "",
  ): string {
    const viewAtContext = rawViewName.split("@");
    let uiViewName = viewAtContext[0] || "$default";
    let uiViewContextAnchor = viewAtContext[1] || "^";

    const relativeMatch = /^\^(\^(\.)?)*/.exec(uiViewContextAnchor);

    if (relativeMatch) {
      const anchorTail = uiViewContextAnchor.replace(relativeMatch[0], "");
      const upLevels = relativeMatch[0].split("^").length - 1;
      let anchor = context;

      for (let i = 0; i < upLevels && anchor; i++) {
        anchor = anchor.parent;
      }

      uiViewContextAnchor = (anchor && anchor.name) || "";
      if (anchorTail) {
        uiViewContextAnchor =
          uiViewContextAnchor + (uiViewContextAnchor && ".") + anchorTail;
      }
    }

    return `${uiViewName}@${uiViewContextAnchor}`;
  }

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
      const normalizedTarget = ViewService.normalizeUIViewTarget(
        viewConfig.viewDecl.$context as ViewContext,
        `${vcName}@${vcContext}`,
      );

      if (normalizedTarget !== uiViewFqn) return false;
      if (vcName !== uiView.name) return false;

      const viewContext = viewConfig.viewDecl.$context as ViewContext;

      if (
        !equals(viewContext, uiViewContext) &&
        vcContext !== uiViewContext.name
      ) {
        return false;
      }

      return !ngViewsByFqn[`${vcName}@${vcContext}.${uiView.name}`];
    };
  }
}
