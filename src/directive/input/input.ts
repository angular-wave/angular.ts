import type { NgModelController } from "../model/model.ts";
import type { ScopeProxied } from "../../core/scope/scope.ts";
import { deProxy, isProxy, stringify } from "../../shared/utils.ts";

type NgModelControllerProxied = ScopeProxied<NgModelController>;

type InputElement = HTMLInputElement | HTMLTextAreaElement;

interface NativeInputValueByKind {
  value: string;
  checked: boolean;
  files: FileList | null;
  none: undefined;
}

type InputValueKind = keyof NativeInputValueByKind;

type NativeInputValue = NativeInputValueByKind[InputValueKind];

type NativeInputUpdateEvent = "input" | "change";

const VALUE_KIND_BY_TYPE = {
  checkbox: "checked",
  file: "files",
  button: "none",
  submit: "none",
  reset: "none",
  image: "none",
} as const satisfies Record<string, InputValueKind>;

const UPDATE_EVENT_BY_TYPE = {
  checkbox: "change",
  radio: "change",
  file: "change",
  hidden: null,
  button: null,
  submit: null,
  reset: null,
  image: null,
} as const satisfies Record<string, NativeInputUpdateEvent | null>;

function hasMappedInputType<T extends object>(
  map: T,
  type: string,
): type is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, type);
}

function toNativeInputString(value: unknown): string {
  return value == null ? "" : stringify(value);
}

function unwrapNgModelController(
  ctrl: NgModelControllerProxied,
): NgModelControllerProxied {
  while (isProxy(ctrl)) {
    ctrl = ctrl.$target as NgModelControllerProxied;
  }

  return ctrl;
}

function readInputAttr(
  element: Element,
  attr: ng.Attributes | undefined,
  normalizedName: string,
): string | undefined {
  const attrValue: string | undefined = attr
    ? (attr as unknown as Record<string, string | undefined>)[normalizedName]
    : undefined;
  const dashName = normalizedName.replace(/[A-Z]/g, (char) => {
    return `-${char.toLowerCase()}`;
  });

  return (
    attrValue ??
    element.getAttribute(`data-${dashName}`) ??
    element.getAttribute(dashName) ??
    undefined
  );
}

function inputType(element: InputElement, attr?: ng.Attributes): string {
  return (
    readInputAttr(element, attr, "type") ??
    (element instanceof HTMLInputElement ? element.type : "textarea")
  ).toLowerCase();
}

function defaultValueKind(type: string): InputValueKind {
  return hasMappedInputType(VALUE_KIND_BY_TYPE, type)
    ? VALUE_KIND_BY_TYPE[type]
    : "value";
}

function nativeUpdateEvent(type: string): NativeInputUpdateEvent | null {
  return hasMappedInputType(UPDATE_EVENT_BY_TYPE, type)
    ? UPDATE_EVENT_BY_TYPE[type]
    : "input";
}

function readViewValue(
  element: InputElement,
  valueKind: InputValueKind,
): NativeInputValue {
  if (!(element instanceof HTMLInputElement)) {
    return element.value;
  }

  switch (valueKind) {
    case "checked":
      return element.checked;
    case "files":
      return element.files;
    case "none":
      return undefined;
    case "value":
    default:
      return element.value;
  }
}

function writeViewValue(
  element: InputElement,
  type: string,
  valueKind: InputValueKind,
  value: unknown,
): void {
  const rawValue = deProxy(value);

  if (!(element instanceof HTMLInputElement)) {
    element.value = toNativeInputString(rawValue);
    return;
  }

  switch (valueKind) {
    case "checked":
      element.checked = rawValue === true;
      return;
    case "files":
      if (rawValue == null) {
        element.value = "";
      }
      return;
    case "none":
      return;
    case "value":
    default:
      if (type === "radio") {
        element.checked =
          rawValue != null && toNativeInputString(rawValue) === element.value;
        return;
      }

      element.value = toNativeInputString(rawValue);
  }
}

