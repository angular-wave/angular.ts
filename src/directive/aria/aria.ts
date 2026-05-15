import { _aria, _parse } from "../../injection-tokens.ts";
import { getNormalizedAttr, hasNormalizedAttr } from "../../shared/dom.ts";
import { extend, stringify } from "../../shared/utils.ts";

export interface AriaService {
  config(key: string | number): any;
  /** @internal */
  _watchExpr(
    attrName: string | number,
    ariaAttr: string,
    nativeAriaNodeNamesParam: string[],
    negate: boolean,
  ): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
}

const ARIA_DISABLE_ATTR = "ngAriaDisable";

interface AriaConfig {
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
}

interface AriaProviderInstance {
  config: (newConfig: Partial<AriaConfig>) => void;
  $get: () => AriaService;
}

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

  /** Builds a watcher that mirrors an Angular expression into an ARIA attribute. */
  function watchExpr(
    attrName: string,
    ariaAttr: string,
    nativeAriaNodeNamesParam: string[],
    negate: boolean,
  ): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void {
    return function (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) {
      if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR)) return;

      const ariaCamelName = attr.$normalize(ariaAttr) as keyof AriaConfig;

      if (
        config[ariaCamelName] &&
        !isNodeOneOf(elem, nativeAriaNodeNamesParam) &&
        !hasNormalizedAttr(elem, ariaCamelName)
      ) {
        scope.$watch(
          getNormalizedAttr(elem, attrName) || "",
          (boolVal: any) => {
            // ensure boolean value
            boolVal = negate ? !boolVal : !!boolVal;
            elem.setAttribute(ariaAttr, boolVal);
          },
        );
      }
    };
  }

  this.$get = function (): AriaService {
    return {
      /** Reads the current ARIA provider configuration value by key. */
      config(key: string | number) {
        return config[key as keyof AriaConfig];
      },
      _watchExpr: watchExpr,
    };
  };
}

ngDisabledAriaDirective.$inject = [_aria];
/** Mirrors `ngDisabled` into `aria-disabled` when needed. */
export function ngDisabledAriaDirective($aria: AriaService): ng.Directive {
  return {
    restrict: "A",
    link: $aria._watchExpr(
      "ngDisabled",
      "aria-disabled",
      nativeAriaNodeNames,
      false,
    ),
  };
}

ngShowAriaDirective.$inject = [_aria];
/** Mirrors `ngShow` into `aria-hidden` when needed. */
export function ngShowAriaDirective($aria: AriaService): ng.Directive {
  return {
    restrict: "A",
    link: $aria._watchExpr("ngShow", "aria-hidden", [], true),
  };
}

/** Adds `aria-live` to `ngMessages` containers when not already present. */
export function ngMessagesAriaDirective(): ng.Directive {
  return {
    restrict: "A",
    require: "?ngMessages",
    link(_scope: ng.Scope, elem: HTMLElement) {
      if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR)) return;

      if (!elem.hasAttribute("aria-live")) {
        elem.setAttribute("aria-live", "assertive");
      }
    },
  };
}

ngClickAriaDirective.$inject = [_aria, _parse];

