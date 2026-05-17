import { _parse, _attributes } from '../../injection-tokens.js';
import { isString, isUndefined, isDefined, hasOwn, isNumberNaN, createErrorFactory } from '../../shared/utils.js';
import { REGEX_STRING_REGEXP } from '../attrs/attrs.js';
import { startingTag } from '../../shared/dom.js';

const ngPatternError = createErrorFactory("ngPattern");
const nativeCustomValidityIssues = new WeakMap();
const NATIVE_CUSTOM_VALIDITY_PRIORITY = {
    required: 10,
    pattern: 20,
    minlength: 30,
    maxlength: 40,
};
function setNativeCustomValidityIssue(ctrl, key, message) {
    let issues = nativeCustomValidityIssues.get(ctrl);
    if (!issues) {
        issues = new Map();
        nativeCustomValidityIssues.set(ctrl, issues);
    }
    if (message) {
        issues.set(key, {
            message,
            priority: NATIVE_CUSTOM_VALIDITY_PRIORITY[key] ?? 100,
        });
    }
    else {
        issues.delete(key);
    }
    let selected;
    issues.forEach((issue) => {
        if (!selected || issue.priority < selected.priority) {
            selected = issue;
        }
    });
    ctrl.$setCustomValidity(selected?.message ?? "");
}
function readValidatorAttr($attributes, element, attr, normalizedName) {
    const elementValue = element instanceof Element
        ? $attributes?.read(element, normalizedName)
        : undefined;
    const attrValue = attr
        ? attr[normalizedName]
        : undefined;
    if (isDefined(attrValue) &&
        (isUndefined(elementValue) || elementValue.includes("{{"))) {
        return attrValue;
    }
    return elementValue ?? attrValue;
}
function hasValidatorAttr($attributes, element, attr, normalizedName) {
    return ((element instanceof Element &&
        Boolean($attributes?.has(element, normalizedName))) ||
        (attr ? hasOwn(attr, normalizedName) : false));
}
function observeValidatorAttr($attributes, scope, element, attr, normalizedName, callback) {
    if (!$attributes || !(element instanceof Element))
        return () => undefined;
    return $attributes.observe(scope, element, normalizedName, (value) => {
        callback(readValidatorAttr($attributes, element, attr, normalizedName) ?? value);
    });
}
/**
 *
 * @param ngRequired AngularTS expression. If it evaluates to `true`, it sets the
 *                                `required` attribute to the element and adds the `required`
 *                                {@link ngModel.NgModelController#$validators `validator`}.
 *
 *
 * ngRequired adds the required {@link ngModel.NgModelController#$validators `validator`} to {@link ngModel `ngModel`}.
 * It is most often used for {@link input `input`} and {@link select `select`} controls, but can also be
 * applied to custom controls.
 *
 * The directive sets the `required` attribute on the element if the AngularTS expression inside
 * `ngRequired` evaluates to true. A special directive for setting `required` is necessary because we
 * cannot use interpolation inside `required`. See the {@link guide/interpolation interpolation guide}
 * for more info.
 *
 * The validator will set the `required` error key to true if the `required` attribute is set and
 * calling {@link ngModel.NgModelController#$isEmpty `NgModelController.$isEmpty`} with the
 * {@link ngModel.NgModelController#$viewValue `ngModel.$viewValue`} returns `true`. For example, the
 * `$isEmpty()` implementation for `input[text]` checks the length of the `$viewValue`. When developing
 * custom controls, `$isEmpty()` can be overwritten to account for a $viewValue that is not string-based.
 *
 */
