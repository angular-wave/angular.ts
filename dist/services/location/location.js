import { trimEmptyHash, urlResolve } from '../../shared/url-utils/url-utils.js';
import { assertDefined, isUndefined, isString, isNumber, deleteProperty, parseKeyValue, isObject, entries, isNull, isDefined, equals, startsWith, encodeUriSegment, toKeyValue, createErrorFactory } from '../../shared/utils.js';
import { getBaseHref } from '../../shared/dom.js';
import { validateRequired } from '../../shared/validate.js';

const PATH_MATCH = /^([^?#]*)(\?([^#]*))?(#(.*))?$/;
const $locationError = createErrorFactory("$location");
const locationCleanupByRootElement = new WeakMap();
/**
 * @ignore
 */
function isLinkRewritingEnabled(rewriteLinks) {
    return !!rewriteLinks;
}
class Location {
    /**
     * @param appBase application base URL
     * @param appBaseNoFile application base URL stripped of any filename
     * @param [html5] Defaults to true
     * @param [prefix] URL path prefix for html5 mode or hash prefix for hashbang mode
     */
    constructor(appBase, appBaseNoFile, html5 = true, prefix) {
        /** @internal */
        this._url = "";
        /** @internal */
        this._state = undefined;
        /** @internal */
        this._path = "";
        /** @internal */
        this._search = {};
        /** @internal */
        this._hash = "";
        /** @internal */
        this._urlUpdatedByLocation = false;
        this.appBase = appBase;
        this.appBaseNoFile = appBaseNoFile;
        this.html5 = html5;
        this.basePrefix = html5 ? (prefix ?? "") : undefined;
        this.hashPrefix = html5 ? undefined : prefix;
        /**
         * An absolute URL is the full URL, including protocol (http/https ), the optional subdomain (e.g. www ), domain (example.com), and path (which includes the directory and slug)
         * with all segments encoded according to rules specified in [RFC 3986](http://www.ietf.org/rfc/rfc3986.txt).
         */
        this.absUrl = "";
    }
    /**
     * Change path, search and hash, when called with parameter and return `$location`.
     *
     * @param url - New URL without base prefix (e.g. `/path?a=b#hash`).
     * @returns The `Location` instance.
     */
    setUrl(url) {
        validateRequired(url, "url");
        const match = PATH_MATCH.exec(url);
        if (!match) {
            throw $locationError("badurl", 'Invalid url "{0}".', url);
        }
        if (match[1] || url === "") {
            this.setPath(match[1] || "");
        }
        if (match[2] || match[1] || url === "") {
            this.setSearch(match[3] || "");
        }
        this.setHash(match[5] || "");
        return this;
    }
    /**
     * Return URL (e.g. `/path?a=b#hash`) when called without any parameter.
     *
     * @returns The current path/search/hash string.
     */
    getUrl() {
        return this._url;
    }
    url(url) {
        return arguments.length ? this.setUrl(assertDefined(url)) : this.getUrl();
    }
    /**
     * Changes the path parameter and returns `$location`.
     *
     * @param path - New path.
     */
    setPath(path) {
        if (isUndefined(path))
            validateRequired(path, "path");
        let newPath = path !== null ? path.toString() : "";
        if (this.html5) {
            newPath = decodePath(newPath, this.html5);
        }
        this._path = newPath.startsWith("/") ? newPath : `/${newPath}`;
        this._compose();
        return this;
    }
    /**
     * Returns the path of the current URL.
     */
    getPath() {
        return this._path;
    }
    path(path) {
        return arguments.length ? this.setPath(path ?? null) : this.getPath();
    }
    /**
     * Changes the hash fragment when called with a parameter and returns `$location`.
     * @param hash - New hash fragment.
     * @returns The `Location` instance.
     */
    setHash(hash) {
        if (isUndefined(hash))
            validateRequired(hash, "hash");
        this._hash = hash !== null ? hash.toString() : "";
        this._compose();
        return this;
    }
    /**
     * Returns the hash fragment when called without any parameters.
     * @returns The current hash fragment.
     */
    getHash() {
        return this._hash;
    }
    hash(hash) {
        return arguments.length ? this.setHash(hash ?? null) : this.getHash();
    }
    /**
     * Sets the search part of the current URL as an object.
     *
     * @param search - New search params as a string or object.
     * @param paramValue - If `search` is a string or number, overrides only a single search property.
     * @returns The `Location` instance.
     */
    setSearch(search, paramValue) {
        validateRequired(search, "search");
        switch (arguments.length) {
            case 1:
                if (isString(search) || isNumber(search)) {
                    search = search.toString();
                    this._search = parseKeyValue(search);
                }
                else if (isObject(search)) {
                    const clonedSearch = structuredClone(search);
                    // remove object undefined or null properties
                    entries(clonedSearch).forEach(([key, value]) => {
                        if (isNull(value))
                            deleteProperty(clonedSearch, key);
                    });
                    this._search = clonedSearch;
                }
                else {
                    throw $locationError("isrcharg", "The first argument of the `$location#search()` call must be a string or an object.");
                }
                break;
            default: {
                if (!isString(search) && !isNumber(search)) {
                    throw $locationError("isrcharg", "The first argument of the `$location#search()` call must be a string or number when setting a single parameter.");
                }
                const searchKey = isString(search) ? search : String(search);
                if (isUndefined(paramValue) || paramValue === null) {
                    deleteProperty(this._search, searchKey);
                }
                else {
                    this._search[searchKey] = paramValue;
                }
                break;
            }
        }
        this._compose();
        return this;
    }
    /**
     * Returns the search part of the current URL as an object.
     *
     * @returns The current search object.
     */
    getSearch() {
        return this._search;
    }
    search(search, paramValue) {
        return arguments.length
            ? this.setSearch(assertDefined(search), paramValue)
            : this.getSearch();
    }
    /**
     * @internal
     * Compose url and update `url` and `absUrl` property
     */
    _compose() {
        this._url = normalizePath(this._path, this._search, this._hash);
        this.absUrl = this.html5
            ? this.appBaseNoFile + this._url.substring(1)
            : this.appBase + (this._url ? (this.hashPrefix ?? "") + this._url : "");
        this._urlUpdatedByLocation = true;
        setTimeout(() => this._updateBrowser?.());
    }
    /**
     * Change the history state object when called with one parameter and return `$location`.
     * The state object is later passed to `pushState` or `replaceState`.
     * See {@link https://developer.mozilla.org/en-US/docs/Web/API/History/pushState#state|History.state}
     *
     * NOTE: This method is supported only in HTML5 mode and only in browsers supporting
     * the HTML5 History API (i.e. methods `pushState` and `replaceState`). If you need to support
     * older browsers (like IE9 or Android < 4.0), don't use this method.
     *
     * @returns The `Location` instance.
     */
    setState(state) {
        if (!this.html5) {
            throw $locationError("nostate", "History API state support is available only in HTML5 mode");
        }
        // The user might modify `stateObject` after invoking `$location.setState(stateObject)`
        // but we're changing the _statereference to $browser.state() during the $digest
        // so the modification window is narrow.
        this._state = state;
        this._urlUpdatedByLocation = true;
        return this;
    }
    /**
     * Returns the current history state object.
     */
    getState() {
        return this._state;
    }
    state(state) {
        return arguments.length ? this.setState(state) : this.getState();
    }
    /** Attempts to parse a clicked link into an app-relative URL update. */
    parseLinkUrl(url, relHref) {
        if (this.html5) {
            if (relHref?.[0] === "#") {
                // special case for links to hash fragments:
                // keep the old url and only replace the hash fragment
                this.setHash(relHref.slice(1));
                return true;
            }
            let appUrl;
            let prevAppUrl;
            let rewrittenUrl;
            if (isDefined((appUrl = stripBaseUrl(this.appBase, url)))) {
                prevAppUrl = appUrl;
                if (this.basePrefix &&
                    isDefined((appUrl = stripBaseUrl(this.basePrefix, appUrl)))) {
                    rewrittenUrl =
                        this.appBaseNoFile + (stripBaseUrl("/", appUrl) ?? appUrl);
                }
                else {
                    rewrittenUrl = this.appBase + prevAppUrl;
                }
            }
            else if (isDefined((appUrl = stripBaseUrl(this.appBaseNoFile, url)))) {
                rewrittenUrl = this.appBaseNoFile + appUrl;
            }
            else if (this.appBaseNoFile === `${url}/`) {
                rewrittenUrl = this.appBaseNoFile;
            }
            if (rewrittenUrl) {
                this.parse(rewrittenUrl);
            }
            return !!rewrittenUrl;
        }
        else {
            if (stripHash(this.appBase) === stripHash(url)) {
                this.parse(url);
                return true;
            }
            return false;
        }
    }
    /**
     * Parse given HTML5 (regular) URL string into properties
     * @param url HTML5 URL
     */
    parse(url) {
        if (this.html5) {
            const pathUrl = stripBaseUrl(this.appBaseNoFile, url);
            if (!isString(pathUrl)) {
                throw $locationError("ipthprfx", 'Invalid url "{0}", missing path prefix "{1}".', url, this.appBaseNoFile);
            }
            const parsed = parseAppUrl(pathUrl, true);
            this._path = parsed.path;
            this._search = parsed.search;
            this._hash = parsed.hash;
            if (!this._path) {
                this._path = "/";
            }
            this._compose();
        }
        else {
            const withoutBaseUrl = stripBaseUrl(this.appBase, url) ??
                stripBaseUrl(this.appBaseNoFile, url);
            let withoutHashUrl = "";
            if (withoutBaseUrl?.charAt(0) === "#") {
                // The rest of the URL starts with a hash so we have
                // got either a hashbang path or a plain hash fragment
                withoutHashUrl =
                    stripBaseUrl(this.hashPrefix ?? "", withoutBaseUrl) ?? withoutBaseUrl;
            }
            else {
                // There was no hashbang path nor hash fragment:
                // If we are in HTML5 mode we use what is left as the path;
                // Otherwise we ignore what is left
                withoutHashUrl = "";
                if (withoutBaseUrl === undefined) {
                    this.appBase = url;
                }
            }
            const parsed = parseAppUrl(withoutHashUrl, false);
            this._path = parsed.path;
            this._search = parsed.search;
            this._hash = parsed.hash;
            this._compose();
        }
    }
}
/**
 * Runtime-owned location policy and browser history state.
 *
 * @internal
 */
class LocationRuntimeState {
    constructor(browserWindow) {
        this.config = {
            hashPrefix: "!",
            html5Mode: {
                enabled: true,
                requireBase: false,
                rewriteLinks: true,
            },
        };
        this._urlChangeListeners = [];
        /** @private */
        this._urlChangeInit = false;
        this._cachedState = null;
        this._lastHistoryState = null;
        this._destroyed = false;
        this._window = browserWindow;
        this._lastBrowserUrl = browserWindow.location.href;
        this.cacheState();
    }
    /// ///////////////////////////////////////////////////////////
    // URL API
    /// ///////////////////////////////////////////////////////////
    /**
     * Updates the browser's current URL and history state.
     *
     * @param url - The target URL to navigate to.
     * @param [state=null] - Optional history state object to associate with the new URL.
     * @returns The runtime state.
     */
    setUrl(url, state) {
        if (state === undefined) {
            state = null;
        }
        if (url) {
            url = new URL(url).href;
            if (this._lastBrowserUrl === url && this._lastHistoryState === state) {
                return this;
            }
            this._lastBrowserUrl = url;
            this._lastHistoryState = state;
            this._window.history.pushState(state, "", url);
            this.cacheState();
        }
        return this;
    }
    /**
     * Returns the current browser URL with any empty hash (`#`) removed.
     *
     * @returns The normalized browser URL.
     */
    getBrowserUrl() {
        return trimEmptyHash(this._window.location.href);
    }
    /**
     * Returns the cached browser history state.
     *
     * @returns The cached history state.
     */
    state() {
        return this._cachedState;
    }
    /**
     * Caches the current state.
     *
     * @private
     */
    cacheState() {
        const currentState = this._window.history.state ?? null;
        if (!equals(currentState, this.lastCachedState)) {
            this._cachedState = currentState;
            this.lastCachedState = currentState;
            this._lastHistoryState = currentState;
        }
    }
    /**
     * @internal
     * Fires the state or URL change event.
     */
    _fireStateOrUrlChange() {
        const prevLastHistoryState = this._lastHistoryState;
        this.cacheState();
        if (this._lastBrowserUrl === this.getBrowserUrl() &&
            prevLastHistoryState === this._cachedState) {
            return;
        }
        this._lastBrowserUrl = this.getBrowserUrl();
        this._lastHistoryState = this._cachedState;
        this._urlChangeListeners.forEach((listener) => {
            listener(trimEmptyHash(this._window.location.href), this._cachedState);
        });
    }
    /**
     * @internal
     * Registers a callback that runs when the browser URL changes.
     *
     * @param callback - Listener invoked with the new URL and history state.
     */
    _onUrlChange(callback) {
        this._assertActive();
        if (!this._urlChangeInit) {
            this._urlChangeHandler ?? (this._urlChangeHandler = this._fireStateOrUrlChange.bind(this));
            this._window.addEventListener("popstate", this._urlChangeHandler);
            this._window.addEventListener("hashchange", this._urlChangeHandler);
            this._urlChangeInit = true;
        }
        this._urlChangeListeners.push(callback);
    }
    /** @internal */
    createService($rootScope, $rootElement, $exceptionHandler) {
        this._assertActive();
        const baseHref = getBaseHref(); // if base[href] is undefined, it defaults to ''
        const initialUrl = trimEmptyHash(this._window.location.href);
        let appBase;
        if (this.config.html5Mode.enabled) {
            if (!baseHref && this.config.html5Mode.requireBase) {
                throw $locationError("nobase", "$location in HTML5 mode requires a <base> tag to be present!");
            }
            appBase = serverBase(initialUrl) + (baseHref || "/");
        }
        else {
            appBase = stripHash(initialUrl);
        }
        const appBaseNoFile = stripFile(appBase);
        const $location = new Location(appBase, appBaseNoFile, this.config.html5Mode.enabled, `#${this.config.hashPrefix}`);
        $location.parseLinkUrl(initialUrl, initialUrl);
        $location._state = this.state();
        let destroyed = false;
        const IGNORE_URI_REGEXP = /^\s*(javascript|mailto):/i;
        locationCleanupByRootElement.get($rootElement)?.();
        const setBrowserUrlWithFallback = (url, state) => {
            const oldUrl = this.getBrowserUrl();
            const oldState = $location._state;
            try {
                this.setUrl(url, state);
                // Make sure $location.getState() returns referentially identical (not just deeply equal)
                // state object; this makes possible quick checking if the state changed in the digest
                // loop. Checking deep equality would be too expensive.
                $location._state = this.state();
            }
            catch (err) {
                // Restore old values if pushState fails
                $location.parse(oldUrl);
                $location._state = oldState;
                $exceptionHandler(err);
            }
        };
        const broadcastRootScopeEvent = (name, ...args) => $rootScope.$broadcast(name, ...args);
        const clickHandler = ((event) => {
            const { rewriteLinks } = this.config.html5Mode;
            // TODO(vojta): rewrite link when opening in new tab/window (in legacy browser)
            // currently we open nice url link and redirect then
            if (!isLinkRewritingEnabled(rewriteLinks) ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.button === 2) {
                return;
            }
            let elm = event.target;
            // traverse the DOM up to find first A tag
            while (elm.nodeName.toLowerCase() !== "a") {
                // ignore rewriting if no A tag (reached root element, or no parent - removed from document)
                if (elm === $rootElement || !elm.parentElement)
                    return;
                elm = elm.parentElement;
            }
            if (isString(rewriteLinks) && !elm.hasAttribute(rewriteLinks)) {
                return;
            }
            let absHref = elm.href;
            const relHref = elm.getAttribute("href");
            if (!isString(absHref) && "animVal" in absHref) {
                // SVGAnimatedString.animVal should be identical to SVGAnimatedString.baseVal, unless during
                // an animation.
                absHref = new URL(absHref.animVal).href;
            }
            // Ignore when url is started with javascript: or mailto:
            if (IGNORE_URI_REGEXP.test(absHref))
                return;
            if (absHref && !elm.getAttribute("target") && !event.defaultPrevented) {
                if ($location.parseLinkUrl(absHref, relHref)) {
                    // We do a preventDefault for all urls that are part of the AngularTS application,
                    // in html5mode and also without, so that we are able to abort navigation without
                    // getting double entries in the location history.
                    event.preventDefault();
                }
            }
        });
        this._rootClickHandler = clickHandler;
        $rootElement.addEventListener("click", clickHandler);
        const cleanupLocation = () => {
            destroyed = true;
            if (this._rootClickHandler) {
                $rootElement.removeEventListener("click", this._rootClickHandler);
                this._rootClickHandler = undefined;
            }
            if (this._urlChangeHandler) {
                this._window.removeEventListener("popstate", this._urlChangeHandler);
                this._window.removeEventListener("hashchange", this._urlChangeHandler);
                this._urlChangeHandler = undefined;
            }
            this._urlChangeInit = false;
            this._urlChangeListeners.length = 0;
            if (this._serviceCleanup === cleanupLocation) {
                this._serviceCleanup = undefined;
            }
            if (locationCleanupByRootElement.get($rootElement) === cleanupLocation) {
                locationCleanupByRootElement.delete($rootElement);
            }
        };
        this._serviceCleanup = cleanupLocation;
        locationCleanupByRootElement.set($rootElement, cleanupLocation);
        $rootScope.$on("$destroy", () => {
            cleanupLocation();
        });
        // rewrite hashbang url <> html5 url
        if ($location.absUrl !== initialUrl) {
            this.setUrl($location.absUrl, true);
        }
        let initializing = true;
        // update $location when $browser url changes
        this._onUrlChange((newUrl, newState) => {
            if (!startsWith(newUrl, appBaseNoFile)) {
                // If we are navigating outside of the app then force a reload
                this._window.location.href = newUrl;
                return;
            }
            queueMicrotask(() => {
                if (destroyed)
                    return;
                const oldUrl = $location.absUrl;
                const oldState = $location._state;
                $location.parse(newUrl);
                $location._state = newState;
                const { defaultPrevented } = broadcastRootScopeEvent("$locationChangeStart", newUrl, oldUrl, newState, oldState);
                // if the location was changed by a `$locationChangeStart` handler then stop
                // processing this location change
                if ($location.absUrl !== newUrl)
                    return;
                if (defaultPrevented) {
                    $location.parse(oldUrl);
                    $location._state = oldState;
                    setBrowserUrlWithFallback(oldUrl, oldState);
                }
                else {
                    initializing = false;
                    afterLocationChange(oldUrl, oldState);
                }
            });
        });
        // update browser
        const updateBrowser = () => {
            if (initializing || $location._urlUpdatedByLocation) {
                $location._urlUpdatedByLocation = false;
                const oldUrl = this.getBrowserUrl();
                let newUrl = $location.absUrl;
                const oldState = this.state();
                const urlOrStateChanged = !urlsEqual(oldUrl, newUrl) ||
                    ($location.html5 && oldState !== $location._state);
                if (initializing || urlOrStateChanged) {
                    initializing = false;
                    setTimeout(() => {
                        if (destroyed)
                            return;
                        newUrl = $location.absUrl;
                        const { defaultPrevented } = broadcastRootScopeEvent("$locationChangeStart", $location.absUrl, oldUrl, $location._state, oldState);
                        // if the location was changed by a `$locationChangeStart` handler then stop
                        // processing this location change
                        if ($location.absUrl !== newUrl)
                            return;
                        if (defaultPrevented) {
                            $location.parse(oldUrl);
                            $location._state = oldState;
                        }
                        else {
                            if (urlOrStateChanged) {
                                setBrowserUrlWithFallback(newUrl, oldState === $location._state ? null : $location._state);
                            }
                            afterLocationChange(oldUrl, oldState);
                        }
                    });
                }
            }
        };
        $location._updateBrowser = updateBrowser;
        updateBrowser();
        $rootScope.$on("$updateBrowser", updateBrowser);
        return $location;
        function afterLocationChange(oldUrl, oldState) {
            if (destroyed)
                return;
            broadcastRootScopeEvent("$locationChangeSuccess", $location.absUrl, oldUrl, $location._state, oldState);
        }
    }
    /** @internal */
    destroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        this._serviceCleanup?.();
        this._serviceCleanup = undefined;
        if (this._urlChangeHandler) {
            this._window.removeEventListener("popstate", this._urlChangeHandler);
            this._window.removeEventListener("hashchange", this._urlChangeHandler);
            this._urlChangeHandler = undefined;
        }
        this._urlChangeInit = false;
        this._urlChangeListeners.length = 0;
        this._rootClickHandler = undefined;
    }
    /** @internal */
    _assertActive() {
        if (this._destroyed) {
            throw new Error("Location runtime has already been disposed.");
        }
    }
}
/** @internal */
function createLocationRuntimeState(browserWindow) {
    return new LocationRuntimeState(browserWindow);
}
/** @internal */
function applyLocationConfiguration(state, config) {
    state._assertActive();
    if (config.html5Mode !== undefined) {
        Object.assign(state.config.html5Mode, typeof config.html5Mode === "boolean"
            ? { enabled: config.html5Mode }
            : config.html5Mode);
    }
    if (config.hashPrefix !== undefined) {
        state.config.hashPrefix = config.hashPrefix;
    }
}
/**
 * ///////////////////////////
 *     PRIVATE HELPERS
 * ///////////////////////////
 */
/**
 * @ignore
 * Encodes a URL path by encoding each path segment individually using `encodeUriSegment`,
 * while preserving forward slashes (`/`) as segment separators.
 *
 * This function first decodes any existing percent-encodings (such as `%20` or `%2F`)
 * in each segment to prevent double encoding, except for encoded forward slashes (`%2F`),
 * which are replaced with literal slashes before decoding to keep path boundaries intact.
 *
 * After decoding, each segment is re-encoded with `encodeUriSegment` according to RFC 3986,
 * encoding only characters that must be encoded in a path segment.
 *
 * The encoded segments are then rejoined with `/` to form the encoded path.
 *
 * @param path - The URL path string to encode. May contain multiple segments separated by `/`.
 * @returns The encoded path, where each segment is encoded, but forward slashes are preserved.
 *
 * @example
 * encodePath("user profile/images/pic 1.jpg")
 * // returns "user%20profile/images/pic%201.jpg"
 *
 * @example
 * encodePath("folder1%2Fsub/folder2")
 * // returns "folder1%2Fsub/folder2"
 */
function encodePath(path) {
    const segments = path.split("/");
    let i = segments.length;
    while (i--) {
        // Decode any existing encodings (e.g. %20, %2F) to prevent double-encoding
        // But keep slashes intact (they were split on)
        const decodedSegment = decodeURIComponent(segments[i].replace(/%2F/gi, "/"));
        segments[i] = encodeUriSegment(decodedSegment);
    }
    return segments.join("/");
}
/**
 * @ignore
 * Decodes each segment of a URL path.
 *
 * Splits the input path by "/", decodes each segment using decodeURIComponent,
 * and if html5Mode is enabled, re-encodes any forward slashes inside segments
 * as "%2F" to avoid confusion with path separators.
 *
 * @param path - The URL path to decode.
 * @param html5Mode - If true, encodes forward slashes in segments as "%2F".
 * @returns The decoded path with segments optionally encoding slashes.
 */
function decodePath(path, html5Mode) {
    const segments = path.split("/");
    let i = segments.length;
    while (i--) {
        segments[i] = decodeURIComponent(segments[i]);
        if (html5Mode) {
            // encode forward slashes to prevent them from being mistaken for path separators
            segments[i] = segments[i].replace(/\//g, "%2F");
        }
    }
    return segments.join("/");
}
/**
 * @ignore
 * Normalizes a URL path by encoding the path segments, query parameters, and hash fragment.
 *
 * - Path segments are encoded using `encodePath`, which encodes each segment individually.
 * - Query parameters (`searchValue`) are converted to a query string using `toKeyValue`.
 * - Hash fragment (`hashValue`) is encoded using `encodeUriSegment` and prefixed with `#`.
 *
 * This function returns a fully constructed URL path with optional query and hash components.
 *
 * @param pathValue - The base URL path (e.g., "folder/item name").
 * @param searchValue - An object or string representing query parameters.
 *   - If an object, it can contain strings, numbers, booleans, or arrays of values.
 *   - If a string, it is assumed to be a raw query string.
 *   - If null or undefined, no query string is added.
 * @param hashValue - The URL fragment (everything after `#`). If null or undefined, no hash is added.
 *
 * @returns The normalized URL path including encoded path, optional query string, and optional hash.
 *
 * @example
 * normalizePath("products/list", { category: "books", page: 2 }, "section1")
 * // returns "products/list?category=books&page=2#section1"
 *
 * @example
 * normalizePath("user profile/images", null, null)
 * // returns "user%20profile/images"
 */
function normalizePath(pathValue, searchValue, hashValue) {
    const search = toKeyValue(searchValue ?? null);
    const hash = hashValue ? `#${encodeUriSegment(hashValue)}` : "";
    const path = encodePath(pathValue);
    return path + (search ? `?${search}` : "") + hash;
}
/**
 * @ignore
 * Parses an application URL into isolated path, search, and hash values.
 *
 * @param url - The URL string to parse.
 * @param html5Mode - Whether HTML5 mode is enabled (affects decoding).
 * @throws Will throw an error if the URL starts with invalid slashes.
 */
function parseAppUrl(url, html5Mode) {
    if (/^\s*[\\/]{2,}/.test(url)) {
        throw $locationError("badpath", 'Invalid url "{0}".', url);
    }
    const prefixed = !url.startsWith("/");
    if (prefixed) {
        url = `/${url}`;
    }
    const match = urlResolve(url);
    const path = prefixed && match.pathname.startsWith("/")
        ? match.pathname.substring(1)
        : match.pathname;
    let parsedPath = decodePath(path, html5Mode);
    // make sure path starts with '/';
    if (parsedPath && !parsedPath.startsWith("/")) {
        parsedPath = `/${parsedPath}`;
    }
    return {
        path: parsedPath,
        search: parseKeyValue(match.search),
        hash: decodeURIComponent(match.hash),
    };
}
/**
 * @ignore
 * Returns the substring of `url` after the `base` string if `url` starts with `base`.
 * Returns `undefined` if `url` does not start with `base`.
 * @returns Text from `url` after `base`, or `undefined` if it does not begin with the expected string.
 */
function stripBaseUrl(base, url) {
    if (startsWith(url, base)) {
        return url.substring(base.length);
    }
    return undefined;
}
/**
 * @ignore
 * Removes the hash fragment (including the '#') from the given URL string.
 *
 * @param url - The URL string to process.
 * @returns The URL without the hash fragment.
 */
function stripHash(url) {
    const index = url.indexOf("#");
    return index === -1 ? url : url.substring(0, index);
}
/**
 * @ignore
 * Removes the file name (and any hash) from a URL, returning the base directory path.
 *
 * For example:
 * - Input: "https://example.com/path/to/file.js"
 *   Output: "https://example.com/path/to/"
 *
 * - Input: "https://example.com/path/to/file.js#section"
 *   Output: "https://example.com/path/to/"
 *
 * @param url - The URL from which to strip the file name and hash.
 * @returns The base path of the URL, ending with a slash.
 */
function stripFile(url) {
    return url.substring(0, stripHash(url).lastIndexOf("/") + 1);
}
/**
 * @ignore
 * Extracts the base server URL (scheme, host, and optional port) from a full URL.
 *
 * If no path is present, returns the full URL.
 *
 * For example:
 * - Input: "https://example.com/path/to/file"
 *   Output: "https://example.com"
 *
 * - Input: "http://localhost:3000/api/data"
 *   Output: "http://localhost:3000"
 *
 * @param url - The full URL to extract the server base from.
 * @returns The server base, including scheme and host (and port if present).
 */
function serverBase(url) {
    const start = url.indexOf("//") + 2;
    const slashIndex = url.indexOf("/", start);
    return slashIndex === -1 ? url : url.substring(0, slashIndex);
}
/**
 * @ignore
 * Determines if two URLs are equal despite potential differences in encoding,
 * trailing slashes, or empty hash fragments, such as between $location.absUrl() and $browser.url().
 *
 * @param x - First URL to compare.
 * @param y - Second URL to compare.
 * @returns `true` if URLs are equivalent after normalization.
 */
function urlsEqual(x, y) {
    return normalizeUrl(x) === normalizeUrl(y);
}
/**
 * @ignore
 * Normalizes a URL by resolving it via a DOM anchor element,
 * removing trailing slashes (except root), and trimming empty hashes.
 *
 * @param url - URL to normalize.
 * @returns The normalized URL string.
 */
function normalizeUrl(url) {
    const anchor = document.createElement("a");
    anchor.href = url;
    let normalized = anchor.href;
    // Remove trailing slash unless it's root (e.g., https://example.com/)
    if (normalized.endsWith("/") && !/^https?:\/\/[^/]+\/$/.test(normalized)) {
        normalized = normalized.slice(0, -1);
    }
    // Remove empty hash (e.g., https://example.com/foo# -> https://example.com/foo)
    if (normalized.endsWith("#")) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}

export { Location, LocationRuntimeState, applyLocationConfiguration, createLocationRuntimeState, decodePath, encodePath, isLinkRewritingEnabled, normalizePath, parseAppUrl, serverBase, stripBaseUrl, stripFile, stripHash, urlsEqual };
