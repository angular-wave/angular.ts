import { isString } from "../utils.ts";

/**
 * A normalized representation of a parsed URL.
 */
export interface ParsedUrl {
  /**
   * The full URL string, including protocol, host, path, query, and hash.
   * Example: "https://example.com:8080/path?query=1#section"
   */
  href: string;

  /**
   * The protocol scheme of the URL, without the trailing colon.
   * Example: "http" or "https"
   */
  protocol: string;

  /**
   * The host part of the URL, including hostname and port (if specified).
   * Example: "example.com:8080"
   */
  host: string;

  /**
   * The query string portion of the URL, without the leading "?".
   * Example: "query=1&sort=asc"
   */
  search: string;

  /**
   * The fragment identifier (hash) of the URL, without the leading "#".
   * Example: "section2"
   */
  hash: string;

  /**
   * The domain or IP address (including IPv6 in brackets) of the URL.
   * Example: "example.com" or "[::1]"
   */
  hostname: string;

  /**
   * The port number of the URL as a string, or an empty string if not specified.
   * Example: "8080" or ""
   */
  port: string;

  /**
   * The path of the URL, always beginning with a leading slash.
   * Example: "/path/to/resource"
   */
  pathname: string;
}

export type ResolvableUrl = string | ParsedUrl;

const originUrl = urlResolve(window.location.href);

/** Resolves a string URL into its parsed browser components. */
export function urlResolve(url: ResolvableUrl): ParsedUrl {
  if (!isString(url)) return url as ParsedUrl;

  const urlParsingNode = new URL(url, window.location.href);

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
 * @param requestUrl - The URL of the request as a string that will be resolved or a
 *     parsed URL object.
 * @returns Whether the request is for the same origin as the application document.
 */
export function urlIsSameOrigin(requestUrl: ResolvableUrl): boolean {
  return urlsAreSameOrigin(requestUrl, originUrl);
}

/**
 * Parse a request URL and determine whether it is same-origin as the current document base URL.
 *
 * Note: The base URL is usually the same as the document location (`location.href`) but can
 * be overriden by using the `<base>` tag.
 *
 * @param requestUrl - The URL of the request as a string that will be resolved or a
 *     parsed URL object.
 * @returns Whether the URL is same-origin as the document base URL.
 */
export function urlIsSameOriginAsBaseUrl(requestUrl: ResolvableUrl): boolean {
  return urlsAreSameOrigin(requestUrl, document.baseURI);
}

/**
 * Create a function that can check a URL's origin against a list of allowed/trusted origins.
 * The current location's origin is implicitly trusted.
 *
 * @param trustedOriginUrls - A list of URLs (strings), whose origins are trusted.
 *
 * @returns A function that receives a URL (string or parsed URL object) and returns
 *     whether it is of an allowed origin.
 */
export function urlIsAllowedOriginFactory(
  trustedOriginUrls: string[],
): (url: ResolvableUrl) => boolean {
  const parsedAllowedOriginUrls = [originUrl].concat(
    trustedOriginUrls.map(urlResolve),
  );

  /**
   * Check whether the specified URL (string or parsed URL object) has an origin that is allowed
   * based on a list of trusted-origin URLs. The current location's origin is implicitly
   * trusted.
   *
   * @param requestUrl - The URL to be checked (provided as a string that will be
   *     resolved or a parsed URL object).
   *
   * @returns Whether the specified URL is of an allowed origin.
   */
  return function urlIsAllowedOrigin(requestUrl: ResolvableUrl): boolean {
    const parsedUrl = urlResolve(requestUrl);

    return parsedAllowedOriginUrls.some(
      urlsAreSameOrigin.bind(null, parsedUrl),
    );
  };
}

/**
 * Determine if two URLs share the same origin.
 *
 * @param url1 - First URL to compare as a string or a normalized URL in the form of
 *     a dictionary object returned by `urlResolve()`.
 * @param url2 - Second URL to compare as a string or a normalized URL in the form
 *     of a dictionary object returned by `urlResolve()`.
 *
 * @returns True if both URLs have the same origin, and false otherwise.
 */
export function urlsAreSameOrigin(
  url1: ResolvableUrl,
  url2: ResolvableUrl,
): boolean {
  url1 = urlResolve(url1);
  url2 = urlResolve(url2);

  return url1.protocol === url2.protocol && url1.host === url2.host;
}

/**
 * Removes a trailing hash ('#') from the given URL if it exists.
 */
export function trimEmptyHash(url: string): string {
  return url.replace(/#$/, "");
}
