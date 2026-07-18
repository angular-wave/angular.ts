import { _aria, _parse } from "../../injection-tokens.ts";
import { directiveNormalize, stringify } from "../../shared/utils.ts";
import { getNormalizedAttr, hasNormalizedAttr } from "../../shared/dom.ts";

type AriaDiagnosticCode =
  | "aria-missing-accessible-name"
  | "aria-missing-reference"
  | "aria-positive-tabindex"
  | "aria-hidden-interactive";

interface AriaDiagnostic {
  code: AriaDiagnosticCode;
  message: string;
  source: string;
  element: HTMLElement;
}

type AriaAttributeName =
  | "aria-activedescendant"
  | "aria-atomic"
  | "aria-autocomplete"
  | "aria-braillelabel"
  | "aria-brailleroledescription"
  | "aria-busy"
  | "aria-checked"
  | "aria-colcount"
  | "aria-colindex"
  | "aria-colindextext"
  | "aria-colspan"
  | "aria-controls"
  | "aria-current"
  | "aria-describedby"
  | "aria-description"
  | "aria-details"
  | "aria-disabled"
  | "aria-dropeffect"
  | "aria-errormessage"
  | "aria-expanded"
  | "aria-flowto"
  | "aria-grabbed"
  | "aria-haspopup"
  | "aria-hidden"
  | "aria-invalid"
  | "aria-keyshortcuts"
  | "aria-label"
  | "aria-labelledby"
  | "aria-level"
  | "aria-live"
  | "aria-modal"
  | "aria-multiline"
  | "aria-multiselectable"
  | "aria-orientation"
  | "aria-owns"
  | "aria-placeholder"
  | "aria-posinset"
  | "aria-pressed"
  | "aria-readonly"
  | "aria-relevant"
  | "aria-required"
  | "aria-roledescription"
  | "aria-rowcount"
  | "aria-rowindex"
  | "aria-rowindextext"
  | "aria-rowspan"
  | "aria-selected"
  | "aria-setsize"
  | "aria-sort"
  | "aria-valuemax"
  | "aria-valuemin"
  | "aria-valuenow"
  | "aria-valuetext";

type ManagedAriaAttributeName = Extract<
  AriaAttributeName,
  | "aria-hidden"
  | "aria-current"
  | "aria-checked"
  | "aria-readonly"
  | "aria-disabled"
  | "aria-required"
  | "aria-invalid"
>;

export interface AriaService {
  config<K extends keyof AriaConfig>(key: K): AriaConfig[K];
  /** @internal */
  _diagnoseInteractive(element: HTMLElement, source: string): void;
  /** @internal */
  _diagnostics(): readonly AriaDiagnostic[];
  /** @internal */
  _watchExpr(
    attrName: string,
    ariaAttr: ManagedAriaAttributeName,
    nativeAriaNodeNamesParam: string[],
    negate: boolean,
  ): (scope: ng.Scope, elem: HTMLElement) => void;
}

const ARIA_DISABLE_ATTR = "ngAriaDisable";

export interface AriaConfig {
  ariaHidden: boolean;
  ariaChecked: boolean;
  ariaReadonly: boolean;
  ariaDisabled: boolean;
  ariaRequired: boolean;
  ariaInvalid: boolean;
  ariaValue: boolean;
  ariaCurrent: boolean;
  ariaCurrentToken:
    | "page"
    | "step"
    | "location"
    | "date"
    | "time"
    | "true"
    | "false";
  tabindex: boolean;
  bindKeydown: boolean;
  bindRoleForClick: boolean;
  bindRoleForState: boolean;
  diagnostics: boolean;
}

type AriaNgModelController = Omit<
  ng.NgModelController,
  "$isEmpty" | "$validators" | "$watch" | "$viewValue"