const requiredDirective = [
    _parse,
    _attributes,
    /** Creates the `required` validator directive. */
    ($parse, $attributes) => ({
        restrict: "A",
        require: "?ngModel",
        link: 
        /** Wires required-state observation into the ngModel validator set. */
        (scope, elm, attr, ctrl) => {
            if (!ctrl)
                return;
            const ngRequired = readValidatorAttr($attributes, elm, attr, "ngRequired");
            // For boolean attributes like required, presence means true
            const ngRequiredGetter = ngRequired ? $parse(ngRequired) : undefined;
            let value = ngRequiredGetter
                ? Boolean(ngRequiredGetter(scope))
                : hasValidatorAttr($attributes, elm, attr, "required");
            const syncNativeRequired = (required) => {
                if ($attributes && elm instanceof Element) {
                    $attributes.set(elm, "required", required);
                }
                const nativeControl = elm;
                ctrl.$setNativeValidity(!nativeControl.willValidate ||
                    nativeControl.validity?.valid !== false);
            };
            if (!ngRequired) {
                // force truthy in case we are on non input element
                // (input elements do this automatically for boolean attributes like required)
                attr.required = "true";
            }
            syncNativeRequired(Boolean(value));
            ctrl.$validators.required = (_modelValue, viewValue) => {
                return !value || !ctrl.$isEmpty(viewValue);
            };
            const setRequiredValue = (nextValue) => {
                if (value !== nextValue) {
                    value = nextValue;
                    syncNativeRequired(Boolean(value));
                    ctrl.$validate();
                }
            };
            if (ngRequiredGetter && ngRequired) {
                scope.$watch(ngRequired, (nextValue) => {
                    setRequiredValue(Boolean(nextValue));
                });
            }
            else {
                observeValidatorAttr($attributes, scope, elm, attr, "required", (newVal) => {
                    setRequiredValue($attributes && elm instanceof Element
                        ? $attributes.has(elm, "required")
                        : newVal);
                });
            }
        },
    }),
];
/**
 * @param ngPattern AngularTS expression that must evaluate to a `RegExp` or a `String`
 *                                      parsable into a `RegExp`, or a `RegExp` literal. See above for
 *                                      more details.
 *
 *
 *
 * ngPattern adds the pattern {@link ngModel.NgModelController#$validators `validator`} to {@link ngModel `ngModel`}.
 * It is most often used for text-based {@link input `input`} controls, but can also be applied to custom text-based controls.
 *
 * The validator sets the `pattern` error key if the {@link ngModel.NgModelController#$viewValue `ngModel.$viewValue`}
 * does not match a RegExp which is obtained from the `ngPattern` attribute value:
 * - the value is an AngularTS expression:
 *   - If the expression evaluates to a RegExp object, then this is used directly.
 *   - If the expression evaluates to a string, then it will be converted to a RegExp after wrapping it
 *     in `^` and `$` characters. For instance, `"abc"` will be converted to `new RegExp('^abc$')`.
 * - If the value is a RegExp literal, e.g. `ngPattern="/^\d+$/"`, it is used directly.
 *
 * <div class="alert alert-info">
 * **Note:** Avoid using the `g` flag on the RegExp, as it will cause each successive search to
 * start at the index of the last search's match, thus not taking the whole input value into
 * account.
 * </div>
 *
 * <div class="alert alert-info">
 * **Note:** This directive is also added when the plain `pattern` attribute is used, with two
 * differences:
 * <ol>
 *   <li>
 *     `ngPattern` does not set the `pattern` attribute and therefore HTML5 constraint validation is
 *     not available.
 *   </li>
 *   <li>
 *     The `ngPattern` attribute must be an expression, while the `pattern` value must be
 *     interpolated.
 *   </li>
 * </ol>
 * </div>
 */
