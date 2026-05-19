import { _parse, _attributes, _element, _attrs, _scope, _injector, _interpolate } from '../../injection-tokens.js';
import { hasAnimate, isString, isFunction, callFunction, assertNotHasOwnProperty, shallowCopy, deProxy, deleteProperty, arrayRemove, isObjectEmpty, snakeCase, extend, isUndefined } from '../../shared/utils.js';
import { VALID_CLASS, INVALID_CLASS, PRISTINE_CLASS, DIRTY_CLASS } from '../../shared/constants.js';
import { createLazyAnimate } from '../../animations/lazy-animate.js';

const nullFormCtrl = {
    $nonscope: true,
    $addControl: () => {
        /* empty */
    },
    $getControls: () => [],
    _renameControl: (control, name) => {
        control.$name = name;
    },
    $removeControl: () => {
        /* empty */
    },
    $setValidity: () => {
        /* empty */
    },
    $setNativeValidity: () => {
        /* empty */
    },
    $setDirty: () => {
        /* empty */
    },
    $setPristine: () => {
        /* empty */
    },
    $setSubmitted: () => {
        /* empty */
    },
    _setSubmitted: () => {
        /* empty */
    },
};
const PENDING_CLASS = "ng-pending";
const SUBMITTED_CLASS = "ng-submitted";
let nextValidityPropagationId = 0;
function toCustomValidationState(state) {
    if (isUndefined(state))
        return "pending";
    if (state === true)
        return "valid";
    if (state === false)
        return "invalid";
    return "skipped";
}
function toPublicValidationState(state) {
    if (state === "pending")
        return undefined;
    if (state === "valid")
        return true;
    if (state === "invalid")
        return false;
    return null;
}
/**
 * @property $dirty True if user has already interacted with the form.
 * @property $valid True if all containing groups and controls are valid.
 * @property $invalid True if at least one containing control or group is invalid.
 * @property $submitted True if user has submitted the form even if its invalid.
 *
 * @property $pending An object hash, containing references to controls or groups with
 *  pending validators, where:
 *
 *  - keys are validations tokens (error names).
 *  - values are arrays of controls or forms that have a pending validator for the given error name.
 *
 * @property $error An object hash, containing references to controls or groups with failing
 *  validators, where:
 *
 *  - keys are AngularTS/custom validation tokens (error names),
 *  - values are arrays of controls or forms that have a failing validator for the given error name.
 *
 * `FormController` keeps track of all its controls and logical groups as well as the state of them,
 * such as custom validity or dirty/pristine state.
 *
 * Each {@link ng.directive:form form} directive creates an instance
 * of `FormController`.
 *
 */
