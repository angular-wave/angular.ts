import { $injectTokens } from "../../injection-tokens.js";
import type { NgModelController } from "../model/model.ts";
import type { ScopeProxied } from "../../core/scope/scope.ts";
import {
  deProxy,
  equals,
  isDefined,
  isNumber,
  isNumberNaN,
  isObject,
  isProxy,
  isString,
  isUndefined,
  nextUid,
  trim,
} from "../../shared/utils.js";
import { ngModelMinErr } from "./../model/model.ts";

export type NgModelControllerProxied = ScopeProxied<NgModelController>;

export type InputTypeHandler = (
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: NgModelControllerProxied,
  $parse: ng.ParseService,
) => void;

// Regex code was initially obtained from SO prior to modification: https://stackoverflow.com/questions/3143070/javascript-regex-iso-datetime#answer-3143231
export const ISO_DATE_REGEXP =
  /^\d{4,}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z)$/;
// See valid URLs in RFC3987 (http://tools.ietf.org/html/rfc3987)
// Note: We are being more lenient, because browsers are too.
//   1. Scheme
//   2. Slashes
//   3. Username
//   4. Password
//   5. Hostname
//   6. Port
//   7. Path
//   8. Query
//   9. Fragment
//                 1111111111111111 222   333333    44444        55555555555555555555555     666     77777777     8888888     999
export const URL_REGEXP =
  /^[a-z][a-z\d.+-]*:\/*(?:[^:@]+(?::[^@]+)?@)?(?:[^\s:/?#]+|\[[a-f\d:]+])(?::\d+)?(?:\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i;

export const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
const NUMBER_REGEXP = /^\s*([-+])?(\d+|(\d*(\.\d*)))([eE][+-]?\d+)?\s*$/;

const DATE_REGEXP = /^(\d{4,})-(\d{2})-(\d{2})$/;

const DATETIMELOCAL_REGEXP =
  /^(\d{4,})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d)(\.\d{1,3})?)?$/;

const WEEK_REGEXP = /^(\d{4,})-W(\d\d)$/;

const MONTH_REGEXP = /^(\d{4,})-(\d\d)$/;

const TIME_REGEXP = /^(\d\d):(\d\d)(?::(\d\d)(\.\d{1,3})?)?$/;

// The name of a form control's ValidityState property.
// This is used so that it's possible for internal tests to create mock ValidityStates.
export const VALIDITY_STATE_PROPERTY = "validity";

const PARTIAL_VALIDATION_EVENTS = "keydown wheel mousedown";

const PARTIAL_VALIDATION_TYPES = new Map();

"date,datetime-local,month,time,week".split(",").forEach((type) => {
  PARTIAL_VALIDATION_TYPES.set(type, true);
});
const inputType = {
  text: textInputType,
  date: createStringDateInputType("date", DATE_REGEXP),
  "datetime-local": createStringDateInputType(
    "datetimelocal",
    DATETIMELOCAL_REGEXP,
  ),
  time: createStringDateInputType("time", TIME_REGEXP),
  week: createStringDateInputType("week", WEEK_REGEXP),
  month: createStringDateInputType("month", MONTH_REGEXP),
  number: numberInputType,
  url: urlInputType,
  email: emailInputType,
  radio: radioInputType,
  range: rangeInputType,
  checkbox: checkboxInputType,
  hidden: () => {
    /* empty */
  },
  button: () => {
    /* empty */
  },
  submit: () => {
    /* empty */
  },
  reset: () => {
    /* empty */
  },
  file: () => {
    /* empty */
  },
};

type InputCtrl = NgModelControllerProxied & Record<string, any>;
type ModelCtrl = NgModelController & Record<string, any>;

/**
 * Adds formatter logic for input types backed by string values.
 */
function stringBasedInputType(ctrl: ModelCtrl): void {
  ctrl.$formatters.push((value: any) =>
    ctrl.$isEmpty(value) ? value : value.toString(),
  );
}

/**
 * Configures the standard text input pipeline.
 */
function textInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: InputCtrl,
): void {
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);
}

/**
 * Wires the shared DOM event handling used by text-like inputs.
 */
