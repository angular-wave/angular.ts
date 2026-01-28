import { $injectTokens } from "../../injection-tokens.js";
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
import { ngModelMinErr } from "./../model/model.js";

/** @typedef {import("../model/model.js").NgModelController} NgModelController */

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

/**
 * @type {Map<string, boolean>}
 */
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

/**
 * @param {NgModelController} ctrl
 */
function stringBasedInputType(ctrl) {
  ctrl.$formatters.push((value) =>
    ctrl.$isEmpty(value) ? value : value.toString(),
  );
}

/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {any} ctrl
 */
function textInputType(scope, element, attr, ctrl) {
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);
}

/**
 * @param {ng.Scope} _scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {any} ctrl
 */
function baseInputType(_scope, element, attr, ctrl) {
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

  /**
   * @type {number | null | undefined}
   */
  let timeout;

  /** @type {(ev?: Event) => void} */
  const listener = function (ev) {
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
        // eslint-disable-next-line no-invalid-this
        const validity = this[VALIDITY_STATE_PROPERTY];

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
        });
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
 * @param {string} type
 * @param {RegExp} regexp
 * @returns {*}
 */
export function createStringDateInputType(type, regexp) {
  /**
   * @param {ng.Scope} scope
   * @param {HTMLInputElement} element
   * @param {ng.Attributes} attr
   * @param {any} ctrl
   * @param {ng.ParseService} $parse
   */
  return function stringDateInputType(scope, element, attr, ctrl, $parse) {
    baseInputType(scope, element, attr, ctrl);
    ctrl.$parsers.push((/** @type {string} */ value) => {
      if (ctrl.$isEmpty(value)) return null;

      if (regexp.test(value)) return value;

      ctrl._parserName = type;

      return undefined;
    });

    ctrl.$formatters.push((/** @type {unknown} */ value) => {
      if (ctrl.$isEmpty(value)) return "";

      if (!isString(value)) {
        throw ngModelMinErr("datefmt", "Expected `{0}` to be a string", value);
      }

      return value;
    });

    // Optional min/max
    if (isDefined(attr.min) || attr.ngMin) {
      let minVal = attr.min || $parse?.(attr.ngMin)(scope);

      ctrl.$validators.min = (
        /** @type {any} */ _modelValue,
        /** @type {number} */ viewValue,
      ) => ctrl.$isEmpty(viewValue) || viewValue >= minVal;
      attr.$observe("min", (val) => {
        minVal = val;
        ctrl.$validate();
      });
    }

    if (isDefined(attr.max) || attr.ngMax) {
      let maxVal = attr.max || $parse?.(attr.ngMax)(scope);

      ctrl.$validators.max = (
        /** @type {any} */ _modelValue,
        /** @type {number} */ viewValue,
      ) => ctrl.$isEmpty(viewValue) || viewValue <= maxVal;
      attr.$observe("max", (val) => {
        maxVal = val;
        ctrl.$validate();
      });
    }
  };
}

/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {any} ctrl
 * @param {string} parserName
 */
export function badInputChecker(scope, element, attr, ctrl, parserName) {
  const nativeValidation = (ctrl._hasNativeValidators = isObject(
    element.validity,
  ));

  if (nativeValidation) {
    ctrl.$parsers.push((/** @type {any} */ value) => {
      const validity = element[VALIDITY_STATE_PROPERTY] || {};

      if (validity.badInput || validity.typeMismatch) {
        ctrl._parserName = parserName;

        return undefined;
      }

      return value;
    });
  }
}

/**
 * @param {NgModelController} ctrl
 */
