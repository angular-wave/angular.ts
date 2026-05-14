import { _injector, _provide } from '../../injection-tokens.js';
import { isFunction } from '../../shared/utils.js';
import { validateIsString, validate } from '../../shared/validate.js';

const SUFFIX = "Filter";
class FilterProvider {
    constructor($provide) {
        this._$provide = $provide;
        this.$get = [
            _injector,
            ($injector) => (name) => {
                validateIsString(name, "name");
                return $injector.get(name + SUFFIX);
            },
        ];
    }
    register(name, factory) {
        validateIsString(name, "name");
        validate(isFunction, factory, "factory");
        this._$provide.factory(name + SUFFIX, factory);
        return this;
    }
}
FilterProvider.$inject = [_provide];

export { FilterProvider };
