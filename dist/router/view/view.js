import { _templateFactory, _router } from '../../injection-tokens.js';
import { removeFrom } from '../../shared/common.js';
import { assertDefined, assign, isString } from '../../shared/utils.js';

const FQN_MULTIPLIER = 10000;
let nextViewId = 0;
/** @internal */
function createViewConfig(path, viewDecl, factory) {
    return {
        _id: nextViewId++,
        _path: path,
        _viewDecl: viewDecl,
        _factory: factory,
        _component: undefined,
        _template: undefined,
        _loaded: false,
        _controller: undefined,
    };
}
/** @internal */
function getViewTemplate(config, ngView, context) {
    return config._component
        ? config._factory._makeComponentTemplate(ngView, context, config._component, config._viewDecl.bindings)
        : config._template;
}
/** @internal */
async function loadViewConfig(config) {
    const params = {};
    config._path.forEach((node) => assign(params, node.paramValues));
    const viewResult = await config._factory._fromConfig(config._viewDecl, params);
    config._controller = config._viewDecl.controller;
    assign(config, viewResult);
    return config;
}
/** @internal */
function normalizeNgViewTarget(context, rawViewName = "") {
    const viewAtContext = rawViewName.split("@");
    let ngViewName = viewAtContext[0] || "$default";
    let ngViewContextAnchor = isString(viewAtContext[1]) ? viewAtContext[1] : "^";
    const relativeViewNameSugar = /^(\^(?:\.\^)*)\.(.*$)/.exec(ngViewName);
    if (relativeViewNameSugar) {
        ngViewContextAnchor = relativeViewNameSugar[1];
        ngViewName = relativeViewNameSugar[2];
    }
    if (ngViewName.startsWith("!")) {
        ngViewName = ngViewName.substring(1);
        ngViewContextAnchor = "";
    }
    const relativeMatch = /^(\^(?:\.\^)*)$/;
    if (relativeMatch.exec(ngViewContextAnchor)) {
        let anchorState = context;
        let hops = 0;
        for (let i = 0; i < ngViewContextAnchor.length; i++) {
            if (ngViewContextAnchor[i] === "^") {
                hops++;
            }
        }
        for (let i = 0; i < hops; i++) {
            anchorState = anchorState?.parent;
        }
        if (!anchorState) {
            anchorState = context;
            while (anchorState.parent)
                anchorState = anchorState.parent;
        }
        ngViewContextAnchor = anchorState.name;
    }
    else if (ngViewContextAnchor === ".") {
        ngViewContextAnchor = context.name;
    }
    return { ngViewName, ngViewContextAnchor };
}
function contextDepth(context) {
    let cursor = context;
    let depth = 1;
    while (cursor?.parent) {
        depth += 1;
        cursor = cursor.parent;
    }
    return depth;
}
function ngViewDepth(cache, ngView) {
    const cached = cache.get(ngView);
    if (cached !== undefined)
        return cached;
    const computed = ngView._fqn.split(".").length * FQN_MULTIPLIER +
        contextDepth(ngView._creationContext);
    cache.set(ngView, computed);
    return computed;
}
function viewConfigDepth(cache, config) {
    const cached = cache.get(config);
    if (cached !== undefined)
        return cached;
    let context = assertDefined(config._viewDecl._context);
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
        this._ngViews.forEach((ngView) => {
            ngViewsByFqn[ngView._fqn] = ngView;
        });
        const ngViewDepthCache = new Map();
        const viewConfigDepthCache = new Map();
        this._ngViews.sort((left, right) => ngViewDepth(ngViewDepthCache, left) -
            ngViewDepth(ngViewDepthCache, right));
        this._ngViews.forEach((ngView) => {
            let selectedViewConfig = undefined;
            let bestDepth = Number.NEGATIVE_INFINITY;
            this._viewConfigs.forEach((candidate) => {
                if (!ViewService._matches(ngViewsByFqn, ngView, candidate))
                    return;
                const candidateDepth = viewConfigDepth(viewConfigDepthCache, candidate);
                if (!selectedViewConfig || candidateDepth > bestDepth) {
                    selectedViewConfig = candidate;
                    bestDepth = candidateDepth;
                }
            });
            if (this._ngViews.includes(ngView)) {
                ngView._configUpdated(selectedViewConfig);
            }
        });
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
        if (!viewConfig?._viewDecl)
            return false;
        const ngViewContext = ngView._creationContext;
        const viewDecl = viewConfig._viewDecl;
        const vcName = viewDecl._ngViewName || "$default";
        const vcContext = viewDecl._ngViewContextAnchor || "";
        const normalizedTarget = vcContext ? `${vcContext}.${vcName}` : vcName;
        if (normalizedTarget !== ngView._fqn)
            return false;
        const viewContext = assertDefined(viewDecl._context);
        if (viewContext.name !== ngViewContext.name &&
            vcContext !== ngViewContext.name) {
            return false;
        }
        const childViewFqn = `${normalizedTarget}.${ngView._name}`;
        return !ngViewsByFqn[childViewFqn];
    }
}

export { ViewService, createViewConfig, getViewTemplate, loadViewConfig, normalizeNgViewTarget };
