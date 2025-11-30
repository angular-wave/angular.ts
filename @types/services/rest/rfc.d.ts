/**
 * RFC 6570 Level 4 URI Template expander
 *
 * Supports operators: (none), +, #, ., /, ;, ?, &
 * Supports varspec modifiers: explode (*) and prefix (:len)
 *
 * Usage:
 *   expandUriTemplate("/users/{id}", { id: 10 }) === "/users/10"
 *   expandUriTemplate("/search{?q,lang}", { q: "a b", lang: "en" }) === "/search?q=a%20b&lang=en"
 *   expandUriTemplate("/repos/{owner}/{repo}/issues{?labels*}", { labels: ["bug","ui"] }) === "/repos/x/y/issues?labels=bug&labels=ui"
 *
 * @param {string} template
 * @param {Object<string, any>} vars
 * @returns {string}
 */
export function expandUriTemplate(
  template: string,
  vars?: {
    [x: string]: any;
  },
): string;
/**
 * Helper: percent-encode a string. If allowReserved true, reserved chars are NOT encoded.
 * @param {string} str
 * @param {boolean} allowReserved
 * @returns {string}
 */
export function pctEncode(str: string, allowReserved: boolean): string;
/**
 * Parse and expand a single expression (content between { and }).
 * @param {string} expression
 * @param {Object<string, any>} vars
 * @returns {string}
 */
export function expandExpression(
  expression: string,
  vars: {
    [x: string]: any;
  },
): string;
