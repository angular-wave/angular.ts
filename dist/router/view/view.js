import { _templateFactory, _router } from '../../injection-tokens.js';
import { removeFrom } from '../../shared/common.js';
import { ViewConfig } from '../state/views.js';

const FQN_MULTIPLIER = 10000;
function contextDepth(context) {
    let cursor = context;
    let depth = 1;
    while (cursor && cursor.parent) {
        depth += 1;
        cursor = cursor.parent;
    }
    return depth;
}
function ngViewDepth(cache, ngView) {
    const cached = cache.get(ngView);
    if (cached !== undefined)
        return cached;
    const computed = ngView.fqn.split(".").length * FQN_MULTIPLIER +
        contextDepth(ngView.creationContext);
    cache.set(ngView, computed);
    return computed;
}
function viewConfigDepth(cache, config) {
    const cached = cache.get(config);
    if (cached !== undefined)
        return cached;
    let context = config.viewDecl.$context;
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
class ViewService {
    /**
     * Creates an empty view registry ready to track active `ng-view` instances.
     */
    constructor() {
        /**
         * Returns the singleton view service instance.
         */
        this.$get = [
            _templateFactory,
            _router,
            ($templateFactory, $routerState) => {
                this._templateFactory = $templateFactory;
                this._rootViewContext($routerState._currentState || null);
                return this;
            },
        ];
        this._ngViews = [];
        this._viewConfigs = [];
        this._templateFactory = undefined;
        this._rootContext = undefined;
    }
    /**
     * Gets or sets the root view context used for relative `ng-view` targeting.
     */
    /** @internal */
    _rootViewContext(context) {
        return (this._rootContext = context || this._rootContext);
    }
    /**
     * Builds a view config for one view declaration along the specified path.
     */
    /** @internal */
    _createViewConfig(path, decl) {
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
    _deactivateViewConfig(viewConfig) {
        removeFrom(this._viewConfigs, viewConfig);
    }
    /**
     * Adds a view config to the active registry.
     */
    /** @internal */
    _activateViewConfig(viewConfig) {
        this._viewConfigs.push(viewConfig);
    }
    /**
     * Re-matches active `ng-view` instances against currently registered view configs
     * and notifies each view when its config assignment changes.
     */
    /** @internal */
    _sync() {
        const ngViewsByFqn = {};
        for (let i = 0; i < this._ngViews.length; i++) {
            const ngView = this._ngViews[i];
            ngViewsByFqn[ngView.fqn] = ngView;
        }
        const ngViewDepthCache = new Map();
        const viewConfigDepthCache = new Map();
        this._ngViews.sort((left, right) => ngViewDepth(ngViewDepthCache, left) -
            ngViewDepth(ngViewDepthCache, right));
        for (let i = 0; i < this._ngViews.length; i++) {
            const ngView = this._ngViews[i];
            let selectedViewConfig = undefined;
            let bestDepth = Number.NEGATIVE_INFINITY;
            for (let j = 0; j < this._viewConfigs.length; j++) {
                const candidate = this._viewConfigs[j];
                if (!ViewService._matches(ngViewsByFqn, ngView, candidate))
                    continue;
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
    _registerNgView(ngView) {
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
    static _matches(ngViewsByFqn, ngView, viewConfig) {
        if (!viewConfig || !viewConfig.viewDecl)
            return false;
        const ngViewContext = ngView.creationContext;
        const { viewDecl } = viewConfig;
        const vcName = viewDecl.$ngViewName || "$default";
        const vcContext = viewDecl.$ngViewContextAnchor || "";
        const normalizedTarget = vcContext ? `${vcContext}.${vcName}` : vcName;
        if (normalizedTarget !== ngView.fqn)
            return false;
        const viewContext = viewDecl.$context;
        if (viewContext.name !== ngViewContext.name &&
            vcContext !== ngViewContext.name) {
            return false;
        }
        const childViewFqn = `${normalizedTarget}.${ngView.name}`;
        return !ngViewsByFqn[childViewFqn];
    }
}

export { ViewService };
