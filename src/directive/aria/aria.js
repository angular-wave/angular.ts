import { extend, hasOwn } from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";

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
  if (nodeTypeArray.indexOf(elem.nodeName) !== -1) {
    return true;
  }

  return false;
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
export function AriaProvider() {
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

  function watchExpr(attrName, ariaAttr, nativeAriaNodeNamesParam, negate) {
    return function (scope, elem, attr) {
      if (hasOwn(attr, ARIA_DISABLE_ATTR)) return;

      const ariaCamelName = attr.$normalize(ariaAttr);

      if (
        config[ariaCamelName] &&
        !isNodeOneOf(elem, nativeAriaNodeNamesParam) &&
        !attr[ariaCamelName]
      ) {
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
      config(key) {
        return config[key];
      },
      $$watchExpr: watchExpr,
    };
  };
}

ngDisabledAriaDirective.$inject = [$injectTokens.$aria];
export function ngDisabledAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngDisabled",
    "aria-disabled",
    nativeAriaNodeNames,
    false,
  );
}

ngShowAriaDirective.$inject = [$injectTokens.$aria];
export function ngShowAriaDirective($aria) {
  return $aria.$$watchExpr("ngShow", "aria-hidden", [], true);
}

/**
 * @return {ng.Directive}
 */
export function ngMessagesAriaDirective() {
  return {
    restrict: "A",
    require: "?ngMessages",
    link(_scope, elem, attr) {
      if (hasOwn(attr, ARIA_DISABLE_ATTR)) return;

      if (!elem.hasAttribute("aria-live")) {
        elem.setAttribute("aria-live", "assertive");
      }
    },
  };
}

ngClickAriaDirective.$inject = [$injectTokens.$aria, $injectTokens.$parse];

/**
 * @param $aria
 * @param {ng.ParseService} $parse
 * @return {ng.Directive}
 */
export function ngClickAriaDirective($aria, $parse) {
  return {
    restrict: "A",
    compile(_elem, attr) {
      if (hasOwn(attr, ARIA_DISABLE_ATTR)) return undefined;

      const fn = $parse(attr.ngClick);

      return (scope, elem, attrParam) => {
        if (!isNodeOneOf(elem, nativeAriaNodeNames)) {
          if ($aria.config("bindRoleForClick") && !elem.hasAttribute("role")) {
            elem.setAttribute("role", "button");
          }

          if ($aria.config("tabindex") && !elem.hasAttribute("tabindex")) {
            elem.setAttribute("tabindex", "0");
          }

          if (
            $aria.config("bindKeydown") &&
            !attrParam.ngKeydown &&
            !attrParam.ngKeypress &&
            !attrParam.ngKeyup
          ) {
            elem.addEventListener(
              "keydown",
              /** @param {KeyboardEvent} event */
              (event) => {
                const keyCode = parseInt(event.key, 10);

                // eslint-disable-next-line no-magic-numbers
                if (keyCode === 13 || keyCode === 32) {
                  // If the event is triggered on a non-interactive element ...
                  if (
                    nativeAriaNodeNames.indexOf(
                      /** @type {Node} */ (event.target).nodeName,
                    ) === -1 &&
                    !(
                      /** @type {HTMLElement} */ (event.target)
                        .isContentEditable
                    )
                  ) {
                    // ... prevent the default browser behavior (e.g. scrolling when pressing spacebar)
                    // See https://github.com/angular/angular.js/issues/16664
                    event.preventDefault();
                  }
                  fn(scope, { $event: event });
                }
              },
            );
          }
        }
      };
    },
  };
}

ngRequiredAriaDirective.$inject = [$injectTokens.$aria];
export function ngRequiredAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngRequired",
    "aria-required",
    nativeAriaNodeNames,
    false,
  );
}

ngCheckedAriaDirective.$inject = ["$aria"];
export function ngCheckedAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngChecked",
    "aria-checked",
    nativeAriaNodeNames,
    false,
  );
}

ngValueAriaDirective.$inject = [$injectTokens.$aria];
export function ngValueAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngValue",
    "aria-checked",
    nativeAriaNodeNames,
    false,
  );
}

ngHideAriaDirective.$inject = [$injectTokens.$aria];
export function ngHideAriaDirective($aria) {
  return $aria.$$watchExpr("ngHide", "aria-hidden", [], false);
}

