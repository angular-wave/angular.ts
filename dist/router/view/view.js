import { _templateFactory, _router, _compileLifecycle, _transitions, _compile, _controller, _injector } from '../../injection-tokens.js';
import { setCacheData } from '../../shared/dom.js';
import { removeFrom } from '../../shared/common.js';
import { assertDefined, assign, isString } from '../../shared/utils.js';
import { registerViewControllerCallbacks } from '../directives/view-controller-hooks.js';
import { ResolveContext } from '../resolve/resolve-context.js';
import { kebobString } from '../../shared/strings.js';
import { getLocals } from '../state/state-registry.js';
export { normalizeNgViewTarget } from '../state/view-target.js';

const FQN_MULTIPLIER = 10000;
const COMPONENT_CONTEXT_ATTR = "data-ng-view-component-context";
let nextViewId = 0;
function createViewFillPlan(viewDecl, componentName) {
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
function viewDeclTargetKey(viewDecl) {
    const viewName = viewDecl._ngViewName ?? "$default";
    const viewContext = viewDecl._ngViewContextAnchor ?? "";
    return viewContext ? `${viewContext}.${viewName}` : viewName;
}
function viewDeclDepth(viewDecl) {
    let context = assertDefined(viewDecl._context);
    let count = 0;
    while (++count && context.parent) {
        context = context.parent;
    }
    return count;
}
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
        _fillPlan: createViewFillPlan(viewDecl, undefined),
        _targetKey: viewDeclTargetKey(viewDecl),
        _depth: viewDeclDepth(viewDecl),
    };
}
/** @internal */
function getViewTemplate(config, ngView, context) {
    const plan = config._fillPlan;
    return plan._kind === "component" && plan._componentName
        ? config._factory._makeComponentTemplate(ngView, context, plan._componentName, config._viewDecl.bindings)
        : config._template;
}
/** @internal */
async function loadViewConfig(config) {
    const params = {};
    config._path.forEach((node) => {
        assign(params, node.paramValues);
    });
    const viewResult = await config._factory._fromConfig(config._viewDecl, params);
    config._controller = config._viewDecl.controller;
    assign(config, viewResult);
    config._fillPlan = createViewFillPlan(config._viewDecl, config._component);
    return config;
}
function contextDepth(context) {
    let cursor = context;
    let depth = 1;
    while (cursor.parent) {
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
            _compileLifecycle,
            _transitions,
            _compile,
            _controller,
            _injector,
            ($templateFactory, $routerState, $compileLifecycle, $transitions, $compile, $controller, $injector) => {
                this._templateFactory = $templateFactory;
                this._compile = $compile;
                this._controller = $controller;
                this._injector = $injector;
                this._rootViewContext($routerState._currentState ?? null);
                this._transitions = $transitions;
                this._deregisterCompileLifecycle?.();
                this._deregisterCompileLifecycle = $compileLifecycle.onControllerCreated((record) => {
                    this._componentControllerCreated(record);
                });
                return this;
            },
        ];
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
    /** @internal */
    _fillView(options) {
        const { host, rootNodes, scope, config, initial, activeNgView, animation } = options;
        const $compile = assertDefined(this._compile);
        const viewData = {
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
        const resolveContext = config && plan?._needsResolveContext
            ? new ResolveContext(config._path, assertDefined(this._injector))
            : undefined;
        if (host.childNodes.length || this._filledHosts.has(host)) {
            scope.$broadcast("$destroy");
        }
        else {
            this._filledHosts.add(host);
        }
        host.innerHTML = config
            ? (getViewTemplate(config, host, assertDefined(resolveContext)) ??
                initial)
            : initial;
        if (config && plan?._kind === "component") {
            this._markComponentView(host, config, scope);
        }
        const link = $compile(host.contentDocument ?? host.childNodes);
        const locals = resolveContext ? getLocals(resolveContext) : undefined;
        const targetScope = scope.$target;
        targetScope.$resolve = locals;
        const controller = plan?._hasController ? config?._controller : undefined;
        if (controller) {
            const controllerConfig = assertDefined(config);
            const controllerInstance = assertDefined(this._controller)(controller, assign({}, locals, { $scope: scope, $element: host }));
            setCacheData(host, "$ngControllerController", controllerInstance);
            const { children } = host;
            for (let i = 0; i < children.length; i++) {
                setCacheData(children[i], "$ngControllerController", controllerInstance);
            }
            registerViewControllerCallbacks(assertDefined(this._transitions), controllerInstance, scope, controllerConfig);
        }
        link(scope);
        if (scope.$handler._destroyed) {
            scope.$broadcast("$destroy");
        }
    }
    /** @internal */
    _markComponentView(host, config, scope) {
        const { _componentElementName, _componentName } = config._fillPlan;
        if (!_componentElementName || !_componentName)
            return;
        const componentHost = host.querySelector(_componentElementName);
        if (!componentHost)
            return;
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
    _componentControllerCreated(record) {
        const id = record.element.getAttribute(COMPONENT_CONTEXT_ATTR);
        if (!id)
            return;
        const context = this._componentContexts.get(id);
        if (record.directiveName !== context?.componentName)
            return;
        record.element.removeAttribute(COMPONENT_CONTEXT_ATTR);
        this._componentContexts.delete(id);
        if (!this._transitions)
            return;
        registerViewControllerCallbacks(this._transitions, record.controller, context.scope, context.config);
    }
    /**
     * Gets or sets the root view context used for relative `ng-view` targeting.
     */
    /** @internal */
    _rootViewContext(context) {
        return (this._rootContext = context ?? this._rootContext);
    }
    /**
     * Removes a view config from the active registry.
     */
    /** @internal */
    _deactivateViewConfig(viewConfig) {
        removeFrom(this._viewConfigs, viewConfig);
        const targetConfigs = this._viewConfigsByTarget.get(viewConfig._targetKey);
        if (!targetConfigs)
            return;
        removeFrom(targetConfigs, viewConfig);
        if (!targetConfigs.length) {
            this._viewConfigsByTarget.delete(viewConfig._targetKey);
        }
    }
    /**
     * Adds a view config to the active registry.
     */
    /** @internal */
    _activateViewConfig(viewConfig) {
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
    _sync() {
        const ngViewsByFqn = {};
        this._ngViews.forEach((ngView) => {
            ngViewsByFqn[ngView._fqn] = ngView;
        });
        const ngViewDepthCache = new Map();
        this._ngViews.sort((left, right) => ngViewDepth(ngViewDepthCache, left) -
            ngViewDepth(ngViewDepthCache, right));
        this._ngViews.forEach((ngView) => {
            let selectedViewConfig = null;
            let bestDepth = Number.NEGATIVE_INFINITY;
            const targetConfigs = this._viewConfigsByTarget.get(ngView._fqn) ?? [];
            for (let i = 0; i < targetConfigs.length; i++) {
                const candidate = targetConfigs[i];
                if (!ViewService._matches(ngViewsByFqn, ngView, candidate))
                    continue;
                if (selectedViewConfig === null || candidate._depth > bestDepth) {
                    selectedViewConfig = candidate;
                    bestDepth = candidate._depth;
                }
            }
            if (!this._ngViews.includes(ngView))
                return;
            if (ngView._config === selectedViewConfig)
                return;
            ngView._config = selectedViewConfig;
            ngView._configUpdated(selectedViewConfig ?? undefined);
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
        const ngViewContext = ngView._creationContext;
        const viewDecl = viewConfig._viewDecl;
        const normalizedTarget = viewConfig._targetKey;
        const vcContext = viewDecl._ngViewContextAnchor ?? "";
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

export { ViewService, createViewConfig, getViewTemplate, loadViewConfig };
