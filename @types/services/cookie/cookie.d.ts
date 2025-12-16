/**
 * Service provider that creates a {@link CookieService $cookie} service.
 * @type {ng.ServiceProvider}
 */
export class CookieProvider {
  /** @type {ng.CookieOptions} */
  defaults: ng.CookieOptions;
  $get: () => CookieService;
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
   */
  constructor(defaults: ng.CookieOptions);
  /** @private @type {ng.CookieOptions} */
  private _defaults;
  /**
   * Retrieves a raw cookie value.
   *
   * @param {string} key
   * @returns {string|null}
   * @throws {URIError} – If decodeURIComponent fails.
   */
  get(key: string): string | null;
  /**
   * Retrieves a cookie and deserializes its JSON content.
   *
   * @template T
   * @param {string} key
   * @returns {T|null}
   * @throws {SyntaxError} if cookie JSON is invalid
   */
  getObject<T>(key: string): T | null;
  /**
   * Returns an object containing all raw cookies.
   *
   * @returns {Record<string, string>}
   * @throws {URIError} – If decodeURIComponent fails
   */
  getAll(): Record<string, string>;
  /**
   * Sets a raw cookie value.
   *
   * @param {string} key
   * @param {string} value
   * @param {ng.CookieOptions} [options]
   * @throws {URIError} if key or value cannot be encoded
   */
  put(key: string, value: string, options?: ng.CookieOptions): void;
  /**
   * Serializes an object as JSON and stores it as a cookie.
   *
   * @param {string} key
   * @param {any} value
   * @param {ng.CookieOptions} [options]
   * @throws {TypeError} if Object cannot be converted to JSON
   */
  putObject(key: string, value: any, options?: ng.CookieOptions): void;
  /**
   * Removes a cookie by setting an expired date.
   *
   * @param {string} key
   * @param {ng.CookieOptions} [options]
   */
  remove(key: string, options?: ng.CookieOptions): void;
}
