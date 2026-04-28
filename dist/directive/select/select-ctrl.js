import { _element, _scope } from '../../injection-tokens.js';
import { NodeType } from '../../shared/node.js';
import { removeElement } from '../../shared/dom.js';
import { isUndefined, hashKey, assertNotHasOwnProperty, isNullOrUndefined, isDefined, isArray } from '../../shared/utils.js';

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
        return this._hasOption(realVal) ? realVal : null;
    }
    /** @ignore */
    /** @internal */
    _writeValue(value) {
        const currentlySelectedOption = this._element.options[this._element.selectedIndex];
        if (currentlySelectedOption)
            currentlySelectedOption.selected = false;
        if (this._hasOption(value)) {
            this._removeUnknownOption();
            const hashedVal = hashKey(value);
            this._element.value =
                hashedVal in this._selectValueMap ? hashedVal : value;
            const selectedOption = this._element.options[this._element.selectedIndex];
            if (!selectedOption) {
                this._selectUnknownOrEmptyOption(value);
            }
            else {
                selectedOption.selected = true;
            }
        }
        else {
            this._selectUnknownOrEmptyOption(value);
        }
    }
    /** @ignore */
    /** @internal */
    _addOption(value, element) {
        if (element.nodeType === NodeType._COMMENT_NODE)
            return;
        assertNotHasOwnProperty(value, '"option value"');
        if (value === "") {
            this._hasEmptyOption = true;
            this._emptyOption = element;
        }
        const count = this._optionsMap.get(value) || 0;
        this._optionsMap.set(value, count + 1);
        this._scheduleRender();
        const currentViewValue = this._ngModelCtrl?.$viewValue;
        const currentModelValue = this._ngModelCtrl?.$modelValue;
        if (currentViewValue === value ||
            currentModelValue === value ||
            ((isNullOrUndefined(currentViewValue) || currentViewValue === "") &&
                value === "")) {
            this._scope.$postUpdate(() => {
                if (this._scope._destroyed)
                    return;
                this._ngModelCtrl?.$render?.();
            });
        }
    }
    /** @ignore */
    /** @internal */
    _removeOption(value) {
        const count = this._optionsMap.get(value);
        if (count) {
            if (count === 1) {
                this._optionsMap.delete(value);
                if (value === "") {
                    this._hasEmptyOption = false;
                    this._emptyOption = undefined;
                }
            }
            else {
                this._optionsMap.set(value, count - 1);
            }
        }
    }
    /** @ignore */
    /** @internal */
    _hasOption(value) {
        return !!this._optionsMap.get(value);
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
        this._scope.$postUpdate(() => {
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
        this._scope.$postUpdate(() => {
            if (this._scope._destroyed)
                return;
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
    _registerOption(optionScope, optionElement, optionAttrs, interpolateValueFn, interpolateTextFn) {
        let oldVal;
        let hashedVal;
        let registeredValue = optionAttrs.value;
        if (optionAttrs.$attr.ngValue) {
            optionAttrs.$observe("value", (newVal) => {
                let removal;
                const previouslySelected = optionElement.selected;
                if (isDefined(hashedVal)) {
                    this._removeOption(oldVal);
                    delete this._selectValueMap[hashedVal];
                    removal = true;
                }
                hashedVal = hashKey(newVal);
                oldVal = newVal;
                registeredValue = newVal;
                this._selectValueMap[hashedVal] = newVal;
                this._addOption(newVal, optionElement);
                optionElement.setAttribute("value", hashedVal);
                if (removal && previouslySelected) {
                    this._scheduleViewValueUpdate();
                }
            });
        }
        else if (interpolateValueFn) {
            optionAttrs.$observe("value", (newVal) => {
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
            });
        }
        else if (interpolateTextFn) {
            optionScope.value = interpolateTextFn(optionScope);
            if (!optionAttrs.value) {
                optionAttrs.$set("value", optionScope.value);
                registeredValue = optionScope.value;
                this._addOption(optionScope.value, optionElement);
            }
            optionScope.$watch("value", () => {
                const newVal = interpolateTextFn(optionScope);
                if (!optionAttrs.value) {
                    optionAttrs.$set("value", newVal);
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
            this._addOption(optionAttrs.value, optionElement);
        }
        optionAttrs.$observe("disabled", (newVal) => {
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
                currentValue.indexOf(removeValue) !== -1) ||
                currentValue === removeValue;
            this._removeOption(removeValue);
            this._scheduleRender();
            if (!shouldUpdateViewValue)
                return;
            optionScope.$postUpdate(() => {
                queueMicrotask(() => {
                    if (this._scope._destroyed || this._hasOption(removeValue)) {
                        return;
                    }
                    this._scheduleViewValueUpdate(true);
                });
            });
        });
    }
}
/* @ignore */ SelectController.$inject = [_element, _scope];

export { SelectController };