const patternDirective = [
    _parse,
    _attributes,
    /** Creates the `pattern` validator directive. */
    ($parse, $attributes) => ({
        restrict: "A",
        require: "?ngModel",
        compile: (tElm, tAttr) => {
            let patternExp = "";
            let parseFn;
            const templateNgPattern = readValidatorAttr($attributes, tElm, tAttr, "ngPattern");
            if (templateNgPattern) {
                patternExp = templateNgPattern;
                const ngPattern = templateNgPattern;
                // ngPattern might be a scope expression, or an inlined regex, which is not parsable.
                // We get value of the attribute here, so we can compare the old and the new value
                // in the observer to avoid unnecessary validations
                if (ngPattern.startsWith("/") && REGEX_STRING_REGEXP.test(ngPattern)) {
                    parseFn = function () {
                        return templateNgPattern;
                    };
                }
                else {
                    parseFn = templateNgPattern ? $parse(templateNgPattern) : undefined;
                }
            }
            return function (scope, elm, attr, ctrl) {
                if (!ctrl)
                    return;
                const modelCtrl = ctrl;
                const ngPattern = readValidatorAttr($attributes, elm, attr, "ngPattern");
                let attrVal = readValidatorAttr($attributes, elm, attr, "pattern");
                if (ngPattern) {
                    const parsedPattern = parseFn?.(scope);
                    attrVal = parsedPattern;
                }
                else {
                    patternExp = attrVal ?? "";
                }
                let regexp = attrVal
                    ? parsePatternAttr(attrVal, patternExp, elm)
                    : undefined;
                function refreshRegexp(newVal, validateOnChange = true) {
                    const oldRegexp = regexp;
                    const nextValue = ngPattern ? parseFn?.(scope) : newVal;
                    regexp = nextValue
                        ? parsePatternAttr(nextValue, patternExp, elm)
                        : undefined;
                    if (validateOnChange &&
                        oldRegexp?.toString() !== regexp?.toString()) {
                        modelCtrl.$validate();
                    }
                }
                observeValidatorAttr($attributes, scope, elm, attr, "pattern", refreshRegexp);
                modelCtrl.$validators.pattern = (_modelValue, viewValue) => {
                    if (ngPattern) {
                        refreshRegexp(undefined, false);
                    }
                    // HTML5 pattern constraint validates the input value, so we validate the viewValue
                    const valid = modelCtrl.$isEmpty(viewValue) ||
                        isUndefined(regexp) ||
                        regexp.test(String(viewValue));
                    setNativeCustomValidityIssue(modelCtrl, "pattern", valid ? null : "Value does not match the required pattern.");
                    return valid;
                };
            };
        },
    }),
];
/**
 * @param ngMaxlength AngularTS expression that must evaluate to a `Number` or `String`
 *                                 parsable into a `Number`. Used as value for the `maxlength`
 *                                 {@link ngModel.NgModelController#$validators validator}.
 *
 *
 *
 * ngMaxlength adds the maxlength {@link ngModel.NgModelController#$validators `validator`} to {@link ngModel `ngModel`}.
 * It is most often used for text-based {@link input `input`} controls, but can also be applied to custom text-based controls.
 *
 * The validator sets the `maxlength` error key if the {@link ngModel.NgModelController#$viewValue `ngModel.$viewValue`}
 * is longer than the integer obtained by evaluating the AngularTS expression given in the
 * `ngMaxlength` attribute value.
 *
 * <div class="alert alert-info">
 * **Note:** This directive is also added when the plain `maxlength` attribute is used, with two
 * differences:
 * <ol>
 *   <li>
 *     `ngMaxlength` does not set the `maxlength` attribute and therefore HTML5 constraint
 *     validation is not available.
 *   </li>
 *   <li>
 *     The `ngMaxlength` attribute must be an expression, while the `maxlength` value must be
 *     interpolated.
 *   </li>
 * </ol>
 * </div>
 *
 */
