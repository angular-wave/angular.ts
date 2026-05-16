import { _attributes, _parse } from "../../injection-tokens.ts";
import {
  hasOwn,
  isFunction,
  isNumberNaN,
  isUndefined,
  createErrorFactory,
  isString,
  isDefined,
} from "../../shared/utils.ts";
import { REGEX_STRING_REGEXP } from "./../attrs/attrs.ts";
import { startingTag } from "../../shared/dom.ts";

const ngPatternError = createErrorFactory("ngPattern");

type ValidatingNgModelController = ng.NgModelController & {
  $validators: Record<string, (modelValue: any, viewValue: any) => boolean>;
  $setNativeValidity?: (state: boolean | null) => void;
  $setCustomValidity?: (message: string) => void;
};

type ValidatorAttrFallback = Record<string, string | undefined>;

interface NativeCustomValidityIssue {
  message: string;
  priority: number;
}

const nativeCustomValidityIssues = new WeakMap<
  object,
  Map<string, NativeCustomValidityIssue>
>();

const NATIVE_CUSTOM_VALIDITY_PRIORITY: Record<string, number> = {
  required: 10,
  pattern: 20,
  minlength: 30,
  maxlength: 40,
};

function setNativeCustomValidityIssue(
  ctrl: ValidatingNgModelController,
  key: string,
  message: string | null,
): void {
  if (!ctrl.$setCustomValidity) return;

  let issues = nativeCustomValidityIssues.get(ctrl);

  if (!issues) {
    issues = new Map();
    nativeCustomValidityIssues.set(ctrl, issues);
  }

  if (message) {
    issues.set(key, {
      message,
      priority: NATIVE_CUSTOM_VALIDITY_PRIORITY[key] ?? 100,
    });
  } else {
    issues.delete(key);
  }

  let selected: NativeCustomValidityIssue | undefined;

  issues.forEach((issue) => {
    if (!selected || issue.priority < selected.priority) {
      selected = issue;
    }
  });

  ctrl.$setCustomValidity(selected?.message ?? "");
}

function readValidatorAttr(
  $attributes: ng.AttributesService | undefined,
  element: Element | Node,
  attr: ng.Attributes | undefined,
  normalizedName: string,
): string | undefined {
  const elementValue =
    element instanceof Element
      ? $attributes?.read(element, normalizedName)
      : undefined;

  const attrValue: string | undefined = attr
    ? (attr as unknown as ValidatorAttrFallback)[normalizedName]
    : undefined;

  if (
    isDefined(attrValue) &&
    (isUndefined(elementValue) || elementValue.includes("{{"))
  ) {
    return attrValue;
  }

  return elementValue ?? attrValue;
}

function hasValidatorAttr(
  $attributes: ng.AttributesService | undefined,
  element: Element | Node,
  attr: ng.Attributes | undefined,
  normalizedName: string,
): boolean {
  return (
    (element instanceof Element &&
      Boolean($attributes?.has(element, normalizedName))) ||
    (attr ? hasOwn(attr, normalizedName) : false)
  );
}

