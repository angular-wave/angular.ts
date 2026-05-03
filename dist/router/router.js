import { _location, _injector, _locationProvider } from '../injection-tokens.js';
import { removeFrom } from '../shared/common.js';
import { getBaseHref } from '../shared/dom.js';
import { stripLastPathElement } from '../shared/strings.js';
import { isDefined, isInstanceOf, isNull, assign } from '../shared/utils.js';
import { ParamFactory } from './params/param-factory.js';
import { createDefaultParamTypes } from './params/param-types.js';
import { StateParams } from './params/state-params.js';
import { UrlMatcher, compareUrlMatchers } from './url/url-matcher.js';

const EXACT_ROUTE_MATCH_PRIORITY = Number.EPSILON;
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
                this._location = $location;
                this._paramFactory._injector = $injector;
                return this;
            },
        ];
        this._locationProvider = $locationProvider;
        this._stateService = undefined;
        this._stateRoutes = [];
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
    _getBaseHref() {
        return (this._baseHref ||
            (this._baseHref = getBaseHref() || window.location.pathname));
    }
    /** @internal */
    _url(newUrl, state) {
        if (isDefined(newUrl)) {
            this._location.setUrl(decodeURIComponent(newUrl));
        }
        if (state)
            this._location.setState(state);
        return this._location.getUrl();
    }
    /** @internal */
    _sync(evt) {
        if (evt && evt.defaultPrevented)
            return;
        const best = this._match(this._location.getPath(), this._location.getSearch(), this._location.getHash());
        if (!best)
            return;
        this._transitionToStateRoute(best.state, best.match);
    }
    /** @internal */
    _registerStateRoute(state) {
        if (!this._stateRoutes.includes(state)) {
            this._stateRoutes.push(state);
        }
    }
    /** @internal */
    _removeStateRoute(state) {
        removeFrom(this._stateRoutes, state);
    }
    /** @internal */
    _transitionToStateRoute(state, params) {
        const $state = this._stateService;
        if (!$state)
            return;
        const { current } = $state;
        const currentHref = current ? $state.href(current, $state.params) : null;
        if ($state.href(state, params) !== currentHref) {
            $state.transitionTo(state, params, { inherit: true, source: "url" });
        }
    }
    /** @internal */
    _match(path, search, hash) {
        let best;
        this._stateRoutes.forEach((state) => {
            const urlMatcher = state._url;
            if (!isInstanceOf(urlMatcher, UrlMatcher))
                return;
            const match = urlMatcher._exec(path, search, hash || "");
            if (match === null)
                return;
            const weight = stateRouteMatchPriority(urlMatcher, match);
            if (!best) {
                best = { match, state, urlMatcher, weight };
                return;
            }
            const specificity = compareUrlMatchers(urlMatcher, best.urlMatcher);
            if (specificity < 0 || (specificity === 0 && weight > best.weight)) {
                best = { match, state, urlMatcher, weight };
            }
        });
        return best;
    }
    /** @internal */
    _update(read) {
        if (read) {
            this._lastUrl = this._url();
            return;
        }
        if (this._url() === this._lastUrl)
            return;
        this._url(this._lastUrl, true);
    }
    /** @internal */
    _push(urlMatcher, params, options) {
        const url = urlMatcher._format(params || {});
        if (!isNull(url)) {
            this._url(url, options && !!options.replace);
        }
    }
    /** @internal */
    _href(urlMatcher, params, options) {
        let url = urlMatcher._format(params);
        if (isNull(url))
            return null;
        options = options || { absolute: false };
        const isHtml5 = this._locationProvider.html5ModeConf.enabled;
        if (!isHtml5) {
            url = `#${this._locationProvider.hashPrefixConf}${url}`;
        }
        url = appendBasePath(url, isHtml5, options.absolute, this._getBaseHref());
        if (!options.absolute || !url) {
            return url;
        }
        const slash = !isHtml5 && url ? "/" : "";
        return [
            `${window.location.protocol}//`,
            window.location.host,
            slash,
            url,
        ].join("");
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
function stateRouteMatchPriority(urlMatcher, params) {
    const path = urlMatcher._cache._path || [urlMatcher];
    let optionalCount = 0;
    let matched = 0;
    path.forEach((matcher) => {
        matcher._params.forEach((param) => {
            if (!param.isOptional)
                return;
            optionalCount++;
            if (params[param.id])
                matched++;
        });
    });
    return optionalCount ? matched / optionalCount : EXACT_ROUTE_MATCH_PRIORITY;
}
function appendBasePath(url, isHtml5, absolute, baseHref) {
    if (baseHref === "/")
        return url;
    if (isHtml5)
        return stripLastPathElement(baseHref) + url;
    if (absolute)
        return baseHref.slice(1) + url;
    return url;
}

export { RouterProvider };
