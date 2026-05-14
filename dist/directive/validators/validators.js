import { _parse } from '../../injection-tokens.js';
import { isString, isUndefined, hasOwn, isFunction, isNumberNaN, createErrorFactory } from '../../shared/utils.js';
import { REGEX_STRING_REGEXP } from '../attrs/attrs.js';
import { startingTag } from '../../shared/dom.js';

const ngPatternError = createErrorFactory("ngPattern");
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
        link: 
        /** Wires required-state observation into the ngModel validator set. */
        (scope, _elm, attr, ctrl) => {
            if (!ctrl)
                return;
            // For boolean attributes like required, presence means true
            let value = hasOwn(attr, "required") ||
                (attr.ngRequired && $parse(attr.ngRequired)(scope));
            if (!attr.ngRequired) {
                // force truthy in case we are on non input element
                // (input elements do this automatically for boolean attributes like required)
                attr.required = "true";
            }
            ctrl.$validators.required = (_modelValue, viewValue) => {
                return !value || !ctrl.$isEmpty(viewValue);
            };
            attr.$observe("required", (newVal) => {
                if (value !== newVal) {
                    value = newVal;
                    ctrl.$validate();
                }
            });
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
        compile: (_Elm, tAttr) => {
            let patternExp = "";
            let parseFn;
            if (tAttr.ngPattern) {
                patternExp = tAttr.ngPattern;
                const ngPattern = tAttr.ngPattern;
                // ngPattern might be a scope expression, or an inlined regex, which is not parsable.
                // We get value of the attribute here, so we can compare the old and the new value
                // in the observer to avoid unnecessary validations
                if (ngPattern.startsWith("/") && REGEX_STRING_REGEXP.test(ngPattern)) {
                    parseFn = function () {
                        return tAttr.ngPattern;
                    };
                }
                else {
                    parseFn = tAttr.ngPattern ? $parse(tAttr.ngPattern) : undefined;
                }
            }
            return function (scope, elm, attr, ctrl) {
                if (!ctrl)
                    return;
                let attrVal = attr.pattern;
                if (attr.ngPattern) {
                    attrVal = parseFn?.(scope);
                }
                else {
                    patternExp = attr.pattern;
                }
                let regexp = attrVal
                    ? parsePatternAttr(attrVal, patternExp, elm)
                    : undefined;
                attr.$observe("pattern", (newVal) => {
                    const oldRegexp = regexp;
                    regexp = newVal && parsePatternAttr(newVal, patternExp, elm);
                    if (oldRegexp?.toString() !== regexp?.toString()) {
                        ctrl.$validate();
                    }
                });
                ctrl.$validators.pattern = (_modelValue, viewValue) => {
                    // HTML5 pattern constraint validates the input value, so we validate the viewValue
                    return (ctrl.$isEmpty(viewValue) ||
                        isUndefined(regexp) ||
                        regexp.test(viewValue));
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
        link: 
        /** Watches maxlength changes and keeps the validator in sync. */
        (scope, _elm, attr, ctrl) => {
            if (!ctrl)
                return;
            let maxlength = attr.maxlength ||
                (attr.ngMaxlength && $parse(attr.ngMaxlength)(scope));
            let maxlengthParsed = parseLength(maxlength);
            attr.$observe("maxlength", (value) => {
                if (maxlength !== value) {
                    maxlengthParsed = parseLength(value);
                    maxlength = value;
                    ctrl.$validate();
                }
            });
            ctrl.$validators.maxlength = function (_modelValue, viewValue) {
                return (maxlengthParsed < 0 ||
                    ctrl.$isEmpty(viewValue) ||
                    (isString(viewValue) && viewValue.length <= maxlengthParsed));
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
        link(scope, _elm, attr, ctrl) {
            if (!ctrl)
                return;
            let minlength = attr.minlength || (attr.ngMinlength && $parse(attr.ngMinlength)(scope));
            let minlengthParsed = parseLength(minlength) || -1;
            attr.$observe("minlength", (value) => {
                if (minlength !== value) {
                    minlengthParsed = parseLength(value) || -1;
                    minlength = value;
                    ctrl.$validate();
                }
            });
            ctrl.$validators.minlength = function (modelValue, viewValue) {
                return ctrl.$isEmpty(viewValue) || viewValue.length >= minlengthParsed;
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
    if (!isFunction(regex.test)) {
        throw ngPatternError("noregexp", "Expected {0} to be a RegExp but was {1}. Element: {2}", patternExp, regex, startingTag(elm));
    }
    return regex;
}
/** Parses a numeric length attribute into an integer or `-1` when invalid. */
function parseLength(val) {
    const intVal = parseInt(val, 10);
    return isNumberNaN(intVal) ? -1 : intVal;
}

export { maxlengthDirective, minlengthDirective, patternDirective, requiredDirective };
