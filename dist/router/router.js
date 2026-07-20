import { assign } from '../shared/utils.js';
import { ParamType } from './params/param-type.js';
import { ParamFactory } from './params/param-factory.js';
import { createDefaultParamTypes } from './params/param-types.js';
import { StateParams } from './params/state-params.js';
import { RouteTable } from './route-table.js';
import { RouterUrlRuntime } from './router-url.js';
import { UrlMatcher } from './url/url-matcher.js';

/**
 * Mutable router state/config shared across state, URL, and transition services.
 */
class RouterRuntimeState {
    /**
     * Creates the shared mutable router globals container.
     */
    constructor(locationConfig) {
        this._stateService = undefined;
        this._routeTable = new RouteTable();
        this._urlRuntime = new RouterUrlRuntime(locationConfig);
        this._isCaseInsensitive = false;
        this._isStrictMode = true;
        this._defaultSquash = false;
        this._paramTypes = createDefaultParamTypes();
        this._paramFactory = new ParamFactory(this);
        this._params = new StateParams();
        this._scroll = undefined;
        this._focus = undefined;
        this._viewTransitions = undefined;
        this._loading = undefined;
        this._retry = undefined;
        this._fallbackTo = undefined;
        this._error = undefined;
        this._errorBoundary = undefined;
        this._retention = undefined;
        this._lastStartedTransitionId = -1;
        this._lastStartedTransition = undefined;
        this._lastSuccessfulTransition = undefined;
        this._successfulTransitionCleanup = undefined;
        this._injector = undefined;
        this._current = undefined;
        this._currentState = undefined;
        this._transition = undefined;
    }
    /** @internal */
    _setSuccessfulTransition(trans) {
        if (this._lastSuccessfulTransition && this._successfulTransitionCleanup) {
            this._successfulTransitionCleanup(this._lastSuccessfulTransition);
        }
        this._lastSuccessfulTransition = trans;
    }
    /** @internal */
    _getDefaultSquash() {
        return this._defaultSquash;
    }
    config(config) {
        if (config.strict !== undefined) {
            this._isStrictMode = config.strict;
        }
        if (config.caseInsensitive !== undefined) {
            this._isCaseInsensitive = config.caseInsensitive;
        }
        if (config.defaultSquash !== undefined) {
            this._defaultSquash = config.defaultSquash;
        }
        if (config.paramTypes !== undefined) {
            for (const [name, definition] of Object.entries(config.paramTypes)) {
                this._paramTypes[name] = new ParamType({
                    name,
                    ...definition,
                });
            }
        }
        if (config.scroll !== undefined) {
            this._scroll = config.scroll;
        }
        if (config.focus !== undefined) {
            this._focus = config.focus;
        }
        if (config.viewTransitions !== undefined) {
            this._viewTransitions = config.viewTransitions;
        }
        if (config.loading !== undefined) {
            this._loading = config.loading;
        }
        if (config.retry !== undefined) {
            this._retry = config.retry;
        }
        if (config.fallbackTo !== undefined) {
            this._fallbackTo = config.fallbackTo;
        }
        if (config.error !== undefined) {
            this._error = config.error;
        }
        if (config.errorBoundary !== undefined) {
            this._errorBoundary = config.errorBoundary;
        }
        if (config.retention !== undefined) {
            this._retention = config.retention;
        }
    }
    /** @internal */
    _initRuntime($location, $injector) {
        this._urlRuntime._init($location);
        this._paramFactory._injector = $injector;
        return this;
    }
    /** @internal */
    _sync(evt) {
        if (evt?.defaultPrevented)
            return;
        const best = this._routeTable._match(this._urlRuntime._path(), this._urlRuntime._search(), this._urlRuntime._hash());
        if (!best)
            return;
        this._transitionToStateRoute(best.state, best.match);
    }
    /** @internal */
    _transitionToStateRoute(state, params) {
        const $state = this._stateService;
        if (!$state)
            return;
        const { current } = $state;
        const currentHref = current ? $state.href(current, this._params) : null;
        if ($state.href(state, params) !== currentHref) {
            void $state.transitionTo(state, params, {
                inherit: true,
                source: "url",
            });
        }
    }
    /** @internal */
    _compile(urlPattern, config) {
        const globalConfig = {
            state: { params: {} },
            strict: this._isStrictMode,
            caseInsensitive: this._isCaseInsensitive,
        };
        return new UrlMatcher(urlPattern, this._paramTypes, this._paramFactory, assign(globalConfig, config));
    }
}

export { RouterRuntimeState };
