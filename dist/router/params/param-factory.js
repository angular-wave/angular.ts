import { Param, DefType } from './param.js';

class ParamFactory {
    /**
     * @param {UrlParamConfig} urlServiceConfig
     */
    constructor(urlServiceConfig) {
        this._injector = undefined;
        this.urlServiceConfig = urlServiceConfig;
    }
    /**
     * @param {string} id
     * @param {ParamType | null} type
     * @param {ng.StateDeclaration} state
     */
    fromConfig(id, type, state) {
        return new Param(id, type, DefType._CONFIG, this.urlServiceConfig, this, state);
    }
    /**
     * @param {string} id
     * @param {ParamType} type
     * @param {ng.StateDeclaration} state
     */
    fromPath(id, type, state) {
        return new Param(id, type, DefType._PATH, this.urlServiceConfig, this, state);
    }
    /**
     * @param {string} id
     * @param {ParamType} type
     * @param {ng.StateDeclaration} state
     */
    fromSearch(id, type, state) {
        return new Param(id, type, DefType._SEARCH, this.urlServiceConfig, this, state);
    }
}

export { ParamFactory };
