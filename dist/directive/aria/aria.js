import { _aria, _parse } from '../../injection-tokens.js';
import { directiveNormalize, stringify } from '../../shared/utils.js';
import { hasNormalizedAttr, getNormalizedAttr } from '../../shared/dom.js';

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
const ARIA_REFERENCE_ATTRS = [
    "aria-controls",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "aria-labelledby",
];
const isNodeOneOf = function (elem, nodeTypeArray) {
    return nodeTypeArray.includes(elem.nodeName);
};
const DEFAULT_ARIA_CONFIG = {
    ariaHidden: true,
    ariaChecked: true,
    ariaReadonly: true,
    ariaDisabled: true,
    ariaRequired: true,
    ariaInvalid: true,
    ariaValue: true,
    ariaCurrent: true,
    ariaCurrentToken: "page",
    tabindex: true,
    bindKeydown: true,
    bindRoleForClick: true,
    bindRoleForState: true,
    diagnostics: false,
};
/** @internal */
function createAriaRuntimeState() {
    return {
        config: { ...DEFAULT_ARIA_CONFIG },
        destroyed: false,
    };
}
/** @internal */
function applyAriaConfiguration(state, config) {
    if (state.destroyed) {
        throw new Error("ARIA runtime has already been disposed.");
    }
    Object.assign(state.config, config);
}
/** @internal */
function destroyAriaRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
}
/** @internal */
function createAriaService(state, $log) {
    if (state.destroyed) {
        throw new Error("ARIA runtime has already been disposed.");
    }
    const config = state.config;
    const diagnostics = [];
    const seenDiagnostics = new Set();
    function findReferencedElement(element, id) {
        let current = element;
        while (current) {
            if (current.id === id) {
                return current;
            }
            const candidates = Array.from(current.querySelectorAll("[id]"));
            const found = candidates.find((candidate) => candidate.id === id);
            if (found) {
                return found;
            }
            current = current.parentElement;
        }
        return element.ownerDocument.getElementById(id);
    }
    function hasAccessibleName(element) {
        if (element.getAttribute("aria-label")?.trim()) {
            return true;
        }
        const labelledBy = element.getAttribute("aria-labelledby");
        if (labelledBy) {
            const hasReferencedName = labelledBy
                .split(/\s+/)
                .filter(Boolean)
                .some((id) => {
                const label = findReferencedElement(element, id);
                if (!label) {
                    return false;
                }
                return Boolean((label.getAttribute("aria-label") ?? "").trim() ||
                    label.textContent.trim());
            });
            if (hasReferencedName) {
                return true;
            }
        }
        return Boolean(element.textContent.trim());
    }
    function reportDiagnostic(element, source, code, message) {
        if (!config.diagnostics) {
            return;
        }
        const key = `${code}:${source}:${message}`;
        if (seenDiagnostics.has(key)) {
            return;
        }
        seenDiagnostics.add(key);
        diagnostics.push({ code, message, source, element });
        $log.warn(message, element);
    }
    function diagnoseAriaReferences(element, source) {
        ARIA_REFERENCE_ATTRS.forEach((attr) => {
            const rawValue = element.getAttribute(attr);
            if (!rawValue) {
                return;
            }
            rawValue
                .split(/\s+/)
                .filter(Boolean)
                .forEach((id) => {
                if (!findReferencedElement(element, id)) {
                    reportDiagnostic(element, source, "aria-missing-reference", `$aria: ${source} references missing ${attr} target "${id}".`);
                }
            });
        });
    }
    function diagnoseInteractive(element, source) {
        const tabindex = element.getAttribute("tabindex");
        const parsedTabindex = tabindex === null ? 0 : Number(tabindex);
        if (Number.isFinite(parsedTabindex) && parsedTabindex > 0) {
            reportDiagnostic(element, source, "aria-positive-tabindex", `$aria: ${source} uses positive tabindex "${String(tabindex)}". Prefer tabindex="0" and DOM order.`);
        }
        if (element.getAttribute("aria-hidden") === "true") {
            reportDiagnostic(element, source, "aria-hidden-interactive", `$aria: ${source} is interactive but hidden from the accessibility tree.`);
        }
        if (!hasAccessibleName(element)) {
            reportDiagnostic(element, source, "aria-missing-accessible-name", `$aria: ${source} creates an interactive element without an accessible name.`);
        }
        diagnoseAriaReferences(element, source);
    }
    /** Builds a watcher that mirrors an Angular expression into an ARIA attribute. */
    function watchExpr(attrName, ariaAttr, nativeAriaNodeNamesParam, negate) {
        return function (scope, elem) {
            if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR))
                return;
            const ariaCamelName = directiveNormalize(ariaAttr);
            if (config[ariaCamelName] &&
                !isNodeOneOf(elem, nativeAriaNodeNamesParam) &&
                !hasNormalizedAttr(elem, ariaCamelName)) {
                scope.$watch(getNormalizedAttr(elem, attrName) ?? "", (boolVal) => {
                    // ensure boolean value
                    boolVal = negate ? !boolVal : !!boolVal;
                    elem.setAttribute(ariaAttr, String(boolVal));
                });
            }
        };
    }
    return {
        /** Reads the current ARIA runtime configuration value by key. */
        config(key) {
            return config[key];
        },
        _diagnoseInteractive: diagnoseInteractive,
        _diagnostics() {
            return diagnostics;
        },
        _watchExpr: watchExpr,
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
        link(_scope, elem) {
            if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR))
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
        compile(elem) {
            if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR))
                return undefined;
            const fn = $parse(getNormalizedAttr(elem, "ngClick") ?? "");
            return (scope, linkElem) => {
                if (!isNodeOneOf(linkElem, nativeAriaNodeNames)) {
                    if ($aria.config("bindRoleForClick") &&
                        !linkElem.hasAttribute("role")) {
                        linkElem.setAttribute("role", "button");
                    }
                    if ($aria.config("tabindex") && !linkElem.hasAttribute("tabindex")) {
                        linkElem.setAttribute("tabindex", "0");
                    }
                    if ($aria.config("bindKeydown") &&
                        !hasNormalizedAttr(linkElem, "ngKeydown") &&
                        !hasNormalizedAttr(linkElem, "ngKeypress") &&
                        !hasNormalizedAttr(linkElem, "ngKeyup")) {
                        /** Handles keyboard activation for synthetic button semantics. */
                        linkElem.addEventListener("keydown", (event) => {
                            const isActivationKey = event.key === "Enter" || event.key === " ";
                            if (isActivationKey) {
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
                    $aria._diagnoseInteractive(linkElem, "ng-click");
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
            (elem.getAttribute("type") !== "hidden" || elem.nodeName !== "INPUT"));
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
    function getShape(element) {
        const type = getNormalizedAttr(element, "type");
        const role = getNormalizedAttr(element, "role");
        return (type ?? role) === "checkbox" || role === "menuitemcheckbox"
            ? "checkbox"
            : (type ?? role) === "radio" || role === "menuitemradio"
                ? "radio"
                : type === "range" || role === "progressbar" || role === "slider"
                    ? "range"
                    : "";
    }
    function observeAriaAttribute(scope, elem, normalizedName, callback) {
        const observerName = directiveNormalize(normalizedName);
        const observer = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i++) {
                const attributeName = mutations[i].attributeName;
                if (attributeName &&
                    directiveNormalize(attributeName) === observerName) {
                    callback();
                }
            }
        });
        observer.observe(elem, { attributes: true });
        let deregisterDestroy = scope.$on("$destroy", deregister);
        function deregister() {
            observer.disconnect();
            deregisterDestroy?.();
            deregisterDestroy = undefined;
        }
    }
    return {
        restrict: "A",
        require: "ngModel",
        priority: 200, // Make sure watches are fired after any other directives that affect the ngModel value
        compile(compileElement) {
            if (hasNormalizedAttr(compileElement, ARIA_DISABLE_ATTR))
                return undefined;
            const shape = getShape(compileElement);
            return {
                post(scope, elem, ngModel) {
                    const needsTabIndex = shouldAttachAttr("tabindex", "tabindex", elem, false);
                    function getRadioReaction() {
                        // Strict comparison would cause a BC
                        elem.setAttribute("aria-checked", (getNormalizedAttr(elem, "value") == ngModel.$viewValue).toString());
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
                            $aria._diagnoseInteractive(elem, "ng-model");
                            break;
                        case "range":
                            if (shouldAttachRole(shape, elem)) {
                                elem.setAttribute("role", "slider");
                            }
                            if ($aria.config("ariaValue")) {
                                const needsAriaValuemin = !elem.hasAttribute("aria-valuemin") &&
                                    (hasNormalizedAttr(elem, "min") ||
                                        hasNormalizedAttr(elem, "ngMin"));
                                const needsAriaValuemax = !elem.hasAttribute("aria-valuemax") &&
                                    (hasNormalizedAttr(elem, "max") ||
                                        hasNormalizedAttr(elem, "ngMax"));
                                const needsAriaValuenow = !elem.hasAttribute("aria-valuenow");
                                if (needsAriaValuemin) {
                                    const updateAriaMin = () => {
                                        elem.setAttribute("aria-valuemin", stringify(getNormalizedAttr(elem, "min") ??
                                            getNormalizedAttr(elem, "ngMin")));
                                    };
                                    updateAriaMin();
                                    observeAriaAttribute(scope, elem, "min", updateAriaMin);
                                    observeAriaAttribute(scope, elem, "ngMin", updateAriaMin);
                                }
                                if (needsAriaValuemax) {
                                    const updateAriaMax = () => {
                                        elem.setAttribute("aria-valuemax", stringify(getNormalizedAttr(elem, "max") ??
                                            getNormalizedAttr(elem, "ngMax")));
                                    };
                                    updateAriaMax();
                                    observeAriaAttribute(scope, elem, "max", updateAriaMax);
                                    observeAriaAttribute(scope, elem, "ngMax", updateAriaMax);
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
                            $aria._diagnoseInteractive(elem, "ng-model");
                            break;
                    }
                    if (!hasNormalizedAttr(elem, "ngRequired") &&
                        ngModel.$validators.required &&
                        shouldAttachAttr("aria-required", "ariaRequired", elem, false)) {
                        // ngModel.$error.required is undefined on custom controls
                        const updateAriaRequired = () => {
                            elem.setAttribute("aria-required", hasNormalizedAttr(elem, "required").toString());
                        };
                        updateAriaRequired();
                        observeAriaAttribute(scope, elem, "required", updateAriaRequired);
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
        link(_scope, elem) {
            if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR))
                return;
            if ($aria.config("tabindex") &&
                !elem.hasAttribute("tabindex") &&
                !isNodeOneOf(elem, nativeAriaNodeNames)) {
                elem.setAttribute("tabindex", "0");
            }
            if (!isNodeOneOf(elem, nativeAriaNodeNames)) {
                $aria._diagnoseInteractive(elem, "ng-dblclick");
            }
        },
    };
}

export { applyAriaConfiguration, createAriaRuntimeState, createAriaService, destroyAriaRuntimeState, ngCheckedAriaDirective, ngClickAriaDirective, ngDblclickAriaDirective, ngDisabledAriaDirective, ngHideAriaDirective, ngMessagesAriaDirective, ngModelAriaDirective, ngReadonlyAriaDirective, ngRequiredAriaDirective, ngShowAriaDirective, ngValueAriaDirective };