// asks for $scope to fool the BC controller module
class FormController {
    /**
     * Creates a form controller for a specific form element and its scope.
     */
    constructor($element, $attrs, $scope, $injector, $interpolate, $attributes) {
        this._isAnimated = hasAnimate($element);
        this._controls = [];
        const interpolatedName = $interpolate($attributes.read($element, "name") ??
            $attributes.read($element, "ngForm") ??
            "")?.($scope);
        this.$name = isString(interpolatedName) ? interpolatedName : "";
        /** True if user has already interacted with the form. */
        this.$dirty = false;
        /** True if user has not interacted with the form yet. */
        this.$pristine = true;
        this.$valid = true;
        this.$invalid = false;
        this.$submitted = false;
        this._parentForm = nullFormCtrl;
        this._element = $element;
        this._getAnimate = createLazyAnimate($injector);
        this.$error = {};
        this._customErrorControls = new Map();
        this._pendingCustomValidatorControls = new Map();
        this._validCustomValidatorControls = new Map();
        this.$pending = undefined;
        this._classCache = {};
        const isValid = this._element.classList.contains(VALID_CLASS);
        this._classCache[VALID_CLASS] = isValid;
        this._classCache[INVALID_CLASS] = !isValid;
        this._validityPropagationId = nextValidityPropagationId++;
        this.$target = { _parentForm: nullFormCtrl };
    }
    /**
     * Rollback all form controls pending updates to the `$modelValue`.
     *
     * Updates may be pending by a debounced event or because the input is waiting for a some future
     * event defined in `ng-model-options`. This method is typically needed by the reset button of
     * a form that uses `ng-model-options` to pend updates.
     */
    $rollbackViewValue() {
        this._controls.forEach((control) => {
            control.$rollbackViewValue();
        });
    }
    /**
     * Commit all form controls pending updates to the `$modelValue`.
     *
     * Updates may be pending by a debounced event or because the input is waiting for a some future
     * event defined in `ng-model-options`. This method is rarely needed as `NgModelController`
     * usually handles calling this in response to input events.
     */
    $commitViewValue() {
        this._controls.forEach((control) => {
            control.$commitViewValue();
        });
    }
    /** @internal */
    _syncNativeViewValue(trigger = "reset") {
        this._controls.forEach((control) => {
            if (isFunction(control._syncNativeViewValue)) {
                callFunction(control._syncNativeViewValue, control, trigger);
            }
        });
    }
    /**
     * Register a control with the form. Input elements using ngModelController do this automatically
     * when they are linked.
     *
     * Note that the current state of the control will not be reflected on the new parent form. This
     * is not an issue with normal use, as freshly compiled and linked controls are in a `$pristine`
     * state.
     *
     * However, if the method is used programmatically, for example by adding dynamically created controls,
     * or controls that have been previously removed without destroying their corresponding DOM element,
     * it's the developers responsibility to make sure the current state propagates to the parent form.
     *
     * For example, if an input control is added that is already `$dirty` and has `$error` properties,
     * calling `$setDirty()` and `$validate()` afterwards will propagate the state to the parent form.
     */
    $addControl(control) {
        // Breaking change - before, inputs whose name was "hasOwnProperty" were quietly ignored
        // and not added to the scope.  Now we throw an error.
        assertNotHasOwnProperty(String(control.$name), "input");
        this._validityPropagationId = nextValidityPropagationId++;
        this._controls.push(control);
        if (control.$name) {
            this[String(control.$name)] = control;
        }
        control.$target._parentForm = this;
    }
    /**
     * This method returns a **shallow copy** of the controls that are currently part of this form.
     * The controls can be instances of {@link form.FormController `FormController`}
     * ({@link ngForm "child-forms"}) and of {@link ngModel.NgModelController `NgModelController`}.
     * If you need access to the controls of child-forms, you have to call `$getControls()`
     * recursively on them.
     * This can be used for example to iterate over all controls to validate them.
     *
     * The controls can be accessed normally, but adding to, or removing controls from the array has
     * no effect on the form. Instead, use {@link form.FormController#$addControl `$addControl()`} and
     * {@link form.FormController#$removeControl `$removeControl()`} for this use-case.
     * Likewise, adding a control to, or removing a control from the form is not reflected
     * in the shallow copy. That means you should get a fresh copy from `$getControls()` every time
     * you need access to the controls.
     */
    $getControls() {
        return shallowCopy(this._controls);
    }
    /** @internal Returns the registered public control reference for a raw/proxied controller. */
    _resolveRegisteredControl(controller) {
        const rawController = deProxy(controller);
        for (let i = 0, l = this._controls.length; i < l; i++) {
            const control = this._controls[i];
            if (control === controller || deProxy(control) === rawController) {
                return control;
            }
        }
        return controller;
    }
    // Private API: rename a form control
    /**
     * Renames a registered control on the form controller.
     */
    /** @internal */
    _renameControl(control, newName) {
        const oldName = control.$name;
        this._validityPropagationId = nextValidityPropagationId++;
        const formRecord = this;
        const oldKey = String(oldName);
        if (formRecord[oldKey] === control) {
            deleteProperty(formRecord, oldKey);
        }
        formRecord[String(newName)] = control;
        control.$name = newName;
    }
    /**
     * Deregister a control from the form.
     *
     * Input elements using ngModelController do this automatically when they are destroyed.
     *
     * Note that only the removed control's validation state (`$errors`etc.) will be removed from the
     * form. `$dirty`, `$submitted` states will not be changed, because the expected behavior can be
     * different from case to case. For example, removing the only `$dirty` control from a form may or
     * may not mean that the form is still `$dirty`.
     */
    $removeControl(control) {
        this._validityPropagationId = nextValidityPropagationId++;
        if (control.$name &&
            this[String(control.$name)] === control) {
            deleteProperty(this, String(control.$name));
        }
        new Set([
            ...this._pendingCustomValidatorControls.keys(),
            ...this._customErrorControls.keys(),
            ...this._validCustomValidatorControls.keys(),
        ]).forEach((name) => {
            this.$setValidity(name, null, control);
        });
        arrayRemove(this._controls, control);
        this.$setNativeValidity(true, control);
        control.$target._parentForm = nullFormCtrl;
    }
    /**
     * Sets the form to a dirty state.
     *
     * This method can be called to add the 'ng-dirty' class and set the form to a dirty
     * state (ng-dirty class). This method will also propagate to parent forms.
     */
    $setDirty() {
        if (this._isAnimated) {
            const animate = this._getAnimate();
            animate.removeClass(this._element, PRISTINE_CLASS);
            animate.addClass(this._element, DIRTY_CLASS);
        }
        else {
            // Fallback for non-animated environments
            this._element.classList.remove(PRISTINE_CLASS);
            this._element.classList.add(DIRTY_CLASS);
        }
        this.$dirty = true;
        this.$pristine = false;
        this._parentForm.$setDirty();
    }
    /**
     * Sets the form to its pristine state.
     *
     * This method sets the form's `$pristine` state to true, the `$dirty` state to false, removes
     * the `ng-dirty` class and adds the `ng-pristine` class. Additionally, it sets the `$submitted`
     * state to false.
     *
     * This method will also propagate to all the controls contained in this form.
     *
     * Setting a form back to a pristine state is often useful when we want to 'reuse' a form after
     * saving or resetting it.
     */
    $setPristine() {
        if (this._isAnimated) {
            this._getAnimate().setClass(this._element, PRISTINE_CLASS, `${DIRTY_CLASS} ${SUBMITTED_CLASS}`);
        }
        else {
            // Fallback for non-animated environments
            this._element.classList.remove(DIRTY_CLASS, SUBMITTED_CLASS);
            this._element.classList.add(PRISTINE_CLASS);
        }
        this.$dirty = false;
        this.$pristine = true;
        this.$submitted = false;
        this._controls.forEach((control) => {
            control.$setPristine();
        });
    }
    /**
     * Sets the form to its untouched state.
     *
     * This method can be called to remove the 'ng-touched' class and set the form controls to their
     * untouched state (ng-untouched class).
     *
     * Setting a form controls back to their untouched state is often useful when setting the form
     * back to its pristine state.
     */
    $setUntouched() {
        this._controls.forEach((control) => {
            control.$setUntouched();
        });
    }
    /**
     * Sets the form to its `$submitted` state. This will also set `$submitted` on all child and
     * parent forms of the form.
     */
    $setSubmitted() {
        if (this._parentForm === nullFormCtrl) {
            this._setSubmitted();
            return;
        }
        let rootForm = this._parentForm;
        while (rootForm._parentForm !== nullFormCtrl) {
            rootForm = rootForm._parentForm;
        }
        rootForm._setSubmitted();
    }
    /** @internal */
    _setSubmitted() {
        if (this._isAnimated) {
            this._getAnimate().addClass(this._element, SUBMITTED_CLASS);
        }
        else {
            this._element.classList.add(SUBMITTED_CLASS);
        }
        this.$submitted = true;
        this._controls.forEach((control) => {
            const maybeSetSubmitted = control
                ._setSubmitted;
            if (isFunction(maybeSetSubmitted)) {
                callFunction(maybeSetSubmitted, control);
            }
        });
    }
    /**
     * Adds a controller reference to a named custom-validity bucket.
     */
    /** @internal */
    _setCustomValidityBucket(bucket, property, controller) {
        controller = this._resolveRegisteredControl(controller);
        let controls = bucket.get(property);
        if (!controls) {
            controls = new Set();
            bucket.set(property, controls);
        }
        if (!FormController._hasEquivalentControl(controls, controller)) {
            controls.add(controller);
        }
    }
    /**
     * Removes a controller reference from a named custom-validity bucket.
     */
    /** @internal */
    _unsetCustomValidityBucket(bucket, property, controller) {
        const controls = bucket.get(property);
        if (!controls)
            return;
        const resolvedController = this._resolveRegisteredControl(controller);
        controls.forEach((item) => {
            if (FormController._isSameControl(item, controller) ||
                FormController._isSameControl(item, resolvedController)) {
                controls.delete(item);
            }
        });
        if (controls.size === 0) {
            bucket.delete(property);
        }
    }
    /** @internal */
    static _hasEquivalentControl(controls, controller) {
        for (const item of controls) {
            if (FormController._isSameControl(item, controller)) {
                return true;
            }
        }
        return false;
    }
    /** @internal */
    static _isSameControl(left, right) {
        return left === right || deProxy(left) === deProxy(right);
    }
    /** @internal */
    static _publicCustomValidityObject(bucket) {
        const object = {};
        bucket.forEach((controls, property) => {
            object[property] = Array.from(controls);
        });
        return object;
    }
    /** @internal */
    _syncPublicCustomValidityObjects() {
        this.$error = FormController._publicCustomValidityObject(this._customErrorControls);
        this.$pending = this._pendingCustomValidatorControls.size
            ? FormController._publicCustomValidityObject(this._pendingCustomValidatorControls)
            : undefined;
    }
    /**
     * Change the validity state of the form, and notify the parent form (if any).
     *
     * Application developers will rarely need to call this method directly. It is used internally, by
     * {@link ngModel.NgModelController#$setValidity NgModelController.$setValidity()}, to propagate a
     * control's validity state to the parent `FormController`.
     *
     * @param validationErrorKey - Name of the validator. The `validationErrorKey` will be
     *        assigned to either `$error[validationErrorKey]` or `$pending[validationErrorKey]` (for
     *        unfulfilled `$asyncValidators`), so that it is available for data-binding. The
     *        `validationErrorKey` should be in camelCase and will get converted into dash-case for
     *        class name. Example: `myError` will result in `ng-valid-my-error` and
     *        `ng-invalid-my-error` classes and can be bound to as `{{ someForm.$error.myError }}`.
     * @param state - Whether the current state is valid (true), invalid (false), pending
     *        (undefined),  or skipped (null). Pending is used for unfulfilled `$asyncValidators`.
     *        Skipped is used by AngularTS when validators do not run because of parse errors and when
     *        `$asyncValidators` do not run because any of the `$validators` failed.
     * @param controller - The controller whose validity state is
     *        triggering the change.
     */
    $setValidity(validationErrorKey, state, controller = this) {
        const customState = toCustomValidationState(state);
        if (customState === "pending") {
            this._setCustomValidityBucket(this._pendingCustomValidatorControls, validationErrorKey, controller);
        }
        else {
            this._unsetCustomValidityBucket(this._pendingCustomValidatorControls, validationErrorKey, controller);
        }
        if (customState === "pending" || customState === "skipped") {
            this._unsetCustomValidityBucket(this._customErrorControls, validationErrorKey, controller);
            this._unsetCustomValidityBucket(this._validCustomValidatorControls, validationErrorKey, controller);
        }
        else if (customState === "valid") {
            this._unsetCustomValidityBucket(this._customErrorControls, validationErrorKey, controller);
            this._setCustomValidityBucket(this._validCustomValidatorControls, validationErrorKey, controller);
        }
        else {
            this._setCustomValidityBucket(this._customErrorControls, validationErrorKey, controller);
            this._unsetCustomValidityBucket(this._validCustomValidatorControls, validationErrorKey, controller);
        }
        this._syncPublicCustomValidityObjects();
        if (this.$pending) {
            cachedToggleClass(this, PENDING_CLASS, true);
            this.$valid = this.$invalid = undefined;
            toggleValidationCss(this, "", null);
        }
        else {
            cachedToggleClass(this, PENDING_CLASS, false);
            this.$valid = isObjectEmpty(this.$error) && this._hasNativeValidity();
            this.$invalid = !this.$valid;
            toggleValidationCss(this, "", this.$valid);
        }
        // Re-read after syncing map-backed custom-validity buckets.
        let combinedState;
        if (this.$pending?.[validationErrorKey]) {
            combinedState = "pending";
        }
        else if (this.$error[validationErrorKey]) {
            combinedState = "invalid";
        }
        else if (this._validCustomValidatorControls.has(validationErrorKey)) {
            combinedState = "valid";
        }
        else {
            combinedState = "skipped";
        }
        const publicCombinedState = toPublicValidationState(combinedState);
        toggleValidationCss(this, validationErrorKey, publicCombinedState);
        this._parentForm.$setValidity(validationErrorKey, publicCombinedState, this);
        /**
         * Updates the CSS validity classes for the controller and validation key.
         */
        function toggleValidationCss(ctrl, validationErrorKeyParam, isValid) {
            validationErrorKeyParam = validationErrorKeyParam
                ? `-${snakeCase(validationErrorKeyParam, "-")}`
                : "";
            cachedToggleClass(ctrl, VALID_CLASS + validationErrorKeyParam, isValid === true);
            cachedToggleClass(ctrl, INVALID_CLASS + validationErrorKeyParam, isValid === false);
        }
    }
    /** @internal */
    _hasNativeValidity() {
        return this._controls.every((control) => {
            return deProxy(control)._hasNativeValidity();
        });
    }
    $setNativeValidity(state, controller) {
        this._validityPropagationId = nextValidityPropagationId++;
        const isNativeValid = this._hasNativeValidity();
        if (!this.$pending) {
            this.$valid = isObjectEmpty(this.$error) && isNativeValid;
            this.$invalid = !this.$valid;
            cachedToggleClass(this, VALID_CLASS, this.$valid);
            cachedToggleClass(this, INVALID_CLASS, this.$invalid);
        }
        this._parentForm.$setNativeValidity(isNativeValid, this);
    }
}
FormController.$nonscope = true;
/* @ignore */ FormController.$inject = [
    _element,
    _attrs,
    _scope,
    _injector,
    _interpolate,
    _attributes,
];
/**
 * Helper directive that makes it possible to create control groups inside a
 * {@link ng.directive:form `form`} directive.
 * These logical groups can be used, for example, to determine the validity of a sub-group of
 * controls.
 *
 * <div class="alert alert-danger">
 * **Note**: `ngForm` cannot be used as a replacement for `<form>`, because it lacks its
 * [built-in HTML functionality](https://html.spec.whatwg.org/#the-form-element).
 * Specifically, you cannot submit `ngForm` like a `<form>` tag. That means,
 * you cannot send data to the server with `ngForm`, or integrate it with
 * {@link ng.directive:ngSubmit `ngSubmit`}.
 * </div>
 *
 * @param ngForm|name - Name of the form. If specified, the form controller will
 *     be published into the related scope, under this name.
 *
 */
