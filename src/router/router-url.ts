import { getBaseHref } from "../shared/dom.ts";
import { stripLastPathElement } from "../shared/strings.ts";
import { isDefined, isNull } from "../shared/utils.ts";
import type { UrlMatcher } from "./url/url-matcher.ts";
import type { RawParams } from "./params/interface.ts";
import type { StateParams } from "./params/state-params.ts";
import type { LocationConfig } from "../services/location/location.ts";

/**
 * Owns URL reads, writes, and href formatting for the router runtime.
 *
 * @internal
 */
export class RouterUrlRuntime {
  /** @internal */
  _location!: ng.LocationService;
  /** @internal */
  _locationConfig: LocationConfig;
  /** @internal */
  _baseHref!: string;
  /** @internal */
  _lastUrl!: string;

  constructor(locationConfig: LocationConfig) {
    this._locationConfig = locationConfig;
  }

  /** @internal */
  _init($location: ng.LocationService): void {
    this._location = $location;
  }

  /** @internal */
  _path(): string {
    return this._location.getPath();
  }

  /** @internal */
  _search(): RawParams {
    return this._location.getSearch() as RawParams;
  }

  /** @internal */
  _hash(): string {
    return this._location.getHash();
  }

  /** @internal */
  _getBaseHref(): string {
    return (
      this._baseHref ||
      (this._baseHref = getBaseHref() || window.location.pathname)
    );
  }

  /** @internal */
  _url(newUrl?: string, state?: unknown): string {
    if (isDefined(newUrl)) {
      this._location.setUrl(decodeURIComponent(newUrl));
    }

    if (state) this._location.setState(state);

    return this._location.getUrl();
  }

  /** @internal */
  _update(read?: boolean): void {
    if (read) {
      this._lastUrl = this._url();

      return;
    }

    if (this._url() === this._lastUrl) return;
    this._url(this._lastUrl, true);
  }

  /** @internal */
  _push(
    urlMatcher: UrlMatcher,
    params: StateParams,
    options: { replace?: boolean },
  ): void {
    const url = urlMatcher._format(params);

    if (!isNull(url)) {
      this._url(url, !!options.replace);
    }
  }

  /** @internal */
  _href(
    urlMatcher: UrlMatcher,
    params: RawParams,
    options: { absolute?: boolean },
  ): string | null {
    let url = urlMatcher._format(params);

    if (isNull(url)) return null;
    const html5Mode = this._locationConfig.html5Mode;
    const isHtml5 =
      typeof html5Mode === "boolean" ? html5Mode : (html5Mode?.enabled ?? true);

    if (!isHtml5) {
      url = `#${this._locationConfig.hashPrefix ?? "!"}${url}`;
    }
    url = appendBasePath(url, isHtml5, options.absolute, this._getBaseHref());

    if (!options.absolute || !url) {
      return url;
    }
    const slash = !isHtml5 && url ? "/" : "";

    return [
      `${window.location.protocol}//`,
      window.location.host,
      slash,
      url,
    ].join("");
  }

  /** @internal */
  _parseHref(
    href: string,
  ): { path: string; search: RawParams; hash: string } | undefined {
    const baseUrl = new URL(window.location.href);
    const url = new URL(href, baseUrl);

    if (url.origin !== baseUrl.origin) return undefined;

    const html5Mode = this._locationConfig.html5Mode;
    const isHtml5 =
      typeof html5Mode === "boolean" ? html5Mode : (html5Mode?.enabled ?? true);

    if (!isHtml5) {
      const hashPrefix = this._locationConfig.hashPrefix ?? "!";
      const hashUrl = url.hash.slice(1);

      if (!hashUrl.startsWith(hashPrefix)) return undefined;

      const parsed = new URL(hashUrl.slice(hashPrefix.length), baseUrl.origin);

      return {
        path: decodeURIComponent(parsed.pathname),
        search: parseSearchParams(parsed.searchParams),
        hash: decodeURIComponent(parsed.hash.slice(1)),
      };
    }

    const basePath = stripLastPathElement(this._getBaseHref()).replace(
      /\/$/,
      "",
    );

    if (
      basePath &&
      url.pathname !== basePath &&
      !url.pathname.startsWith(`${basePath}/`)
    ) {
      return undefined;
    }

    return {
      path: decodeURIComponent(url.pathname.slice(basePath.length) || "/"),
      search: parseSearchParams(url.searchParams),
      hash: decodeURIComponent(url.hash.slice(1)),
    };
  }
}

function parseSearchParams(params: URLSearchParams): RawParams {
  const result: RawParams = {};

  params.forEach((value, key) => {
    const current = result[key];

    result[key] = isDefined(current)
      ? Array.isArray(current)
        ? (current as unknown[]).concat(value)
        : [current, value]
      : value;
  });

  return result;
}

function appendBasePath(
  url: string,
  isHtml5: boolean,
  absolute: boolean | undefined,
  baseHref: string,
): string {
  if (baseHref === "/") return url;

  if (isHtml5) return stripLastPathElement(baseHref) + url;

  if (absolute) return baseHref.slice(1) + url;

  return url;
}
