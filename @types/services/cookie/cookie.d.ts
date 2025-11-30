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
  constructor(defaults: ng.CookieOptions);
  /** @type {CookieOptions} */
  defaults: CookieOptions;
  /**
   * Retrieves a raw cookie value.
   *
   * @param {string} key
   * @returns {string|null}
   */
  get(key: string): string | null;
  /**
   * Retrieves a cookie and deserializes its JSON content.
   *
   * @template T
   * @param {string} key
   * @returns {T|null}
   */
  getObject<T>(key: string): T | null;
  /**
   * Returns an object containing all raw cookies.
   *
   * @returns {Record<string, string>}
   */
  getAll(): Record<string, string>;
  /**
   * Sets a raw cookie value.
   *
   * @param {string} key
   * @param {string} value
   * @param {CookieOptions} [options]
   */
  put(key: string, value: string, options?: CookieOptions): void;
  /**
   * Serializes an object as JSON and stores it as a cookie.
   *
   * @param {string} key
   * @param {any} value
   * @param {CookieOptions} [options]
   */
  putObject(key: string, value: any, options?: CookieOptions): void;
  /**
   * Removes a cookie by setting an expired date.
   *
   * @param {string} key
   * @param {CookieOptions} [options]
   */
  remove(key: string, options?: CookieOptions): void;
}
export class CookieProvider {
  defaults: {};
  $get(): CookieService;
}
export type CookieOptions = import("./interface.ts").CookieOptions;