function baseInputType(
  _scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: InputCtrl,
): void {
  const type = element.type.toLowerCase();

  let composing = false;

  // In composition mode, users are still inputting intermediate text buffer,
  // hold the listener until composition is done.
  // More about composition events: https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent
  element.addEventListener("compositionstart", () => {
    composing = true;
  });

  element.addEventListener("compositionend", () => {
    composing = false;
    listener();
  });

  let timeout: ReturnType<typeof setTimeout> | null | undefined;

  const listener = function (ev?: Event): void {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    if (composing) return;
    let { value } = element;

    const event = ev && ev.type;

    // By default we will trim the value
    // If the attribute ng-trim exists we will avoid trimming
    // If input type is 'password', the value is never trimmed
    if (type !== "password" && (!attr.ngTrim || attr.ngTrim !== "false")) {
      value = trim(value);
    }

    // If a control is suffering from bad input (due to native validators), browsers discard its
    // value, so it may be necessary to revalidate (by calling $setViewValue again) even if the
    // control's value is the same empty value twice in a row.
    if (
      ctrl.$viewValue !== value ||
      (value === "" && ctrl._hasNativeValidators)
    ) {
      ctrl.$target.$setViewValue(value, event);
    }
  };

  ["input", "change", "paste", "drop", "cut"].forEach((event) => {
    element.addEventListener(event, listener);
  });

  // Some native input types (date-family) have the ability to change validity without
  // firing any input/change events.
  // For these event types, when native validators are present and the browser supports the type,
  // check for validity changes on various DOM events.
  if (
    PARTIAL_VALIDATION_TYPES.has(type) &&
    ctrl._hasNativeValidators &&
    type === attr.type
  ) {
    element.addEventListener(PARTIAL_VALIDATION_EVENTS, (ev) => {
      if (!timeout) {
        const validity = element[VALIDITY_STATE_PROPERTY];

        const origBadInput = validity.badInput;

        const origTypeMismatch = validity.typeMismatch;

        timeout = setTimeout(() => {
          timeout = null;

          if (
            validity.badInput !== origBadInput ||
            validity.typeMismatch !== origTypeMismatch
          ) {
            listener(ev);
          }
        }, 0);
      }
    });
  }

  ctrl.$render = function () {
    // Workaround for Firefox validation #12102.
    const value = ctrl.$isEmpty(ctrl.$viewValue) ? "" : ctrl.$viewValue;

    if (element.value !== value) {
      element.value = value;
    }
  };
}

/**
 * Creates an input handler for string-backed date-like input types.
 */
export function createStringDateInputType(
  type: string,
  regexp: RegExp,
): InputTypeHandler {
  return function stringDateInputType(
    scope: ng.Scope,
    element: HTMLInputElement,
    attr: ng.Attributes,
    ctrl: InputCtrl,
    $parse: ng.ParseService,
  ): void {
    baseInputType(scope, element, attr, ctrl);
    ctrl.$parsers.push((value: string) => {
      if (ctrl.$isEmpty(value)) return null;

      if (regexp.test(value)) return value;

      ctrl._parserName = type;

      return undefined;
    });

    ctrl.$formatters.push((value: unknown) => {
      if (ctrl.$isEmpty(value)) return "";

      if (!isString(value)) {
        throw ngModelMinErr("datefmt", "Expected `{0}` to be a string", value);
      }

      return value;
    });

    // Optional min/max
    if (isDefined(attr.min) || attr.ngMin) {
      let minVal = attr.min || $parse?.(attr.ngMin)(scope);

      ctrl.$validators.min = (_modelValue: any, viewValue: number) =>
        ctrl.$isEmpty(viewValue) || viewValue >= minVal;
      attr.$observe("min", (val: any) => {
        minVal = val;
        ctrl.$validate();
      });
    }

    if (isDefined(attr.max) || attr.ngMax) {
      let maxVal = attr.max || $parse?.(attr.ngMax)(scope);

      ctrl.$validators.max = (_modelValue: any, viewValue: number) =>
        ctrl.$isEmpty(viewValue) || viewValue <= maxVal;
      attr.$observe("max", (val: any) => {
        maxVal = val;
        ctrl.$validate();
      });
    }
  };
}

/**
 * Adds native bad-input handling for inputs that expose browser validity state.
 */
