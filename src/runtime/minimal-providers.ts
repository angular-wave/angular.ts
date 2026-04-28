import { isDefined } from "../shared/utils.ts";

export class MinimalSceProvider {
  $get = () => {
    const sce = {
      getTrusted: (_context: unknown, value: unknown) => value,
      getTrustedMediaUrl: (value: unknown) => value,
      trustAs: (_context: unknown, value: unknown) => value,
      valueOf: (value: unknown) => value,
    };

    return sce;
  };
}

export class MinimalSceDelegateProvider {
  _a = /^\s*(https?|s?ftp|mailto|tel|file):/;
  _i = /^\s*((https?|ftp|file|blob):|data:image\/)/;

  aHrefSanitizationTrustedUrlList(regexp?: RegExp) {
    if (isDefined(regexp)) {
      this._a = regexp;

      return this;
    }

    return this._a;
  }

  imgSrcSanitizationTrustedUrlList(regexp?: RegExp) {
    if (isDefined(regexp)) {
      this._i = regexp;

      return this;
    }

    return this._i;
  }

  $get = () => ({
    getTrusted: (_context: unknown, value: unknown) => value,
    trustAs: (_context: unknown, value: unknown) => value,
    valueOf: (value: unknown) => value,
  });
}
