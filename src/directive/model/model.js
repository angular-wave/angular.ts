import {
  DIRTY_CLASS,
  EMPTY_CLASS,
  INVALID_CLASS,
  NOT_EMPTY_CLASS,
  PRISTINE_CLASS,
  TOUCHED_CLASS,
  UNTOUCHED_CLASS,
  VALID_CLASS,
} from "../../shared/constants.js";
import {
  deProxy,
  entries,
  hasAnimate,
  isBoolean,
  isFunction,
  isNull,
  isNumber,
  isNumberNaN,
  isObjectEmpty,
  isPromiseLike,
  isUndefined,
  keys,
  minErr,
  snakeCase,
} from "../../shared/utils.js";
import { PENDING_CLASS, nullFormCtrl } from "../form/form.js";
import { defaultModelOptions } from "../model-options/model-options.js";
import { startingTag } from "../../shared/dom.js";
import { $injectTokens as $t } from "../../injection-tokens.js";

export const ngModelMinErr = minErr("ngModel");

/**
 * 
 * @property {*} $viewValue The actual value from the control's view.
 *
 * @property {*} $modelValue The value in the model that the control is bound to.
 * @property {Array.<Function>} $parsers Array of functions to execute, as a pipeline, whenever
 *  the control updates the ngModelController with a new `$viewValue` from the DOM, usually via user input.
 *
 * @property {Array.<Function>} $formatters Array of functions to execute, as a pipeline, whenever
    the bound ngModel expression changes programmatically. The `$formatters` are not called when the
    value of the control is changed by user interaction.
 *
 * @property {Object.<string, (string, string) => boolean>} $validators A collection of validators that are applied whenever the model value changes. 
 * The key value within the object refers to the name of the validator while the function refers to the validation operation. 
 * The validation operation is provided with the model value as an argument and must return a true or false value depending on the response of that validation.
 *
 * @property {Object.<string, function(string, string) => Promise>} $asyncValidators A collection of validations that are expected to perform an asynchronous validation (e.g. a HTTP request).
 *  The validation function that is provided is expected to return a promise when it is run during the model validation process
 *
 * @property {Array.<Function>} $viewChangeListeners Array of functions to execute whenever
 *     a change to {@link ngModel.NgModelController#$viewValue `$viewValue`} has caused a change
 *     to {@link ngModel.NgModelController#$modelValue `$modelValue`}.
 *     It is called with no arguments, and its return value is ignored.
 *     This can be used in place of additional $watches against the model value.
 *
 * @property {Object} $error An object hash with all failing validator ids as keys.
 * @property {Object} $pending An object hash with all pending validator ids as keys.
 *
 * @property {boolean} $untouched True if control has not lost focus yet.
 * @property {boolean} $touched True if control has lost focus.
 * @property {boolean} $pristine True if user has not interacted with the control yet.
 * @property {boolean} $dirty True if user has already interacted with the control.
 * @property {boolean} $valid True if there is no error.
 * @property {boolean} $invalid True if at least one error on the control.
 * @property {string} $name The name attribute of the control.
 */

export class NgModelController {
  /* @ignore */ static $nonscope = true;
  /* @ignore */ static $inject = [
    $t._scope,
    $t._exceptionHandler,
    $t._attrs,
    $t._element,
    $t._parse,
    $t._animate,
    $t._interpolate,
  ];

  /**
   * @param {ng.Scope} $scope
   * @param {ng.ExceptionHandlerService} $exceptionHandler
   * @param {ng.Attributes} $attr
   * @param {Element} $element
   * @param {ng.ParseService} $parse
   * @param {ng.AnimateService} $animate
   * @param {ng.InterpolateService} $interpolate
   */
  constructor(
    $scope,
    $exceptionHandler,
    $attr,
    $element,
    $parse,
    $animate,
    $interpolate,
  ) {
    /** @type {any} The actual value from the control's view  */
    this.$viewValue = Number.NaN;

    /** @type {any} The value in the model that the control is bound to. */
    this.$modelValue = Number.NaN;
    /** @type {any} */
    this._rawModelValue = undefined; // stores the parsed modelValue / model set from scope regardless of validity.

    /** @type {import("./interface.ts").ModelValidators} */
    this.$validators = {};

    /** @type {import("./interface.ts").AsyncModelValidators} */
    this.$asyncValidators = {};

    /** @type {Array<import("./interface.ts").ModelParser>} */
    this.$parsers = [];

    /** @type {Array<import("./interface.ts").ModelFormatter>} */
    this.$formatters = [];

    /** @type {Array<import("./interface.ts").ModelViewChangeListener>} */
    this.$viewChangeListeners = [];

    /** @type {boolean} */
    this.$untouched = true;

    /** @type {boolean} */
    this.$touched = false;

    /** @type {boolean} */
    this.$pristine = true;

    /** @type {boolean} */
    this.$dirty = false;

    /** @type {boolean} */
    this.$valid = true;

    /** @type {boolean} */
    this.$invalid = false;

    this.$error = {}; // keep invalid keys here
    this._success = {}; // keep valid keys here
    this.$pending = undefined; // keep pending keys here
    this.$name = $interpolate($attr.name || "", false)($scope);
    this._parentForm = nullFormCtrl;
    this.$options = defaultModelOptions;
    this._updateEvents = "";
    // Attach the correct context to the event handler function for updateOn
    this._updateEventHandler = this._updateEventHandler.bind(this);

    this._parsedNgModel = $parse($attr.ngModel);
    this._parsedNgModelAssign = this._parsedNgModel._assign;

    /**
     * @type {import("../../core/parse/interface.ts").CompiledExpression |
     *        (function(ng.Scope): any)}
     */
    this._ngModelGet = this._parsedNgModel;
    this._ngModelSet = this._parsedNgModelAssign;
    this._pendingDebounce = null;
    this._parserValid = undefined;

    /** @type {string} */
    this._parserName = "parse";

    /** @type {number} */
    this._currentValidationRunId = 0;

    /** @type {ng.Scope} */
    this._scope = $scope; // attempt to bind to nearest controller if present
    this._attr = $attr;
    this._element = $element;
    this._animate = $animate;
    this._parse = $parse;
    this._exceptionHandler = $exceptionHandler;

    this._hasNativeValidators = false;

    this._classCache = {};
    const isValid = this._element.classList.contains(VALID_CLASS);

    this._classCache[VALID_CLASS] = isValid;
    this._classCache[INVALID_CLASS] = !isValid;

    this._eventRemovers = new Set();

    setupModelWatcher(this);
  }