export function badInputChecker(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: InputCtrl,
  parserName: string,
): void {
  const nativeValidation = (ctrl._hasNativeValidators = isObject(
    element.validity,
  ));

  if (nativeValidation) {
    ctrl.$parsers.push((value: any) => {
      const validity =
        (element[VALIDITY_STATE_PROPERTY] as Partial<ValidityState>) || {};

      if (validity.badInput || validity.typeMismatch) {
        ctrl._parserName = parserName;

        return undefined;
      }

      return value;
    });
  }
}

/**
 * Adds parser and formatter logic for numeric model values.
 */
export function numberFormatterParser(ctrl: ModelCtrl): void {
  ctrl.$parsers.push((value: any) => {
    if (ctrl.$isEmpty(value)) return null;

    if (NUMBER_REGEXP.test(value)) return parseFloat(value);

    ctrl._parserName = "number";

    return undefined;
  });

  ctrl.$formatters.push((value: any) => {
    if (!ctrl.$isEmpty(value)) {
      if (!isNumber(value)) {
        throw ngModelMinErr("numfmt", "Expected `{0}` to be a number", value);
      }
      value = value.toString();
    }

    return value;
  });
}

/**
 * Parses numeric attribute values used by min/max/step validators.
 */
function parseNumberAttrVal(val: any): number | undefined {
  if (isDefined(val) && !isNumber(val)) {
    val = parseFloat(val);
  }

  return !isNumberNaN(val) ? val : undefined;
}

/**
 * Checks whether a numeric value is an integer.
 */
export function isNumberInteger(num: any): boolean {
  // See http://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript#14794066
  // (minus the assumption that `num` is a number)

  return (num | 0) === num;
}

/**
 * Counts the decimal digits used by a number.
 */
export function countDecimals(num: number): number {
  const numString = num.toString();

  const decimalSymbolIndex = numString.indexOf(".");

  if (decimalSymbolIndex === -1) {
    if (num > -1 && num < 1) {
      // It may be in the exponential notation format (`1e-X`)
      const match = /e-(\d+)$/.exec(numString);

      if (match) {
        return Number(match[1]);
      }
    }

    return 0;
  }

  return numString.length - decimalSymbolIndex - 1;
}

/**
 * Determines whether a numeric view value satisfies the configured step constraint.
 */
export function isValidForStep(
  viewValue: any,
  stepBase: number,
  step: number | undefined,
): boolean {
  // At this point `stepBase` and `step` are expected to be non-NaN values
  // and `viewValue` is expected to be a valid stringified number.
  let value = Number(viewValue);

  const isNonIntegerValue = !isNumberInteger(value);

  const isNonIntegerStepBase = !isNumberInteger(stepBase);

  const numericStep = step ?? 0;
  const isNonIntegerStep = !isNumberInteger(numericStep);

  // Due to limitations in Floating Point Arithmetic (e.g. `0.3 - 0.2 !== 0.1` or
  // `0.5 % 0.1 !== 0`), we need to convert all numbers to integers.
  if (isNonIntegerValue || isNonIntegerStepBase || isNonIntegerStep) {
    const valueDecimals = isNonIntegerValue ? countDecimals(value) : 0;

    const stepBaseDecimals = isNonIntegerStepBase ? countDecimals(stepBase) : 0;

    const stepDecimals = isNonIntegerStep ? countDecimals(numericStep) : 0;

    const decimalCount = Math.max(
      valueDecimals,
      stepBaseDecimals,
      stepDecimals,
    );

    const multiplier = 10 ** decimalCount;

    value *= multiplier;
    stepBase *= multiplier;
    step = numericStep * multiplier;

    if (isNonIntegerValue) value = Math.round(value);

    if (isNonIntegerStepBase) stepBase = Math.round(stepBase);

    if (isNonIntegerStep) step = Math.round(step);
  }

  return (value - stepBase) % (step ?? numericStep) === 0;
}

/**
 * Configures validation and parsing for numeric inputs.
 */
