import { trimEmptyHash, urlResolve } from "../../shared/url-utils/url-utils.js";
import {
  encodeUriSegment,
  entries,
  equals,
  isDefined,
  isNull,
  isNumber,
  isObject,
  isString,
  isUndefined,
  minErr,
  parseKeyValue,
  startsWith,
  toKeyValue,
} from "../../shared/utils.js";
import { getBaseHref } from "../../shared/dom.js";
import { $injectTokens as $t } from "../../injection-tokens.js";

const PATH_MATCH = /^([^?#]*)(\?([^#]*))?(#(.*))?$/;

const $locationMinErr = minErr("$location");

let urlUpdatedByLocation = false;

/**
 * @ignore
 * The pathname, beginning with "/"
 * @type {string}
 */
let _path;

/**
 * @type {Object.<string, string|number|boolean|Array<string|number|boolean>>}
 */
let _search;

/**
 * @ignore
 * The hash string, minus the hash symbol
 * @type {string}
 */
let _hash;

export class Location {
  /**
   * @param {string} appBase application base URL
   * @param {string} appBaseNoFile application base URL stripped of any filename
   * @param {boolean} [html5] Defaults to true
   * @param {string} [prefix] URL path prefix for html5 mode or hash prefix for hashbang mode
   */
  constructor(appBase, appBaseNoFile, html5 = true, prefix) {
    /** @type {string} */
    this.appBase = appBase;

    /** @type {string} */
    this.appBaseNoFile = appBaseNoFile;

    /** @type {boolean} */
    this.html5 = html5;

    /** @type {string | undefined} */
    this.basePrefix = html5 ? prefix || "" : undefined;

    /** @type {string | undefined} */
    this.hashPrefix = html5 ? undefined : prefix;

    /**
     * An absolute URL is the full URL, including protocol (http/https ), the optional subdomain (e.g. www ), domain (example.com), and path (which includes the directory and slug)
     * with all segments encoded according to rules specified in [RFC 3986](http://www.ietf.org/rfc/rfc3986.txt).
     * @type {string}
     */
    this.absUrl = "";

    /**
     * @ignore
     * Current url
     * @type {string}
     */
    this._url = undefined;

    /**
     * @ignore
     * Callback to update browser url
     * @type {Function | undefined}
     */
    this._updateBrowser = undefined;
  }

  /**
   * Change path, search and hash, when called with parameter and return `$location`.
   *
   * @param {string} url New URL without base prefix (e.g. `/path?a=b#hash`)
   * @return {Location} url
   */
  setUrl(url) {
    const match = PATH_MATCH.exec(url);

    if (match[1] !== undefined || url === "") {
      this.setPath(match[1] || "");
    }

    if (match[2] !== undefined || match[1] !== undefined || url === "") {
      this.setSearch(match[3] || "");
    }

    this.setHash(match[5] || "");

    return this;
  }

  /**
   * Return URL (e.g. `/path?a=b#hash`) when called without any parameter.
   *
   * @return {string} url
   */
  getUrl() {
    return this._url;
  }

  /**
   * Change path parameter and return `$location`.
   *
   * @param {(string|number)} path New path
   * @return {Location}
   */
  setPath(path) {
    const newPath = path !== null ? path.toString() : "";

    _path = newPath.charAt(0) === "/" ? newPath : `/${newPath}`;
    this._compose();

    return this;
  }

  /**
   *
   * Return path of current URL
   *
   * @return {string}
   */
  getPath() {
    return _path;
  }

  /**
   * Changes the hash fragment when called with a parameter and returns `$location`.
   * @param {(string|number)} hash New hash fragment
   * @return {Location} hash
   */
  setHash(hash) {
    _hash = hash !== null ? hash.toString() : "";
    this._compose();

    return this;
  }

  /**
   * Returns the hash fragment when called without any parameters.
   * @return {string} hash
   */
  getHash() {
    return _hash;
  }

  /**
   * Sets the search part (as object) of current URL
   *
   * @param {string|Object} search New search params - string or hash object.
   * @param {(string|number|Array<string>|boolean)=} paramValue If search is a string or number, then paramValue will override only a single search property.
   * @returns {Object} Search object or Location object
   */
  setSearch(search, paramValue) {
    switch (arguments.length) {
      case 1:
        if (isString(search) || isNumber(search)) {
          search = search.toString();
          _search = parseKeyValue(search);
        } else if (isObject(search)) {
          search = structuredClone(search, {});
          // remove object undefined or null properties
          entries(search).forEach(([key, value]) => {
            if (isNull(value)) delete search[key];
          });

          _search = search;
        } else {
          throw $locationMinErr(
            "isrcharg",
            "The first argument of the `$location#search()` call must be a string or an object.",
          );
        }
        break;
      default:
        if (isUndefined(paramValue) || paramValue === null) {
          delete _search[search];
        } else {
          _search[search] = paramValue;
        }
    }

    this._compose();

    return this;
  }

  /**
   * Returns the search part (as object) of current URL
   *
   * @returns {Object} Search object or Location object
   */
  getSearch() {
    return _search;
  }

  /**
   * @private
   * Compose url and update `url` and `absUrl` property
   */
  _compose() {
    this._url = normalizePath(_path, _search, _hash);
    this.absUrl = this.html5
      ? this.appBaseNoFile + this._url.substring(1)
      : this.appBase + (this._url ? this.hashPrefix + this._url : "");
    urlUpdatedByLocation = true;
    setTimeout(() => this._updateBrowser && this._updateBrowser());
  }

  /**
   * Change the history state object when called with one parameter and return `$location`.
   * The state object is later passed to `pushState` or `replaceState`.
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/History/pushState#state|History.state}
   *
   * NOTE: This method is supported only in HTML5 mode and only in browsers supporting
   * the HTML5 History API (i.e. methods `pushState` and `replaceState`). If you need to support
   * older browsers (like IE9 or Android < 4.0), don't use this method.
   * @param {any} state
   * @returns {Location}
   */
  setState(state) {
    if (!this.html5) {
      throw $locationMinErr(
        "nostate",
        "History API state support is available only in HTML5 mode",
      );
    }
    // The user might modify `stateObject` after invoking `$location.setState(stateObject)`
    // but we're changing the $$state reference to $browser.state() during the $digest
    // so the modification window is narrow.
    this.$$state = isUndefined(state) ? null : state;
    urlUpdatedByLocation = true;

    return this;
  }

  /**
   * Return the history state object
   * @returns {any}
   */
  getState() {
    return this.$$state;
  }

  /**
   * @param {string} url
   * @param {string} relHref
   * @returns {boolean}
   */
  parseLinkUrl(url, relHref) {
    if (this.html5) {
      if (relHref && relHref[0] === "#") {
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

        if (
          this.basePrefix &&
          isDefined((appUrl = stripBaseUrl(this.basePrefix, appUrl)))
        ) {
          rewrittenUrl =
            this.appBaseNoFile + (stripBaseUrl("/", appUrl) || appUrl);
        } else {
          rewrittenUrl = this.appBase + prevAppUrl;
        }
      } else if (isDefined((appUrl = stripBaseUrl(this.appBaseNoFile, url)))) {
        rewrittenUrl = this.appBaseNoFile + appUrl;
      } else if (this.appBaseNoFile === `${url}/`) {
        rewrittenUrl = this.appBaseNoFile;
      }

      if (rewrittenUrl) {
        this.parse(rewrittenUrl);
      }

      return !!rewrittenUrl;
    } else {
      if (stripHash(this.appBase) === stripHash(url)) {
        this.parse(url);

        return true;
      }

      return false;
    }
  }

  /**
   * Parse given HTML5 (regular) URL string into properties
   * @param {string} url HTML5 URL
   */
  parse(url) {
    if (this.html5) {
      const pathUrl = stripBaseUrl(this.appBaseNoFile, url);

      if (!isString(pathUrl)) {
        throw $locationMinErr(
          "ipthprfx",
          'Invalid url "{0}", missing path prefix "{1}".',
          url,
          this.appBaseNoFile,
        );
      }

      parseAppUrl(pathUrl, true);

      if (!_path) {
        _path = "/";
      }

      this._compose();
    } else {
      const withoutBaseUrl =
        stripBaseUrl(this.appBase, url) ||
        stripBaseUrl(this.appBaseNoFile, url);

      let withoutHashUrl;

      if (!isUndefined(withoutBaseUrl) && withoutBaseUrl.charAt(0) === "#") {
        // The rest of the URL starts with a hash so we have
        // got either a hashbang path or a plain hash fragment
        withoutHashUrl = stripBaseUrl(this.hashPrefix, withoutBaseUrl);

        if (isUndefined(withoutHashUrl)) {
          // There was no hashbang prefix so we just have a hash fragment
          withoutHashUrl = withoutBaseUrl;
        }
      } else {
        // There was no hashbang path nor hash fragment:
        // If we are in HTML5 mode we use what is left as the path;
        // Otherwise we ignore what is left
        if (this.html5) {
          withoutHashUrl = withoutBaseUrl;
        } else {
          withoutHashUrl = "";

          if (isUndefined(withoutBaseUrl)) {
            this.appBase = url;
          }
        }
      }

      parseAppUrl(withoutHashUrl, false);

      _path = removeWindowsDriveName(_path, withoutHashUrl, this.appBase);

      this._compose();

      /*
       * In Windows, on an anchor node on documents loaded from
       * the filesystem, the browser will return a pathname
       * prefixed with the drive name ('/C:/path') when a
       * pathname without a drive is set:
       *  * a.setAttribute('href', '/foo')
       *   * a.pathname === '/C:/foo' //true
       *
       * Inside of AngularTS, we're always using pathnames that
       * do not include drive names for routing.
       */
      function removeWindowsDriveName(path, urlParam, base) {
        /*
        Matches paths for file protocol on windows,
        such as /C:/foo/bar, and captures only /foo/bar.
        */
        const windowsFilePathExp = /^\/[A-Z]:(\/.*)/;

        // Get the relative path from the input URL.
        if (startsWith(urlParam, base)) {
          urlParam = urlParam.replace(base, "");
        }

        // The input URL intentionally contains a first path segment that ends with a colon.
        if (windowsFilePathExp.exec(urlParam)) {
          return path;
        }

        const firstPathSegmentMatch = windowsFilePathExp.exec(path);

        return firstPathSegmentMatch ? firstPathSegmentMatch[1] : path;
      }
    }
  }
}

export class LocationProvider {
  constructor() {
    /** @type {string} */
    this.hashPrefixConf = "!";

    /** @type {import("./interface.ts").Html5Mode} */
    this.html5ModeConf = {
      enabled: true,
      requireBase: false,
      rewriteLinks: true,
    };

    /** @private @type {Array<import("./interface.ts").UrlChangeListener>} */
    this._urlChangeListeners = [];
    /** @private */
    this._urlChangeInit = false;

    /** @private @type {History['state']} */
    this._cachedState = null;
    /** @private @type {History['state']} */
    this._lastHistoryState = null;
    /** @private @type {string} */
    this._lastBrowserUrl = window.location.href;
    this.cacheState();
  }

  /// ///////////////////////////////////////////////////////////
  // URL API
  /// ///////////////////////////////////////////////////////////

  /**
   * Updates the browser's current URL and history state.
   *
   * @param {string|undefined} url - The target URL to navigate to.
   * @param {*} [state=null] - Optional history state object to associate with the new URL.
   * @returns {LocationProvider}
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
      history.pushState(state, "", url);
      this.cacheState();
    }

    return this;
  }

  /**
   * Returns the current URL with any empty hash (`#`) removed.
   * @return {string}
   */
  getBrowserUrl() {
    return trimEmptyHash(window.location.href);
  }

  /**
   * Returns the cached state.
   * @returns {History['state']} The cached state.
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
    const currentState = history.state ?? null;

    if (!equals(currentState, this.lastCachedState)) {
      this._cachedState = currentState;
      this.lastCachedState = currentState;
      this._lastHistoryState = currentState;
    }
  }

  /**
   * Fires the state or URL change event.
   */
  #fireStateOrUrlChange() {
    const prevLastHistoryState = this._lastHistoryState;

    this.cacheState();

    if (
      this._lastBrowserUrl === this.getBrowserUrl() &&
      prevLastHistoryState === this._cachedState
    ) {
      return;
    }
    this._lastBrowserUrl = this.getBrowserUrl();
    this._lastHistoryState = this._cachedState;
    this._urlChangeListeners.forEach((listener) => {
      listener(trimEmptyHash(window.location.href), this._cachedState);
    });
  }

  /**
   * Registers a callback to be called when the URL changes.
   *
   * @param {import("./interface.ts").UrlChangeListener} callback - The callback function to register.
   * @returns void
   */
  #onUrlChange(callback) {
    if (!this._urlChangeInit) {
      window.addEventListener(
        "popstate",
        this.#fireStateOrUrlChange.bind(this),
      );
      window.addEventListener(
        "hashchange",
        this.#fireStateOrUrlChange.bind(this),
      );
      this._urlChangeInit = true;
    }
    this._urlChangeListeners.push(callback);
  }

  $get = [
    $t._rootScope,
    $t._rootElement,
    $t._exceptionHandler,
    /**
     *
     * @param {ng.Scope} $rootScope
     * @param {Element} $rootElement
     * @param {ng.ExceptionHandlerService} $exceptionHandler
     * @returns {Location}
     */
    ($rootScope, $rootElement, $exceptionHandler) => {
      const baseHref = getBaseHref(); // if base[href] is undefined, it defaults to ''

      const initialUrl = trimEmptyHash(window.location.href);

      let appBase;

      if (this.html5ModeConf.enabled) {
        if (!baseHref && this.html5ModeConf.requireBase) {
          throw $locationMinErr(
            "nobase",
            "$location in HTML5 mode requires a <base> tag to be present!",
          );
        }
        appBase = serverBase(initialUrl) + (baseHref || "/");
      } else {
        appBase = stripHash(initialUrl);
      }
      const appBaseNoFile = stripFile(appBase);

      const $location = new Location(
        appBase,
        appBaseNoFile,
        this.html5ModeConf.enabled,
        `#${this.hashPrefixConf}`,
      );

      $location.parseLinkUrl(initialUrl, initialUrl);

      $location.$$state = this.state();

      const IGNORE_URI_REGEXP = /^\s*(javascript|mailto):/i;

      const setBrowserUrlWithFallback = (url, state) => {
        const oldUrl = $location.getUrl();

        const oldState = $location.$$state;

        try {
          this.setUrl(url, state);

          // Make sure $location.getState() returns referentially identical (not just deeply equal)
          // state object; this makes possible quick checking if the state changed in the digest
          // loop. Checking deep equality would be too expensive.
          $location.$$state = this.state();
        } catch (err) {
          // Restore old values if pushState fails
          $location.setUrl(/** @type {string} */ (oldUrl));
          $location.$$state = oldState;
          $exceptionHandler(err);
        }
      };

      $rootElement.addEventListener(
        "click",
        /** @param {MouseEvent} event */
        (event) => {
          const { rewriteLinks } = this.html5ModeConf;
          // TODO(vojta): rewrite link when opening in new tab/window (in legacy browser)
          // currently we open nice url link and redirect then

          if (
            !rewriteLinks ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.button === 2
          ) {
            return;
          }
          let elm = /** @type {HTMLElement} */ (event.target);

          // traverse the DOM up to find first A tag
          while (elm.nodeName.toLowerCase() !== "a") {
            // ignore rewriting if no A tag (reached root element, or no parent - removed from document)

            if (elm === $rootElement || !(elm = elm.parentElement)) return;
          }

          if (
            isString(rewriteLinks) &&
            isUndefined(elm.getAttribute(/** @type {string} */ (rewriteLinks)))
          ) {
            return;
          }

          let absHref = /** @type {HTMLAnchorElement} */ (elm).href;

          // get the actual href attribute - see
          // http://msdn.microsoft.com/en-us/library/ie/dd347148(v=vs.85).aspx
          const relHref =
            elm.getAttribute("href") || elm.getAttribute("xlink:href");

          if (
            isObject(absHref) &&
            absHref.toString() === "[object SVGAnimatedString]"
          ) {
            // SVGAnimatedString.animVal should be identical to SVGAnimatedString.baseVal, unless during
            // an animation.

            const scvAnimatedString = /** @type {unknown} */ (absHref);

            absHref = new URL(
              /** @type {SVGAnimatedString } */ (scvAnimatedString).animVal,
            ).href;
          }

          // Ignore when url is started with javascript: or mailto:
          if (IGNORE_URI_REGEXP.test(absHref)) return;

          if (
            absHref &&
            !elm.getAttribute("target") &&
            !event.defaultPrevented
          ) {
            if ($location.parseLinkUrl(absHref, relHref)) {
              // We do a preventDefault for all urls that are part of the AngularTS application,
              // in html5mode and also without, so that we are able to abort navigation without
              // getting double entries in the location history.
              event.preventDefault();
            }
          }
        },
      );

      // rewrite hashbang url <> html5 url
      if ($location.absUrl !== initialUrl) {
        this.setUrl($location.absUrl, true);
      }

      let initializing = true;

      // update $location when $browser url changes
      this.#onUrlChange((newUrl, newState) => {
        if (!startsWith(newUrl, appBaseNoFile)) {
          // If we are navigating outside of the app then force a reload
          window.location.href = newUrl;

          return;
        }

        queueMicrotask(() => {
          const oldUrl = $location.absUrl;

          const oldState = $location.$$state;

          $location.parse(newUrl);
          $location.$$state = newState;

          const { defaultPrevented } = $rootScope.$broadcast(
            "$locationChangeStart",
            newUrl,
            oldUrl,
            newState,
            oldState,
          );

          // if the location was changed by a `$locationChangeStart` handler then stop
          // processing this location change
          if ($location.absUrl !== newUrl) return;

          if (defaultPrevented) {
            $location.parse(oldUrl);
            $location.$$state = oldState;
            setBrowserUrlWithFallback(oldUrl, oldState);
          } else {
            initializing = false;
            afterLocationChange(oldUrl, oldState);
          }
        });
      });

      // update browser
      const updateBrowser = () => {
        if (initializing || urlUpdatedByLocation) {
          urlUpdatedByLocation = false;

          const oldUrl = /** @type {string} */ (this.getBrowserUrl());

          let newUrl = $location.absUrl;

          const oldState = this.state();

          const urlOrStateChanged =
            !urlsEqual(oldUrl, newUrl) ||
            ($location.html5 && oldState !== $location.$$state);

          if (initializing || urlOrStateChanged) {
            initializing = false;

            setTimeout(() => {
              newUrl = $location.absUrl;

              const { defaultPrevented } = $rootScope.$broadcast(
                "$locationChangeStart",
                $location.absUrl,
                oldUrl,
                $location.$$state,
                oldState,
              );

              // if the location was changed by a `$locationChangeStart` handler then stop
              // processing this location change
              if ($location.absUrl !== newUrl) return;

              if (defaultPrevented) {
                $location.parse(oldUrl);
                $location.$$state = oldState;
              } else {
                if (urlOrStateChanged) {
                  setBrowserUrlWithFallback(
                    newUrl,
                    oldState === $location.$$state ? null : $location.$$state,
                  );
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

      /**
       * @param {string} oldUrl
       * @param {any} oldState
       */
      function afterLocationChange(oldUrl, oldState) {
        $rootScope.$broadcast(
          "$locationChangeSuccess",
          $location.absUrl,
          oldUrl,
          $location.$$state,
          oldState,
        );
      }
    },
  ];
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
 * @param {string} path - The URL path string to encode. May contain multiple segments separated by `/`.
 * @returns {string} The encoded path, where each segment is encoded, but forward slashes are preserved.
 *
 * @example
 * encodePath("user profile/images/pic 1.jpg")
 * // returns "user%20profile/images/pic%201.jpg"
 *
 * @example
 * encodePath("folder1%2Fsub/folder2")
 * // returns "folder1%2Fsub/folder2"
 */
export function encodePath(path) {
  const segments = path.split("/");

  let i = segments.length;

  while (i--) {
    // Decode any existing encodings (e.g. %20, %2F) to prevent double-encoding
    // But keep slashes intact (they were split on)
    const decodedSegment = decodeURIComponent(
      segments[i].replace(/%2F/gi, "/"),
    );

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
 * @param {string} path - The URL path to decode.
 * @param {boolean} html5Mode - If true, encodes forward slashes in segments as "%2F".
 * @returns {string} The decoded path with segments optionally encoding slashes.
 */
export function decodePath(path, html5Mode) {
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
 * @param {string} pathValue - The base URL path (e.g., "folder/item name").
 * @param {Object.<string, any> | string | null} searchValue - An object or string representing query parameters.
 *   - If an object, it can contain strings, numbers, booleans, or arrays of values.
 *   - If a string, it is assumed to be a raw query string.
 *   - If null or undefined, no query string is added.
 * @param {string | null} hashValue - The URL fragment (everything after `#`). If null or undefined, no hash is added.
 *
 * @returns {string} The normalized URL path including encoded path, optional query string, and optional hash.
 *
 * @example
 * normalizePath("products/list", { category: "books", page: 2 }, "section1")
 * // returns "products/list?category=books&page=2#section1"
 *
 * @example
 * normalizePath("user profile/images", null, null)
 * // returns "user%20profile/images"
 */
export function normalizePath(pathValue, searchValue, hashValue) {
  const search = toKeyValue(searchValue);

  const hash = hashValue ? `#${encodeUriSegment(hashValue)}` : "";

  const path = encodePath(pathValue);

  return path + (search ? `?${search}` : "") + hash;
}

/**
 * @ignore
 * Parses the application URL and updates the location object with path, search, and hash.
 *
 * @param {string} url - The URL string to parse.
 * @param {boolean} html5Mode - Whether HTML5 mode is enabled (affects decoding).
 * @throws Will throw an error if the URL starts with invalid slashes.
 */
export function parseAppUrl(url, html5Mode) {
  if (/^\s*[\\/]{2,}/.test(url)) {
    throw $locationMinErr("badpath", 'Invalid url "{0}".', url);
  }

  const prefixed = url.charAt(0) !== "/";

  if (prefixed) {
    url = `/${url}`;
  }
  const match = urlResolve(url);

  const path =
    prefixed && match.pathname.charAt(0) === "/"
      ? match.pathname.substring(1)
      : match.pathname;

  _path = decodePath(path, html5Mode);
  _search = parseKeyValue(match.search);
  _hash = decodeURIComponent(match.hash);

  // make sure path starts with '/';
  if (_path && _path.charAt(0) !== "/") {
    _path = `/${_path}`;
  }
}

/**
 * @ignore
 * Returns the substring of `url` after the `base` string if `url` starts with `base`.
 * Returns `undefined` if `url` does not start with `base`.
 * @param {string} base
 * @param {string} url
 * @returns {string|undefined} returns text from `url` after `base` or `undefined` if it does not begin with
 *                   the expected string.
 */
export function stripBaseUrl(base, url) {
  if (startsWith(url, base)) {
    return url.substring(base.length);
  }

  return undefined;
}

/**
 * @ignore
 * Removes the hash fragment (including the '#') from the given URL string.
 *
 * @param {string} url - The URL string to process.
 * @returns {string} The URL without the hash fragment.
 */
export function stripHash(url) {
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
 * @param {string} url - The URL from which to strip the file name and hash.
 * @returns {string} The base path of the URL, ending with a slash.
 */
export function stripFile(url) {
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
 * @param {string} url - The full URL to extract the server base from.
 * @returns {string} The server base, including scheme and host (and port if present).
 */
export function serverBase(url) {
  const start = url.indexOf("//") + 2;

  const slashIndex = url.indexOf("/", start);

  return slashIndex === -1 ? url : url.substring(0, slashIndex);
}

/**
 * @ignore
 * Determine if two URLs are equal despite potential differences in encoding,
 * trailing slashes, or empty hash fragments, such as between $location.absUrl() and $browser.url().
 *
 * @param {string} x - First URL to compare.
 * @param {string} y - Second URL to compare.
 * @returns {boolean} True if URLs are equivalent after normalization.
 */
export function urlsEqual(x, y) {
  return normalizeUrl(x) === normalizeUrl(y);
}

/**
 * @ignore
 * Normalize a URL by resolving it via a DOM anchor element,
 * removing trailing slashes (except root), and trimming empty hashes.
 *
 * @param {string} url - URL to normalize.
 * @returns {string} Normalized URL string.
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