function isEmptyViewValue(valueKind: InputValueKind, value: unknown): boolean {
  if (valueKind === "checked") return value !== true;
  if (valueKind === "files") return !(value as FileList | null)?.length;

  return value == null || value === "";
}

function createInputControlBinding(
  element: InputElement,
  ctrl: NgModelControllerProxied,
  type: string,
  valueKind: InputValueKind,
  updateEvent: NativeInputUpdateEvent | null,
): { connect(): void } {
  const eventRemovers = new Set<() => void>();
  let composing = false;

  function syncNativeValidity(): void {
    ctrl.$setNativeValidity(!element.willValidate || element.validity.valid);
  }

  function syncViewToModel(trigger: NativeInputUpdateEvent): void {
    ctrl.$setViewValue(readViewValue(element, valueKind), trigger);
    syncNativeValidity();
  }

  function syncModelToView(): void {
    writeViewValue(element, type, valueKind, ctrl.$viewValue);
    syncNativeValidity();
  }

  function disconnect(): void {
    eventRemovers.forEach((remove) => {
      remove();
    });
    eventRemovers.clear();
    if (ctrl._setNativeCustomValidity === setNativeCustomValidity) {
      ctrl._setNativeCustomValidity = null;
    }
  }

  const setNativeCustomValidity = (message: string) => {
    element.setCustomValidity(message);
    syncNativeValidity();
  };

  return {
    connect(): void {
      ctrl._hasNativeValidators = true;
      ctrl._setNativeCustomValidity = setNativeCustomValidity;
      Object.defineProperty(ctrl, "$validity", {
        configurable: true,
        get: () => element.validity,
      });
      Object.defineProperty(ctrl, "$validationMessage", {
        configurable: true,
        get: () => element.validationMessage,
      });
      ctrl.$isEmpty = (value: unknown) => isEmptyViewValue(valueKind, value);
      ctrl.$render = () => {
        syncModelToView();
      };

      syncNativeValidity();

      if (updateEvent) {
        const listener = () => {
          if (composing) return;
          syncViewToModel(updateEvent);
        };

        element.addEventListener(updateEvent, listener);
        eventRemovers.add(() => {
          element.removeEventListener(updateEvent, listener);
        });
      }

      if (updateEvent === "input") {
        const compositionStartListener = () => {
          composing = true;
        };
        const compositionEndListener = () => {
          composing = false;
          syncViewToModel("input");
        };

        element.addEventListener("compositionstart", compositionStartListener);
        element.addEventListener("compositionend", compositionEndListener);
        eventRemovers.add(() => {
          element.removeEventListener(
            "compositionstart",
            compositionStartListener,
          );
          element.removeEventListener("compositionend", compositionEndListener);
        });
      }

      ctrl._eventRemovers.add(() => {
        disconnect();
      });
    },
  };
}

/**
 * Connects native input and textarea elements to an existing `ngModel`
 * controller through browser value and constraint-validation APIs.
 *
 * This directive is registered for both `input` and `textarea` elements by the
 * AngularTS runtime. Applications normally consume it through markup rather
 * than calling the factory directly.
 *
 * @example
 * ```html
 * <input type="email" name="email" ng-model="email" required />
 * ```
 *
 * @example
 * ```html
 * <input type="file" name="avatar" ng-model="avatarFiles" />
 * ```
 */
export function inputDirective(): ng.Directive {
  return {
    restrict: "E",
    require: ["?ngModel"],
    link: {
      pre(
        _scope: ng.Scope,
        element: HTMLElement,
        attr: ng.Attributes,
        ctrls: [NgModelControllerProxied | undefined],
      ) {
        const model = ctrls[0];

        if (!model) return;

        const input = element as InputElement;
        const ctrl = unwrapNgModelController(model);
        const type = inputType(input, attr);
        const valueKind = defaultValueKind(type);
        const updateEvent = nativeUpdateEvent(type);
        const binding = createInputControlBinding(
          input,
          ctrl,
          type,
          valueKind,
          updateEvent,
        );

        binding.connect();
      },
    },
  };
}
