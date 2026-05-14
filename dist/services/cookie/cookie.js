import { isDefined, isString, isNullOrUndefined, isInstanceOf, isNumber, nullObject } from '../../shared/utils.js';
import { validateIsString, validateRequired, BADARG } from '../../shared/validate.js';

/**
 * Service provider that creates a {@link CookieService $cookie} service.
 */
class CookieProvider {
    constructor() {
        this.$get = () => new CookieService(this.defaults);
        this.defaults = {};
    }
}
/**
 *
 * High-level API for reading, writing, serializing, and removing browser
 * cookies through the injectable `$cookie` service.
 */
class CookieService {
    /**
     * Accepts the default cookie attributes defined by `$cookiesProvider.defaults`.
     */
    constructor(defaults) {
        this._defaults = defaults;
    }
    /**
     * Retrieves a raw cookie value.
     *
     * @param key - Cookie name to read.
     * @returns The decoded cookie value, or `null` when not set.
     * @throws {URIError} – If decodeURIComponent fails.
     */
    get(key) {
        validateIsString(key, "key");
        const all = parseCookies();
        return all[key] || null;
    }
    /**
     * Retrieves a cookie and deserializes its JSON content.
     *
     * @template T
     * @param key - Cookie name to read.
     * @returns The parsed value, or `null` when not set.
     * @throws {SyntaxError} if cookie JSON is invalid
     */
    getObject(key) {
        validateIsString(key, "key");
        const raw = this.get(key);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    /**
     * Returns an object containing all raw cookies.
     *
     * @throws {URIError} – If decodeURIComponent fails
     */
    getAll() {
        return parseCookies();
    }
    /**
     * Sets a raw cookie value.
     *
     * @param key - Cookie name to write.
     * @param value - String value to write.
     * @param options - Cookie attributes for this write.
     * @throws {URIError} if key or value cannot be encoded
     */
    put(key, value, options = {}) {
        validateIsString(key, "key");
        validateIsString(value, "value");
        const encodedKey = encodeURIComponent(key);
        const encodedVal = encodeURIComponent(value);
        document.cookie = `${encodedKey}=${encodedVal}${buildOptions({
            ...this._defaults,
            ...options,
        })}`;
    }
    /**
     * Serializes an object as JSON and stores it as a cookie.
     *
     * @param key - Cookie name to write.
     * @param value - JSON-serializable value.
     * @param options - Cookie attributes for this write.
     * @throws {TypeError} if Object cannot be converted to JSON
     */
    putObject(key, value, options) {
        validateIsString(key, "key");
        validateRequired(value, "value");
        const str = JSON.stringify(value);
        this.put(key, str, options);
    }
    /**
     * Removes a cookie by setting an expired date.
     *
     * @param key - Cookie name to remove.
     * @param options - Cookie attributes that must match the existing cookie.
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
let _lastCookieMap = nullObject();
/** @throws {URIError} – If decodeURIComponent fails */
function parseCookies() {
    const current = document.cookie;
    // Fast path: return cached object if nothing changed
    if (current === _lastCookieString) {
        return _lastCookieMap;
    }
    _lastCookieString = current;
    const out = nullObject();
    if (!current) {
        _lastCookieMap = out;
        return out;
    }
    const parts = current.split("; ");
    for (const part of parts) {
        const eq = part.indexOf("=");
        if (eq === -1)
            continue; // skip malformed cookie
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
 * @throws {TypeError} if any of options are invalid
 */
function buildOptions(opts = {}) {
    const parts = [];
    const rawOptions = opts;
    const { path, domain, expires, secure, samesite: sameSiteOption, } = rawOptions;
    // Path
    if (isDefined(path)) {
        if (!isString(path))
            throw new TypeError(`${BADARG}:path ${describeOptionValue(path)}`);
        parts.push(`path=${path}`);
    }
    // Domain
    if (isDefined(domain)) {
        if (!isString(domain))
            throw new TypeError(`${BADARG}:domain ${describeOptionValue(domain)}`);
        parts.push(`domain=${domain}`);
    }
    // Expires
    if (!isNullOrUndefined(expires)) {
        let expDate;
        if (isInstanceOf(expires, Date)) {
            expDate = expires;
        }
        else if (isNumber(expires) || isString(expires)) {
            expDate = new Date(expires);
        }
        else {
            throw new TypeError(`${BADARG}:expires ${describeOptionValue(expires)}`);
        }
        if (isNaN(expDate.getTime())) {
            throw new TypeError(`${BADARG}:expires ${describeOptionValue(expires)}`);
        }
        parts.push(`expires=${expDate.toUTCString()}`);
    }
    // Secure
    if (secure) {
        parts.push("secure");
    }
    // SameSite
    if (isDefined(sameSiteOption)) {
        if (!isString(sameSiteOption))
            throw new TypeError(`${BADARG}:samesite ${describeOptionValue(sameSiteOption)}`);
        const samesite = sameSiteOption.toLowerCase();
        if (!["lax", "strict", "none"].includes(samesite)) {
            throw new TypeError(`${BADARG}:samesite ${sameSiteOption}`);
        }
        parts.push(`samesite=${samesite}`);
    }
    // Join all parts with semicolons
    return parts.length ? `;${parts.join(";")}` : "";
}
function describeOptionValue(value) {
    if (isString(value) || isNumber(value) || typeof value === "boolean") {
        return String(value);
    }
    if (isInstanceOf(value, Date)) {
        return value.toString();
    }
    return Object.prototype.toString.call(value);
}

export { CookieProvider, CookieService };
