import { equals, removeFrom } from "../../shared/common.js";
import { trace } from "../common/trace.js";
import { ViewConfig, getViewConfigFactory } from "../state/views.ts";

/** @typedef {import("./interface.ts").ActiveUIView} ActiveUIView */
/** @typedef {import("./interface.ts").ViewContext} ViewContext */
/** @typedef {import("./interface.ts").ViewTuple} ViewTuple */
/** @typedef {import("../state/views.ts").ViewConfig} ViewConfigType */

const FQN_MULTIPLIER = 10_000;

export class ViewService {
  constructor() {
    this._ngViews = [];
    this._viewConfigs = [];
    this._listeners = [];
    this._viewConfigFactory = getViewConfigFactory();
    this._rootContext = undefined;
  }

  $get = () => this;

  rootViewContext(context) {
    return (this._rootContext = context || this._rootContext);
  }

  _createViewConfig(path, decl) {
    const cfgFactory = this._viewConfigFactory;

    if (!cfgFactory) {
      throw new Error("ViewService: No view config factory registered");
    }

    return cfgFactory(path, decl);
  }

  deactivateViewConfig(viewConfig) {
    trace.traceViewServiceEvent("<- Removing", viewConfig);
    removeFrom(this._viewConfigs, viewConfig);
  }

  activateViewConfig(viewConfig) {
    trace.traceViewServiceEvent("-> Registering", viewConfig);
    this._viewConfigs.push(viewConfig);
  }

  onSync(listener) {
    this._listeners.push(listener);

    return () => removeFrom(this._listeners, listener);
  }

  sync() {
    /** @type {Record<string, ActiveUIView>} */
    const ngViewsByFqn = {};

    for (let i = 0; i < this._ngViews.length; i++) {
      const ngView = this._ngViews[i];

      ngViewsByFqn[ngView.fqn] = ngView;
    }

    /** @param {ViewContext} context */
    const contextDepth = (context) => {
      let cursor = context;

      let depth = 1;

      while (cursor && cursor.parent) {
        depth += 1;
        cursor = cursor.parent;
      }

      return depth;
    };

    /** @type {Map<ActiveUIView, number>} */
    const ngViewDepthCache = new Map();

    /** @param {ActiveUIView} ngView */
    const ngViewDepth = (ngView) => {
      const cached = ngViewDepthCache.get(ngView);

      if (cached !== undefined) return cached;

      const computed =
        ngView.fqn.split(".").length * FQN_MULTIPLIER +
        contextDepth(ngView.creationContext);

      ngViewDepthCache.set(ngView, computed);

      return computed;
    };

    /** @type {Map<ViewConfigType, number>} */
    const viewConfigDepthCache = new Map();

    /** @param {ViewConfigType} config */
    const viewConfigDepth = (config) => {
      const cached = viewConfigDepthCache.get(config);

      if (cached !== undefined) return cached;

      let context = /** @type {ViewContext} */ (config.viewDecl.$context);

      let count = 0;

      while (++count && context.parent) {
        context = context.parent;
      }

      viewConfigDepthCache.set(config, count);

      return count;
    };

    this._ngViews.sort((left, right) => ngViewDepth(left) - ngViewDepth(right));

    /** @type {Set<ViewConfigType>} */
    const matchedViewConfigs = new Set();

    /** @type {ViewTuple[]} */
    const ngViewTuples = [];

    for (let i = 0; i < this._ngViews.length; i++) {
      const ngView = this._ngViews[i];

      const matches = ViewService.matches(ngViewsByFqn, ngView);

      /** @type {ViewConfigType | undefined} */
      let selectedViewConfig = undefined;

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

    /** @type {ViewTuple[]} */
    const unmatchedConfigTuples = [];

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

  registerUIView(ngView) {
    trace.traceViewServiceUIViewEvent("-> Registering", ngView);
    const ngViews = this._ngViews;

    const fqnMatches = (uiv) => uiv.fqn === ngView.fqn;

    if (ngViews.filter(fqnMatches).length) {
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

  available() {
    return this._viewConfigs;
  }

  active() {
    return this._ngViews.filter((view) => view.config).map((view) => view.name);
  }

  static normalizeUIViewTarget(context, rawViewName = "") {
    const normalized = ViewConfig.normalizeUIViewTarget(context, rawViewName);

    return `${normalized.ngViewName}@${normalized.ngViewContextAnchor}`;
  }
}

ViewService.matches = (
  /** @type {Record<string, ActiveUIView>} */ ngViewsByFqn,
  /** @type {ActiveUIView} */ uiView,
) => {
  const uiViewFqn = uiView.fqn;

  const uiViewContext = uiView.creationContext;

  return (/** @type {ViewConfigType} */ viewConfig) => {
    if (!viewConfig || !viewConfig.viewDecl) return false;

    const vcName = viewConfig.viewDecl.$ngViewName || "$default";

    const vcContext = viewConfig.viewDecl.$ngViewContextAnchor || "";

    const normalizedTarget = vcContext ? `${vcContext}.${vcName}` : vcName;

    if (normalizedTarget !== uiViewFqn) return false;

    if (vcName !== uiView.name) return false;

    const viewContext = /** @type {ViewContext} */ (
      viewConfig.viewDecl.$context
    );

    if (
      !equals(viewContext, uiViewContext) &&
      vcContext !== uiViewContext.name
    ) {
      return false;
    }

    const childViewFqn = `${normalizedTarget}.${uiView.name}`;

    return !ngViewsByFqn[childViewFqn];
  };
};