/** Adds keyboard and role accessibility behavior for `ngClick` on non-native controls. */
export function ngClickAriaDirective(
  $aria: AriaService,
  $parse: ng.ParseService,
): ng.Directive {
  return {
    restrict: "A",
    compile(elem: HTMLElement) {
      if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR)) return undefined;

      const fn = $parse(getNormalizedAttr(elem, "ngClick") || "");

      return (scope: ng.Scope, elem: HTMLElement) => {
        if (!isNodeOneOf(elem, nativeAriaNodeNames)) {
          if ($aria.config("bindRoleForClick") && !elem.hasAttribute("role")) {
            elem.setAttribute("role", "button");
          }

          if ($aria.config("tabindex") && !elem.hasAttribute("tabindex")) {
            elem.setAttribute("tabindex", "0");
          }

          if (
            $aria.config("bindKeydown") &&
            !hasNormalizedAttr(elem, "ngKeydown") &&
            !hasNormalizedAttr(elem, "ngKeypress") &&
            !hasNormalizedAttr(elem, "ngKeyup")
          ) {
            elem.addEventListener(
              "keydown",
              /** Handles keyboard activation for synthetic button semantics. */
              (event) => {
                const keyCode = parseInt(event.key, 10);

                if (keyCode === 13 || keyCode === 32) {
                  // If the event is triggered on a non-interactive element ...
                  if (
                    !nativeAriaNodeNames.includes(
                      (event.target as Node).nodeName,
                    ) &&
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

ngRequiredAriaDirective.$inject = [_aria];
/** Mirrors `ngRequired` into `aria-required` when needed. */
export function ngRequiredAriaDirective($aria: AriaService): ng.Directive {
  return {
    restrict: "A",
    link: $aria._watchExpr(
      "ngRequired",
      "aria-required",
      nativeAriaNodeNames,
      false,
    ),
  };
}

ngCheckedAriaDirective.$inject = [_aria];
/** Mirrors `ngChecked` into `aria-checked` when needed. */
export function ngCheckedAriaDirective($aria: AriaService): ng.Directive {
  return {
    restrict: "A",
    link: $aria._watchExpr(
      "ngChecked",
      "aria-checked",
      nativeAriaNodeNames,
      false,
    ),
  };
}

ngValueAriaDirective.$inject = [_aria];
/** Mirrors `ngValue` into `aria-checked` for non-native controls when needed. */
export function ngValueAriaDirective($aria: AriaService): ng.Directive {
  return {
    restrict: "A",
    link: $aria._watchExpr(
      "ngValue",
      "aria-checked",
      nativeAriaNodeNames,
      false,
    ),
  };
}

ngHideAriaDirective.$inject = [_aria];
/** Mirrors `ngHide` into `aria-hidden` when needed. */
export function ngHideAriaDirective($aria: AriaService): ng.Directive {
  return {
    restrict: "A",
    link: $aria._watchExpr("ngHide", "aria-hidden", [], false),
  };
}

ngReadonlyAriaDirective.$inject = [_aria];
/** Mirrors `ngReadonly` into `aria-readonly` when needed. */
export function ngReadonlyAriaDirective($aria: AriaService): ng.Directive {
  return {
    restrict: "A",
    link: $aria._watchExpr(
      "ngReadonly",
      "aria-readonly",
      nativeAriaNodeNames,
      false,
    ),
  };
}

ngModelAriaDirective.$inject = [_aria];
/** Adds ARIA validity, checked, and range metadata for `ngModel` controls. */
export function ngModelAriaDirective($aria: AriaService): ng.Directive {
  /** Determines whether an ARIA attribute should be attached to an element. */
  function shouldAttachAttr(
    attr: string,
    normalizedAttr: string,
    elem: HTMLElement,
    allowNonAriaNodes: boolean,
  ): boolean {
    return ($aria.config(normalizedAttr) &&
      !elem.getAttribute(attr) &&
      (allowNonAriaNodes || !isNodeOneOf(elem, nativeAriaNodeNames)) &&
      (elem.getAttribute("type") !== "hidden" ||
        elem.nodeName !== "INPUT")) as boolean;
  }

  /** Determines whether a synthetic ARIA role should be attached to an element. */
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

  /** Infers the control shape used to decide which ARIA attributes to manage. */
  function getShape(element: Element): string {
    const type = getNormalizedAttr(element, "type");

    const role = getNormalizedAttr(element, "role");

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
    compile(compileElement: Element) {
      if (hasNormalizedAttr(compileElement, ARIA_DISABLE_ATTR))
        return undefined;

      const shape = getShape(compileElement);

      return {
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
                  (hasNormalizedAttr(elem, "min") ||
                    hasNormalizedAttr(elem, "ngMin"));

                const needsAriaValuemax =
                  !elem.hasAttribute("aria-valuemax") &&
                  (hasNormalizedAttr(elem, "max") ||
                    hasNormalizedAttr(elem, "ngMax"));

                const needsAriaValuenow = !elem.hasAttribute("aria-valuenow");

                if (needsAriaValuemin) {
                  attrPost.$observe("min", (newVal?: unknown) => {
                    elem.setAttribute("aria-valuemin", stringify(newVal));
                  });
                }

                if (needsAriaValuemax) {
                  attrPost.$observe("max", (newVal?: unknown) => {
                    elem.setAttribute("aria-valuemax", stringify(newVal));
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
            !hasNormalizedAttr(elem, "ngRequired") &&
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

ngDblclickAriaDirective.$inject = [_aria];
/** Adds focusability for `ngDblclick` on non-native interactive controls. */
export function ngDblclickAriaDirective($aria: AriaService): ng.Directive {
  return {
    restrict: "A",
    link(_scope: ng.Scope, elem: HTMLElement) {
      if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR)) return;

      if (
        $aria.config("tabindex") &&
        !elem.hasAttribute("tabindex") &&
        !isNodeOneOf(elem, nativeAriaNodeNames)
      ) {
        elem.setAttribute("tabindex", "0");
      }
    },
  };
}
