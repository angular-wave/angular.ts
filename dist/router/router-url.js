import { getBaseHref } from '../shared/dom.js';
import { stripLastPathElement } from '../shared/strings.js';
import { isDefined, isNull } from '../shared/utils.js';

/**
 * Owns URL reads, writes, and href formatting for the router runtime.
 *
 * @internal
 */
class RouterUrlRuntime {
    constructor($locationProvider) {
        this._locationProvider = $locationProvider;
    }
    /** @internal */
    _init($location) {
        this._location = $location;
    }
    /** @internal */
    _path() {
        return this._location.getPath();
    }
    /** @internal */
    _search() {
        return this._location.getSearch();
    }
    /** @internal */
    _hash() {
        return this._location.getHash();
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
        const url = urlMatcher._format(params);
        if (!isNull(url)) {
            this._url(url, !!options.replace);
        }
    }
    /** @internal */
    _href(urlMatcher, params, options) {
        let url = urlMatcher._format(params);
        if (isNull(url))
            return null;
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

export { RouterUrlRuntime };
