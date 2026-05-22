import { _element, _scope } from '../../injection-tokens.js';
import { NodeType } from '../../shared/node.js';
import { removeElement, getNormalizedAttr, setNormalizedAttr } from '../../shared/dom.js';
import { isUndefined, hashKey, deProxy, assertNotHasOwnProperty, isNullOrUndefined, stringify, isDefined, isArray, deleteProperty, directiveNormalize } from '../../shared/utils.js';

function readOptionElementAttr(optionElement, normalizedName, observedValue) {
    if (isDefined(observedValue)) {
        return observedValue;
    }
    return getNormalizedAttr(optionElement, normalizedName);
}
function hasInterpolatedOptionAttr(optionElement, normalizedName) {
    return Boolean(getNormalizedAttr(optionElement, normalizedName)?.includes("{{"));
}
function observeOptionElementAttr(optionScope, optionElement, normalizedName, readValue, callback, skipInitial = false) {
    let lastValue = {};
    let skipNext = skipInitial;
    const expectedName = directiveNormalize(normalizedName);
    const handleObservedValue = (observedValue) => {
        if (skipNext) {
            skipNext = false;
            return;
        }
        const newValue = readValue(observedValue);
        if (Object.is(newValue, lastValue))
            return;
        lastValue = newValue;
        callback(newValue);
    };
    const initialValue = getNormalizedAttr(optionElement, normalizedName);
    if (initialValue !== undefined) {
        handleObservedValue(initialValue);
    }
    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const { attributeName } = mutations[i];
            if (!attributeName ||
                directiveNormalize(attributeName) !== expectedName) {
                continue;
            }
            handleObservedValue(getNormalizedAttr(optionElement, normalizedName));
        }
    });
    observer.observe(optionElement, { attributes: true });
    let deregisterDestroy = optionScope.$on("$destroy", deregister);
    function deregister() {
        observer.disconnect();
        deregisterDestroy?.();
        deregisterDestroy = undefined;
    }
    return deregister;
}
function setOptionElementAttr(optionElement, normalizedName, value) {
    setNormalizedAttr(optionElement, normalizedName, value);
}
/**
 * The controller for the `select` directive.
 *
 * It exposes utility methods that can be used to augment the behavior of a
 * regular or `ngOptions`-backed select element.
 */