  set(object, property) {
    object[property] = true;
  }

  unset(object, property) {
    delete object[property];
  }

  $setValidity(validationErrorKey, state) {
    const that = this;

    function createAndSet(ctrl, name, value) {
      if (!ctrl[name]) {
        ctrl[name] = {};
      }
      that.set(ctrl[name], value);
    }

    function unsetAndCleanup(ctrl, name, value) {
      if (ctrl[name]) {
        that.unset(ctrl[name], value);
      }

      if (isObjectEmpty(ctrl[name])) {
        ctrl[name] = undefined;
      }
    }

    function cachedToggleClass(ctrl, className, switchValue) {
      if (switchValue && !ctrl._classCache[className]) {
        if (hasAnimate(ctrl._element)) {
          ctrl._animate.addClass(ctrl._element, className);
        } else {
          ctrl._element.classList.add(className);
        }

        ctrl._classCache[className] = true;
      } else if (!switchValue && ctrl._classCache[className]) {
        if (hasAnimate(ctrl._element)) {
          ctrl._animate.removeClass(ctrl._element, className);
        } else {
          ctrl._element.classList.remove(className);
        }
        ctrl._classCache[className] = false;
      }
    }

    function toggleValidationCss(ctrl, validationErrorKeyParam, isValid) {
      validationErrorKeyParam = validationErrorKeyParam
        ? `-${snakeCase(validationErrorKeyParam, "-")}`
        : "";

      cachedToggleClass(
        ctrl,
        VALID_CLASS + validationErrorKeyParam,
        isValid === true,
      );
      cachedToggleClass(
        ctrl,
        INVALID_CLASS + validationErrorKeyParam,
        isValid === false,
      );
    }

    if (isUndefined(state)) {
      createAndSet(this, "$pending", validationErrorKey);
    } else {
      unsetAndCleanup(this, "$pending", validationErrorKey);
    }

    if (!isBoolean(state)) {
      delete this.$error[validationErrorKey];
      delete this._success[validationErrorKey];
    } else if (state) {
      delete this.$error[validationErrorKey];
      this.set(this._success, validationErrorKey);
    } else {
      this.set(this.$error, validationErrorKey);
      delete this._success[validationErrorKey];
    }

    if (this.$pending) {
      cachedToggleClass(this, PENDING_CLASS, true);
      this.$valid = this.$invalid = undefined;
      toggleValidationCss(this, "", null);
    } else {
      cachedToggleClass(this, PENDING_CLASS, false);
      this.$valid = isObjectEmpty(this.$error);
      this.$invalid = !this.$valid;
      toggleValidationCss(this, "", this.$valid);
    }

    // re-read the state as the set/unset methods could have
    // combined state in this.$error[validationError] (used for forms),
    // where setting/unsetting only increments/decrements the value,
    // and does not replace it.
    let combinedState;

    if (this.$pending && this.$pending[validationErrorKey]) {
      combinedState = undefined;
    } else if (this.$error[validationErrorKey]) {
      combinedState = false;
    } else if (this._success[validationErrorKey]) {
      combinedState = true;
    } else {
      combinedState = null;
    }

    toggleValidationCss(this, validationErrorKey, combinedState);
    this._parentForm.$setValidity(validationErrorKey, combinedState, this);
  }