ngReadonlyAriaDirective.$inject = [$injectTokens.$aria];
export function ngReadonlyAriaDirective($aria) {
  return $aria.$$watchExpr(
    "ngReadonly",
    "aria-readonly",
    nativeAriaNodeNames,
    false,
  );
}

ngModelAriaDirective.$inject = [$injectTokens.$aria];
export function ngModelAriaDirective($aria) {
  function shouldAttachAttr(attr, normalizedAttr, elem, allowNonAriaNodes) {
    return (
      $aria.config(normalizedAttr) &&
      !elem.getAttribute(attr) &&
      (allowNonAriaNodes || !isNodeOneOf(elem, nativeAriaNodeNames)) &&
      (elem.getAttribute("type") !== "hidden" || elem.nodeName !== "INPUT")
    );
  }

  function shouldAttachRole(role, elem) {
    // if element does not have role attribute
    // AND element type is equal to role (if custom element has a type equaling shape) <-- remove?
    // AND element is not in nativeAriaNodeNames
    return (
      !elem.getAttribute("role") &&
      elem.getAttribute("type") === role &&
      !isNodeOneOf(elem, nativeAriaNodeNames)
    );
  }

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
    compile(_, attr) {
      if (hasOwn(attr, ARIA_DISABLE_ATTR)) return undefined;

      const shape = getShape(attr);

      return {
        post(_, elem, attrPost, ngModel) {
          const needsTabIndex = shouldAttachAttr(
            "tabindex",
            "tabindex",
            elem,
            false,
          );

          function getRadioReaction() {
            // Strict comparison would cause a BC
            elem.setAttribute(
              "aria-checked",
              (attrPost.value == ngModel.$viewValue).toString(),
            );
          }

          function getCheckboxReaction() {
            elem.setAttribute(
              "aria-checked",
              (!ngModel.$isEmpty(ngModel.$viewValue)).toString(),
            );
          }

          switch (shape) {
            case "radio":
            case "checkbox":
              if (shouldAttachRole(shape, elem)) {
                elem.setAttribute("role", shape);
              }

              if (
                shouldAttachAttr("aria-checked", "ariaChecked", elem, false)
              ) {
                ngModel.$watch(
                  "$modelValue",
                  shape === "radio" ? getRadioReaction : getCheckboxReaction,
                );
              }

              if (needsTabIndex) {
                elem.setAttribute("tabindex", 0);
              }
              break;
            case "range":
              if (shouldAttachRole(shape, elem)) {
                elem.setAttribute("role", "slider");
              }

              if ($aria.config("ariaValue")) {
                const needsAriaValuemin =
                  !elem.hasAttribute("aria-valuemin") &&
                  (hasOwn(attrPost, "min") || hasOwn(attrPost, "ngMin"));

                const needsAriaValuemax =
                  !elem.hasAttribute("aria-valuemax") &&
                  (hasOwn(attrPost, "max") || hasOwn(attrPost, "ngMax"));

                const needsAriaValuenow = !elem.hasAttribute("aria-valuenow");

                if (needsAriaValuemin) {
                  attrPost.$observe("min", (newVal) => {
                    elem.setAttribute("aria-valuemin", newVal);
                  });
                }

                if (needsAriaValuemax) {
                  attrPost.$observe("max", (newVal) => {
                    elem.setAttribute("aria-valuemax", newVal);
                  });
                }

                if (needsAriaValuenow) {
                  ngModel.$watch("$modelValue", (newVal) => {
                    elem.setAttribute("aria-valuenow", newVal);
                  });
                }
              }

              if (needsTabIndex) {
                elem.setAttribute("tabindex", 0);
              }
              break;
          }

          if (
            !hasOwn(attrPost, "ngRequired") &&
            ngModel.$validators.required &&
            shouldAttachAttr("aria-required", "ariaRequired", elem, false)
          ) {
            // ngModel.$error.required is undefined on custom controls
            attrPost.$observe("required", () => {
              elem.setAttribute(
                "aria-required",
                (!!attrPost.required).toString(),
              );
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

ngDblclickAriaDirective.$inject = [$injectTokens.$aria];
export function ngDblclickAriaDirective($aria) {
  return function (scope, elem, attr) {
    if (hasOwn(attr, ARIA_DISABLE_ATTR)) return;

    if (
      $aria.config("tabindex") &&
      !elem.hasAttribute("tabindex") &&
      !isNodeOneOf(elem, nativeAriaNodeNames)
    ) {
      elem.setAttribute("tabindex", 0);
    }
  };
}