export function numberInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: InputCtrl,
  $parse: ng.ParseService,
): void {
  badInputChecker(scope, element, attr, ctrl, "number");
  numberFormatterParser(ctrl);
  baseInputType(scope, element, attr, ctrl);

  let parsedMinVal: number | undefined;

  if (isDefined(attr.min) || attr.ngMin) {
    let minVal = attr.min || $parse(attr.ngMin)(scope);

    parsedMinVal = parseNumberAttrVal(minVal);

    ctrl.$validators.min = function (modelValue: any, viewValue: number) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedMinVal) ||
        viewValue >= parsedMinVal
      );
    };

    attr.$observe("min", (val: any) => {
      if (val !== minVal) {
        parsedMinVal = parseNumberAttrVal(val);
        minVal = val;
        // TODO(matsko): implement validateLater to reduce number of validations
        ctrl.$validate();
      }
    });
  }

  if (isDefined(attr.max) || attr.ngMax) {
    let maxVal = attr.max || $parse(attr.ngMax)(scope);

    let parsedMaxVal = parseNumberAttrVal(maxVal);

    ctrl.$validators.max = function (modelValue: any, viewValue: number) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedMaxVal) ||
        viewValue <= parsedMaxVal
      );
    };

    attr.$observe("max", (val: any) => {
      if (val !== maxVal) {
        parsedMaxVal = parseNumberAttrVal(val);
        maxVal = val;
        // TODO(matsko): implement validateLater to reduce number of validations
        ctrl.$validate();
      }
    });
  }

  if (isDefined(attr.step) || attr.ngStep) {
    let stepVal = attr.step || $parse(attr.ngStep)(scope);

    let parsedStepVal = parseNumberAttrVal(stepVal);

    ctrl.$validators.step = function (modelValue: any, viewValue: any) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedStepVal) ||
        isValidForStep(viewValue, parsedMinVal || 0, parsedStepVal)
      );
    };

    attr.$observe("step", (val: any) => {
      // TODO(matsko): implement validateLater to reduce number of validations
      if (val !== stepVal) {
        parsedStepVal = parseNumberAttrVal(val);
        stepVal = val;
        ctrl.$validate();
      }
    });
  }
}

/**
 * Configures range inputs and keeps the browser-adjusted value in sync with ngModel.
 */
