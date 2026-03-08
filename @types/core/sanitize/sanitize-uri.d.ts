import type { SanitizerFn } from "./interface.ts";
/**
 * Private service to sanitize uris for links and images. Used by $compile.
 */
export declare class SanitizeUriProvider {
  _aHrefSanitizationTrustedUrlList: RegExp;
  _imgSrcSanitizationTrustedUrlList: RegExp;
  $get: [string, ($window: Window) => SanitizerFn];
  /**
   * Creates the URI sanitizer provider with the default trusted URL patterns.
   */
  constructor();
  /**
   * Gets or sets the trusted URL whitelist used for anchor `href` values.
   */
  aHrefSanitizationTrustedUrlList(
    regexp?: RegExp,
  ): RegExp | SanitizeUriProvider;
  /**
   * Gets or sets the trusted URL whitelist used for image/media sources.
   */
  imgSrcSanitizationTrustedUrlList(
    regexp?: RegExp,
  ): RegExp | SanitizeUriProvider;
}
