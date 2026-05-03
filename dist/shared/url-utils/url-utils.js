import { isString } from '../utils.js';

const originUrl = urlResolve(window.location.href);
/** Resolves a string URL into its parsed browser components. */
function urlResolve(url) {
    if (!isString(url))
        return url;
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
        pathname: urlParsingNode.pathname.charAt(0) === "/"
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
function urlIsSameOrigin(requestUrl) {
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
function urlIsSameOriginAsBaseUrl(requestUrl) {
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
function urlIsAllowedOriginFactory(trustedOriginUrls) {
    const parsedAllowedOriginUrls = [originUrl];
    trustedOriginUrls.forEach((url) => {
        parsedAllowedOriginUrls.push(urlResolve(url));
    });
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
    return function urlIsAllowedOrigin(requestUrl) {
        const parsedUrl = urlResolve(requestUrl);
        for (let i = 0; i < parsedAllowedOriginUrls.length; i++) {
            if (urlsAreSameOrigin(parsedUrl, parsedAllowedOriginUrls[i])) {
                return true;
            }
        }
        return false;
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
function urlsAreSameOrigin(url1, url2) {
    url1 = urlResolve(url1);
    url2 = urlResolve(url2);
    return url1.protocol === url2.protocol && url1.host === url2.host;
}
/**
 * Removes a trailing hash ('#') from the given URL if it exists.
 */
function trimEmptyHash(url) {
    return url.replace(/#$/, "");
}

export { trimEmptyHash, urlIsAllowedOriginFactory, urlIsSameOrigin, urlIsSameOriginAsBaseUrl, urlResolve, urlsAreSameOrigin };
