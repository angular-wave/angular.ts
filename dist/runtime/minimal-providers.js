import { isDefined } from '../shared/utils.js';

class MinimalSceProvider {
    constructor() {
        this.$get = () => {
            const sce = {
                getTrusted: (_context, value) => value,
                getTrustedMediaUrl: (value) => value,
                trustAs: (_context, value) => value,
                valueOf: (value) => value,
            };
            return sce;
        };
    }
}
class MinimalSceDelegateProvider {
    constructor() {
        this._a = /^\s*(https?|s?ftp|mailto|tel|file):/;
        this._i = /^\s*((https?|ftp|file|blob):|data:image\/)/;
        this.$get = () => ({
            getTrusted: (_context, value) => value,
            trustAs: (_context, value) => value,
            valueOf: (value) => value,
        });
    }
    aHrefSanitizationTrustedUrlList(regexp) {
        if (isDefined(regexp)) {
            this._a = regexp;
            return this;
        }
        return this._a;
    }
    imgSrcSanitizationTrustedUrlList(regexp) {
        if (isDefined(regexp)) {
            this._i = regexp;
            return this;
        }
        return this._i;
    }
}

export { MinimalSceDelegateProvider, MinimalSceProvider };