  _initGetterSetters() {
    if (this.$options.getOption("getterSetter")) {
      const invokeModelGetter = this._parse(`${this._attr.ngModel}()`);

      const invokeModelSetter = this._parse(`${this._attr.ngModel}(_$p)`);

      this._ngModelGet = ($scope) => {
        let modelValue = this._parsedNgModel($scope);

        if (isFunction(modelValue)) {
          modelValue = invokeModelGetter($scope);
        }

        return modelValue;
      };
      this._ngModelSet = ($scope, newValue) => {
        if (isFunction(this._parsedNgModel($scope))) {
          invokeModelSetter($scope, { _$p: newValue });
        } else {
          this._parsedNgModelAssign($scope, newValue);
        }
      };
    } else if (!this._parsedNgModel._assign) {
      throw ngModelMinErr(
        "nonassign",
        "Expression '{0}' is non-assignable. Element: {1}",
        this._attr.ngModel,
        startingTag(this._element),
      );
    }
  }

  /**
   * Called when the view needs to be updated. It is expected that the user of the ng-model
   * directive will implement this method.
   *
   * The `$render()` method is invoked in the following situations:
   *
   * * `$rollbackViewValue()` is called.  If we are rolling back the view value to the last
   *   committed value then `$render()` is called to update the input control.
   * * The value referenced by `ng-model` is changed programmatically and both the `$modelValue` and
   *   the `$viewValue` are different from last time.
   *
   * Since `ng-model` does not do a deep watch, `$render()` is only invoked if the values of
   * `$modelValue` and `$viewValue` are actually different from their previous values. If `$modelValue`
   * or `$viewValue` are objects (rather than a string or number) then `$render()` will not be
   * invoked if you only change a property on the objects.
   */
  $render() {
    /* empty */
  }

  /**
   * This is called when we need to determine if the value of an input is empty.
   *
   * For instance, the required directive does this to work out if the input has data or not.
   *
   * The default `$isEmpty` function checks whether the value is `undefined`, `''`, `null` or `NaN`.
   *
   * You can override this for input directives whose concept of being empty is different from the
   * default. The `checkboxInputType` directive does this because in its case a value of `false`
   * implies empty.
   *
   * @param {*} value The value of the input to check for emptiness.
   * @returns {boolean} True if `value` is "empty".
   */
  $isEmpty(value) {
    return (
      isUndefined(value) ||
      value === "" ||
      value === null ||
      Number.isNaN(value)
    );
  }

  _updateEmptyClasses(value) {
    if (this.$isEmpty(value)) {
      if (hasAnimate(this._element)) {
        this._animate.removeClass(this._element, NOT_EMPTY_CLASS);
        this._animate.addClass(this._element, EMPTY_CLASS);
      } else {
        this._element.classList.remove(NOT_EMPTY_CLASS);
        this._element.classList.add(EMPTY_CLASS);
      }
    } else {
      if (hasAnimate(this._element)) {
        this._animate.removeClass(this._element, EMPTY_CLASS);
        this._animate.addClass(this._element, NOT_EMPTY_CLASS);
      } else {
        this._element.classList.remove(EMPTY_CLASS);
        this._element.classList.add(NOT_EMPTY_CLASS);
      }
    }
  }

  /**
   * Sets the control to its pristine state.
   *
   * This method can be called to remove the `ng-dirty` class and set the control to its pristine
   * state (`ng-pristine` class). A model is considered to be pristine when the control
   * has not been changed from when first compiled.
   */
  $setPristine() {
    this.$dirty = false;
    this.$pristine = true;

    if (!this._element) return;

    if (hasAnimate(this._element)) {
      this._animate.removeClass(this._element, EMPTY_CLASS);
      this._animate.addClass(this._element, PRISTINE_CLASS);
    } else {
      this._element.classList.remove(EMPTY_CLASS);
      this._element.classList.add(PRISTINE_CLASS);
    }
  }

  /**
   * Sets the control to its dirty state.
   *
   * This method can be called to remove the `ng-pristine` class and set the control to its dirty
   * state (`ng-dirty` class). A model is considered to be dirty when the control has been changed
   * from when first compiled.
   */
  $setDirty() {
    this.$dirty = true;
    this.$pristine = false;

    if (hasAnimate(this._element)) {
      this._animate.removeClass(this._element, PRISTINE_CLASS);
      this._animate.addClass(this._element, DIRTY_CLASS);
    } else {
      this._element.classList.remove(PRISTINE_CLASS);
      this._element.classList.add(DIRTY_CLASS);
    }
    this._parentForm.$setDirty();
  }

  /**
   * Sets the control to its untouched state.
   *
   * This method can be called to remove the `ng-touched` class and set the control to its
   * untouched state (`ng-untouched` class). Upon compilation, a model is set as untouched
   * by default, however this function can be used to restore that state if the model has
   * already been touched by the user.
   */
  $setUntouched() {
    this.$touched = false;
    this.$untouched = true;

    if (hasAnimate(this._element)) {
      this._animate.setClass(this._element, UNTOUCHED_CLASS, TOUCHED_CLASS);
    } else {
      this._element.classList.remove(TOUCHED_CLASS);
      this._element.classList.add(UNTOUCHED_CLASS);
    }
  }

