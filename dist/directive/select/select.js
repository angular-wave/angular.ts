import { _interpolate } from '../../injection-tokens.js';
import { getInheritedData, getCacheData, FUTURE_PARENT_ELEMENT_KEY } from '../../shared/dom.js';
import { isDefined, arrayFrom, includes, equals, shallowCopy } from '../../shared/utils.js';
import { SelectController } from './select-ctrl.js';

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
        selectElement.addEventListener("change", () => {
            selectCtrl._removeUnknownOption();
            const viewValue = selectCtrl._readValue();
            ngModelCtrl.$setViewValue(viewValue);
        });
        if (attr.multiple) {
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
            _scope.$watch(attr.ngModel, () => {
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
    function selectPostLink(_scope, _element, _attrs, ctrls) {
        const ngModelCtrl = ctrls[1];
        if (!ngModelCtrl)
            return;
        const selectCtrl = ctrls[0];
        ngModelCtrl.$render = function () {
            selectCtrl._writeValue(ngModelCtrl.$viewValue);
        };
        selectCtrl._scheduleRender();
    }
}
optionDirective.$inject = [_interpolate];
function optionDirective($interpolate) {
    return {
        restrict: "E",
        priority: 100,
        compile(element, attr) {
            const optionElement = element;
            let interpolateValueFn;
            let interpolateTextFn;
            if (isDefined(attr.ngValue)) ;
            else if (isDefined(attr.value)) {
                interpolateValueFn = $interpolate(attr.value, true);
            }
            else {
                interpolateTextFn = $interpolate(optionElement.textContent, true);
                if (!interpolateTextFn) {
                    attr.$set("value", optionElement.textContent);
                }
            }
            return function (scope, elemParam, attrParam) {
                const optionElementParam = elemParam;
                const selectCtrlName = "$selectController";
                const parent = optionElementParam.parentElement;
                const futureParent = getInheritedData(optionElementParam, FUTURE_PARENT_ELEMENT_KEY);
                const selectCtrl = (parent ? getCacheData(parent, selectCtrlName) : undefined) ||
                    (parent?.parentElement
                        ? getCacheData(parent.parentElement, selectCtrlName)
                        : undefined) ||
                    (futureParent
                        ? getInheritedData(futureParent, selectCtrlName)
                        : null);
                if (selectCtrl) {
                    selectCtrl._registerOption(scope, optionElementParam, attrParam, interpolateValueFn, interpolateTextFn);
                }
            };
        },
    };
}

export { optionDirective, selectDirective };