/**
 * Directive that instantiates
 * {@link form.FormController FormController}.
 *
 * If the `name` attribute is specified, the form controller is published onto the current scope under
 * this name.
 *
 * ## Alias: {@link ng.directive:ngForm `ngForm`}
 *
 * In AngularTS, logical form groups can be nested. This means that the outer
 * form is valid when all child groups and controls are valid as well. Browsers
 * do not allow nested native `<form>` elements, so AngularTS provides
 * {@link ng.directive:ngForm `ngForm`} for grouping validation state without
 * native form submission, reset, or `FormData` behavior.
 *
 * ## CSS classes
 *  - `ng-valid` is set if the form is valid.
 *  - `ng-invalid` is set if the form is invalid.
 *  - `ng-pending` is set if the form is pending.
 *  - `ng-pristine` is set if the form is pristine.
 *  - `ng-dirty` is set if the form is dirty.
 *  - `ng-submitted` is set if the form was submitted.
 *
 * Keep in mind that ngAnimate can detect each of these classes when added and removed.
 *
 *
 * ## Submitting a form
 *
 * Native `<form>` elements keep native browser submission behavior. On submit,
 * AngularTS commits pending `ngModelOptions` view values, marks the form
 * submitted, and lets `ngSubmit` run as a normal `submit` event listener.
 * AngularTS prevents the default action only when the form has no `action`
 * attribute. With an `action`, the native submit is left uncancelled.
 *
 * Native reset behavior also remains browser-owned. After reset, AngularTS
 * reads the resulting native control values back into registered model
 * controllers.
 *
 * @animations
 * Animations in ngForm are triggered when any of the associated CSS classes are added and removed.
 * These classes are: `.ng-pristine`, `.ng-dirty`, `.ng-invalid` and `.ng-valid` as well as any
 * other validations that are performed within the form. Animations in ngForm are similar to how
 * they work in ngClass and animations can be hooked into using CSS transitions, keyframes as well
 * as JS animations.
 *
 * @param isNgForm - Name of the form. If specified, the form controller will be published into
 *     related scope, under this name.
 */