  /**
   * Sets the control to its touched state.
   *
   * This method can be called to remove the `ng-untouched` class and set the control to its
   * touched state (`ng-touched` class). A model is considered to be touched when the user has
   * first focused the control element and then shifted focus away from the control (blur event).
   */
  $setTouched() {
    this.$touched = true;
    this.$untouched = false;

    if (hasAnimate(this._element)) {
      this._animate.setClass(this._element, TOUCHED_CLASS, UNTOUCHED_CLASS);
    } else {
      this._element.classList.remove(UNTOUCHED_CLASS);
      this._element.classList.add(TOUCHED_CLASS);
    }
  }

  /**
   * Cancel an update and reset the input element's value to prevent an update to the `$modelValue`,
   * which may be caused by a pending debounced event or because the input is waiting for some
   * future event.
   *
   * If you have an input that uses `ng-model-options` to set up debounced updates or updates that
   * depend on special events such as `blur`, there can be a period when the `$viewValue` is out of
   * sync with the ngModel's `$modelValue`.
   *
   * In this case, you can use `$rollbackViewValue()` to manually cancel the debounced / future update
   * and reset the input to the last committed view value.
   *
   * It is also possible that you run into difficulties if you try to update the ngModel's `$modelValue`
   * programmatically before these debounced/future events have resolved/occurred, because AngularTS's
   * dirty checking mechanism is not able to tell whether the model has actually changed or not.
   *
   * The `$rollbackViewValue()` method should be called before programmatically changing the model of an
   * input which may have such events pending. This is important in order to make sure that the
   * input field will be updated with the new model value and any pending operations are cancelled.
   *
   * @example
   * <example name="ng-model-cancel-update" module="cancel-update-example">
   *   <file name="app.js">
   *     angular.module('cancel-update-example', [])
   *
   *     .controller('CancelUpdateController', ['$scope', function($scope) {
   *       $scope.model = {value1: '', value2: ''};
   *
   *       $scope.setEmpty = function(e, value, rollback) {
   *         if (e.keyCode === 27) {
   *           e.preventDefault();
   *           if (rollback) {
   *             $scope.myForm[value].$rollbackViewValue();
   *           }
   *           $scope.model[value] = '';
   *         }
   *       };
   *     }]);
   *   </file>
   *   <file name="index.html">
   *     <div ng-controller="CancelUpdateController">
   *       <p>Both of these inputs are only updated if they are blurred. Hitting escape should
   *       empty them. Follow these steps and observe the difference:</p>
   *       <ol>
   *         <li>Type something in the input. You will see that the model is not yet updated</li>
   *         <li>Press the Escape key.
   *           <ol>
   *             <li> In the first example, nothing happens, because the model is already '', and no
   *             update is detected. If you blur the input, the model will be set to the current view.
   *             </li>
   *             <li> In the second example, the pending update is cancelled, and the input is set back
   *             to the last committed view value (''). Blurring the input does nothing.
   *             </li>
   *           </ol>
   *         </li>
   *       </ol>
   *
   *       <form name="myForm" ng-model-options="{ updateOn: 'blur' }">
   *         <div>
   *           <p id="inputDescription1">Without $rollbackViewValue():</p>
   *           <input name="value1" aria-describedby="inputDescription1" ng-model="model.value1"
   *                  ng-keydown="setEmpty($event, 'value1')">
   *           value1: "{{ model.value1 }}"
   *         </div>
   *
   *         <div>
   *           <p id="inputDescription2">With $rollbackViewValue():</p>
   *           <input name="value2" aria-describedby="inputDescription2" ng-model="model.value2"
   *                  ng-keydown="setEmpty($event, 'value2', true)">
   *           value2: "{{ model.value2 }}"
   *         </div>
   *       </form>
   *     </div>
   *   </file>
       <file name="style.css">
          div {
            display: table-cell;
          }
          div:nth-child(1) {
            padding-right: 30px;
          }

        </file>
   * </example>
   */
  $rollbackViewValue() {
    clearTimeout(this._pendingDebounce);
    this.$viewValue = this._lastCommittedViewValue;
    this.$render();
  }