export function rangeInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: InputCtrl,
): void {
  badInputChecker(scope, element, attr, ctrl, "range");
  numberFormatterParser(ctrl);
  baseInputType(scope, element, attr, ctrl);

  const supportsRange = ctrl._hasNativeValidators && element.type === "range";

  let minVal = supportsRange ? 0 : undefined;

  let maxVal = supportsRange ? 100 : undefined;

  let stepVal = supportsRange ? 1 : undefined;

  const { validity } = element;

  const hasMinAttr = isDefined(attr.min);

  const hasMaxAttr = isDefined(attr.max);

  const hasStepAttr = isDefined(attr.step);

  const originalRender = ctrl.$render;

  ctrl.$render =
    supportsRange &&
    isDefined(validity.rangeUnderflow) &&
    isDefined(validity.rangeOverflow)
      ? // Browsers that implement range will set these values automatically, but reading the adjusted values after
        // $render would cause the min / max validators to be applied with the wrong value
        function rangeRender() {
          originalRender();
          ctrl.$setViewValue(element.value, undefined);
        }
      : originalRender;

  if (hasMinAttr) {
    minVal = parseNumberAttrVal(attr.min);

    ctrl.$validators.min = supportsRange
      ? // Since all browsers set the input to a valid value, we don't need to check validity
        function noopMinValidator() {
          return true;
        }
      : // non-support browsers validate the min val
        function minValidator(modelValue: any, viewValue: number) {
          return (
            ctrl.$isEmpty(viewValue) ||
            isUndefined(minVal) ||
            viewValue >= minVal
          );
        };

    setInitialValueAndObserver("min", minChange);
  }

  if (hasMaxAttr) {
    maxVal = parseNumberAttrVal(attr.max);

    ctrl.$validators.max = supportsRange
      ? // Since all browsers set the input to a valid value, we don't need to check validity
        function noopMaxValidator() {
          return true;
        }
      : // non-support browsers validate the max val
        function maxValidator(modelValue: any, viewValue: number) {
          return (
            ctrl.$isEmpty(viewValue) ||
            isUndefined(maxVal) ||
            viewValue <= maxVal
          );
        };

    setInitialValueAndObserver("max", maxChange);
  }

  if (hasStepAttr) {
    stepVal = parseNumberAttrVal(attr.step);

    ctrl.$validators.step = supportsRange
      ? function nativeStepValidator() {
          // Currently, only FF implements the spec on step change correctly (i.e. adjusting the
          // input element value to a valid value). It's possible that other browsers set the stepMismatch
          // validity error instead, so we can at least report an error in that case.
          return !validity.stepMismatch;
        }
      : // ngStep doesn't set the setp attr, so the browser doesn't adjust the input value as setting step would
        function stepValidator(modelValue: any, viewValue: any) {
          return (
            ctrl.$isEmpty(viewValue) ||
            isUndefined(stepVal) ||
            isValidForStep(viewValue, minVal || 0, stepVal)
          );
        };

    setInitialValueAndObserver("step", stepChange);
  }

  /**
   * Applies the initial DOM attribute value and observes later changes.
   */
  function setInitialValueAndObserver(
    htmlAttrName: string,
    changeFn: (val: any) => void,
  ): void {
    // interpolated attributes set the attribute value only after a digest, but we need the
    // attribute value when the input is first rendered, so that the browser can adjust the
    // input value based on the min/max value
    element.setAttribute(htmlAttrName, attr[htmlAttrName]);
    let oldVal = attr[htmlAttrName];

    attr.$observe(htmlAttrName, (val: any) => {
      if (val !== oldVal) {
        oldVal = val;
        changeFn(val);
      }
    });
  }

  /**
   * Updates the active minimum value and revalidates if necessary.
   */
  function minChange(val: any): void {
    minVal = parseNumberAttrVal(val);

    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    if (supportsRange) {
      // Browser already normalizes element.value against min
      ctrl.$setViewValue(element.value, undefined);
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }

  /**
   * Updates the active maximum value and revalidates if necessary.
   */
  function maxChange(val: any): void {
    maxVal = parseNumberAttrVal(val);

    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    if (supportsRange) {
      // Browser normalizes element.value against max
      ctrl.$setViewValue(element.value, undefined);
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }

  /**
   * Updates the active step value and revalidates if necessary.
   */
  function stepChange(val: any): void {
    stepVal = parseNumberAttrVal(val);

    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    // Some browsers don't adjust the input value correctly, but set the stepMismatch error
    if (!supportsRange) {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    } else if (ctrl.$viewValue !== element.value) {
      ctrl.$setViewValue(element.value, undefined);
    }
  }
}

/**
 * Configures URL input validation.
 */
function urlInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: InputCtrl,
): void {
  // Note: no badInputChecker here by purpose as `url` is only a validation
  // in browsers, i.e. we can always read out input.value even if it is not valid!
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);

  ctrl.$validators.url = function (modelValue: any, viewValue: any) {
    const value = modelValue || viewValue;

    return ctrl.$isEmpty(value) || URL_REGEXP.test(value);
  };
}

/**
 * Configures email input validation.
 */
function emailInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: InputCtrl,
): void {
  // Note: no badInputChecker here by purpose as `url` is only a validation
  // in browsers, i.e. we can always read out input.value even if it is not valid!
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);

  ctrl.$validators.email = function (modelValue: any, viewValue: any) {
    const value = modelValue || viewValue;

    return ctrl.$isEmpty(value) || EMAIL_REGEXP.test(value);
  };
}

/**
 * Configures radio inputs and keeps the checked state synchronized with the model.
 */
function radioInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: InputCtrl,
): void {
  const doTrim = !attr.ngTrim || trim(attr.ngTrim) !== "false";

  // make the name unique, if not defined
  if (isUndefined(attr.name)) {
    element.setAttribute("name", `${nextUid()}`);
  }

  const listener = function (ev: Event) {
    if (element.checked) {
      let { value } = attr;

      if (doTrim) {
        value = trim(value);
      }
      ctrl.$setViewValue(value, ev && ev.type);
    }
  };

  element.addEventListener("change", listener);
  // NgModelController call
  ctrl.$render = function () {
    let { value } = attr;

    if (doTrim) {
      value = trim(value);
    }
    const deproxy = isProxy(ctrl.$viewValue)
      ? (ctrl.$viewValue.$target as ng.Scope)
      : ctrl.$viewValue;

    // the proxy may reach down two levels
    element.checked = deProxy(value) === deProxy(deproxy);
  };

  attr.$observe("value", ctrl.$render);
}

