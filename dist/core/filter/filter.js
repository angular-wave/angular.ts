import { _injector, _provide } from '../../injection-tokens.js';
import { filterFilter } from '../../filters/filter.js';
import { jsonFilter } from '../../filters/json.js';
import { limitToFilter } from '../../filters/limit-to.js';
import { orderByFilter } from '../../filters/order-by.js';
import { entries, isFunction } from '../../shared/utils.js';
import { validateIsString, validate } from '../../shared/validate.js';

const SUFFIX = "Filter";
class FilterProvider {
    constructor($provide) {
        this._$provide = $provide;
        entries({
            filter: filterFilter,
            json: jsonFilter,
            limitTo: limitToFilter,
            orderBy: orderByFilter,
        }).forEach(([key, value]) => {
            this.register(key, value);
        });
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
