import { _compile, _parse } from '../../injection-tokens.js';
import { emptyElement, createDocumentFragment, startingTag, removeElement } from '../../shared/dom.js';
import { NodeType } from '../../shared/node.js';
import { assertDefined, isDefined, isNull, equals, isArrayLike, hasOwn, hashKey, includes, createErrorFactory } from '../../shared/utils.js';

const ngOptionsError = createErrorFactory("ngOptions");
const optionTemplate = document.createElement("option");
const optGroupTemplate = document.createElement("optgroup");
const NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([$\w][$\w]*)|(?:\(\s*([$\w][$\w]*)\s*,\s*([$\w][$\w]*)\s*\)))\s+in\s+([\s\S]+?)$/;
class OptionItem {
    constructor(selectValue, viewValue, label, group, disabled) {
        /** @internal */
        this._element = null;
        this._selectValue = selectValue;
        this._viewValue = viewValue;
        this._label = label;
        this._group = group;
        this._disabled = disabled;
    }
}
ngOptionsDirective.$inject = [_compile, _parse];
function ngOptionsDirective($compile, $parse) {
    function parseOptionsExpression(optionsExp, selectElement, scope) {
        const match = NG_OPTIONS_REGEXP.exec(optionsExp);
        if (!match) {
            throw ngOptionsError("iexp", "Expected expression in form of " +
                "'_select_ (as _label_)? for (_key_,)?_value_ in _collection_'" +
                " but got '{0}'. Element: {1}", optionsExp, startingTag(selectElement));
        }
        const valueName = match[5] || match[7];
        const keyName = match[6];
        const selectAs = match[0].includes(" as ") && match[1];
        const valueFn = $parse(match[2] ? match[1] : valueName);
        const selectAsFn = selectAs && $parse(selectAs);
        const viewValueFn = selectAsFn || valueFn;
        const displayFn = $parse(match[2] || match[1]);
        const groupByFn = $parse(match[3] || "");
        const disableWhenFn = $parse(match[4] || "");
        const valuesFn = $parse(match[8]);
        const locals = {};
        const getLocals = keyName
            ? (value, key) => {
                locals[keyName] = key;
                locals[valueName] = value;
                return locals;
            }
            : (value) => {
                locals[valueName] = value;
                return locals;
            };
        return {
            _getWatchables: match[8],
            /** @internal */
            _getOptions() {
                const optionItems = [];
                const selectValueMap = {};
                const optionValues = valuesFn(scope) || [];
                const addOption = (value, key) => {
                    const updatedLocals = getLocals(value, key);
                    const viewValue = viewValueFn(scope, updatedLocals);
                    const selectValue = hashKey(viewValue);
                    const label = displayFn(scope, updatedLocals);
                    const group = groupByFn(scope, updatedLocals);
                    const disabled = disableWhenFn(scope, updatedLocals);
                    const optionItem = new OptionItem(selectValue, viewValue, label, group, disabled);
                    optionItems.push(optionItem);
                    selectValueMap[selectValue] = optionItem;
                };
                if (!keyName && isArrayLike(optionValues)) {
                    const arrayLikeOptions = optionValues;
                    for (let index = 0, l = arrayLikeOptions.length; index < l; index++) {
                        addOption(arrayLikeOptions[index], index);
                    }
                }
                else {
                    const optionRecord = optionValues;
                    for (const itemKey in optionRecord) {
                        if (hasOwn(optionRecord, itemKey) && !itemKey.startsWith("$")) {
                            addOption(optionRecord[itemKey], itemKey);
                        }
                    }
                }
                return {
                    _items: optionItems,
                    _selectValueMap: selectValueMap,
                    /** @internal */
                    _getOptionFromViewValue(value) {
                        return selectValueMap[hashKey(value)];
                    },
                    /** @internal */
                    _getViewValueFromOption(option) {
                        return option._viewValue;
                    },
                };
            },
        };
    }
    function ngOptionsPostLink(scope, selectElement, attr, ctrls) {
        const selectNode = selectElement;
        const selectCtrl = ctrls[0];
        const ngModelCtrl = ctrls[1];
        const { multiple } = attr;
        for (let i = 0, children = selectNode.childNodes, ii = children.length; i < ii; i++) {
            if (children[i].value === "") {
                selectCtrl._hasEmptyOption = true;
                selectCtrl._emptyOption = children[i];
                break;
            }
        }
        emptyElement(selectNode);
        const providedEmptyOption = !!selectCtrl._emptyOption;
        let options;
        const ngOptions = parseOptionsExpression(attr.ngOptions, selectNode, scope);
        const listFragment = createDocumentFragment();
        selectCtrl._generateUnknownOptionValue = () => "?";
        if (!multiple) {
            selectCtrl._writeValue = function writeNgOptionsValue(value) {
                if (!options)
                    return;
                const selectedOption = selectNode.options[selectNode.selectedIndex];
                const option = options._getOptionFromViewValue(value);
                if (selectedOption)
                    selectedOption.removeAttribute("selected");
                if (option) {
                    if (selectNode.value !== option._selectValue) {
                        selectCtrl._removeUnknownOption();
                        selectNode.value = option._selectValue;
                        assertDefined(option._element).selected = true;
                    }
                    assertDefined(option._element).setAttribute("selected", "selected");
                }
                else {
                    selectCtrl._selectUnknownOrEmptyOption(value);
                }
            };
            selectCtrl._readValue = function readNgOptionsValue() {
                if (!options)
                    return null;
                const selectedOption = options._selectValueMap[selectNode.value];
                if (selectedOption && !selectedOption._disabled) {
                    selectCtrl._unselectEmptyOption();
                    selectCtrl._removeUnknownOption();
                    return options._getViewValueFromOption(selectedOption);
                }
                return null;
            };
        }
        else {
            selectCtrl._writeValue = function writeNgOptionsMultiple(values) {
                if (!options)
                    return;
                const selectedOptions = values?.map(getAndUpdateSelectedOption) || [];
                options._items.forEach((option) => {
                    if (option._element?.selected && !includes(selectedOptions, option)) {
                        option._element.selected = false;
                    }
                });
            };
            selectCtrl._readValue = () => {
                if (!options)
                    return [];
                const selections = [];
                const optionsEls = selectNode.options;
                for (let i = 0; i < optionsEls.length; i++) {
                    const optionEl = optionsEls[i];
                    if (optionEl.selected) {
                        const option = options._selectValueMap[optionEl.value];
                        if (option && !option._disabled) {
                            selections.push(options._getViewValueFromOption(option));
                        }
                    }
                }
                return selections;
            };
        }
        if (providedEmptyOption) {
            const linkFn = $compile(assertDefined(selectCtrl._emptyOption));
            selectNode.prepend(assertDefined(selectCtrl._emptyOption));
            linkFn(scope);
            if (assertDefined(selectCtrl._emptyOption).nodeType ===
                NodeType._COMMENT_NODE) {
                selectCtrl._hasEmptyOption = false;
                selectCtrl._registerOption = function (_optionScope, optionEl) {
                    if (optionEl.value === "") {
                        selectCtrl._hasEmptyOption = true;
                        selectCtrl._emptyOption = optionEl;
                        ngModelCtrl.$render();
                        optionEl.addEventListener("$destroy", () => {
                            const needsRerender = selectCtrl.$isEmptyOptionSelected();
                            selectCtrl._hasEmptyOption = false;
                            selectCtrl._emptyOption = undefined;
                            if (needsRerender)
                                ngModelCtrl.$render();
                        });
                    }
                };
            }
        }
        scope.$watch(ngOptions._getWatchables, updateOptions);
        function _addOptionElement(option, parent) {
            const optionElement = optionTemplate.cloneNode(false);
            parent.appendChild(optionElement);
            updateOptionElement(option, optionElement);
        }
        function getAndUpdateSelectedOption(viewValue) {
            const option = options?._getOptionFromViewValue(viewValue);
            const element = option?._element;
            if (element && !element.selected)
                element.selected = true;
            return option;
        }
        function updateOptionElement(option, element) {
            option._element = element;
            element.disabled = option._disabled;
            if (option._label !== element.label) {
                element.label = option._label;
                element.textContent = option._label;
            }
            element.value = option._selectValue;
        }
        function updateOptions() {
            const previousValue = options && selectCtrl._readValue();
            if (options) {
                for (let i = options._items.length - 1; i >= 0; i--) {
                    const option = options._items[i];
                    if (isDefined(option._group)) {
                        if (option._element?.parentElement) {
                            removeElement(option._element.parentElement);
                        }
                    }
                    else {
                        if (option._element) {
                            removeElement(option._element);
                        }
                    }
                }
            }
            options = ngOptions._getOptions();
            const groupElementMap = {};
            options._items.forEach((option) => {
                let groupElement;
                if (isDefined(option._group)) {
                    groupElement = groupElementMap[String(option._group)];
                    if (!groupElement) {
                        groupElement = optGroupTemplate.cloneNode(false);
                        listFragment.appendChild(groupElement);
                        groupElement.label = isNull(option._group) ? "null" : option._group;
                        groupElementMap[String(option._group)] = groupElement;
                    }
                    _addOptionElement(option, groupElement);
                }
                else {
                    _addOptionElement(option, listFragment);
                }
            });
            selectNode.appendChild(listFragment);
            ngModelCtrl.$render();
            if (!ngModelCtrl.$isEmpty(previousValue)) {
                const nextValue = selectCtrl._readValue();
                const isNotPrimitive = multiple;
                if (isNotPrimitive
                    ? !equals(previousValue, nextValue)
                    : previousValue !== nextValue) {
                    ngModelCtrl.$setViewValue(nextValue);
                    ngModelCtrl.$render();
                }
            }
        }
    }
    return {
        restrict: "A",
        terminal: true,
        require: ["select", "ngModel"],
        link: {
            pre: function ngOptionsPreLink(_scope, _selectElement, _attr, ctrls) {
                ctrls[0]._registerOption = () => {
                    /* empty */
                };
            },
            post: ngOptionsPostLink,
        },
    };
}

export { ngOptionsDirective };