/**
 * Evaluates an expression that must resolve to a constant value.
 */
function parseConstantExpr(
  $parse: ng.ParseService,
  context: any,
  name: any,
  expression: any,
  fallback: any,
): any {
  let parseFn;

  if (isDefined(expression)) {
    parseFn = $parse(expression);

    if (!parseFn.constant) {
      throw ngModelMinErr(
        "constexpr",
        "Expected constant expression for `{0}`, but saw " + "`{1}`.",
        name,
        expression,
      );
    }

    return parseFn(context);
  }

  return fallback;
}

/**
 * Configures checkbox inputs and maps checked state to true/false model values.
 */
function checkboxInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: any,
  $parse: ng.ParseService,
): void {
  const trueValue = parseConstantExpr(
    $parse,
    scope,
    "ngTrueValue",
    attr.ngTrueValue,
    true,
  );

  const falseValue = parseConstantExpr(
    $parse,
    scope,
    "ngFalseValue",
    attr.ngFalseValue,
    false,
  );

  const listener = function (ev: Event) {
    ctrl.$setViewValue(element.checked, ev && ev.type);
  };

  element.addEventListener("change", listener);

  ctrl.$render = function () {
    element.checked = ctrl.$viewValue;
  };

  // Override the standard `$isEmpty` because the $viewValue of an empty checkbox is always set to `false`
  // This is because of the parser below, which compares the `$modelValue` with `trueValue` to convert
  // it to a boolean.
  ctrl.$isEmpty = function (value: boolean) {
    return value === false;
  };

  ctrl.$formatters.push((value: any) => equals(value, trueValue));

  ctrl.$parsers.push((value: any) => (value ? trueValue : falseValue));
}

inputDirective.$inject = [$injectTokens._parse];

/**
 * Builds the core input directive and delegates to the appropriate input-type handler.
 */
export function inputDirective($parse: ng.ParseService): ng.Directive {
  return {
    restrict: "E",
    require: ["?ngModel"],
    link: {
      pre(
        scope: ng.Scope,
        element: HTMLElement,
        attr: ng.Attributes,
        ctrls: any[],
      ) {
        if (ctrls[0]) {
          const typeName = attr.type?.toLowerCase() as
            | keyof typeof inputType
            | undefined;

          (inputType[typeName || "text"] || inputType.text)(
            scope,
            element as HTMLInputElement,
            attr,
            ctrls[0],
            $parse,
          );
        }
      },
    },
  };
}

/**
 * Initializes hidden inputs with their static `value` attribute.
 */
export function hiddenInputDirective() {
  return {
    restrict: "E",
    compile(_: HTMLElement, attr: ng.Attributes) {
      if (attr.type?.toLowerCase() !== "hidden") return undefined;

      return {
        pre(_scope: ng.Scope, element: HTMLElement) {
          (element as HTMLInputElement).value =
            element.getAttribute("value") ?? "";
        },
      };
    },
  };
}

const CONSTANT_VALUE_REGEXP = /^(true|false|\d+)$/;

/**
 * Keeps an input element's `value` attribute and property synchronized with `ngValue`.
 */
export function ngValueDirective() {
  /**
   * Inputs use the `value` attribute as their default value until the property is set.
   * Updating both keeps `ngValue` behaving like a one-way binding.
   */
  function updateElementValue(
    element: HTMLInputElement,
    attr: ng.Attributes,
    value: any,
  ): void {
    element.value = deProxy(value ?? "");
    attr.$set("value", value);
  }

  return {
    restrict: "A",
    priority: 100,
    compile(_: HTMLElement, tplAttr: ng.Attributes) {
      if (CONSTANT_VALUE_REGEXP.test(tplAttr.ngValue)) {
        return function (
          scope: ng.Scope,
          elm: HTMLElement,
          attr: ng.Attributes,
        ) {
          const value = scope.$eval(attr.ngValue);

          updateElementValue(elm as HTMLInputElement, attr, value);
        };
      }

      return function (scope: ng.Scope, elm: HTMLElement, attr: ng.Attributes) {
        scope.$watch(attr.ngValue, (value: any) => {
          updateElementValue(elm as HTMLInputElement, attr, value);
        });
      };
    },
  };
}
