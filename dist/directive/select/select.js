import { _interpolate } from '../../injection-tokens.js';
import { getInheritedData, getCacheData, hasNormalizedAttr, getNormalizedAttr, setNormalizedAttr, FUTURE_PARENT_ELEMENT_KEY } from '../../shared/dom.js';
import { isDefined, arrayFrom, includes, equals, shallowCopy } from '../../shared/utils.js';
import { SelectController } from './select-ctrl.js';

function readSelectAttr(element, normalizedName) {
    return getNormalizedAttr(element, normalizedName);
}
function hasSelectAttr(element, normalizedName) {
    return hasNormalizedAttr(element, normalizedName);
}
function setSelectAttr(element, normalizedName, value) {
    setNormalizedAttr(element, normalizedName, value);
}
function selectDirective() {
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
    function selectPreLink(_scope, element, ctrls) {
        const selectElement = element;
        const [selectCtrl, ngModelCtrl] = ctrls;
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
        if (hasNormalizedAttr(element, "multiple")) {
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
            _scope.$watch(getNormalizedAttr(element, "ngModel") ?? "", () => {
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
    function selectPostLink(_scope, element, ctrls) {
        const [selectCtrl, ngModelCtrl] = ctrls;
        if (!ngModelCtrl)
            return;
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
optionDirective.$inject = [_interpolate];
function optionDirective($interpolate) {
    return {
        restrict: "E",
        priority: 100,
        compile(element) {
            const optionElement = element;
            const hasNgValue = hasSelectAttr(element, "ngValue");
            let initialValue = readSelectAttr(element, "value");
            let interpolateValueFn;
            let interpolateTextFn;
            if (hasNgValue) ;
            else if (isDefined(initialValue)) {
                interpolateValueFn = $interpolate(initialValue, true);
            }
            else {
                interpolateTextFn = $interpolate(optionElement.textContent, true);
                if (!interpolateTextFn) {
                    setSelectAttr(optionElement, "value", optionElement.textContent);
                    initialValue = optionElement.textContent || undefined;
                }
            }
            return function (scope, elemParam) {
                const optionElementParam = elemParam;
                const ngValueExpression = readSelectAttr(optionElementParam, "ngValue");
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
                    selectCtrl._registerOption(scope, optionElementParam, interpolateValueFn, interpolateTextFn, ngValueExpression, initialValue, hasNgValue);
                }
            };
        },
    };
}

export { optionDirective, selectDirective };
