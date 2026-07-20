import { _parse } from '../../injection-tokens.js';
import { isString, isUndefined, directiveNormalize, isNumberNaN, createErrorFactory } from '../../shared/utils.js';
import { REGEX_STRING_REGEXP } from '../attrs/attrs.js';
import { setNormalizedAttr, getNormalizedAttr, startingTag, hasNormalizedAttr } from '../../shared/dom.js';

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
function readValidatorAttr(element, normalizedName) {
    return element instanceof Element
        ? getNormalizedAttr(element, normalizedName)
        : undefined;
}
function hasValidatorAttr(element, normalizedName) {
    return (element instanceof Element && hasNormalizedAttr(element, normalizedName));
}
function observeValidatorAttr(scope, element, normalizedName, callback) {
    if (!(element instanceof Element))
        return () => undefined;
    const observerName = directiveNormalize(normalizedName);
    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const attributeName = mutations[i].attributeName;
            if (attributeName && directiveNormalize(attributeName) === observerName) {
                callback(readValidatorAttr(element, normalizedName));
            }
        }
    });
    observer.observe(element, { attributes: true });
    let deregisterDestroy = scope.$on("$destroy", deregister);
    function deregister() {
        observer.disconnect();
        deregisterDestroy?.();
        deregisterDestroy = undefined;
    }
    return deregister;
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
    /** Creates the `required` validator directive. */
    ($parse) => ({
        restrict: "A",
        require: "?ngModel",
        /** Wires required-state observation into the ngModel validator set. */
        link: (scope, elm, ctrl) => {
            if (!ctrl)
                return;
            const ngRequired = readValidatorAttr(elm, "ngRequired");
            // For boolean attributes like required, presence means true
            const ngRequiredGetter = ngRequired ? $parse(ngRequired) : undefined;
            let value = ngRequiredGetter
                ? Boolean(ngRequiredGetter(scope))
                : hasValidatorAttr(elm, "required");
            const syncNativeRequired = (required) => {
                if (elm instanceof Element) {
                    setNormalizedAttr(elm, "required", required);
                }
                const nativeControl = elm;
                ctrl.$setNativeValidity(!nativeControl.willValidate ||
                    nativeControl.validity?.valid !== false);
            };
            if (!ngRequired) {
                // force truthy in case we are on non input element
                // (input elements do this automatically for boolean attributes like required)
                setNormalizedAttr(elm, "required", true);
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
                observeValidatorAttr(scope, elm, "required", () => {
                    setRequiredValue(hasNormalizedAttr(elm, "required"));
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
    /** Creates the `pattern` validator directive. */
    ($parse) => ({
        restrict: "A",
        require: "?ngModel",
        compile: (tElm) => {
            let patternExp = "";
            let parseFn;
            const templateNgPattern = readValidatorAttr(tElm, "ngPattern");
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
            return function (scope, elm, ctrl) {
                if (!ctrl)
                    return;
                const modelCtrl = ctrl;
                const ngPattern = readValidatorAttr(elm, "ngPattern");
                let attrVal = readValidatorAttr(elm, "pattern");
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
                observeValidatorAttr(scope, elm, "pattern", refreshRegexp);
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
    /** Creates the `maxlength` validator directive. */
    ($parse) => ({
        restrict: "A",
        require: "?ngModel",
        /** Watches maxlength changes and keeps the validator in sync. */
        link: (scope, elm, ctrl) => {
            if (!ctrl)
                return;
            const maxlengthAttr = readValidatorAttr(elm, "maxlength");
            const ngMaxlength = readValidatorAttr(elm, "ngMaxlength");
            let maxlength = maxlengthAttr ?? (ngMaxlength && $parse(ngMaxlength)(scope));
            let maxlengthParsed = parseLength(maxlength);
            observeValidatorAttr(scope, elm, "maxlength", (newValue) => {
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
    /** Creates the `minlength` validator directive. */ ($parse) => ({
        restrict: "A",
        require: "?ngModel",
        link(scope, elm, ctrl) {
            if (!ctrl)
                return;
            const minlengthAttr = readValidatorAttr(elm, "minlength");
            const ngMinlength = readValidatorAttr(elm, "ngMinlength");
            let minlength = minlengthAttr ?? (ngMinlength && $parse(ngMinlength)(scope));
            let minlengthParsed = parseLength(minlength) || -1;
            observeValidatorAttr(scope, elm, "minlength", (newValue) => {
                if (minlength !== newValue) {
                    minlengthParsed = parseLength(newValue) || -1;
                    minlength = newValue;
                    ctrl.$validate();
                }
            });
            ctrl.$validators.minlength = function (modelValue, viewValue) {
                const valid = ctrl.$isEmpty(viewValue) ||
                    (isString(viewValue) && viewValue.length >= minlengthParsed) ||
                    (Array.isArray(viewValue) && viewValue.length >= minlengthParsed);
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
