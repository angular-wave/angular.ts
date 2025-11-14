import { isDefined } from "../../shared/utils.js";

/** @typedef {import('../../interface.ts').ServiceProvider} ServiceProvider */

/**
 * Private service to sanitize uris for links and images. Used by $compile.
 * @implements {ServiceProvider}
 */
export class SanitizeUriProvider {
  constructor() {
    /**
     * @private
     * @type {RegExp}
     */
    this._aHrefSanitizationTrustedUrlList =
      /^\s*(https?|s?ftp|mailto|tel|file):/;

    /**
     * @private
     * @type {RegExp}
     */
    this._imgSrcSanitizationTrustedUrlList =
      /^\s*((https?|ftp|file|blob):|data:image\/)/;
  }

  /**
   * Retrieves or overrides the regexp used to trust URLs for a[href] sanitization.
   *
   * @param {RegExp=} regexp New regexp to trust URLs with.
   * @returns {RegExp|SanitizeUriProvider} Current regexp if no param, or self for chaining.
   */
  aHrefSanitizationTrustedUrlList(regexp) {
    if (isDefined(regexp)) {
      this._aHrefSanitizationTrustedUrlList = regexp;
      return this;
    }
    return this._aHrefSanitizationTrustedUrlList;
  }

  /**
   * Retrieves or overrides the regexp used to trust URLs for img[src] sanitization.
   *
   * @param {RegExp=} regexp New regexp to trust URLs with.
   * @returns {RegExp|SanitizeUriProvider} Current regexp if no param, or self for chaining.
   */
  imgSrcSanitizationTrustedUrlList(regexp) {
    if (isDefined(regexp)) {
      this._imgSrcSanitizationTrustedUrlList = regexp;
      return this;
    }
    return this._imgSrcSanitizationTrustedUrlList;
  }

  /**
   * @returns {import("./interface").SanitizerFn}
   */
  $get = [
    "$window",
    /** @param {ng.WindowService} $window */
    ($window) => {
      return /** @type {import("./interface").SanitizerFn} */ (
        (uri, isMediaUrl) => {
          if (!uri) return uri;

          /** @type {RegExp} */
          const regex = isMediaUrl
            ? this._imgSrcSanitizationTrustedUrlList
            : this._aHrefSanitizationTrustedUrlList;

          const normalizedVal = new URL(uri.trim(), $window.location.href).href;

          if (normalizedVal !== "" && !normalizedVal.match(regex)) {
            return `unsafe:${normalizedVal}`;
          }
          return uri;
        }
      );
    },
  ];
}
