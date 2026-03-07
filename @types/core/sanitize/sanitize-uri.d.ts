import type { SanitizerFn } from "./interface.ts";
export declare class SanitizeUriProvider {
  _aHrefSanitizationTrustedUrlList: RegExp;
  _imgSrcSanitizationTrustedUrlList: RegExp;
  $get: [string, ($window: Window) => SanitizerFn];
  constructor();
  aHrefSanitizationTrustedUrlList(
    regexp?: RegExp,
  ): RegExp | SanitizeUriProvider;
  imgSrcSanitizationTrustedUrlList(
    regexp?: RegExp,
  ): RegExp | SanitizeUriProvider;
}