  /**
   * Runs each of the registered validators (first synchronous validators and then
   * asynchronous validators).
   * If the validity changes to invalid, the model will be set to `undefined`,
   * unless {@link ngModelOptions `ngModelOptions.allowInvalid`} is `true`.
   * If the validity changes to valid, it will set the model to the last available valid
   * `$modelValue`, i.e. either the last parsed value or the last value set from the scope.
   */
  $validate() {
    // ignore $validate before model is initialized
    if (isNumberNaN(this.$modelValue)) {
      return;
    }

    const viewValue = this._lastCommittedViewValue;

    // Note: we use the _rawModelValue as $modelValue might have been
    // set to undefined during a view -> model update that found validation
    // errors. We can't parse the view here, since that could change
    // the model although neither viewValue nor the model on the scope changed
    const modelValue = this._rawModelValue;

    const prevValid = this.$valid;

    const prevModelValue = this.$modelValue;

    const allowInvalid = this.$options.getOption("allowInvalid");

    const that = this;

    this._runValidators(modelValue, viewValue, (allValid) => {
      // If there was no change in validity, don't update the model
      // This prevents changing an invalid modelValue to undefined
      if (!allowInvalid && prevValid !== allValid) {
        // Note: Don't check this.$valid here, as we could have
        // external validators (e.g. calculated on the server),
        // that just call $setValidity and need the model value
        // to calculate their validity.
        that.$modelValue = allValid ? modelValue : undefined;

        if (that.$modelValue !== prevModelValue) {
          that._writeModelToScope();
        }
      }
    });
  }

  _runValidators(modelValue, viewValue, doneCallback) {
    this._currentValidationRunId++;
    const localValidationRunId = this._currentValidationRunId;

    const that = this;

    // check parser error
    if (!processParseErrors()) {
      validationDone(false);

      return;
    }

    if (!processSyncValidators()) {
      validationDone(false);

      return;
    }
    processAsyncValidators();

    function processParseErrors() {
      const errorKey = that._parserName;

      if (isUndefined(that._parserValid)) {
        setValidity(errorKey, null);
      } else {
        if (!that._parserValid) {
          keys(that.$validators).forEach((name) => {
            setValidity(name, null);
          });
          keys(that.$asyncValidators).forEach((name) => {
            setValidity(name, null);
          });
        }

        // Set the parse error last, to prevent unsetting it, should a $validators key == parserName
        setValidity(errorKey, that._parserValid);

        return that._parserValid;
      }

      return true;
    }

    function processSyncValidators() {
      let syncValidatorsValid = true;

      entries(that.$validators).forEach(([name, validator]) => {
        const result = Boolean(validator(modelValue, viewValue));

        syncValidatorsValid = syncValidatorsValid && result;
        setValidity(name, result);
      });

      if (!syncValidatorsValid) {
        keys(that.$asyncValidators).forEach((name) => {
          setValidity(name, null);
        });

        return false;
      }

      return true;
    }

    function processAsyncValidators() {
      const validatorPromises = [];

      let allValid = true;

      entries(that.$asyncValidators).forEach(([name, validator]) => {
        const promise = validator(modelValue, viewValue);

        if (!isPromiseLike(promise)) {
          throw ngModelMinErr(
            "nopromise",
            "Expected asynchronous validator to return a promise but got '{0}' instead.",
            promise,
          );
        }
        setValidity(name, undefined);
        validatorPromises.push(
          promise.then(
            () => {
              setValidity(name, true);
            },
            () => {
              allValid = false;
              setValidity(name, false);
            },
          ),
        );
      });

      if (!validatorPromises.length) {
        validationDone(true);
      } else {
        Promise.all(validatorPromises).then(
          () => {
            validationDone(allValid);
          },
          () => {
            /* empty */
          },
        );
      }
    }

    function setValidity(name, isValid) {
      if (localValidationRunId === that._currentValidationRunId) {
        that.$setValidity(name, isValid);
      }
    }

    function validationDone(allValid) {
      if (localValidationRunId === that._currentValidationRunId) {
        doneCallback(allValid);
      }
    }
  }

  /**
   * Commit a pending update to the `$modelValue`.
   *
   * Updates may be pending by a debounced event or because the input is waiting for a some future
   * event defined in `ng-model-options`. this method is rarely needed as `NgModelController`
   * usually handles calling this in response to input events.
   */
  $commitViewValue() {
    clearTimeout(this._pendingDebounce);

    // If the view value has not changed then we should just exit, except in the case where there is
    // a native validator on the element. In this case the validation state may have changed even though
    // the viewValue has stayed empty.
    if (
      this._lastCommittedViewValue === this.$viewValue &&
      (this.$viewValue !== "" || !this._hasNativeValidators)
    ) {
      return;
    }

    if (
      this._lastCommittedViewValue === undefined &&
      Number.isNaN(this.$viewValue)
    ) {
      return;
    }

    this._updateEmptyClasses(this.$viewValue);
    this._lastCommittedViewValue = this.$viewValue;

    // change to dirty
    if (this.$pristine) {
      this.$setDirty();
    }
    this._parseAndValidate();
  }

