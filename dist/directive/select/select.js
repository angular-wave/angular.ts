import { _attributes, _interpolate } from '../../injection-tokens.js';
import { getInheritedData, getCacheData, FUTURE_PARENT_ELEMENT_KEY } from '../../shared/dom.js';
import { isDefined, arrayFrom, includes, equals, shallowCopy } from '../../shared/utils.js';
import { SelectController } from './select-ctrl.js';

selectDirective.$inject = [_attributes];
function readSelectAttr($attributes, element, attr, normalizedName) {
    const value = $attributes?.read(element, normalizedName);
    return isDefined(value)
        ? value
        : attr[normalizedName];
}
function hasSelectAttr($attributes, element, attr, normalizedName) {
    return ($attributes?.has(element, normalizedName) ?? isDefined(attr[normalizedName]));
}
function setSelectAttr($attributes, element, normalizedName, value) {
    $attributes.set(element, normalizedName, value);
}
function selectDirective($attributes) {
    return {
        restrict: "E",
        require: ["select", "?ngModel"],
        controller: SelectController,
        priority: 1,
        link: {
            pre: selectPreLink,
            post: selectPostLink,
        },
    };
    function selectPreLink(_scope, element, attr, ctrls) {
        const selectElement = element;
        const selectCtrl = ctrls[0];
        const ngModelCtrl = ctrls[1];
        if (!ngModelCtrl) {
            selectCtrl._registerOption = () => {
                /* empty */
            };
            return;
        }
        selectCtrl._ngModelCtrl = ngModelCtrl;
        const syncNativeValidity = () => {
            ngModelCtrl.$setNativeValidity(!selectElement.willValidate || selectElement.validity.valid);
        };
        selectElement.addEventListener("change", () => {
            selectCtrl._removeUnknownOption();
            const viewValue = selectCtrl._readValue();
            ngModelCtrl.$setViewValue(viewValue);
            syncNativeValidity();
        });
        if (hasSelectAttr($attributes, element, attr, "multiple")) {
            selectCtrl._multiple = true;
            selectCtrl._readValue = function () {
                const array = [];
                const options = selectElement.getElementsByTagName("option");
                arrayFrom(options).forEach((option) => {
                    if (option.selected && !option.disabled) {
                        const val = option.value;
                        array.push(val in selectCtrl._selectValueMap
                            ? selectCtrl._selectValueMap[val]
                            : val);
                    }
                });
                return array;
            };
            selectCtrl._writeValue = function (value) {
                const options = selectElement.getElementsByTagName("option");
                arrayFrom(options).forEach((option) => {
                    const shouldBeSelected = !!value &&
                        (includes(value, option.value) ||
                            includes(value, selectCtrl._selectValueMap[option.value]));
                    const currentlySelected = option.selected;
                    if (shouldBeSelected !== currentlySelected) {
                        option.selected = shouldBeSelected;
                    }
                });
            };
            let lastView;
            let lastViewRef = NaN;
            _scope.$watch(readSelectAttr($attributes, element, attr, "ngModel") ?? "", () => {
                if (lastViewRef === ngModelCtrl.$viewValue &&
                    !equals(lastView, ngModelCtrl.$viewValue)) {
                    lastView = shallowCopy(ngModelCtrl.$viewValue);
                    ngModelCtrl.$render();
                }
                lastViewRef = ngModelCtrl.$viewValue;
            });
            ngModelCtrl.$isEmpty = function (value) {
                return !value || value.length === 0;
            };
        }
    }
    function selectPostLink(_scope, element, _attrs, ctrls) {
        const ngModelCtrl = ctrls[1];
        if (!ngModelCtrl)
            return;
        const selectCtrl = ctrls[0];
        const selectElement = element;
        const syncNativeValidity = () => {
            ngModelCtrl.$setNativeValidity(!selectElement.willValidate || selectElement.validity.valid);
        };
        ngModelCtrl.$render = function () {
            selectCtrl._writeValue(ngModelCtrl.$viewValue);
            syncNativeValidity();
        };
        syncNativeValidity();
        selectCtrl._scheduleRender();
    }
}
optionDirective.$inject = [_attributes, _interpolate];
function optionDirective($attributes, $interpolate) {
    return {
        restrict: "E",
        priority: 100,
        compile(element, attr) {
            const optionElement = element;
            const hasNgValue = hasSelectAttr($attributes, element, attr, "ngValue");
            let initialValue = readSelectAttr($attributes, element, attr, "value");
            let interpolateValueFn;
            let interpolateTextFn;
            if (hasNgValue) ;
            else if (isDefined(initialValue)) {
                interpolateValueFn = $interpolate(initialValue, true);
            }
            else {
                interpolateTextFn = $interpolate(optionElement.textContent, true);
                if (!interpolateTextFn) {
                    setSelectAttr($attributes, optionElement, "value", optionElement.textContent);
                    initialValue = optionElement.textContent || undefined;
                }
            }
            return function (scope, elemParam, attrParam) {
                const optionElementParam = elemParam;
                const selectCtrlName = "$selectController";
                const parent = optionElementParam.parentElement;
                const futureParent = getInheritedData(optionElementParam, FUTURE_PARENT_ELEMENT_KEY);
                const selectCtrl = ((parent
                    ? getCacheData(parent, selectCtrlName)
                    : undefined) ??
                    (parent?.parentElement
                        ? getCacheData(parent.parentElement, selectCtrlName)
                        : undefined) ??
                    (futureParent
                        ? getInheritedData(futureParent, selectCtrlName)
                        : null));
                if (selectCtrl) {
                    selectCtrl._registerOption(scope, optionElementParam, attrParam, interpolateValueFn, interpolateTextFn, $attributes, initialValue, hasNgValue);
                }
            };
        },
    };
}

export { optionDirective, selectDirective };
