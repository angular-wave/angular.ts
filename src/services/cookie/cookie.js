import { $injectTokens } from "../../injection-tokens.js";
import {
  assert,
  isDefined,
  isFunction,
  isNullOrUndefined,
  isNumber,
  isObject,
  isString,
} from "../../shared/utils.js";

/**
 * Service provider that creates a {@link ng.CookieService $cookie} service.
 * @type {ng.ServiceProvider}
 */
export class CookieProvider {
  constructor() {
    this.defaults = {};
  }

  $get = [
    $injectTokens.$exceptionHandler,
    /** @param {ng.ExceptionHandlerService} $exceptionHandler  */
    ($exceptionHandler) => new CookieService(this.defaults, $exceptionHandler),
  ];
}

/**
 * $cookies service class
 *
 * Provides high-level APIs for interacting with browser cookies:
 *  - Raw get/set/remove
 *  - JSON serialization helpers
 *  - Global defaults supplied by $cookiesProvider
 */
export class CookieService {
  /**
   * @param {ng.CookieOptions} defaults
   *   Default cookie attributes defined by `$cookiesProvider.defaults`.
   * @param {ng.ExceptionHandlerService} $exceptionHandler
   */
  constructor(defaults, $exceptionHandler) {
    assert(isObject(defaults), "badarg");
    assert(isFunction($exceptionHandler), "badarg");
    /** @type {ng.CookieOptions} */
    this.defaults = Object.freeze({ ...defaults });
    this.$exceptionHandler = $exceptionHandler;
  }

  /**
   * Retrieves a raw cookie value.
   *
   * @param {string} key
   * @returns {string|null}
   */
  get(key) {
    assert(isString(key), "badarg");
    const all = parseCookies();
    return all[key] || null;
  }

  /**
   * Retrieves a cookie and deserializes its JSON content.
   *
   * @template T
   * @param {string} key
   * @returns {T|null}
   * @throws {SyntaxError} if cookie JSON is invalid
   */
  getObject(key) {
    assert(isString(key), "badarg");
    const raw = this.get(key);
    if (!raw) return null;
    try {
      return /** @type {T} */ (JSON.parse(raw));
    } catch (err) {
      const error = new SyntaxError(`badparse: "${key}" => ${err.message}`);
      this.$exceptionHandler(error);
      throw error;
    }
  }

  /**
   * Returns an object containing all raw cookies.
   *
   * @returns {Record<string, string>}
   */
  getAll() {
    return parseCookies();
  }

  /**
   * Sets a raw cookie value.
   *
   * @param {string} key
   * @param {string} value
   * @param {ng.CookieOptions} [options]
   */
  put(key, value, options = {}) {
    assert(isString(key), "badarg: key");
    assert(isString(value), "badarg: value");
    const encodedKey = encodeURIComponent(key);
    const encodedVal = encodeURIComponent(value);

    try {
      document.cookie =
        `${encodedKey}=${encodedVal}` +
        buildOptions({ ...this.defaults, ...options });
    } catch (e) {
      this.$exceptionHandler(e);
      throw e;
    }
  }

  /**
   * Serializes an object as JSON and stores it as a cookie.
   *
   * @param {string} key
   * @param {any} value
   * @param {ng.CookieOptions} [options]
   * @throws {TypeError} if Object cannot be converted to JSON
   */
  putObject(key, value, options) {
    assert(isString(key), "badarg: key");
    assert(!isNullOrUndefined(key), "badarg: key");
    try {
      const str = JSON.stringify(value);
      this.put(key, str, options);
    } catch (err) {
      const error = new TypeError(`badserialize: "${key}" => ${err.message}`);
      this.$exceptionHandler(error);
      throw error;
    }
  }

  /**
   * Removes a cookie by setting an expired date.
   *
   * @param {string} key
   * @param {ng.CookieOptions} [options]
   */
  remove(key, options = {}) {
    assert(isString(key), "badarg");
    this.put(key, "", {
      ...this.defaults,
      ...options,
      expires: new Date(0),
    });
  }
}

/*----------Helpers----------*/

/**
 * @returns {Record<string,string>}
 */
function parseCookies() {
  /** @type {Record<string, string>} */
  const out = {};
  if (!document.cookie) return out;

  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue; // skip malformed cookie
    const key = decodeURIComponent(part.substring(0, eq));
    const val = decodeURIComponent(part.substring(eq + 1));
    out[key] = val;
  }
  return out;
}

/**
 * Build cookie options string from an options object.
 * Safely validates types for path, domain, expires, secure, and samesite.
 *
 * @param {ng.CookieOptions} opts
 * @returns {string}
 * @throws {TypeError} if any of options are invalid
 */
function buildOptions(opts = {}) {
  const parts = [];

  // Path
  if (isDefined(opts.path)) {
    if (!isString(opts.path)) throw new TypeError(`badarg:path ${opts.path}`);
    parts.push(`path=${opts.path}`);
  }

  // Domain
  if (isDefined(opts.domain)) {
    if (!isString(opts.domain))
      throw new TypeError(`badarg:domain ${opts.domain}`);
    parts.push(`domain=${opts.domain}`);
  }

  // Expires
  if (opts.expires != null) {
    let expDate;

    if (opts.expires instanceof Date) {
      expDate = opts.expires;
    } else if (isNumber(opts.expires) || isString(opts.expires)) {
      expDate = new Date(opts.expires);
    } else {
      throw new TypeError(`badarg:expires ${String(opts.expires)}`);
    }

    if (isNaN(expDate.getTime())) {
      throw new TypeError(`badarg:expires ${String(opts.expires)}`);
    }

    parts.push(`expires=${expDate.toUTCString()}`);
  }

  // Secure
  if (opts.secure) {
    parts.push("secure");
  }

  // SameSite
  if (isDefined(opts.samesite)) {
    if (!isString(opts.samesite))
      throw new TypeError(`badarg:samesite ${opts.samesite}`);
    const s = opts.samesite.toLowerCase();
    if (!["lax", "strict", "none"].includes(s)) {
      throw new TypeError(`badarg:samesite ${opts.samesite}`);
    }
    parts.push(`samesite=${s}`);
  }

  // Join all parts with semicolons
  return parts.length ? ";" + parts.join(";") : "";
}