const maxlengthDirective = [
    _parse,
    _attributes,
    /** Creates the `maxlength` validator directive. */
    ($parse, $attributes) => ({
        restrict: "A",
        require: "?ngModel",
        link: 
        /** Watches maxlength changes and keeps the validator in sync. */
        (scope, elm, attr, ctrl) => {
            if (!ctrl)
                return;
            const maxlengthAttr = readValidatorAttr($attributes, elm, attr, "maxlength");
            const ngMaxlength = readValidatorAttr($attributes, elm, attr, "ngMaxlength");
            let maxlength = maxlengthAttr ?? (ngMaxlength && $parse(ngMaxlength)(scope));
            let maxlengthParsed = parseLength(maxlength);
            observeValidatorAttr($attributes, scope, elm, attr, "maxlength", (newValue) => {
                if (maxlength !== newValue) {
                    maxlengthParsed = parseLength(newValue);
                    maxlength = newValue;
                    ctrl.$validate();
                }
            });
            ctrl.$validators.maxlength = function (_modelValue, viewValue) {
                const valid = maxlengthParsed < 0 ||
                    ctrl.$isEmpty(viewValue) ||
                    (isString(viewValue) && viewValue.length <= maxlengthParsed);
                setNativeCustomValidityIssue(ctrl, "maxlength", valid
                    ? null
                    : `Value must be at most ${String(maxlengthParsed)} characters.`);
                return valid;
            };
        },
    }),
];
/**
 *
 * @param ngMinlength AngularTS expression that must evaluate to a `Number` or `String`
 *                                 parsable into a `Number`. Used as value for the `minlength`
 *                                 {@link ngModel.NgModelController#$validators validator}.
 *
 *
 *
 * ngMinlength adds the minlength {@link ngModel.NgModelController#$validators `validator`} to {@link ngModel `ngModel`}.
 * It is most often used for text-based {@link input `input`} controls, but can also be applied to custom text-based controls.
 *
 * The validator sets the `minlength` error key if the {@link ngModel.NgModelController#$viewValue `ngModel.$viewValue`}
 * is shorter than the integer obtained by evaluating the AngularTS expression given in the
 * `ngMinlength` attribute value.
 *
 * <div class="alert alert-info">
 * **Note:** This directive is also added when the plain `minlength` attribute is used, with two
 * differences:
 * <ol>
 *   <li>
 *     `ngMinlength` does not set the `minlength` attribute and therefore HTML5 constraint
 *     validation is not available.
 *   </li>
 *   <li>
 *     The `ngMinlength` value must be an expression, while the `minlength` value must be
 *     interpolated.
 *   </li>
 * </ol>
 * </div>
 *
 */
const minlengthDirective = [
    _parse,
    _attributes,
    /** Creates the `minlength` validator directive. */ ($parse, $attributes) => ({
        restrict: "A",
        require: "?ngModel",
        link(scope, elm, attr, ctrl) {
            if (!ctrl)
                return;
            const minlengthAttr = readValidatorAttr($attributes, elm, attr, "minlength");
            const ngMinlength = readValidatorAttr($attributes, elm, attr, "ngMinlength");
            let minlength = minlengthAttr ?? (ngMinlength && $parse(ngMinlength)(scope));
            let minlengthParsed = parseLength(minlength) || -1;
            observeValidatorAttr($attributes, scope, elm, attr, "minlength", (newValue) => {
                if (minlength !== newValue) {
                    minlengthParsed = parseLength(newValue) || -1;
                    minlength = newValue;
                    ctrl.$validate();
                }
            });
            ctrl.$validators.minlength = function (modelValue, viewValue) {
                const valid = ctrl.$isEmpty(viewValue) || viewValue.length >= minlengthParsed;
                setNativeCustomValidityIssue(ctrl, "minlength", valid
                    ? null
                    : `Value must be at least ${String(minlengthParsed)} characters.`);
                return valid;
            };
        },
    }),
];
/** Parses a pattern attribute value into a `RegExp` instance. */
function parsePatternAttr(input, patternExp, elm) {
    let regex = input;
    if (isString(regex)) {
        const match = /^\/(.*)\/([gimsuy]*)$/.exec(regex);
        regex = match ? new RegExp(match[1], match[2]) : new RegExp(`^${regex}$`);
    }
    if (!(regex instanceof RegExp)) {
        throw ngPatternError("noregexp", "Expected {0} to be a RegExp but was {1}. Element: {2}", patternExp, regex, startingTag(elm));
    }
    return regex;
}
/** Parses a numeric length attribute into an integer or `-1` when invalid. */
function parseLength(val) {
    const intVal = parseInt(String(val), 10);
    return isNumberNaN(intVal) ? -1 : intVal;
}

export { maxlengthDirective, minlengthDirective, patternDirective, requiredDirective };
