import { $injectTokens } from "../../injection-tokens.js";
import {
  assert,
  isDefined,
  isNullOrUndefined,
  isNumber,
  isString,
} from "../../shared/utils.js";
import {
  validateIsString,
  validateRequired,
  BADARGVALUE,
  BADARG,
} from "../../shared/validate.js";

/**
 * Service provider that creates a {@link CookieService $cookie} service.
 * @type {ng.ServiceProvider}
 */
export class CookieProvider {
  constructor() {
    this.defaults = {};
  }

  $get = [
    $injectTokens._exceptionHandler,
    /** @param {ng.ExceptionHandlerService} $exceptionHandler  */
    ($exceptionHandler) => new CookieService(this.defaults, $exceptionHandler),
  ];
}

/**
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
    /** @type {ng.CookieOptions} */
    this._defaults = Object.freeze({ ...defaults });
    this._$exceptionHandler = $exceptionHandler;
  }

  /**
   * Retrieves a raw cookie value.
   *
   * @param {string} key
   * @returns {string|null}
   * @throws {URIError} – If decodeURIComponent fails.
   */
  get(key) {
    validateIsString(key, "key");

    try {
      const all = parseCookies();

      return all[key] || null;
    } catch (err) {
      throw this._$exceptionHandler(err);
    }
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
    validateIsString(key, "key");

    const raw = this.get(key);

    if (!raw) return null;

    try {
      return /** @type {T} */ (JSON.parse(raw));
    } catch (err) {
      throw this._$exceptionHandler(
        new SyntaxError(`badparse: "${key}" => ${err.message}`),
      );
    }
  }

  /**
   * Returns an object containing all raw cookies.
   *
   * @returns {Record<string, string>}
   * @throws {URIError} – If decodeURIComponent fails
   */
  getAll() {
    try {
      return parseCookies();
    } catch (err) {
      return this._$exceptionHandler(err);
    }
  }

  /**
   * Sets a raw cookie value.
   *
   * @param {string} key
   * @param {string} value
   * @param {ng.CookieOptions} [options]
   */
  put(key, value, options = {}) {
    validateIsString(key, "key");
    validateIsString(value, "value");
    const encodedKey = encodeURIComponent(key);

    const encodedVal = encodeURIComponent(value);

    try {
      document.cookie = `${encodedKey}=${encodedVal}${buildOptions({
        ...this._defaults,
        ...options,
      })}`;
    } catch (err) {
      this._$exceptionHandler(err);
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
    validateIsString(key, "key");
    validateRequired(value, "value");
    assert(!isNullOrUndefined(value), BADARGVALUE);

    try {
      const str = JSON.stringify(value);

      this.put(key, str, options);
    } catch (err) {
      this._$exceptionHandler(
        new TypeError(`badserialize: "${key}" => ${err.message}`),
      );
    }
  }

  /**
   * Removes a cookie by setting an expired date.
   *
   * @param {string} key
   * @param {ng.CookieOptions} [options]
   */
  remove(key, options = {}) {
    validateIsString(key, "key");
    this.put(key, "", {
      ...this._defaults,
      ...options,
      expires: new Date(0),
    });
  }
}

/*----------Helpers----------*/

// Internal cache
let _lastCookieString = "";

/** @type {Record<string, string>} */
let _lastCookieMap = Object.create(null);

/**
 * @returns {Record<string,string>}
 * @throws {URIError} – If decodeURIComponent fails
 */
function parseCookies() {
  const current = document.cookie;

  // Fast path: return cached object if nothing changed
  if (current === _lastCookieString) {
    return _lastCookieMap;
  }

  _lastCookieString = current;

  /** @type {Record<string, string>} */
  const out = Object.create(null);

  if (!current) {
    _lastCookieMap = out;

    return out;
  }

  const parts = current.split("; ");

  for (const part of parts) {
    const eq = part.indexOf("=");

    if (eq === -1) continue; // skip malformed cookie

    const key = decodeURIComponent(part.substring(0, eq));

    const val = decodeURIComponent(part.substring(eq + 1));

    out[key] = val; // last wins
  }

  _lastCookieMap = out;

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
    if (!isString(opts.path))
      throw new TypeError(`${BADARG}:path ${opts.path}`);
    parts.push(`path=${opts.path}`);
  }

  // Domain
  if (isDefined(opts.domain)) {
    if (!isString(opts.domain))
      throw new TypeError(`${BADARG}:domain ${opts.domain}`);
    parts.push(`domain=${opts.domain}`);
  }

  // Expires
  if (!isNullOrUndefined(opts.expires)) {
    let expDate;

    if (opts.expires instanceof Date) {
      expDate = opts.expires;
    } else if (isNumber(opts.expires) || isString(opts.expires)) {
      expDate = new Date(opts.expires);
    } else {
      throw new TypeError(`${BADARG}:expires ${String(opts.expires)}`);
    }

    if (isNaN(expDate.getTime())) {
      throw new TypeError(`${BADARG}:expires ${String(opts.expires)}`);
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
      throw new TypeError(`${BADARG}:samesite ${opts.samesite}`);
    const samesite = opts.samesite.toLowerCase();

    if (!["lax", "strict", "none"].includes(samesite)) {
      throw new TypeError(`${BADARG}:samesite ${opts.samesite}`);
    }
    parts.push(`samesite=${samesite}`);
  }

  // Join all parts with semicolons
  return parts.length ? `;${parts.join(";")}` : "";
}