function observeValidatorAttr(
  $attributes: ng.AttributesService | undefined,
  scope: ng.Scope,
  element: Element | Node,
  attr: ng.Attributes,
  normalizedName: string,
  callback: (value?: string) => void,
): () => void {
  if (!$attributes || !(element instanceof Element)) return () => undefined;

  return $attributes.observe(scope, element, normalizedName, (value) => {
    callback(
      readValidatorAttr($attributes, element, attr, normalizedName) ?? value,
    );
  });
}

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
export const requiredDirective: [
  string,
  string,
  ($parse: ng.ParseService, $attributes?: ng.AttributesService) => ng.Directive,
] = [
  _parse,
  _attributes,
  /** Creates the `required` validator directive. */
  ($parse: ng.ParseService, $attributes?: ng.AttributesService) => ({
    restrict: "A",
    require: "?ngModel",
    link:
      /** Wires required-state observation into the ngModel validator set. */
      (
        scope: ng.Scope,
        elm: Element,
        attr: ng.Attributes,
        ctrl?: ValidatingNgModelController,
      ) => {
        if (!ctrl) return;
        const ngRequired = readValidatorAttr(
          $attributes,
          elm,
          attr,
          "ngRequired",
        );
        // For boolean attributes like required, presence means true
        const ngRequiredGetter = ngRequired ? $parse(ngRequired) : undefined;
        let value: unknown = ngRequiredGetter
          ? Boolean(ngRequiredGetter(scope))
          : hasValidatorAttr($attributes, elm, attr, "required");

        const syncNativeRequired = (required: boolean) => {
          if ($attributes && elm instanceof Element) {
            $attributes.set(elm, "required", required);
          }
          const nativeControl = elm as Element & {
            willValidate?: boolean;
            validity?: ValidityState;
          };

          ctrl.$setNativeValidity?.(
            !nativeControl.willValidate ||
              nativeControl.validity?.valid !== false,
          );
        };

        if (!ngRequired) {
          // force truthy in case we are on non input element
          // (input elements do this automatically for boolean attributes like required)
          attr.required = "true";
        }

        syncNativeRequired(Boolean(value));

        ctrl.$validators.required = (_modelValue: any, viewValue: any) => {
          return !value || !ctrl.$isEmpty(viewValue);
        };

        const setRequiredValue = (nextValue: unknown) => {
          if (value !== nextValue) {
            value = nextValue;
            syncNativeRequired(Boolean(value));
            ctrl.$validate();
          }
        };

        if (ngRequiredGetter && ngRequired) {
          scope.$watch(ngRequired, (nextValue) => {
            setRequiredValue(Boolean(nextValue));
          });
        } else {
          observeValidatorAttr(
            $attributes,
            scope,
            elm,
            attr,
            "required",
            (newVal?: string) => {
              setRequiredValue(
                $attributes && elm instanceof Element
                  ? $attributes.has(elm, "required")
                  : newVal,
              );
            },
          );
        }
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
export const patternDirective: [
  string,
  string,
  ($parse: ng.ParseService, $attributes?: ng.AttributesService) => ng.Directive,
] = [
  _parse,
  _attributes,
  /** Creates the `pattern` validator directive. */
  ($parse: ng.ParseService, $attributes?: ng.AttributesService) => ({
    restrict: "A",
    require: "?ngModel",
    compile: (tElm: Element, tAttr: ng.Attributes) => {
      let patternExp = "";

      let parseFn: (() => any) | ((scope: ng.Scope) => string) | undefined;

      const templateNgPattern = readValidatorAttr(
        $attributes,
        tElm,
        tAttr,
        "ngPattern",
      );

      if (templateNgPattern) {
        patternExp = templateNgPattern;
        const ngPattern = templateNgPattern;

        // ngPattern might be a scope expression, or an inlined regex, which is not parsable.
        // We get value of the attribute here, so we can compare the old and the new value
        // in the observer to avoid unnecessary validations
        if (ngPattern.startsWith("/") && REGEX_STRING_REGEXP.test(ngPattern)) {
          parseFn = function () {
            return templateNgPattern as unknown;
          };
        } else {
          parseFn = templateNgPattern ? $parse(templateNgPattern) : undefined;
        }
      }

      return function (
        scope: ng.Scope,
        elm: Element | Node,
        attr: ng.Attributes,
        ctrl?: ValidatingNgModelController,
      ) {
        if (!ctrl) return;
        const modelCtrl = ctrl;
        const ngPattern = readValidatorAttr(
          $attributes,
          elm,
          attr,
          "ngPattern",
        );
        let attrVal = readValidatorAttr($attributes, elm, attr, "pattern");

        if (ngPattern) {
          attrVal = parseFn?.(scope);
        } else {
          patternExp = attrVal ?? "";
        }
        let regexp = attrVal
          ? parsePatternAttr(attrVal, patternExp, elm)
          : undefined;

        function refreshRegexp(newVal?: string, validateOnChange = true): void {
          const oldRegexp = regexp;
          const nextValue = ngPattern ? parseFn?.(scope) : newVal;

          regexp = nextValue
            ? parsePatternAttr(nextValue, patternExp, elm)
            : undefined;

          if (
            validateOnChange &&
            oldRegexp?.toString() !== regexp?.toString()
          ) {
            modelCtrl.$validate();
          }
        }

        observeValidatorAttr(
          $attributes,
          scope,
          elm,
          attr,
          "pattern",
          refreshRegexp,
        );

        modelCtrl.$validators.pattern = (_modelValue: any, viewValue: any) => {
          if (ngPattern) {
            refreshRegexp(attrVal, false);
          }

          // HTML5 pattern constraint validates the input value, so we validate the viewValue
          const valid =
            modelCtrl.$isEmpty(viewValue) ||
            isUndefined(regexp) ||
            regexp.test(viewValue);

          setNativeCustomValidityIssue(
            modelCtrl,
            "pattern",
            valid ? null : "Value does not match the required pattern.",
          );

          return valid;
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
export const maxlengthDirective: [
  string,
  string,
  ($parse: ng.ParseService, $attributes?: ng.AttributesService) => ng.Directive,
] = [
  _parse,
  _attributes,
  /** Creates the `maxlength` validator directive. */
  ($parse: ng.ParseService, $attributes?: ng.AttributesService) => ({
    restrict: "A",
    require: "?ngModel",
    link:
      /** Watches maxlength changes and keeps the validator in sync. */
      (
        scope: ng.Scope,
        elm: Element,
        attr: ng.Attributes,
        ctrl?: ValidatingNgModelController,
      ) => {
        if (!ctrl) return;
        const maxlengthAttr = readValidatorAttr(
          $attributes,
          elm,
          attr,
          "maxlength",
        );
        const ngMaxlength = readValidatorAttr(
          $attributes,
          elm,
          attr,
          "ngMaxlength",
        );

        let maxlength =
          maxlengthAttr || (ngMaxlength && $parse(ngMaxlength)(scope));

        let maxlengthParsed = parseLength(maxlength);

        observeValidatorAttr(
          $attributes,
          scope,
          elm,
          attr,
          "maxlength",
          (newValue?: string) => {
            if (maxlength !== newValue) {
              maxlengthParsed = parseLength(newValue);
              maxlength = newValue;
              ctrl.$validate();
            }
          },
        );
        ctrl.$validators.maxlength = function (
          _modelValue: any,
          viewValue: any,
        ) {
          const valid =
            maxlengthParsed < 0 ||
            ctrl.$isEmpty(viewValue) ||
            (isString(viewValue) && viewValue.length <= maxlengthParsed);

          setNativeCustomValidityIssue(
            ctrl,
            "maxlength",
            valid
              ? null
              : `Value must be at most ${maxlengthParsed} characters.`,
          );

          return valid;
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
export const minlengthDirective: [
  string,
  string,
  ($parse: ng.ParseService, $attributes?: ng.AttributesService) => ng.Directive,
] = [
  _parse,
  _attributes,
  /** Creates the `minlength` validator directive. */ (
    $parse: ng.ParseService,
    $attributes?: ng.AttributesService,
  ) => ({
    restrict: "A",
    require: "?ngModel",
    link(
      scope: ng.Scope,
      elm: Element,
      attr: ng.Attributes,
      ctrl?: ValidatingNgModelController,
    ) {
      if (!ctrl) return;
      const minlengthAttr = readValidatorAttr(
        $attributes,
        elm,
        attr,
        "minlength",
      );
      const ngMinlength = readValidatorAttr(
        $attributes,
        elm,
        attr,
        "ngMinlength",
      );

      let minlength =
        minlengthAttr || (ngMinlength && $parse(ngMinlength)(scope));

      let minlengthParsed = parseLength(minlength) || -1;

      observeValidatorAttr(
        $attributes,
        scope,
        elm,
        attr,
        "minlength",
        (newValue?: string) => {
          if (minlength !== newValue) {
            minlengthParsed = parseLength(newValue) || -1;
            minlength = newValue;
            ctrl.$validate();
          }
        },
      );
      ctrl.$validators.minlength = function (
        modelValue: any,
        viewValue: string | any[],
      ) {
        void modelValue;

        const valid =
          ctrl.$isEmpty(viewValue) || viewValue.length >= minlengthParsed;

        setNativeCustomValidityIssue(
          ctrl,
          "minlength",
          valid
            ? null
            : `Value must be at least ${minlengthParsed} characters.`,
        );

        return valid;
      };
    },
  }),
];

/** Parses a pattern attribute value into a `RegExp` instance. */
function parsePatternAttr(
  input: string | RegExp,
  patternExp: string,
  elm: Element | Node,
): RegExp {
  let regex: RegExp | string = input;

  if (isString(regex)) {
    const match = /^\/(.*)\/([gimsuy]*)$/.exec(regex);

    regex = match ? new RegExp(match[1], match[2]) : new RegExp(`^${regex}$`);
  }

  if (!isFunction(regex.test)) {
    throw ngPatternError(
      "noregexp",
      "Expected {0} to be a RegExp but was {1}. Element: {2}",
      patternExp,
      regex,
      startingTag(elm),
    );
  }

  return regex;
}

/** Parses a numeric length attribute into an integer or `-1` when invalid. */
function parseLength(val: any): number {
  const intVal = parseInt(val, 10);

  return isNumberNaN(intVal) ? -1 : intVal;
}