const formDirectiveFactory = function (isNgForm) {
    return [
        _parse,
        _attributes,
        /**
         * Builds the form/ngForm directive definition.
         */
        function ($parse, $attributes) {
            return {
                name: "form",
                restrict: isNgForm ? "EA" : "E",
                require: ["form", "^^?form"], // first is the form's own ctrl, second is an optional parent form
                controller: FormController,
                compile: function ngFormCompile(formElement) {
                    // Setup initial state of the control
                    formElement.classList.add(PRISTINE_CLASS, VALID_CLASS);
                    const nameAttr = $attributes.has(formElement, "name")
                        ? "name"
                        : isNgForm && $attributes.has(formElement, "ngForm")
                            ? "ngForm"
                            : false;
                    return {
                        pre: function ngFormPreLink(scope, formElementParam, attrParam, ctrls) {
                            const [controller] = ctrls;
                            if (formElementParam instanceof HTMLFormElement) {
                                const shouldPreventSubmit = !("action" in attrParam);
                                const handleFormSubmission = function (event) {
                                    controller.$commitViewValue();
                                    controller.$setSubmitted();
                                    if (shouldPreventSubmit) {
                                        event.preventDefault();
                                    }
                                };
                                let syncingNativeReset = false;
                                const resetElementToDefault = (element) => {
                                    if (element instanceof HTMLInputElement) {
                                        if (element.type === "checkbox" ||
                                            element.type === "radio") {
                                            element.checked = element.defaultChecked;
                                        }
                                        else {
                                            element.value = element.defaultValue;
                                        }
                                        return;
                                    }
                                    if (element instanceof HTMLTextAreaElement) {
                                        element.value = element.defaultValue;
                                        return;
                                    }
                                    if (element instanceof HTMLSelectElement) {
                                        Array.from(element.options).forEach((option) => {
                                            option.selected = option.defaultSelected;
                                        });
                                    }
                                };
                                const resetRegisteredControlsToDefaults = (formController) => {
                                    formController.$getControls().forEach((control) => {
                                        const actualControl = deProxy(control);
                                        if (actualControl instanceof FormController) {
                                            resetRegisteredControlsToDefaults(actualControl);
                                        }
                                        resetElementToDefault(actualControl._element);
                                    });
                                };
                                const syncNativeResetState = () => {
                                    if (!syncingNativeReset) {
                                        syncingNativeReset = true;
                                        formElementParam.reset();
                                        resetRegisteredControlsToDefaults(controller);
                                        syncingNativeReset = false;
                                    }
                                    controller._syncNativeViewValue("reset");
                                    controller.$setNativeValidity();
                                };
                                const scheduleNativeResetSync = () => {
                                    setTimeout(() => {
                                        syncNativeResetState();
                                    });
                                };
                                let resetEventSeen = false;
                                const handleFormReset = function (event) {
                                    if (event.defaultPrevented || syncingNativeReset)
                                        return;
                                    resetEventSeen = true;
                                    scheduleNativeResetSync();
                                };
                                const handleResetClick = function (event) {
                                    const { target } = event;
                                    if (event.defaultPrevented ||
                                        !(target instanceof HTMLButtonElement ||
                                            target instanceof HTMLInputElement) ||
                                        target.type !== "reset") {
                                        return;
                                    }
                                    resetEventSeen = false;
                                    setTimeout(() => {
                                        if (resetEventSeen)
                                            return;
                                        syncNativeResetState();
                                    });
                                };
                                const resetControls = Array.from(formElementParam.querySelectorAll("button,input")).filter((element) => {
                                    return ((element instanceof HTMLButtonElement ||
                                        element instanceof HTMLInputElement) &&
                                        element.type === "reset");
                                });
                                formElementParam.addEventListener("submit", handleFormSubmission);
                                formElementParam.addEventListener("reset", handleFormReset);
                                formElementParam.addEventListener("click", handleResetClick);
                                resetControls.forEach((control) => {
                                    control.addEventListener("click", handleResetClick);
                                });
                                formElementParam.addEventListener("$destroy", () => {
                                    formElementParam.removeEventListener("submit", handleFormSubmission);
                                    formElementParam.removeEventListener("reset", handleFormReset);
                                    formElementParam.removeEventListener("click", handleResetClick);
                                    resetControls.forEach((control) => {
                                        control.removeEventListener("click", handleResetClick);
                                    });
                                });
                            }
                            const parentFormCtrl = ctrls[1] ?? controller._parentForm;
                            parentFormCtrl.$addControl(controller);
                            const parsedSetter = nameAttr
                                ? getSetter(String(controller.$name))
                                : undefined;
                            const setter = parsedSetter
                                ? (scopeParam, value) => {
                                    parsedSetter(scopeParam, value);
                                }
                                : () => {
                                    /* empty */
                                };
                            if (nameAttr) {
                                setter(scope, controller);
                                $attributes.observe(scope, formElementParam, nameAttr, (newValue) => {
                                    const nextName = newValue ?? "";
                                    if (controller.$name === nextName)
                                        return;
                                    scope.$target[String(controller.$name)] = undefined;
                                    controller._parentForm._renameControl(controller, nextName);
                                    if (scope.$target !== controller._parentForm &&
                                        controller._parentForm !== nullFormCtrl) ;
                                    else {
                                        scope.$target[nextName] =
                                            controller;
                                    }
                                });
                            }
                            formElementParam.addEventListener("$destroy", () => {
                                const parentForm = controller.$target._parentForm;
                                parentForm.$removeControl(controller);
                                setter(scope, undefined);
                                extend(controller, nullFormCtrl); // stop propagating child destruction handlers upwards
                            });
                        },
                    };
                },
            };
            /**
             * Resolves an assign function for the given form expression.
             */
            function getSetter(expression) {
                if (expression === "") {
                    // create an assignable expression, so forms with an empty name can be renamed later
                    return $parse('this[""]')._assign;
                }
                return $parse(expression)._assign;
            }
        },
    ];
};
const formDirective = formDirectiveFactory();
const ngFormDirective = formDirectiveFactory("ngForm");
/**
 * Adds or removes a cached validation class on a controller element.
 */
function cachedToggleClass(ctrl, className, switchValue) {
    if (switchValue && !ctrl._classCache[className]) {
        if (ctrl._isAnimated) {
            ctrl._getAnimate().addClass(ctrl._element, className);
        }
        else {
            ctrl._element.classList.add(className);
        }
        ctrl._classCache[className] = true;
    }
    else if (!switchValue && ctrl._classCache[className]) {
        if (ctrl._isAnimated) {
            ctrl._getAnimate().removeClass(ctrl._element, className);
        }
        else {
            ctrl._element.classList.remove(className);
        }
        ctrl._classCache[className] = false;
    }
}

export { FormController, PENDING_CLASS, cachedToggleClass, formDirective, ngFormDirective, nullFormCtrl };
