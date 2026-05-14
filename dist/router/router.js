import { _location, _injector, _locationProvider } from '../injection-tokens.js';
import { assign } from '../shared/utils.js';
import { ParamFactory } from './params/param-factory.js';
import { createDefaultParamTypes } from './params/param-types.js';
import { StateParams } from './params/state-params.js';
import { RouteTable } from './route-table.js';
import { RouterUrlRuntime } from './router-url.js';
import { UrlMatcher } from './url/url-matcher.js';

/**
 * Mutable router state/config shared across state, URL, and transition services.
 *
 * @internal
 */
class RouterProvider {
    /**
     * Creates the shared mutable router globals container.
     */
    constructor($locationProvider) {
        this.$get = [
            _location,
            _injector,
            /**
             * Returns the singleton router internals instance.
             */
            ($location, $injector) => {
                this._urlRuntime._init($location);
                this._paramFactory._injector = $injector;
                return this;
            },
        ];
        this._stateService = undefined;
        this._routeTable = new RouteTable();
        this._urlRuntime = new RouterUrlRuntime($locationProvider);
        this._isCaseInsensitive = false;
        this._isStrictMode = true;
        this._defaultSquashPolicy = false;
        this._paramTypes = createDefaultParamTypes();
        this._paramFactory = new ParamFactory(this);
        this._params = new StateParams();
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
    _getDefaultSquashPolicy() {
        return this._defaultSquashPolicy;
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
            void $state.transitionTo(state, params, { inherit: true, source: "url" });
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
/* @ignore */ RouterProvider.$inject = [_locationProvider];

export { RouterProvider };