export function numberFormatterParser(ctrl) {
  ctrl.$parsers.push((value) => {
    if (ctrl.$isEmpty(value)) return null;

    if (NUMBER_REGEXP.test(value)) return parseFloat(value);

    ctrl._parserName = "number";

    return undefined;
  });

  ctrl.$formatters.push((value) => {
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
 * @param {any} val
 * @return {number|undefined}
 */
function parseNumberAttrVal(val) {
  if (isDefined(val) && !isNumber(val)) {
    val = parseFloat(val);
  }

  return !isNumberNaN(val) ? val : undefined;
}

/**
 * @param {number} num
 * @return {boolean}
 */
export function isNumberInteger(num) {
  // See http://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript#14794066
  // (minus the assumption that `num` is a number)

  return (num | 0) === num;
}

/**
 * @param {number} num
 * @return {number}
 */
export function countDecimals(num) {
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
 * @param {any} viewValue
 * @param {number} stepBase
 * @param {number | undefined} step
 */
export function isValidForStep(viewValue, stepBase, step) {
  // At this point `stepBase` and `step` are expected to be non-NaN values
  // and `viewValue` is expected to be a valid stringified number.
  let value = Number(viewValue);

  const isNonIntegerValue = !isNumberInteger(value);

  const isNonIntegerStepBase = !isNumberInteger(stepBase);

  const isNonIntegerStep = !isNumberInteger(step);

  // Due to limitations in Floating Point Arithmetic (e.g. `0.3 - 0.2 !== 0.1` or
  // `0.5 % 0.1 !== 0`), we need to convert all numbers to integers.
  if (isNonIntegerValue || isNonIntegerStepBase || isNonIntegerStep) {
    const valueDecimals = isNonIntegerValue ? countDecimals(value) : 0;

    const stepBaseDecimals = isNonIntegerStepBase ? countDecimals(stepBase) : 0;

    const stepDecimals = isNonIntegerStep ? countDecimals(step) : 0;

    const decimalCount = Math.max(
      valueDecimals,
      stepBaseDecimals,
      stepDecimals,
    );

    const multiplier = 10 ** decimalCount;

    value *= multiplier;
    stepBase *= multiplier;
    step *= multiplier;

    if (isNonIntegerValue) value = Math.round(value);

    if (isNonIntegerStepBase) stepBase = Math.round(stepBase);

    if (isNonIntegerStep) step = Math.round(step);
  }

  return (value - stepBase) % step === 0;
}

/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {any} ctrl
 * @param {ng.ParseService} $parse
 */
export function numberInputType(scope, element, attr, ctrl, $parse) {
  badInputChecker(scope, element, attr, ctrl, "number");
  numberFormatterParser(ctrl);
  baseInputType(scope, element, attr, ctrl);

  let parsedMinVal;

  if (isDefined(attr.min) || attr.ngMin) {
    let minVal = attr.min || $parse(attr.ngMin)(scope);

    parsedMinVal = parseNumberAttrVal(minVal);

    ctrl.$validators.min = function (modelValue, viewValue) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedMinVal) ||
        viewValue >= parsedMinVal
      );
    };

    attr.$observe("min", (val) => {
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

    ctrl.$validators.max = function (modelValue, viewValue) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedMaxVal) ||
        viewValue <= parsedMaxVal
      );
    };

    attr.$observe("max", (val) => {
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

    ctrl.$validators.step = function (
      /** @type {any} */ modelValue,
      /** @type {any} */ viewValue,
    ) {
      return (
        ctrl.$isEmpty(viewValue) ||
        isUndefined(parsedStepVal) ||
        isValidForStep(viewValue, parsedMinVal || 0, parsedStepVal)
      );
    };

    attr.$observe("step", (val) => {
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
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {any} ctrl
 */
export function rangeInputType(scope, element, attr, ctrl) {
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
          ctrl.$setViewValue(element.value);
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
        function minValidator(modelValue, viewValue) {
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
        function maxValidator(modelValue, viewValue) {
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
        function stepValidator(modelValue, viewValue) {
          return (
            ctrl.$isEmpty(viewValue) ||
            isUndefined(stepVal) ||
            isValidForStep(viewValue, minVal || 0, stepVal)
          );
        };

    setInitialValueAndObserver("step", stepChange);
  }

  function setInitialValueAndObserver(htmlAttrName, changeFn) {
    // interpolated attributes set the attribute value only after a digest, but we need the
    // attribute value when the input is first rendered, so that the browser can adjust the
    // input value based on the min/max value
    element.setAttribute(htmlAttrName, attr[htmlAttrName]);
    let oldVal = attr[htmlAttrName];

    attr.$observe(htmlAttrName, (val) => {
      if (val !== oldVal) {
        oldVal = val;
        changeFn(val);
      }
    });
  }

  function minChange(val) {
    minVal = parseNumberAttrVal(val);

    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    if (supportsRange) {
      let elVal = element.value;

      // IE11 doesn't set the el val correctly if the minVal is greater than the element value
      if (minVal > elVal) {
        elVal = minVal;
        element.value = elVal;
      }
      ctrl.$setViewValue(elVal);
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }

  function maxChange(val) {
    maxVal = parseNumberAttrVal(val);

    // ignore changes before model is initialized
    if (isNumberNaN(ctrl.$modelValue)) {
      return;
    }

    if (supportsRange) {
      let elVal = element.value;

      // IE11 doesn't set the el val correctly if the maxVal is less than the element value
      if (maxVal < elVal) {
        element.value = maxVal;
        // IE11 and Chrome don't set the value to the minVal when max < min
        elVal = maxVal < minVal ? minVal : maxVal;
      }
      ctrl.$setViewValue(elVal);
    } else {
      // TODO(matsko): implement validateLater to reduce number of validations
      ctrl.$validate();
    }
  }

  function stepChange(val) {
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
      ctrl.$setViewValue(element.value);
    }
  }
}

/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {any} ctrl
 */
function urlInputType(scope, element, attr, ctrl) {
  // Note: no badInputChecker here by purpose as `url` is only a validation
  // in browsers, i.e. we can always read out input.value even if it is not valid!
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);

  ctrl.$validators.url = function (modelValue, viewValue) {
    const value = modelValue || viewValue;

    return ctrl.$isEmpty(value) || URL_REGEXP.test(value);
  };
}

/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {any} ctrl
 */
function emailInputType(scope, element, attr, ctrl) {
  // Note: no badInputChecker here by purpose as `url` is only a validation
  // in browsers, i.e. we can always read out input.value even if it is not valid!
  baseInputType(scope, element, attr, ctrl);
  stringBasedInputType(ctrl);

  ctrl.$validators.email = function (modelValue, viewValue) {
    const value = modelValue || viewValue;

    return ctrl.$isEmpty(value) || EMAIL_REGEXP.test(value);
  };
}

/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {any} ctrl
 */
function radioInputType(scope, element, attr, ctrl) {
  const doTrim = !attr.ngTrim || trim(attr.ngTrim) !== "false";

  // make the name unique, if not defined
  if (isUndefined(attr.name)) {
    element.setAttribute("name", nextUid());
  }

  const listener = function (ev) {
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
      ? ctrl.$viewValue.$target
      : ctrl.$viewValue;

    // the proxy may reach down two levels
    element.checked = deProxy(value) === deProxy(deproxy);
  };

  attr.$observe("value", ctrl.$render);
}

/**
 *
 * @param {ng.ParseService} $parse
 * @param {*} context
 * @param {*} name
 * @param {*} expression
 * @param {*} fallback
 * @returns
 */
function parseConstantExpr($parse, context, name, expression, fallback) {
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
 *
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {*} ctrl
 * @param {ng.ParseService} $parse
 */
function checkboxInputType(scope, element, attr, ctrl, $parse) {
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

  const listener = function (ev) {
    ctrl.$setViewValue(element.checked, ev && ev.type);
  };

  element.addEventListener("change", listener);

  ctrl.$render = function () {
    element.checked = ctrl.$viewValue;
  };

  // Override the standard `$isEmpty` because the $viewValue of an empty checkbox is always set to `false`
  // This is because of the parser below, which compares the `$modelValue` with `trueValue` to convert
  // it to a boolean.
  ctrl.$isEmpty = function (value) {
    return value === false;
  };

  ctrl.$formatters.push((value) => equals(value, trueValue));

  ctrl.$parsers.push((value) => (value ? trueValue : falseValue));
}

inputDirective.$inject = [$injectTokens._parse];

/**
 * @param {ng.ParseService} $parse
 * @returns {ng.Directive}
 */
export function inputDirective($parse) {
  return {
    restrict: "E",
    require: ["?ngModel"],
    link: {
      pre(scope, element, attr, ctrls) {
        if (ctrls[0]) {
          (inputType[attr.type?.toLowerCase()] || inputType.text)(
            scope,
            element,
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
 * @returns {ng.Directive}
 */
export function hiddenInputDirective() {
  return {
    restrict: "E",
    compile(_, attr) {
      if (attr.type?.toLowerCase() !== "hidden") return undefined;

      return {
        pre(_scope, element) {
          /** @type {HTMLInputElement} */ (element).value =
            element.getAttribute("value") ?? "";
        },
      };
    },
  };
}

const CONSTANT_VALUE_REGEXP = /^(true|false|\d+)$/;

/**
 * @returns {ng.Directive}
 */
export function ngValueDirective() {
  /**
   * inputs use the value attribute as their default value if the value property is not set.
   * Once the value property has been set (by adding input), it will not react to changes to
   * the value attribute anymore. Setting both attribute and property fixes this behavior, and
   * makes it possible to use ngValue as a sort of one-way bind.
   * @param {HTMLElement} element
   * @param {ng.Attributes} attr
   * @param {any} value
   */
  function updateElementValue(element, attr, value) {
    element.value = deProxy(value ?? "");
    attr.$set("value", value);
  }

  return {
    restrict: "A",
    priority: 100,
    compile(_, tplAttr) {
      if (CONSTANT_VALUE_REGEXP.test(tplAttr.ngValue)) {
        return function (scope, elm, attr) {
          const value = scope.$eval(attr.ngValue);

          updateElementValue(elm, attr, value);
        };
      }

      return function (scope, elm, attr) {
        scope.$watch(attr.ngValue, (value) => {
          updateElementValue(elm, attr, value);
        });
      };
    },
  };
}
