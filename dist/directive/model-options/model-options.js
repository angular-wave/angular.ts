import { _attrs, _scope, _parse } from '../../injection-tokens.js';
import { assign, isString, deleteProperty, keys, isDefined } from '../../shared/utils.js';

const DEFAULT_REGEXP = /(\s+|^)default(\s+|$)/;
class NgModelOptionsController {
    constructor($attrs, $scope, $parse) {
        this._attrs = $attrs;
        this._scope = $scope;
        this._parse = $parse;
        this.parentCtrl = null;
        this.$options = defaultModelOptions;
    }
    $onInit() {
        const parentOptions = this.parentCtrl
            ? this.parentCtrl.$options
            : defaultModelOptions;
        const modelOptionsDefinition = this._parse(this._attrs.ngModelOptions)(this._scope);
        this.$options = parentOptions.createChild(modelOptionsDefinition);
    }
}
NgModelOptionsController.$nonscope = true;
NgModelOptionsController.$inject = [_attrs, _scope, _parse];
/**
 * A container for the options set by the {@link ngModelOptions} directive
 */
class ModelOptions {
    constructor(options) {
        this._options = options;
    }
    getOption(name) {
        return this._options[name];
    }
    createChild(options = {}) {
        let inheritAll = false;
        const mergedOptions = assign({}, options);
        for (const [key, option] of Object.entries(mergedOptions)) {
            if (option === "$inherit") {
                if (key === "*") {
                    inheritAll = true;
                }
                else {
                    mergedOptions[key] = this._options[key];
                    if (key === "updateOn") {
                        mergedOptions.updateOnDefault = this._options.updateOnDefault;
                    }
                }
            }
            else if (key === "updateOn" && isString(option)) {
                mergedOptions.updateOnDefault = false;
                mergedOptions[key] = option
                    .replace(DEFAULT_REGEXP, () => {
                    mergedOptions.updateOnDefault = true;
                    return " ";
                })
                    .trim();
            }
        }
        if (inheritAll) {
            deleteProperty(mergedOptions, "*");
            defaults(mergedOptions, this._options);
        }
        defaults(mergedOptions, defaultModelOptions._options);
        return new ModelOptions(mergedOptions);
    }
}
ModelOptions.$nonscope = true;
const defaultModelOptions = new ModelOptions({
    updateOn: "",
    updateOnDefault: true,
    debounce: 0,
    getterSetter: false,
    allowInvalid: false,
});
/** Registers the `ngModelOptions` directive controller. */
function ngModelOptionsDirective() {
    return {
        restrict: "A",
        priority: 10,
        require: { parentCtrl: "?^^ngModelOptions" },
        bindToController: true,
        controller: NgModelOptionsController,
    };
}
// Shallow-copy missing defaults from `src` into `dst`.
function defaults(dst, src) {
    keys(src).forEach((key) => {
        if (!isDefined(dst[key])) {
            dst[key] = src[key];
        }
    });
}

export { ModelOptions, defaultModelOptions, ngModelOptionsDirective };
