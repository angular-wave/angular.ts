import { equals, removeFrom } from "../../shared/common.ts";
import { $injectTokens as $t } from "../../injection-tokens.ts";
import { ViewConfig } from "../state/views.ts";
import type { PathNode } from "../path/path-node.ts";
import type { ViewDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TemplateFactoryProvider } from "../template-factory.ts";

/** @internal */
export interface ViewContext {
  name: string;
  parent: ViewContext;
}

/** @internal */
export interface ActiveNgView {
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

export type { ViewConfig } from "../state/views.ts";

const FQN_MULTIPLIER = 10_000;

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
    $t._templateFactory,
    ($templateFactory: TemplateFactoryProvider): ViewService => {
      this._templateFactory = $templateFactory;

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
   * Builds a view config for one view declaration along the specified path.
   */
  /** @internal */
  _createViewConfig(path: PathNode[], decl: ViewDeclaration): ViewConfig {
    const templateFactory = this._templateFactory;

    if (!templateFactory) {
      throw new Error("ViewService: No template factory registered");
    }

    return new ViewConfig(path, decl, templateFactory);
  }

  /**
   * Removes a view config from the active registry.
   */
  /** @internal */
  _deactivateViewConfig(viewConfig: ViewConfig): void {
    removeFrom(this._viewConfigs, viewConfig);
  }

  /**
   * Adds a view config to the active registry.
   */
  /** @internal */
  _activateViewConfig(viewConfig: ViewConfig): void {
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

    const contextDepth = (context: ViewContext): number => {
      let cursor: ViewContext | undefined = context;

      let depth = 1;

      while (cursor && cursor.parent) {
        depth += 1;
        cursor = cursor.parent;
      }

      return depth;
    };

    const ngViewDepthCache = new Map<ActiveNgView, number>();

    const ngViewDepth = (ngView: ActiveNgView): number => {
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

    for (let i = 0; i < this._ngViews.length; i++) {
      const ngView = this._ngViews[i];

      const matches = ViewService._matches(ngViewsByFqn, ngView);

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
      const idx = ngViews.indexOf(ngView);

      if (idx === -1) {
        return;
      }

      ngViews.splice(idx, 1);
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
  ): (viewConfig: ViewConfig) => boolean {
    const ngViewFqn = ngView.fqn;

    const ngViewContext = ngView.creationContext;

    return (viewConfig: ViewConfig): boolean => {
      if (!viewConfig || !viewConfig.viewDecl) return false;
      const vcName = viewConfig.viewDecl.$ngViewName || "$default";

      const vcContext = viewConfig.viewDecl.$ngViewContextAnchor || "";

      const normalizedTarget = vcContext ? `${vcContext}.${vcName}` : vcName;

      if (normalizedTarget !== ngViewFqn) return false;

      const viewContext = viewConfig.viewDecl.$context as ViewContext;

      if (
        !equals(viewContext, ngViewContext) &&
        vcContext !== ngViewContext.name
      ) {
        return false;
      }

      const childViewFqn = `${normalizedTarget}.${ngView.name}`;

      return !ngViewsByFqn[childViewFqn];
    };
  }
}
