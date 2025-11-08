import { isString } from "../../shared/utils.js";

const originUrl = urlResolve(window.location.href);

/**
 * @param {import("./interface.ts").ResolvableUrl} url
 * @return {import("./interface.ts").ParsedUrl}
 */
export function urlResolve(url) {
  if (!isString(url))
    return /** @type {import("./interface.ts").ParsedUrl} */ (url);

  const urlParsingNode = new URL(
    /** @type {string} */ (url),
    window.location.href,
  );

  const hostname = urlParsingNode.hostname.includes(":")
    ? `[${urlParsingNode.hostname}]`
    : urlParsingNode.hostname;

  return {
    href: urlParsingNode.href,
    protocol: urlParsingNode.protocol,
    host: urlParsingNode.host,
    search: urlParsingNode.search
      ? urlParsingNode.search.replace(/^\?/, "")
      : "",
    hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, "") : "",
    hostname,
    port: urlParsingNode.port,
    pathname:
      urlParsingNode.pathname.charAt(0) === "/"
        ? urlParsingNode.pathname
        : `/${urlParsingNode.pathname}`,
  };
}

/**
 * Parse a request URL and determine whether this is a same-origin request as the application
 * document.
 *
 * @param {import("./interface.ts").ResolvableUrl} requestUrl The url of the request as a string that will be resolved
 * or a parsed URL object.
 * @returns {boolean} Whether the request is for the same origin as the application document.
 */
export function urlIsSameOrigin(requestUrl) {
  return urlsAreSameOrigin(requestUrl, originUrl);
}

/**
 * Parse a request URL and determine whether it is same-origin as the current document base URL.
 *
 * Note: The base URL is usually the same as the document location (`location.href`) but can
 * be overriden by using the `<base>` tag.
 *
 * @param {import("./interface.ts").ResolvableUrl} requestUrl The url of the request as a string that will be resolved
 * or a parsed URL object.
 * @returns {boolean} Whether the URL is same-origin as the document base URL.
 */
export function urlIsSameOriginAsBaseUrl(requestUrl) {
  return urlsAreSameOrigin(requestUrl, document.baseURI);
}

/**
 * Create a function that can check a URL's origin against a list of allowed/trusted origins.
 * The current location's origin is implicitly trusted.
 *
 * @param {string[]} trustedOriginUrls - A list of URLs (strings), whose origins are trusted.
 *
 * @returns {(url: import("./interface.ts").ResolvableUrl) => boolean } - A function that receives a URL (string or parsed URL object) and returns
 *     whether it is of an allowed origin.
 */
export function urlIsAllowedOriginFactory(trustedOriginUrls) {
  const parsedAllowedOriginUrls = [originUrl].concat(
    trustedOriginUrls.map(urlResolve),
  );

  /**
   * Check whether the specified URL (string or parsed URL object) has an origin that is allowed
   * based on a list of trusted-origin URLs. The current location's origin is implicitly
   * trusted.
   *
   * @param {import("./interface.ts").ResolvableUrl} requestUrl - The URL to be checked (provided as a string that will be
   *     resolved or a parsed URL object).
   *
   * @returns {boolean} - Whether the specified URL is of an allowed origin.
   */
  return function urlIsAllowedOrigin(requestUrl) {
    const parsedUrl = urlResolve(requestUrl);
    return parsedAllowedOriginUrls.some(
      urlsAreSameOrigin.bind(null, parsedUrl),
    );
  };
}

/**
 * Determine if two URLs share the same origin.
 *
 * @param {import("./interface.ts").ResolvableUrl} url1 - First URL to compare as a string or a normalized URL in the form of
 *     a dictionary object returned by `urlResolve()`.
 * @param {import("./interface.ts").ResolvableUrl} url2 - Second URL to compare as a string or a normalized URL in the form
 *     of a dictionary object returned by `urlResolve()`.
 *
 * @returns {boolean} - True if both URLs have the same origin, and false otherwise.
 */
export function urlsAreSameOrigin(url1, url2) {
  url1 = urlResolve(url1);
  url2 = urlResolve(url2);

  return url1.protocol === url2.protocol && url1.host === url2.host;
}

/**
 * Removes a trailing hash ('#') from the given URL if it exists.
 *
 * @param {string} url
 * @returns {string}
 */
export function trimEmptyHash(url) {
  return url.replace(/#$/, "");
}
