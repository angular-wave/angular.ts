import { _parse, _element, _attrs, _scope, _injector, _interpolate } from '../../injection-tokens.js';
import { hasAnimate, callFunction, assertNotHasOwnProperty, shallowCopy, deProxy, deleteProperty, keys, arrayRemove, isFunction, isArray, isUndefined, isBoolean, isObjectEmpty, snakeCase, extend } from '../../shared/utils.js';
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
/**
 * @property $dirty True if user has already interacted with the form.
 * @property $valid True if all of the containing forms and controls are valid.
 * @property $invalid True if at least one containing control or form is invalid.
 * @property $submitted True if user has submitted the form even if its invalid.
 *
 * @property $pending An object hash, containing references to controls or forms with
 *  pending validators, where:
 *
 *  - keys are validations tokens (error names).
 *  - values are arrays of controls or forms that have a pending validator for the given error name.
 *
 * See {@link form.FormController#$error $error} for a list of built-in validation tokens.
 *
 * @property $error An object hash, containing references to controls or forms with failing
 *  validators, where:
 *
 *  - keys are validation tokens (error names),
 *  - values are arrays of controls or forms that have a failing validator for the given error name.
 *
 *  Built-in validation tokens:
 *  - `email`
 *  - `max`
 *  - `maxlength`
 *  - `min`
 *  - `minlength`
 *  - `number`
 *  - `pattern`
 *  - `required`
 *  - `url`
 *  - `date`
 *  - `datetimelocal`
 *  - `time`
 *  - `week`
 *  - `month`
 *
 *
 * `FormController` keeps track of all its controls and nested forms as well as the state of them,
 * such as being valid/invalid or dirty/pristine.
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
    constructor($element, $attrs, $scope, $injector, $interpolate) {
        this._isAnimated = hasAnimate($element);
        this._controls = [];
        this.$name =
            $interpolate($attrs.name || $attrs.ngForm || "")?.($scope) || "";
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
        this._success = {};
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
            callFunction(control
                .$rollbackViewValue, control);
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
            callFunction(control
                .$commitViewValue, control);
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
        assertNotHasOwnProperty(control.$name, "input");
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
        if (this.$pending) {
            keys(this.$pending).forEach((name) => {
                this.$setValidity(name, null, control);
            });
        }
        if (this.$error) {
            keys(this.$error).forEach((name) => {
                this.$setValidity(name, null, control);
            });
        }
        if (this._success) {
            keys(this._success).forEach((name) => {
                this.$setValidity(name, null, control);
            });
        }
        arrayRemove(this._controls, control);
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
            callFunction(control
                .$setPristine, control);
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
            callFunction(control
                .$setUntouched, control);
        });
    }
    /**
     * Sets the form to its `$submitted` state. This will also set `$submitted` on all child and
     * parent forms of the form.
     */
    $setSubmitted() {
        if (!this._parentForm || this._parentForm === nullFormCtrl) {
            this._setSubmitted();
            return;
        }
        let rootForm = this._parentForm;
        while (rootForm._parentForm && rootForm._parentForm !== nullFormCtrl) {
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
     * Adds a controller reference to a named validity bucket.
     */
    /** @internal */
    _set(object, property, controller) {
        object = deProxy(object);
        controller = this._resolveRegisteredControl(controller);
        const list = object[property];
        if (!list || !isArray(list)) {
            object[property] = [controller];
        }
        else {
            const rawList = deProxy(list);
            const index = rawList.findIndex((item) => item === controller || deProxy(item) === deProxy(controller));
            if (index === -1) {
                list.push(controller);
            }
        }
    }
    /**
     * Removes a controller reference from a named validity bucket.
     */
    /** @internal */
    _unset(object, property, controller) {
        object = deProxy(object);
        const list = object[property];
        if (!list) {
            return;
        }
        if (!isArray(list)) {
            if (list === controller || deProxy(list) === deProxy(controller)) {
                deleteProperty(object, property);
            }
            return;
        }
        const rawList = deProxy(list);
        const index = rawList.findIndex((item) => item === controller || deProxy(item) === deProxy(controller));
        if (index !== -1) {
            rawList.splice(index, 1);
        }
        if (rawList.length === 0) {
            deleteProperty(object, property);
        }
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
    $setValidity(validationErrorKey, state, controller) {
        /**
         * Creates a controller bucket if needed and records a controller under the given key.
         */
        const createAndSet = (ctrl, name, value, controllerParam) => {
            if (!ctrl[name]) {
                ctrl[name] = {};
            }
            this._set(ctrl[name], value, controllerParam);
        };
        /**
         * Removes a controller from a bucket and cleans up empty containers.
         */
        const unsetAndCleanup = (ctrl, name, value, controllerParam) => {
            if (ctrl[name]) {
                this._unset(ctrl[name], value, controllerParam);
            }
            if (isObjectEmpty(ctrl[name])) {
                ctrl[name] = undefined;
            }
        };
        if (isUndefined(state)) {
            createAndSet(this, "$pending", validationErrorKey, controller);
        }
        else {
            unsetAndCleanup(this, "$pending", validationErrorKey, controller);
        }
        if (!isBoolean(state)) {
            this._unset(this.$error, validationErrorKey, controller);
            this._unset(this._success, validationErrorKey, controller);
        }
        else if (state) {
            this._unset(this.$error, validationErrorKey, controller);
            this._set(this._success, validationErrorKey, controller);
        }
        else {
            this._set(this.$error, validationErrorKey, controller);
            this._unset(this._success, validationErrorKey, controller);
        }
        if (this.$pending) {
            cachedToggleClass(this, PENDING_CLASS, true);
            this.$valid = this.$invalid = undefined;
            toggleValidationCss(this, "", null);
        }
        else {
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
        if (this.$pending?.[validationErrorKey]) {
            combinedState = undefined;
        }
        else if (this.$error[validationErrorKey]) {
            combinedState = false;
        }
        else if (this._success[validationErrorKey]) {
            combinedState = true;
        }
        else {
            combinedState = null;
        }
        toggleValidationCss(this, validationErrorKey, combinedState);
        this._parentForm.$setValidity(validationErrorKey, combinedState, this);
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
}
FormController.$nonscope = true;
/* @ignore */ FormController.$inject = [
    _element,
    _attrs,
    _scope,
    _injector,
    _interpolate,
];
/**
 * Helper directive that makes it possible to create control groups inside a
 * {@link ng.directive:form `form`} directive.
 * These "child forms" can be used, for example, to determine the validity of a sub-group of
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
 * In AngularTS, forms can be nested. This means that the outer form is valid when all of the child
 * forms are valid as well. However, browsers do not allow nesting of `<form>` elements, so
 * AngularTS provides the {@link ng.directive:ngForm `ngForm`} directive, which behaves identically to
 * `form` but can be nested. Nested forms can be useful, for example, if the validity of a sub-group
 * of controls needs to be determined.
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
 * ## Submitting a form and preventing the default action
 *
 * Since the role of forms in client-side AngularTS applications is different than in classical
 * roundtrip apps, it is desirable for the browser not to translate the form submission into a full
 * page reload that sends the data to the server. Instead some javascript logic should be triggered
 * to handle the form submission in an application-specific way.
 *
 * For this reason, AngularTS prevents the default action (form submission to the server) unless the
 * `<form>` element has an `action` attribute specified.
 *
 * You can use one of the following two ways to specify what javascript method should be called when
 * a form is submitted:
 *
 * - {@link ng.directive:ngSubmit ngSubmit} directive on the form element
 * - {@link ng.directive:ngClick ngClick} directive on the first
 *  button or input field of type submit (input[type=submit])
 *
 * To prevent double execution of the handler, use only one of the {@link ng.directive:ngSubmit ngSubmit}
 * or {@link ng.directive:ngClick ngClick} directives.
 * This is because of the following form submission rules in the HTML specification:
 *
 * - If a form has only one input field then hitting enter in this field triggers form submit
 * (`ngSubmit`)
 * - if a form has 2+ input fields and no buttons or input[type=submit] then hitting enter
 * doesn't trigger submit
 * - if a form has one or more input fields and one or more buttons or input[type=submit] then
 * hitting enter in any of the input fields will trigger the click handler on the *first* button or
 * input[type=submit] (`ngClick`) *and* a submit handler on the enclosing form (`ngSubmit`)
 *
 * Any pending `ngModelOptions` changes will take place immediately when an enclosing form is
 * submitted. Note that `ngClick` events will occur before the model is updated. Use `ngSubmit`
 * to have access to the updated model.
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
        /**
         * Builds the form/ngForm directive definition.
         */
        function ($parse) {
            return {
                name: "form",
                restrict: isNgForm ? "EA" : "E",
                require: ["form", "^^?form"], // first is the form's own ctrl, second is an optional parent form
                controller: FormController,
                compile: function ngFormCompile(formElement, attr) {
                    // Setup initial state of the control
                    formElement.classList.add(PRISTINE_CLASS, VALID_CLASS);
                    const nameAttr = !isUndefined(attr.name)
                        ? "name"
                        : isNgForm && !isUndefined(attr.ngForm)
                            ? "ngForm"
                            : false;
                    return {
                        pre: function ngFormPreLink(scope, formElementParam, attrParam, ctrls) {
                            const controller = ctrls[0];
                            // if `action` attr is not present on the form, prevent the default action (submission)
                            if (!("action" in attrParam)) {
                                const handleFormSubmission = function (event) {
                                    controller.$commitViewValue();
                                    controller.$setSubmitted();
                                    event.preventDefault();
                                };
                                formElementParam.addEventListener("submit", handleFormSubmission);
                                formElementParam.addEventListener("$destroy", () => {
                                    formElementParam.removeEventListener("submit", handleFormSubmission);
                                });
                            }
                            const parentFormCtrl = ctrls[1] || controller._parentForm;
                            parentFormCtrl.$addControl(controller);
                            const setter = nameAttr
                                ? getSetter(controller.$name) ||
                                    (() => {
                                        /* empty */
                                    })
                                : () => {
                                    /* empty */
                                };
                            if (nameAttr) {
                                setter(scope, controller);
                                attrParam.$observe(nameAttr, (newValue) => {
                                    if (controller.$name === newValue)
                                        return;
                                    scope.$target[String(controller.$name)] = undefined;
                                    controller._parentForm._renameControl(controller, newValue);
                                    if (scope.$target !== controller._parentForm &&
                                        controller._parentForm !== nullFormCtrl) ;
                                    else {
                                        scope.$target[String(newValue)] = controller;
                                    }
                                });
                            }
                            formElementParam.addEventListener("$destroy", () => {
                                const parentForm = controller.$target._parentForm ||
                                    controller._parentForm ||
                                    nullFormCtrl;
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