  _parseAndValidate() {
    let modelValue = this._lastCommittedViewValue;

    const that = this;

    this._parserValid = isUndefined(modelValue) ? undefined : true;

    // Reset any previous parse error
    this.$setValidity(this._parserName, null);
    this._parserName = "parse";

    if (this._parserValid) {
      for (let i = 0; i < this.$parsers.length; i++) {
        modelValue = this.$parsers[i](modelValue);

        if (isUndefined(modelValue)) {
          this._parserValid = false;
          break;
        }
      }
    }

    if (isNumberNaN(this.$modelValue)) {
      // this.$modelValue has not been touched yet...
      // @ts-ignore
      this.$modelValue = this._ngModelGet(this._scope);
    }
    const prevModelValue = this.$modelValue;

    const allowInvalid = this.$options.getOption("allowInvalid");

    this._rawModelValue = modelValue;

    if (allowInvalid) {
      this.$modelValue = modelValue;
      writeToModelIfNeeded();
    }

    // Pass the _lastCommittedViewValue here, because the cached viewValue might be out of date.
    // This can happen if e.g. $setViewValue is called from inside a parser
    this._runValidators(
      modelValue,
      this._lastCommittedViewValue,
      (allValid) => {
        if (!allowInvalid) {
          // Note: Don't check this.$valid here, as we could have
          // external validators (e.g. calculated on the server),
          // that just call $setValidity and need the model value
          // to calculate their validity.
          // if (that.$modelValue ?? that.$modelValue[isProxySymbol]) {
          //   delete that.$modelValue;
          // }
          that.$modelValue = allValid ? modelValue : undefined;
          writeToModelIfNeeded();
        }
      },
    );

    function writeToModelIfNeeded() {
      // intentional loose equality
      // eslint-disable-next-line eqeqeq
      if (that.$modelValue != prevModelValue) {
        if (isNull(that.$modelValue) && prevModelValue === "") return;

        that._writeModelToScope();
      }
    }
  }

  _writeModelToScope() {
    this._ngModelSet(this._scope, this.$modelValue);
    Object.values(this.$viewChangeListeners).forEach((listener) => {
      try {
        listener();
      } catch (err) {
        this._exceptionHandler(err);
      }
    }, this);
  }

  /**
   * Update the view value.
   *
   * This method should be called when a control wants to change the view value; typically,
   * this is done from within a DOM event handler. For example, the {@link ng.directive:input input}
   * directive calls it when the value of the input changes and {@link ng.directive:select select}
   * calls it when an option is selected.
   *
   * When `$setViewValue` is called, the new `value` will be staged for committing through the `$parsers`
   * and `$validators` pipelines. If there are no special {@link ngModelOptions} specified then the staged
   * value is sent directly for processing through the `$parsers` pipeline. After this, the `$validators` and
   * `$asyncValidators` are called and the value is applied to `$modelValue`.
   * Finally, the value is set to the **expression** specified in the `ng-model` attribute and
   * all the registered change listeners, in the `$viewChangeListeners` list are called.
   *
   * In case the {@link ng.directive:ngModelOptions ngModelOptions} directive is used with `updateOn`
   * and the `default` trigger is not listed, all those actions will remain pending until one of the
   * `updateOn` events is triggered on the DOM element.
   * All these actions will be debounced if the {@link ng.directive:ngModelOptions ngModelOptions}
   * directive is used with a custom debounce for this particular event.
   * Note that a `$digest` is only triggered once the `updateOn` events are fired, or if `debounce`
   * is specified, once the timer runs out.
   *
   * When used with standard inputs, the view value will always be a string (which is in some cases
   * parsed into another type, such as a `Date` object for `input[date]`.)
   * However, custom controls might also pass objects to this method. In this case, we should make
   * a copy of the object before passing it to `$setViewValue`. This is because `ngModel` does not
   * perform a deep watch of objects, it only looks for a change of identity. If you only change
   * the property of the object then ngModel will not realize that the object has changed and
   * will not invoke the `$parsers` and `$validators` pipelines. For this reason, you should
   * not change properties of the copy once it has been passed to `$setViewValue`.
   * Otherwise you may cause the model value on the scope to change incorrectly.
   *
   * <div class="alert alert-info">
   * In any case, the value passed to the method should always reflect the current value
   * of the control. For example, if you are calling `$setViewValue` for an input element,
   * you should pass the input DOM value. Otherwise, the control and the scope model become
   * out of sync. It's also important to note that `$setViewValue` does not call `$render` or change
   * the control's DOM value in any way. If we want to change the control's DOM value
   * programmatically, we should update the `ngModel` scope expression. Its new value will be
   * picked up by the model controller, which will run it through the `$formatters`, `$render` it
   * to update the DOM, and finally call `$validate` on it.
   * </div>
   *
   * @param {*} value value from the view.
   * @param {string} [trigger] Event that triggered the update.
   */
  $setViewValue(value, trigger) {
    this.$viewValue = value;

    if (this.$options?.getOption("updateOnDefault")) {
      this._debounceViewValueCommit(trigger);
    }
  }

