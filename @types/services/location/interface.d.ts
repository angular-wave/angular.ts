/**
 * A callback function that gets called when the browser URL or state changes.
 *
 * @param url - The new URL after the change (with trailing `#` removed).
 * @param state - The new history state associated with the URL (`history.state`).
 * @returns void
 */
export type UrlChangeListener = (url: string, state: History["state"]) => void;
/**
 * Represents the configuration options for HTML5 mode.
 */
export interface Html5Mode {
  /**
   * If true, will rely on `history.pushState` to change URLs where supported.
   * Falls back to hash-prefixed paths in browsers that do not support `pushState`.
   * @default false
   */
  enabled: boolean;
  /**
   * When html5Mode is enabled, specifies whether or not a `<base>` tag is required to be present.
   * If both `enabled` and `requireBase` are true, and a `<base>` tag is not present,
   * an error will be thrown when `$location` is injected.
   * @default true
   */
  requireBase: boolean;
  /**
   * When html5Mode is enabled, enables or disables URL rewriting for relative links.
   * If set to a string, URL rewriting will only apply to links with an attribute that matches the given string.
   * For example, if set to `'internal-link'`, URL rewriting will only occur for `<a internal-link>` links.
   * Attribute name normalization does not apply here.
   * @default true
   */
  rewriteLinks: boolean | string;
}
/**
 * Represents default port numbers for various protocols.
 */
export interface DefaultPorts {
  http: number;
  https: number;
  ftp: number;
}
/**
 * Represents the individual components of a URL.
 */
export interface UrlParts {
  /**
   * The URL path (e.g. `/dashboard`, `/users/123`).
   */
  path: string;
  /**
   * The parsed query string as an object.
   * Mirrors AngularJS’s `$location.setSearch()` format.
   */
  search: Object;
  /**
   * The fragment identifier (everything after `#`, not including the `#` itself).
   */
  hash: string;
}