class SelectController {
    /** @ignore */
    constructor($element, $scope) {
        this._element = $element;
        this._scope = $scope;
        this._selectValueMap = {};
        this._ngModelCtrl = {};
        this._multiple = false;
        this._unknownOption = document.createElement("option");
        this._hasEmptyOption = false;
        this._emptyOption = undefined;
        this._optionsMap = new Map();
        this._renderScheduled = false;
        this._updateScheduled = false;
        this._renderRescheduleRequested = false;
        this._updateRescheduleRequested = false;
        this._deferredQueue = [];
        this._deferredDrainScheduled = false;
        this._deferredDraining = false;
        $scope.$on("$destroy", () => {
            this._renderUnknownOption = () => {
                /* empty */
            };
        });
    }
    /**
     * Returns `true` if the select element currently has an empty option
     * element, i.e. an option that signifies that the select is empty or the
     * selection is `null`.
     */
    $hasEmptyOption() {
        return this._hasEmptyOption;
    }
    /**
     * Returns `true` if the select element's unknown option is selected.
     *
     * The unknown option is added and automatically selected whenever the
     * select model does not match any option.
     */
    $isUnknownOptionSelected() {
        return this._element.options[0] === this._unknownOption;
    }
    /**
     * Returns `true` if the select element has an empty option and that option
     * is currently selected.
     */
    $isEmptyOptionSelected() {
        return (this._hasEmptyOption &&
            this._element.options[this._element.selectedIndex] === this._emptyOption);
    }
    /** @ignore */
    /** @internal */
    _renderUnknownOption(val) {
        const unknownVal = this._generateUnknownOptionValue(val);
        this._unknownOption.value = unknownVal;
        this._element.prepend(this._unknownOption);
        this._unknownOption.selected = true;
        this._unknownOption.setAttribute("selected", "selected");
        this._element.value = unknownVal;
    }
    /** @ignore */
    /** @internal */
    _updateUnknownOption(val) {
        const unknownVal = this._generateUnknownOptionValue(val);
        this._unknownOption.value = unknownVal;
        this._unknownOption.selected = true;
        this._unknownOption.setAttribute("selected", "selected");
        this._element.value = unknownVal;
    }
    /** @ignore */
    /** @internal */
    _generateUnknownOptionValue(val) {
        if (isUndefined(val)) {
            return `? undefined:undefined ?`;
        }
        return `? ${hashKey(val)} ?`;
    }
    /** @ignore */
    /** @internal */
    _removeUnknownOption() {
        if (this._unknownOption.parentElement)
            removeElement(this._unknownOption);
    }
    /** @ignore */
    /** @internal */
    _selectEmptyOption() {
        if (this._emptyOption) {
            this._element.value = "";
            this._emptyOption.selected = true;
            this._emptyOption.setAttribute("selected", "selected");
        }
    }
    /** @ignore */
    /** @internal */
    _unselectEmptyOption() {
        if (this._hasEmptyOption && this._emptyOption) {
            this._emptyOption.selected = false;
        }
    }
    /** @ignore */
    /** @internal */
    _readValue() {
        const val = this._element.value;
        const realVal = val in this._selectValueMap ? this._selectValueMap[val] : val;
        return this._hasOption(realVal) ? deProxy(realVal) : null;
    }
    /** @ignore */
    /** @internal */
    _writeValue(value) {
        const writeValue = deProxy(value);
        const currentlySelectedOption = this._element.options.item(this._element.selectedIndex);
        if (currentlySelectedOption)
            currentlySelectedOption.selected = false;
        if (this._hasOption(writeValue)) {
            this._removeUnknownOption();
            const hashedVal = hashKey(writeValue);
            this._element.value =
                hashedVal in this._selectValueMap ? hashedVal : String(writeValue);
            const selectedOption = this._element.options.item(this._element.selectedIndex);
            if (!selectedOption) {
                this._selectUnknownOrEmptyOption(writeValue);
            }
            else {
                selectedOption.selected = true;
            }
        }
        else {
            this._selectUnknownOrEmptyOption(writeValue);
        }
    }
    /** @ignore */
    /** @internal */
    _addOption(value, element) {
        const optionValue = deProxy(value);
        if (element.nodeType === NodeType._COMMENT_NODE)
            return;
        assertNotHasOwnProperty(String(optionValue), '"option value"');
        if (optionValue === "") {
            this._hasEmptyOption = true;
            this._emptyOption = element;
        }
        const count = this._optionsMap.get(optionValue) ?? 0;
        this._optionsMap.set(optionValue, count + 1);
        this._scheduleRender();
        const currentViewValue = this._ngModelCtrl.$viewValue;
        const currentModelValue = this._ngModelCtrl.$modelValue;
        if (currentViewValue === optionValue ||
            currentModelValue === optionValue ||
            ((isNullOrUndefined(currentViewValue) || currentViewValue === "") &&
                optionValue === "")) {
            this._scheduleDeferred(() => {
                this._ngModelCtrl.$render();
            });
        }
    }
    /** @ignore */
    /** @internal */
    _scheduleDeferred(fn, ownerScope = this._scope) {
        this._deferredQueue.push(() => {
            if (ownerScope._destroyed)
                return;
            fn();
        });
        if (this._deferredDrainScheduled || this._deferredDraining) {
            return;
        }
        this._deferredDrainScheduled = true;
        queueMicrotask(() => {
            queueMicrotask(() => {
                this._deferredDrainScheduled = false;
                this._drainDeferredQueue();
            });
        });
    }
    /** @ignore */
    /** @internal */
    _drainDeferredQueue() {
        if (this._deferredQueue.length === 0) {
            return;
        }
        this._deferredDraining = true;
        let index = 0;
        try {
            while (index < this._deferredQueue.length) {
                this._deferredQueue[index++]();
            }
        }
        finally {
            this._deferredQueue.length = 0;
            this._deferredDraining = false;
        }
    }
    /** @ignore */
    /** @internal */
    _removeOption(value) {
        const optionValue = deProxy(value);
        const count = this._optionsMap.get(optionValue);
        if (count) {
            if (count === 1) {
                this._optionsMap.delete(optionValue);
                if (optionValue === "") {
                    this._hasEmptyOption = false;
                    this._emptyOption = undefined;
                }
            }
            else {
                this._optionsMap.set(optionValue, count - 1);
            }
        }
    }
    /** @ignore */
    /** @internal */
    _hasOption(value) {
        const optionValue = deProxy(value);
        return !!this._optionsMap.get(optionValue);
    }
    /** @ignore */
    /** @internal */
    _selectUnknownOrEmptyOption(value) {
        if (isNullOrUndefined(value) && this._emptyOption) {
            this._removeUnknownOption();
            this._selectEmptyOption();
        }
        else if (this._unknownOption.parentElement) {
            this._updateUnknownOption(value);
        }
        else {
            this._renderUnknownOption(value);
        }
    }
    /** @ignore */
    /** @internal */
    _scheduleRender() {
        if (this._renderScheduled) {
            this._renderRescheduleRequested = true;
            return;
        }
        this._renderScheduled = true;
        this._scheduleDeferred(() => {
            this._renderScheduled = false;
            this._ngModelCtrl.$render();
            if (this._renderRescheduleRequested) {
                this._renderRescheduleRequested = false;
                this._scheduleRender();
            }
        });
    }
    /** @ignore */
    /** @internal */
    _scheduleViewValueUpdate(renderAfter = false) {
        if (this._updateScheduled) {
            this._updateRescheduleRequested = true;
            return;
        }
        this._updateScheduled = true;
        this._scheduleDeferred(() => {
            this._updateScheduled = false;
            this._ngModelCtrl.$setViewValue(this._readValue());
            if (renderAfter)
                this._ngModelCtrl.$render();
            if (this._updateRescheduleRequested) {
                this._updateRescheduleRequested = false;
                this._scheduleViewValueUpdate(renderAfter);
            }
        });
    }
    /** @ignore */
    /** @internal */
    _registerOption(optionScope, optionElement, interpolateValueFn, interpolateTextFn, ngValueExpression, initialValue, hasNgValue = false) {
        let oldVal;
        let hashedVal;
        let registeredValue = initialValue;
        if (hasNgValue) {
            let ngValueInitialized = false;
            const syncNgValue = (newVal) => {
                let removal;
                const previouslySelected = optionElement.selected;
                const rawNewVal = deProxy(newVal);
                if (ngValueInitialized && Object.is(rawNewVal, oldVal))
                    return;
                ngValueInitialized = true;
                if (isDefined(hashedVal)) {
                    this._removeOption(oldVal);
                    deleteProperty(this._selectValueMap, hashedVal);
                    removal = true;
                }
                hashedVal = hashKey(rawNewVal);
                oldVal = rawNewVal;
                registeredValue = rawNewVal;
                this._selectValueMap[hashedVal] = rawNewVal;
                this._addOption(rawNewVal, optionElement);
                optionElement.setAttribute("value", hashedVal);
                if (removal && previouslySelected) {
                    this._scheduleViewValueUpdate();
                }
            };
            syncNgValue(undefined);
            optionScope.$watch(stringify(ngValueExpression ?? ""), syncNgValue);
            observeOptionElementAttr(optionScope, optionElement, "value", (observedValue) => {
                if (observedValue !== optionElement.getAttribute("value")) {
                    return oldVal;
                }
                if (isDefined(hashedVal) && observedValue === hashedVal) {
                    return oldVal;
                }
                return observedValue;
            }, syncNgValue, true);
        }
        else if (interpolateValueFn) {
            observeOptionElementAttr(optionScope, optionElement, "value", (observedValue) => readOptionElementAttr(optionElement, "value", observedValue), (newVal) => {
                this._readValue();
                let removal;
                const previouslySelected = optionElement.selected;
                if (isDefined(oldVal)) {
                    this._removeOption(oldVal);
                    removal = true;
                }
                oldVal = newVal;
                registeredValue = newVal;
                this._addOption(newVal, optionElement);
                if (removal && previouslySelected) {
                    this._scheduleViewValueUpdate();
                }
            }, hasInterpolatedOptionAttr(optionElement, "value"));
        }
        else if (interpolateTextFn) {
            const initialTextValue = interpolateTextFn(optionScope);
            optionScope.value = initialTextValue;
            if (!registeredValue) {
                setOptionElementAttr(optionElement, "value", String(optionScope.value));
                registeredValue = initialTextValue;
                this._addOption(String(initialTextValue), optionElement);
            }
            optionScope.$watch("value", () => {
                const newVal = interpolateTextFn(optionScope);
                if (!registeredValue) {
                    setOptionElementAttr(optionElement, "value", String(newVal));
                }
                const previouslySelected = optionElement.selected;
                if (oldVal !== newVal) {
                    this._removeOption(oldVal);
                    oldVal = newVal;
                }
                registeredValue = newVal;
                this._addOption(newVal, optionElement);
                if (oldVal && previouslySelected) {
                    this._scheduleViewValueUpdate();
                }
            });
        }
        else {
            this._addOption(registeredValue, optionElement);
        }
        observeOptionElementAttr(optionScope, optionElement, "disabled", (observedValue) => readOptionElementAttr(optionElement, "disabled", observedValue), (newVal) => {
            if (newVal === "true" || (newVal && optionElement.selected)) {
                if (this._multiple) {
                    this._scheduleViewValueUpdate(true);
                }
                else {
                    this._ngModelCtrl.$setViewValue(null);
                    this._ngModelCtrl.$render();
                }
            }
        });
        optionElement.addEventListener("$destroy", () => {
            const currentValue = this._readValue();
            const removeValue = oldVal ?? registeredValue;
            const shouldUpdateViewValue = (this._multiple &&
                isArray(currentValue) &&
                currentValue.includes(removeValue)) ||
                currentValue === removeValue;
            this._removeOption(removeValue);
            this._scheduleRender();
            if (!shouldUpdateViewValue)
                return;
            this._scheduleDeferred(() => {
                queueMicrotask(() => {
                    if (this._scope._destroyed || this._hasOption(removeValue)) {
                        return;
                    }
                    this._scheduleViewValueUpdate(true);
                });
            }, optionScope);
        });
    }
}
/* @ignore */ SelectController.$inject = [_element, _scope];

export { SelectController };
