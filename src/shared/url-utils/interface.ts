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
