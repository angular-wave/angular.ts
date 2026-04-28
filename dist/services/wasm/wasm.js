import { instantiateWasm } from '../../shared/utils.js';

class WasmProvider {
    constructor() {
        this.$get = () => {
            return async (src, imports = {}, opts = {}) => {
                const result = await instantiateWasm(src, imports);
                return opts.raw ? result : result.exports;
            };
        };
    }
}

export { WasmProvider };