  _debounceViewValueCommit(trigger) {
    let debounceDelay = this.$options.getOption("debounce");

    if (isNumber(debounceDelay[trigger])) {
      debounceDelay = debounceDelay[trigger];
    } else if (
      isNumber(
        /** @type {Object.<string, number>} */ (debounceDelay).default,
      ) &&
      /** @type {string} */ (this.$options.getOption("updateOn")).indexOf(
        trigger,
      ) === -1
    ) {
      debounceDelay = /** @type {Object.<string, number>} */ (debounceDelay)
        .default;
    } else if (isNumber(debounceDelay["*"])) {
      debounceDelay = debounceDelay["*"];
    }

    clearTimeout(this._pendingDebounce);
    const that = this;

    if (/** @type {number} */ (debounceDelay) > 0) {
      // this fails if debounceDelay is an object
      this._pendingDebounce = setTimeout(() => {
        that.$commitViewValue();
      }, /** @type {number} */ (debounceDelay));
    } else {
      this.$commitViewValue();
    }
  }

  /**
   *
   * Override the current model options settings programmatically.
   *
   * The previous `ModelOptions` value will not be modified. Instead, a
   * new `ModelOptions` object will inherit from the previous one overriding
   * or inheriting settings that are defined in the given parameter.
   *
   * See {@link ngModelOptions} for information about what options can be specified
   * and how model option inheritance works.
   *
   * <div class="alert alert-warning">
   * **Note:** this function only affects the options set on the `ngModelController`,
   * and not the options on the {@link ngModelOptions} directive from which they might have been
   * obtained initially.
   * </div>
   *
   * <div class="alert alert-danger">
   * **Note:** it is not possible to override the `getterSetter` option.
   * </div>
   *
   * @param {import("../../interface.ts").NgModelOptions} options a hash of settings to override the previous options
   *
   */
  $overrideModelOptions(options) {
    this._removeAllEventListeners();
    this.$options = this.$options.createChild(options);
    this._updateEvents = this.$options._options.updateOn;
    this._setUpdateOnEvents();
  }

  /**
   * Runs the model -> view pipeline on the current
   * {@link ngModel.NgModelController#$modelValue $modelValue}.
   *
   * The following actions are performed by this method:
   *
   * - the `$modelValue` is run through the {@link ngModel.NgModelController#$formatters $formatters}
   * and the result is set to the {@link ngModel.NgModelController#$viewValue $viewValue}
   * - the `ng-empty` or `ng-not-empty` class is set on the element
   * - if the `$viewValue` has changed:
   *   - {@link ngModel.NgModelController#$render $render} is called on the control
   *   - the {@link ngModel.NgModelController#$validators $validators} are run and
   *   the validation status is set.
   *
   * This method is called by ngModel internally when the bound scope value changes.
   * Application developers usually do not have to call this function themselves.
   *
   * This function can be used when the `$viewValue` or the rendered DOM value are not correctly
   * formatted and the `$modelValue` must be run through the `$formatters` again.
   *
   * @example
   * Consider a text input with an autocomplete list (for fruit), where the items are
   * objects with a name and an id.
   * A user enters `ap` and then selects `Apricot` from the list.
   * Based on this, the autocomplete widget will call `$setViewValue({name: 'Apricot', id: 443})`,
   * but the rendered value will still be `ap`.
   * The widget can then call `ctrl.$processModelValue()` to run the model -> view
   * pipeline again, which formats the object to the string `Apricot`,
   * then updates the `$viewValue`, and finally renders it in the DOM.
   *
   * <example module="inputExample" name="ng-model-process">
     <file name="index.html">
      <div ng-controller="inputController" style="display: flex;">
        <div style="margin-right: 30px;">
          Search Fruit:
          <basic-autocomplete items="items" on-select="selectedFruit = item"></basic-autocomplete>
        </div>
        <div>
          Model:<br>
          <pre>{{selectedFruit | json}}</pre>
        </div>
      </div>
     </file>
     <file name="app.js">
      angular.module('inputExample', [])
        .controller('inputController', function($scope) {
          $scope.items = [
            {name: 'Apricot', id: 443},
            {name: 'Clementine', id: 972},
            {name: 'Durian', id: 169},
            {name: 'Jackfruit', id: 982},
            {name: 'Strawberry', id: 863}
          ];
        })
        .component('basicAutocomplete', {
          bindings: {
            items: '<',
            onSelect: '&'
          },
          templateUrl: 'autocomplete.html',
          controller: function($element, $scope) {
            let that = this;
            let ngModel;

            that.$postLink = function() {
              ngModel = $element.querySelectorAll('input').controller('ngModel');

              ngModel.$formatters.push(function(value) {
                return (value && value.name) || value;
              });

              ngModel.$parsers.push(function(value) {
                let match = value;
                for (let i = 0; i < that.items.length; i++) {
                  if (that.items[i].name === value) {
                    match = that.items[i];
                    break;
                  }
                }

                return match;
              });
            };

            that.selectItem = function(item) {
              ngModel.$setViewValue(item);
              ngModel.$processModelValue();
              that.onSelect({item: item});
            };
          }
        });
     </file>
     <file name="autocomplete.html">
       <div>
         <input type="search" ng-model="$ctrl.searchTerm" />
         <ul>
           <li ng-repeat="item in $ctrl.items | filter:$ctrl.searchTerm">
             <button ng-click="$ctrl.selectItem(item)">{{ item.name }}</button>
           </li>
         </ul>
       </div>
     </file>
   * </example>
   *
   */
  $processModelValue() {
    const viewValue = this._format();

    if (this.$viewValue !== viewValue) {
      this._updateEmptyClasses(viewValue);
      this.$viewValue = this._lastCommittedViewValue = viewValue;
      this.$render();
      // It is possible that model and view value have been updated during render
      this._runValidators(this.$modelValue, this.$viewValue, () => {
        /* empty */
      });
    }
  }

