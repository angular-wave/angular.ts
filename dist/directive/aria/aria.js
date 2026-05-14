import { _aria, _parse } from '../../injection-tokens.js';
import { extend, hasOwn, stringify } from '../../shared/utils.js';

const ARIA_DISABLE_ATTR = "ngAriaDisable";
/**
 * Internal Utilities
 */
const nativeAriaNodeNames = [
    "BUTTON",
    "A",
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "DETAILS",
    "SUMMARY",
];
const isNodeOneOf = function (elem, nodeTypeArray) {
    return nodeTypeArray.includes(elem.nodeName);
};
/**
 * Used for configuring the ARIA attributes injected and managed by ngAria.
 *
 * ```js
 * angular.module('myApp', ['ngAria'], function config($ariaProvider) {
 *   $ariaProvider.config({
 *     ariaValue: true,
 *     tabindex: false
 *   });
 * });
 *```
 *
 * ## Dependencies
 * Requires the {@link ngAria} module to be installed.
 *
 */
function AriaProvider() {
    let config = {
        ariaHidden: true,
        ariaChecked: true,
        ariaReadonly: true,
        ariaDisabled: true,
        ariaRequired: true,
        ariaInvalid: true,
        ariaValue: true,
        tabindex: true,
        bindKeydown: true,
        bindRoleForClick: true,
    };
    this.config = function (newConfig) {
        config = extend(config, newConfig);
    };
    /** Builds a watcher that mirrors an Angular expression into an ARIA attribute. */
    function watchExpr(attrName, ariaAttr, nativeAriaNodeNamesParam, negate) {
        return function (scope, elem, attr) {
            if (hasOwn(attr, ARIA_DISABLE_ATTR))
                return;
            const ariaCamelName = attr.$normalize(ariaAttr);
            if (config[ariaCamelName] &&
                !isNodeOneOf(elem, nativeAriaNodeNamesParam) &&
                !attr[ariaCamelName]) {
                scope.$watch(attr[attrName], (boolVal) => {
                    // ensure boolean value
                    boolVal = negate ? !boolVal : !!boolVal;
                    elem.setAttribute(ariaAttr, boolVal);
                });
            }
        };
    }
    this.$get = function () {
        return {
            /** Reads the current ARIA provider configuration value by key. */
            config(key) {
                return config[key];
            },
            _watchExpr: watchExpr,
        };
    };
}
ngDisabledAriaDirective.$inject = [_aria];
/** Mirrors `ngDisabled` into `aria-disabled` when needed. */
function ngDisabledAriaDirective($aria) {
    return {
        restrict: "A",
        link: $aria._watchExpr("ngDisabled", "aria-disabled", nativeAriaNodeNames, false),
    };
}
ngShowAriaDirective.$inject = [_aria];
/** Mirrors `ngShow` into `aria-hidden` when needed. */
function ngShowAriaDirective($aria) {
    return {
        restrict: "A",
        link: $aria._watchExpr("ngShow", "aria-hidden", [], true),
    };
}
/** Adds `aria-live` to `ngMessages` containers when not already present. */
function ngMessagesAriaDirective() {
    return {
        restrict: "A",
        require: "?ngMessages",
        link(_scope, elem, attr) {
            if (hasOwn(attr, ARIA_DISABLE_ATTR))
                return;
            if (!elem.hasAttribute("aria-live")) {
                elem.setAttribute("aria-live", "assertive");
            }
        },
    };
}
ngClickAriaDirective.$inject = [_aria, _parse];
/** Adds keyboard and role accessibility behavior for `ngClick` on non-native controls. */
function ngClickAriaDirective($aria, $parse) {
    return {
        restrict: "A",
        compile(_elem, attr) {
            if (hasOwn(attr, ARIA_DISABLE_ATTR))
                return undefined;
            const fn = $parse(attr.ngClick);
            return (scope, elem, attrParam) => {
                if (!isNodeOneOf(elem, nativeAriaNodeNames)) {
                    if ($aria.config("bindRoleForClick") && !elem.hasAttribute("role")) {
                        elem.setAttribute("role", "button");
                    }
                    if ($aria.config("tabindex") && !elem.hasAttribute("tabindex")) {
                        elem.setAttribute("tabindex", "0");
                    }
                    if ($aria.config("bindKeydown") &&
                        !attrParam.ngKeydown &&
                        !attrParam.ngKeypress &&
                        !attrParam.ngKeyup) {
                        elem.addEventListener("keydown", 
                        /** Handles keyboard activation for synthetic button semantics. */
                        (event) => {
                            const keyCode = parseInt(event.key, 10);
                            if (keyCode === 13 || keyCode === 32) {
                                // If the event is triggered on a non-interactive element ...
                                if (!nativeAriaNodeNames.includes(event.target.nodeName) &&
                                    !event.target.isContentEditable) {
                                    // ... prevent the default browser behavior (e.g. scrolling when pressing spacebar)
                                    // See https://github.com/angular/angular.ts/issues/16664
                                    event.preventDefault();
                                }
                                fn(scope, { $event: event });
                            }
                        });
                    }
                }
            };
        },
    };
}
ngRequiredAriaDirective.$inject = [_aria];
/** Mirrors `ngRequired` into `aria-required` when needed. */
function ngRequiredAriaDirective($aria) {
    return {
        restrict: "A",
        link: $aria._watchExpr("ngRequired", "aria-required", nativeAriaNodeNames, false),
    };
}
ngCheckedAriaDirective.$inject = [_aria];
/** Mirrors `ngChecked` into `aria-checked` when needed. */
function ngCheckedAriaDirective($aria) {
    return {
        restrict: "A",
        link: $aria._watchExpr("ngChecked", "aria-checked", nativeAriaNodeNames, false),
    };
}
ngValueAriaDirective.$inject = [_aria];
/** Mirrors `ngValue` into `aria-checked` for non-native controls when needed. */
function ngValueAriaDirective($aria) {
    return {
        restrict: "A",
        link: $aria._watchExpr("ngValue", "aria-checked", nativeAriaNodeNames, false),
    };
}
ngHideAriaDirective.$inject = [_aria];
/** Mirrors `ngHide` into `aria-hidden` when needed. */
function ngHideAriaDirective($aria) {
    return {
        restrict: "A",
        link: $aria._watchExpr("ngHide", "aria-hidden", [], false),
    };
}
ngReadonlyAriaDirective.$inject = [_aria];
/** Mirrors `ngReadonly` into `aria-readonly` when needed. */
function ngReadonlyAriaDirective($aria) {
    return {
        restrict: "A",
        link: $aria._watchExpr("ngReadonly", "aria-readonly", nativeAriaNodeNames, false),
    };
}
ngModelAriaDirective.$inject = [_aria];
/** Adds ARIA validity, checked, and range metadata for `ngModel` controls. */
function ngModelAriaDirective($aria) {
    /** Determines whether an ARIA attribute should be attached to an element. */
    function shouldAttachAttr(attr, normalizedAttr, elem, allowNonAriaNodes) {
        return ($aria.config(normalizedAttr) &&
            !elem.getAttribute(attr) &&
            (allowNonAriaNodes || !isNodeOneOf(elem, nativeAriaNodeNames)) &&
            (elem.getAttribute("type") !== "hidden" ||
                elem.nodeName !== "INPUT"));
    }
    /** Determines whether a synthetic ARIA role should be attached to an element. */
    function shouldAttachRole(role, elem) {
        // if element does not have role attribute
        // AND element type is equal to role (if custom element has a type equaling shape) <-- remove?
        // AND element is not in nativeAriaNodeNames
        return (!elem.getAttribute("role") &&
            elem.getAttribute("type") === role &&
            !isNodeOneOf(elem, nativeAriaNodeNames));
    }
    /** Infers the control shape used to decide which ARIA attributes to manage. */
    function getShape(attr) {
        const { type } = attr;
        const { role } = attr;
        return (type || role) === "checkbox" || role === "menuitemcheckbox"
            ? "checkbox"
            : (type || role) === "radio" || role === "menuitemradio"
                ? "radio"
                : type === "range" || role === "progressbar" || role === "slider"
                    ? "range"
                    : "";
    }
    return {
        restrict: "A",
        require: "ngModel",
        priority: 200, // Make sure watches are fired after any other directives that affect the ngModel value
        compile(compileElement, attr) {
            if (hasOwn(attr, ARIA_DISABLE_ATTR))
                return undefined;
            const shape = getShape(attr);
            return {
                post(_, elem, attrPost, ngModel) {
                    const needsTabIndex = shouldAttachAttr("tabindex", "tabindex", elem, false);
                    function getRadioReaction() {
                        // Strict comparison would cause a BC
                        elem.setAttribute("aria-checked", (attrPost.value == ngModel.$viewValue).toString());
                    }
                    function getCheckboxReaction() {
                        elem.setAttribute("aria-checked", (!ngModel.$isEmpty(ngModel.$viewValue)).toString());
                    }
                    switch (shape) {
                        case "radio":
                        case "checkbox":
                            if (shouldAttachRole(shape, elem)) {
                                elem.setAttribute("role", shape);
                            }
                            if (shouldAttachAttr("aria-checked", "ariaChecked", elem, false)) {
                                ngModel.$watch("$modelValue", shape === "radio" ? getRadioReaction : getCheckboxReaction);
                            }
                            if (needsTabIndex) {
                                elem.setAttribute("tabindex", "0");
                            }
                            break;
                        case "range":
                            if (shouldAttachRole(shape, elem)) {
                                elem.setAttribute("role", "slider");
                            }
                            if ($aria.config("ariaValue")) {
                                const needsAriaValuemin = !elem.hasAttribute("aria-valuemin") &&
                                    (hasOwn(attrPost, "min") || hasOwn(attrPost, "ngMin"));
                                const needsAriaValuemax = !elem.hasAttribute("aria-valuemax") &&
                                    (hasOwn(attrPost, "max") || hasOwn(attrPost, "ngMax"));
                                const needsAriaValuenow = !elem.hasAttribute("aria-valuenow");
                                if (needsAriaValuemin) {
                                    attrPost.$observe("min", (newVal) => {
                                        elem.setAttribute("aria-valuemin", stringify(newVal));
                                    });
                                }
                                if (needsAriaValuemax) {
                                    attrPost.$observe("max", (newVal) => {
                                        elem.setAttribute("aria-valuemax", stringify(newVal));
                                    });
                                }
                                if (needsAriaValuenow) {
                                    ngModel.$watch("$modelValue", (newVal) => {
                                        elem.setAttribute("aria-valuenow", newVal);
                                    });
                                }
                            }
                            if (needsTabIndex) {
                                elem.setAttribute("tabindex", "0");
                            }
                            break;
                    }
                    if (!hasOwn(attrPost, "ngRequired") &&
                        ngModel.$validators.required &&
                        shouldAttachAttr("aria-required", "ariaRequired", elem, false)) {
                        // ngModel.$error.required is undefined on custom controls
                        attrPost.$observe("required", () => {
                            elem.setAttribute("aria-required", (!!attrPost.required).toString());
                        });
                    }
                    if (shouldAttachAttr("aria-invalid", "ariaInvalid", elem, true)) {
                        ngModel.$watch("$invalid", (newVal) => {
                            elem.setAttribute("aria-invalid", (!!newVal).toString());
                        });
                    }
                },
            };
        },
    };
}
ngDblclickAriaDirective.$inject = [_aria];
/** Adds focusability for `ngDblclick` on non-native interactive controls. */
function ngDblclickAriaDirective($aria) {
    return {
        restrict: "A",
        link(_scope, elem, attr) {
            if (hasOwn(attr, ARIA_DISABLE_ATTR))
                return;
            if ($aria.config("tabindex") &&
                !elem.hasAttribute("tabindex") &&
                !isNodeOneOf(elem, nativeAriaNodeNames)) {
                elem.setAttribute("tabindex", "0");
            }
        },
    };
}

export { AriaProvider, ngCheckedAriaDirective, ngClickAriaDirective, ngDblclickAriaDirective, ngDisabledAriaDirective, ngHideAriaDirective, ngMessagesAriaDirective, ngModelAriaDirective, ngReadonlyAriaDirective, ngRequiredAriaDirective, ngShowAriaDirective, ngValueAriaDirective };
