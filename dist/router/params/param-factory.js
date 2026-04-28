import { Param, DefType } from './param.js';

class ParamFactory {
    /**
     * @param {UrlConfigProvider} urlServiceConfig
     */
    constructor(urlServiceConfig) {
        this.urlServiceConfig = urlServiceConfig;
    }
    /**
     * @param {string} id
     * @param {ParamType | null} type
     * @param {ng.StateDeclaration} state
     */
    fromConfig(id, type, state) {
        return new Param(id, type, DefType._CONFIG, this.urlServiceConfig, state);
    }
    /**
     * @param {string} id
     * @param {ParamType} type
     * @param {ng.StateDeclaration} state
     */
    fromPath(id, type, state) {
        return new Param(id, type, DefType._PATH, this.urlServiceConfig, state);
    }
    /**
     * @param {string} id
     * @param {ParamType} type
     * @param {ng.StateDeclaration} state
     */
    fromSearch(id, type, state) {
        return new Param(id, type, DefType._SEARCH, this.urlServiceConfig, state);
    }
}

export { ParamFactory };
