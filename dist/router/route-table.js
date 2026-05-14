import { removeFrom } from '../shared/common.js';
import { isInstanceOf } from '../shared/utils.js';
import { UrlMatcher, compareUrlMatchers } from './url/url-matcher.js';

const EXACT_ROUTE_MATCH_PRIORITY = Number.EPSILON;
function stateRouteMatchPriority(urlMatcher, params) {
    const path = urlMatcher._cache._path ?? [urlMatcher];
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
/**
 * Tracks states with URL matchers and selects the best match for a URL.
 *
 * @internal
 */
class RouteTable {
    constructor() {
        this._states = [];
    }
    /** @internal */
    _add(state) {
        if (!this._states.includes(state)) {
            this._states.push(state);
        }
    }
    /** @internal */
    _remove(state) {
        removeFrom(this._states, state);
    }
    /** @internal */
    _match(path, search, hash) {
        let best;
        this._states.forEach((state) => {
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
}

export { RouteTable };
