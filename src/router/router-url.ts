import { getBaseHref } from "../shared/dom.ts";
import { stripLastPathElement } from "../shared/strings.ts";
import { isDefined, isNull } from "../shared/utils.ts";
import { UrlMatcher } from "./url/url-matcher.ts";
import type { RawParams } from "./params/interface.ts";
import type { StateParams } from "./params/state-params.ts";

/**
 * Owns URL reads, writes, and href formatting for the router runtime.
 *
 * @internal
 */
export class RouterUrlRuntime {
  /** @internal */
  _location!: ng.LocationService;
  /** @internal */
  _locationProvider: ng.LocationProvider;
  /** @internal */
  _baseHref!: string;
  /** @internal */
  _lastUrl!: string;

  constructor($locationProvider: ng.LocationProvider) {
    this._locationProvider = $locationProvider;
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
  _update(read?: boolean | undefined): void {
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
    const url = urlMatcher._format(params || {});

    if (!isNull(url)) {
      this._url(url, options && !!options.replace);
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
    options = options || { absolute: false };
    const isHtml5 = this._locationProvider.html5ModeConf.enabled;

    if (!isHtml5) {
      url = `#${this._locationProvider.hashPrefixConf}${url}`;
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
