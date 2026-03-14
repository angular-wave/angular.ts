import { isDefined } from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";
import type { SanitizerFn } from "./interface.ts";

export class SanitizeUriProvider {
  _aHrefSanitizationTrustedUrlList: RegExp;
  _imgSrcSanitizationTrustedUrlList: RegExp;
  $get: [string, ($window: Window) => SanitizerFn];

  constructor() {
    this._aHrefSanitizationTrustedUrlList =
      /^\s*(https?|s?ftp|mailto|tel|file):/;
    this._imgSrcSanitizationTrustedUrlList =
      /^\s*((https?|ftp|file|blob):|data:image\/)/;

    this.$get = [
      $injectTokens._window,
      ($window: Window): SanitizerFn => {
        return (uri, isMediaUrl) => {
          if (!uri) {
            return uri;
          }

          const regex = isMediaUrl
            ? this._imgSrcSanitizationTrustedUrlList
            : this._aHrefSanitizationTrustedUrlList;
          const normalizedVal = new URL(uri.trim(), $window.location.href).href;

          if (normalizedVal !== "" && !normalizedVal.match(regex)) {
            return `unsafe:${normalizedVal}`;
          }

          return uri;
        };
      },
    ];
  }

  aHrefSanitizationTrustedUrlList(
    regexp?: RegExp,
  ): RegExp | SanitizeUriProvider {
    if (isDefined(regexp)) {
      this._aHrefSanitizationTrustedUrlList = regexp;
      return this;
    }

    return this._aHrefSanitizationTrustedUrlList;
  }

  imgSrcSanitizationTrustedUrlList(
    regexp?: RegExp,
  ): RegExp | SanitizeUriProvider {
    if (isDefined(regexp)) {
      this._imgSrcSanitizationTrustedUrlList = regexp;
      return this;
    }

    return this._imgSrcSanitizationTrustedUrlList;
  }
}
