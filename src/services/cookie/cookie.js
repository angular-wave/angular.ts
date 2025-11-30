/**
 * @typedef {import("./interface.ts").CookieOptions} CookieOptions
 */

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
    const key = decodeURIComponent(part.substring(0, eq));
    const val = decodeURIComponent(part.substring(eq + 1));
    out[key] = val;
  }
  return out;
}

/** Utility: stringify options */
/**
 *
 * @param {CookieOptions} opts
 * @returns {string}
 */
function buildOptions(opts = {}) {
  let s = "";

  if (opts.path) s += `;path=${opts.path}`;
  if (opts.domain) s += `;domain=${opts.domain}`;

  if (opts.expires) {
    const exp =
      opts.expires instanceof Date
        ? opts.expires.toUTCString()
        : new Date(opts.expires).toUTCString();
    s += `;expires=${exp}`;
  }

  if (opts.secure) s += `;secure`;
  if (opts.samesite) s += `;samesite=${opts.samesite}`;

  return s;
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
   */
  constructor(defaults) {
    /** @type {CookieOptions} */
    this.defaults = defaults;
  }

  /**
   * Retrieves a raw cookie value.
   *
   * @param {string} key
   * @returns {string|null}
   */
  get(key) {
    const all = parseCookies();
    return all[key] || null;
  }

  /**
   * Retrieves a cookie and deserializes its JSON content.
   *
   * @template T
   * @param {string} key
   * @returns {T|null}
   */
  getObject(key) {
    const raw = this.get(key);
    if (!raw) return null;
    try {
      return /** @type {T} */ (JSON.parse(raw));
    } catch {
      return null;
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
   * @param {CookieOptions} [options]
   */
  put(key, value, options = {}) {
    const encodedKey = encodeURIComponent(key);
    const encodedVal = encodeURIComponent(value);

    document.cookie =
      `${encodedKey}=${encodedVal}` +
      buildOptions({ ...this.defaults, ...options });
  }

  /**
   * Serializes an object as JSON and stores it as a cookie.
   *
   * @param {string} key
   * @param {any} value
   * @param {CookieOptions} [options]
   */
  putObject(key, value, options) {
    this.put(key, JSON.stringify(value), options);
  }

  /**
   * Removes a cookie by setting an expired date.
   *
   * @param {string} key
   * @param {CookieOptions} [options]
   */
  remove(key, options = {}) {
    this.put(key, "", {
      ...this.defaults,
      ...options,
      expires: new Date(0),
    });
  }
}

export class CookieProvider {
  constructor() {
    this.defaults = {};
  }

  $get() {
    return new CookieService(this.defaults);
  }
}
