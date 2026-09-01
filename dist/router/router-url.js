import { getBaseHref } from '../shared/dom.js';
import { stripLastPathElement } from '../shared/strings.js';
import { isNull, isDefined } from '../shared/utils.js';

/**
 * Owns URL reads, writes, and href formatting for the router runtime.
 *
 * @internal
 */
class RouterUrlRuntime {
    constructor(locationConfig) {
        this._locationConfig = locationConfig;
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
    _getUrl() {
        return this._location.getUrl();
    }
    /** @internal */
    _setUrl(newUrl, state) {
        this._location.setUrl(decodeURIComponent(newUrl));
        if (state)
            this._location.setState(state);
        return this._getUrl();
    }
    /** @internal */
    _readUrl() {
        this._lastUrl = this._getUrl();
    }
    /** @internal */
    _writeUrl() {
        if (this._getUrl() === this._lastUrl)
            return;
        this._setUrl(this._lastUrl, true);
    }
    /** @internal */
    _push(urlMatcher, params, options) {
        const url = urlMatcher._format(params);
        if (!isNull(url)) {
            this._setUrl(url, !!options.replace);
        }
    }
    /** @internal */
    _href(urlMatcher, params, options) {
        let url = urlMatcher._format(params);
        if (isNull(url))
            return null;
        const html5Mode = this._locationConfig.html5Mode;
        const isHtml5 = typeof html5Mode === "boolean" ? html5Mode : (html5Mode?.enabled ?? true);
        if (!isHtml5) {
            url = `#${this._locationConfig.hashPrefix ?? "!"}${url}`;
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
    _parseHref(href) {
        const baseUrl = new URL(window.location.href);
        const url = new URL(href, baseUrl);
        if (url.origin !== baseUrl.origin)
            return undefined;
        const html5Mode = this._locationConfig.html5Mode;
        const isHtml5 = typeof html5Mode === "boolean" ? html5Mode : (html5Mode?.enabled ?? true);
        if (!isHtml5) {
            const hashPrefix = this._locationConfig.hashPrefix ?? "!";
            const hashUrl = url.hash.slice(1);
            if (!hashUrl.startsWith(hashPrefix))
                return undefined;
            const parsed = new URL(hashUrl.slice(hashPrefix.length), baseUrl.origin);
            return {
                path: decodeURIComponent(parsed.pathname),
                search: parseSearchParams(parsed.searchParams),
                hash: decodeURIComponent(parsed.hash.slice(1)),
            };
        }
        const basePath = stripLastPathElement(this._getBaseHref()).replace(/\/$/, "");
        if (basePath &&
            url.pathname !== basePath &&
            !url.pathname.startsWith(`${basePath}/`)) {
            return undefined;
        }
        return {
            path: decodeURIComponent(url.pathname.slice(basePath.length) || "/"),
            search: parseSearchParams(url.searchParams),
            hash: decodeURIComponent(url.hash.slice(1)),
        };
    }
}
function parseSearchParams(params) {
    const result = {};
    params.forEach((value, key) => {
        const current = result[key];
        result[key] = isDefined(current)
            ? Array.isArray(current)
                ? current.concat(value)
                : [current, value]
            : value;
    });
    return result;
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
