import { extend, hasOwn } from "../../shared/utils.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import type { AriaService } from "./interface.ts";

const ARIA_DISABLE_ATTR = "ngAriaDisable";

type AriaConfig = {
  ariaHidden: boolean;
  ariaChecked: boolean;
  ariaReadonly: boolean;
  ariaDisabled: boolean;
  ariaRequired: boolean;
  ariaInvalid: boolean;
  ariaValue: boolean;
  tabindex: boolean;
  bindKeydown: boolean;
  bindRoleForClick: boolean;
};

type AriaProviderInstance = {
  config: (newConfig: Partial<AriaConfig>) => void;
  $get: () => AriaService;
};

type AriaNgModelController = ng.NgModelController & {
  $validators: Record<string, any>;
  $watch: (expr: string, listener: (value: any) => void) => void;
  $viewValue: any;
};

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

const isNodeOneOf = function (
  elem: HTMLElement,
  nodeTypeArray: string[],
): boolean {
  return nodeTypeArray.indexOf(elem.nodeName) !== -1;
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
export function AriaProvider(this: AriaProviderInstance): void {
  let config: AriaConfig = {
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

  this.config = function (newConfig: Partial<AriaConfig>) {
    config = extend(config, newConfig);
  };

  /**
   * @param {string | number} attrName
   * @param {any} ariaAttr
   * @param {string | any[]} nativeAriaNodeNamesParam
   * @param {any} negate
   */
  function watchExpr(
    attrName: string,
    ariaAttr: string,
    nativeAriaNodeNamesParam: string[],
    negate: boolean,
  ): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void {
    return function (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) {
      if (hasOwn(attr, ARIA_DISABLE_ATTR)) return;

      const ariaCamelName = attr.$normalize(ariaAttr) as keyof AriaConfig;

      if (
        config[ariaCamelName] &&
        !isNodeOneOf(elem, nativeAriaNodeNamesParam) &&
        !attr[ariaCamelName]
      ) {
        scope.$watch(attr[attrName], (boolVal: any) => {
          // ensure boolean value
          boolVal = negate ? !boolVal : !!boolVal;
          elem.setAttribute(ariaAttr, boolVal);
        });
      }
    };
  }

  this.$get = function (): AriaService {
    return {
      /**
       * @param {string | number} key
       */
      config(key: string | number) {
        return config[key as keyof AriaConfig];
      },
      _watchExpr: watchExpr,
    };
  };
}

ngDisabledAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 */
export function ngDisabledAriaDirective($aria: AriaService) {
  return $aria._watchExpr(
    "ngDisabled",
    "aria-disabled",
    nativeAriaNodeNames,
    false,
  );
}

ngShowAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 */
export function ngShowAriaDirective($aria: AriaService) {
  return $aria._watchExpr("ngShow", "aria-hidden", [], true);
}

/**
 * @return {ng.Directive}
 */
export function ngMessagesAriaDirective() {
  return {
    restrict: "A",
    require: "?ngMessages",
    link(_scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) {
      if (hasOwn(attr, ARIA_DISABLE_ATTR)) return;

      if (!elem.hasAttribute("aria-live")) {
        elem.setAttribute("aria-live", "assertive");
      }
    },
  };
}

ngClickAriaDirective.$inject = [$injectTokens._aria, $injectTokens._parse];

/**
 * @param {ng.AriaService} $aria
 * @param {ng.ParseService} $parse
 * @return {ng.Directive}
 */
export function ngClickAriaDirective(
  $aria: AriaService,
  $parse: ng.ParseService,
) {
  return {
    restrict: "A",
    compile(_elem: HTMLElement, attr: ng.Attributes) {
      if (hasOwn(attr, ARIA_DISABLE_ATTR)) return undefined;

      const fn = $parse(attr.ngClick);

      return (scope: ng.Scope, elem: HTMLElement, attrParam: ng.Attributes) => {
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
                      (event.target as Node).nodeName,
                    ) === -1 &&
                    !(event.target as HTMLElement).isContentEditable
                  ) {
                    // ... prevent the default browser behavior (e.g. scrolling when pressing spacebar)
                    // See https://github.com/angular/angular.ts/issues/16664
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

ngRequiredAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 */
export function ngRequiredAriaDirective($aria: AriaService) {
  return $aria._watchExpr(
    "ngRequired",
    "aria-required",
    nativeAriaNodeNames,
    false,
  );
}

ngCheckedAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 */
export function ngCheckedAriaDirective($aria: AriaService) {
  return $aria._watchExpr(
    "ngChecked",
    "aria-checked",
    nativeAriaNodeNames,
    false,
  );
}

ngValueAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 */
export function ngValueAriaDirective($aria: AriaService) {
  return $aria._watchExpr(
    "ngValue",
    "aria-checked",
    nativeAriaNodeNames,
    false,
  );
}

ngHideAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 */
export function ngHideAriaDirective($aria: AriaService) {
  return $aria._watchExpr("ngHide", "aria-hidden", [], false);
}

ngReadonlyAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 */
export function ngReadonlyAriaDirective($aria: AriaService) {
  return $aria._watchExpr(
    "ngReadonly",
    "aria-readonly",
    nativeAriaNodeNames,
    false,
  );
}

ngModelAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 * @returns {ng.Directive}
 */
export function ngModelAriaDirective($aria: AriaService): ng.Directive<any> {
  /**
   * @param {string} attr
   * @param {string} normalizedAttr
   * @param {HTMLElement} elem
   * @param {boolean} allowNonAriaNodes
   */
  function shouldAttachAttr(
    attr: string,
    normalizedAttr: string,
    elem: HTMLElement,
    allowNonAriaNodes: boolean,
  ): boolean {
    return (
      $aria.config(normalizedAttr) &&
      !elem.getAttribute(attr) &&
      (allowNonAriaNodes || !isNodeOneOf(elem, nativeAriaNodeNames)) &&
      (elem.getAttribute("type") !== "hidden" || elem.nodeName !== "INPUT")
    );
  }

  /**
   * @param {string} role
   * @param {HTMLElement} elem
   */
  function shouldAttachRole(role: string, elem: HTMLElement): boolean {
    // if element does not have role attribute
    // AND element type is equal to role (if custom element has a type equaling shape) <-- remove?
    // AND element is not in nativeAriaNodeNames
    return (
      !elem.getAttribute("role") &&
      elem.getAttribute("type") === role &&
      !isNodeOneOf(elem, nativeAriaNodeNames)
    );
  }

  /**
   * @param {ng.Attributes} attr
   * @returns {string}
   */
  function getShape(attr: ng.Attributes): string {
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
    compile(_: unknown, attr: ng.Attributes) {
      if (hasOwn(attr, ARIA_DISABLE_ATTR)) return undefined;

      const shape = getShape(attr);

      return {
        // eslint-disable-next-line no-shadow
        post(
          _: unknown,
          elem: HTMLElement,
          attrPost: ng.Attributes,
          ngModel: AriaNgModelController,
        ) {
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
              // eslint-disable-next-line eqeqeq
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
                elem.setAttribute("tabindex", "0");
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
                  attrPost.$observe("min", (newVal?: unknown) => {
                    elem.setAttribute("aria-valuemin", String(newVal ?? ""));
                  });
                }

                if (needsAriaValuemax) {
                  attrPost.$observe("max", (newVal?: unknown) => {
                    elem.setAttribute("aria-valuemax", String(newVal ?? ""));
                  });
                }

                if (needsAriaValuenow) {
                  ngModel.$watch("$modelValue", (newVal: string) => {
                    elem.setAttribute("aria-valuenow", newVal);
                  });
                }
              }

              if (needsTabIndex) {
                elem.setAttribute("tabindex", "0");
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
            ngModel.$watch("$invalid", (newVal: any) => {
              elem.setAttribute("aria-invalid", (!!newVal).toString());
            });
          }
        },
      };
    },
  };
}

ngDblclickAriaDirective.$inject = [$injectTokens._aria];
/**
 * @param {ng.AriaService} $aria
 * @returns {import("../../interface.ts").DirectiveLinkFn<any>}
 */
export function ngDblclickAriaDirective(
  $aria: AriaService,
): import("../../interface.ts").DirectiveLinkFn<any> {
  return function (_scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) {
    if (hasOwn(attr, ARIA_DISABLE_ATTR)) return;

    if (
      $aria.config("tabindex") &&
      !elem.hasAttribute("tabindex") &&
      !isNodeOneOf(elem, nativeAriaNodeNames)
    ) {
      elem.setAttribute("tabindex", "0");
    }
  };
}