  /**
   * This method is called internally to run the $formatters on the $modelValue
   */
  _format() {
    const formatters = this.$formatters;

    let idx = formatters.length;

    let viewValue = this.$modelValue;

    while (idx--) {
      viewValue = formatters[idx](viewValue);
    }

    return viewValue;
  }

  /**
   * @ignore
   * This method is called internally when the bound scope value changes.
   */
  _setModelValue(modelValue) {
    this.$modelValue = this._rawModelValue = modelValue;
    this._parserValid = undefined;
    this.$processModelValue();
  }

  /**
   * @ignore
   */
  _removeAllEventListeners() {
    this._eventRemovers.forEach((removeCallback) => removeCallback());
    this._eventRemovers.clear();
  }

  _setUpdateOnEvents() {
    if (this._updateEvents) {
      this._updateEvents.split(" ").forEach((ev) => {
        this._element.addEventListener(ev, this._updateEventHandler);
        this._eventRemovers.add(() =>
          this._element.removeEventListener(ev, this._updateEventHandler),
        );
      });
    }

    this._updateEvents = /** @type {string} */ (
      this.$options.getOption("updateOn")
    );

    if (this._updateEvents) {
      this._updateEvents.split(" ").forEach((ev) => {
        this._element.addEventListener(ev, this._updateEventHandler);
        this._eventRemovers.add(() =>
          this._element.removeEventListener(ev, this._updateEventHandler),
        );
      });
    }
  }

  _updateEventHandler(ev) {
    this._debounceViewValueCommit(ev && ev.type);
  }
}

function setupModelWatcher(ctrl) {
  // model -> value
  // Note: we cannot use a normal scope.$watch as we want to detect the following:
  // 1. scope value is 'a'
  // 2. user enters 'b'
  // 3. ng-change kicks in and reverts scope value to 'a'
  //    -> scope value did not change since the last digest as
  //       ng-change executes in apply phase
  // 4. view should be changed back to 'a'
  ctrl._scope.$watch("value", () => {
    const modelValue = ctrl._ngModelGet(ctrl._scope);

    // if scope model value and ngModel value are out of sync
    // This cannot be moved to the action function, because it would not catch the
    // case where the model is changed in the ngChange function or the model setter
    if (
      modelValue !== ctrl.$modelValue &&
      // checks for NaN is needed to allow setting the model to NaN when there's an asyncValidator

      (!Number.isNaN(ctrl.$modelValue) || !Number.isNaN(modelValue))
    ) {
      ctrl._setModelValue(modelValue);
    }
  });
}

export function ngModelDirective() {
  return {
    restrict: "A",
    require: ["ngModel", "^?form", "^?ngModelOptions"],
    controller: NgModelController,
    // Prelink needs to run before any input directive
    // so that we can set the NgModelOptions in NgModelController
    // before anyone else uses it.
    priority: 1,
    compile:
      /** @param {Element} element  */
      (element) => {
        // Setup initial state of the control
        element.classList.add(PRISTINE_CLASS, UNTOUCHED_CLASS, VALID_CLASS);

        return {
          pre: (scope, _element, attr, ctrls) => {
            const modelCtrl = ctrls[0];

            const formCtrl = ctrls[1] || modelCtrl._parentForm;

            const optionsCtrl = ctrls[2];

            if (optionsCtrl) {
              modelCtrl.$options = optionsCtrl.$options;
            }
            modelCtrl._initGetterSetters();

            // notify others, especially parent forms
            formCtrl.$addControl(modelCtrl);

            attr.$observe("name", (newValue) => {
              if (modelCtrl.$name !== newValue) {
                modelCtrl._parentForm._renameControl(modelCtrl, newValue);
              }
            });
            const deregisterWatch = scope.$watch(attr.ngModel, (val) => {
              modelCtrl._setModelValue(deProxy(val));
            });

            scope.$on("$destroy", () => {
              modelCtrl._parentForm.$removeControl(modelCtrl);
              deregisterWatch();
            });
          },
          post: (scope, elementPost, _attr, ctrls) => {
            const modelCtrl = ctrls[0];

            modelCtrl._setUpdateOnEvents();

            function setTouched() {
              modelCtrl.$setTouched();
            }

            elementPost.addEventListener("blur", () => {
              if (modelCtrl.$touched) return;
              setTouched();
            });

            modelCtrl.$viewChangeListeners.push(() => {
              const { change } = elementPost.dataset;

              change && scope.$eval(change);
            });
          },
        };
      },
  };
}