> & {
  $isEmpty: (value: unknown) => boolean;
  $validators: Partial<Record<string, unknown>>;
  $watch: {
    (expr: "$modelValue", listener: (value: string) => void): void;
    (expr: string, listener: (value: unknown) => void): void;
  };
  $viewValue: unknown;
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

const ARIA_REFERENCE_ATTRS = [
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-labelledby",
];

const isNodeOneOf = function (
  elem: HTMLElement,
  nodeTypeArray: string[],
): boolean {
  return nodeTypeArray.includes(elem.nodeName);
};

const DEFAULT_ARIA_CONFIG: AriaConfig = {
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
export interface AriaRuntimeState {
  readonly config: AriaConfig;
  destroyed: boolean;
}

/** @internal */
export function createAriaRuntimeState(): AriaRuntimeState {
  return {
    config: { ...DEFAULT_ARIA_CONFIG },
    destroyed: false,
  };
}

/** @internal */
export function applyAriaConfiguration(
  state: AriaRuntimeState,
  config: Partial<AriaConfig>,
): void {
  if (state.destroyed) {
    throw new Error("ARIA runtime has already been disposed.");
  }

  Object.assign(state.config, config);
}

/** @internal */
export function destroyAriaRuntimeState(state: AriaRuntimeState): void {
  if (state.destroyed) return;

  state.destroyed = true;
}

/** @internal */
export function createAriaService(
  state: AriaRuntimeState,
  $log: ng.LogService,
): AriaService {
  if (state.destroyed) {
    throw new Error("ARIA runtime has already been disposed.");
  }

  const config = state.config;

  const diagnostics: AriaDiagnostic[] = [];
  const seenDiagnostics = new Set<string>();

  function findReferencedElement(
    element: HTMLElement,
    id: string,
  ): HTMLElement | null {
    let current: HTMLElement | null = element;

    while (current) {
      if (current.id === id) {
        return current;
      }

      const candidates = Array.from(
        current.querySelectorAll<HTMLElement>("[id]"),
      );
      const found = candidates.find((candidate) => candidate.id === id);

      if (found) {
        return found;
      }

      current = current.parentElement;
    }

    return element.ownerDocument.getElementById(id);
  }

  function hasAccessibleName(element: HTMLElement): boolean {
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

          return Boolean(
            (label.getAttribute("aria-label") ?? "").trim() ||
            label.textContent.trim(),
          );
        });

      if (hasReferencedName) {
        return true;
      }
    }

    return Boolean(element.textContent.trim());
  }

  function reportDiagnostic(
    element: HTMLElement,
    source: string,
    code: AriaDiagnosticCode,
    message: string,
  ): void {
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

  function diagnoseAriaReferences(element: HTMLElement, source: string): void {
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
            reportDiagnostic(
              element,
              source,
              "aria-missing-reference",
              `$aria: ${source} references missing ${attr} target "${id}".`,
            );
          }
        });
    });
  }

  function diagnoseInteractive(element: HTMLElement, source: string): void {
    const tabindex = element.getAttribute("tabindex");
    const parsedTabindex = tabindex === null ? 0 : Number(tabindex);

    if (Number.isFinite(parsedTabindex) && parsedTabindex > 0) {
      reportDiagnostic(
        element,
        source,
        "aria-positive-tabindex",
        `$aria: ${source} uses positive tabindex "${String(tabindex)}". Prefer tabindex="0" and DOM order.`,
      );
    }

    if (element.getAttribute("aria-hidden") === "true") {
      reportDiagnostic(
        element,
        source,
        "aria-hidden-interactive",
        `$aria: ${source} is interactive but hidden from the accessibility tree.`,
      );
    }

    if (!hasAccessibleName(element)) {
      reportDiagnostic(
        element,
        source,
        "aria-missing-accessible-name",
        `$aria: ${source} creates an interactive element without an accessible name.`,
      );
    }

    diagnoseAriaReferences(element, source);
  }

  /** Builds a watcher that mirrors an Angular expression into an ARIA attribute. */
  function watchExpr(
    attrName: string,
    ariaAttr: ManagedAriaAttributeName,
    nativeAriaNodeNamesParam: string[],
    negate: boolean,
  ): (scope: ng.Scope, elem: HTMLElement) => void {
    return function (scope: ng.Scope, elem: HTMLElement) {
      if (hasNormalizedAttr(elem, ARIA_DISABLE_ATTR)) return;

      const ariaCamelName = directiveNormalize(ariaAttr) as keyof AriaConfig;

      if (
        config[ariaCamelName] &&
        !isNodeOneOf(elem, nativeAriaNodeNamesParam) &&
        !hasNormalizedAttr(elem, ariaCamelName)
      ) {
        scope.$watch(
          getNormalizedAttr(elem, attrName) ?? "",
          (boolVal: unknown) => {
            // ensure boolean value
            boolVal = negate ? !boolVal : !!boolVal;
            elem.setAttribute(ariaAttr, String(boolVal));
          },
        );
      }
    };
  }

  return {
    /** Reads the current ARIA runtime configuration value by key. */
    config<K extends keyof AriaConfig>(key: K): AriaConfig[K] {
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

      const fn = $parse(getNormalizedAttr(elem, "ngClick") ?? "");

      return (scope: ng.Scope, linkElem: HTMLElement) => {
        if (!isNodeOneOf(linkElem, nativeAriaNodeNames)) {
          if (
            $aria.config("bindRoleForClick") &&
            !linkElem.hasAttribute("role")
          ) {
            linkElem.setAttribute("role", "button");
          }

          if ($aria.config("tabindex") && !linkElem.hasAttribute("tabindex")) {
            linkElem.setAttribute("tabindex", "0");
          }

          if (
            $aria.config("bindKeydown") &&
            !hasNormalizedAttr(linkElem, "ngKeydown") &&
            !hasNormalizedAttr(linkElem, "ngKeypress") &&
            !hasNormalizedAttr(linkElem, "ngKeyup")
          ) {
            /** Handles keyboard activation for synthetic button semantics. */
            linkElem.addEventListener("keydown", (event) => {
              const isActivationKey =
                event.key === "Enter" || event.key === " ";

              if (isActivationKey) {
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
    normalizedAttr: keyof AriaConfig,
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

    return (type ?? role) === "checkbox" || role === "menuitemcheckbox"
      ? "checkbox"
      : (type ?? role) === "radio" || role === "menuitemradio"
        ? "radio"
        : type === "range" || role === "progressbar" || role === "slider"
          ? "range"
          : "";
  }

  function observeAriaAttribute(
    scope: ng.Scope,
    elem: HTMLElement,
    normalizedName: string,
    callback: () => void,
  ): void {
    const observerName = directiveNormalize(normalizedName);
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const attributeName = mutations[i].attributeName;

        if (
          attributeName &&
          directiveNormalize(attributeName) === observerName
        ) {
          callback();
        }
      }
    });
    observer.observe(elem, { attributes: true });

    let deregisterDestroy: (() => void) | undefined = scope.$on(
      "$destroy",
      deregister,
    );

    function deregister(): void {
      observer.disconnect();
      deregisterDestroy?.();
      deregisterDestroy = undefined;
    }
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
          scope: ng.Scope,
          elem: HTMLElement,
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

              (
                getNormalizedAttr(elem, "value") == ngModel.$viewValue
              ).toString(),
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
              $aria._diagnoseInteractive(elem, "ng-model");
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
                  const updateAriaMin = () => {
                    elem.setAttribute(
                      "aria-valuemin",
                      stringify(
                        getNormalizedAttr(elem, "min") ??
                          getNormalizedAttr(elem, "ngMin"),
                      ),
                    );
                  };

                  updateAriaMin();
                  observeAriaAttribute(scope, elem, "min", updateAriaMin);
                  observeAriaAttribute(scope, elem, "ngMin", updateAriaMin);
                }

                if (needsAriaValuemax) {
                  const updateAriaMax = () => {
                    elem.setAttribute(
                      "aria-valuemax",
                      stringify(
                        getNormalizedAttr(elem, "max") ??
                          getNormalizedAttr(elem, "ngMax"),
                      ),
                    );
                  };

                  updateAriaMax();
                  observeAriaAttribute(scope, elem, "max", updateAriaMax);
                  observeAriaAttribute(scope, elem, "ngMax", updateAriaMax);
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
              $aria._diagnoseInteractive(elem, "ng-model");
              break;
          }

          if (
            !hasNormalizedAttr(elem, "ngRequired") &&
            ngModel.$validators.required &&
            shouldAttachAttr("aria-required", "ariaRequired", elem, false)
          ) {
            // ngModel.$error.required is undefined on custom controls
            const updateAriaRequired = () => {
              elem.setAttribute(
                "aria-required",
                hasNormalizedAttr(elem, "required").toString(),
              );
            };

            updateAriaRequired();
            observeAriaAttribute(scope, elem, "required", updateAriaRequired);
          }

          if (shouldAttachAttr("aria-invalid", "ariaInvalid", elem, true)) {
            ngModel.$watch("$invalid", (newVal: unknown) => {
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

      if (!isNodeOneOf(elem, nativeAriaNodeNames)) {
        $aria._diagnoseInteractive(elem, "ng-dblclick");
      }
    },
  };
}
