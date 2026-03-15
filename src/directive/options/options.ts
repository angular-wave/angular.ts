// @ts-nocheck

import { $injectTokens } from "../../injection-tokens.ts";
import { emptyElement, removeElement, startingTag } from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import {
  equals,
  hasOwn,
  hashKey,
  includes,
  isArrayLike,
  isDefined,
  minErr,
} from "../../shared/utils.ts";

const ngOptionsMinErr = minErr("ngOptions");

const optionTemplate = document.createElement("option");
const optGroupTemplate = document.createElement("optgroup");

const NG_OPTIONS_REGEXP =
  /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([$\w][$\w]*)|(?:\(\s*([$\w][$\w]*)\s*,\s*([$\w][$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;

class OptionItem {
  element = null;

  constructor(selectValue, viewValue, label, group, disabled) {
    this.selectValue = selectValue;
    this.viewValue = viewValue;
    this.label = label;
    this.group = group;
    this.disabled = disabled;
  }
}

ngOptionsDirective.$inject = [$injectTokens._compile, $injectTokens._parse];

export function ngOptionsDirective($compile, $parse) {
  function parseOptionsExpression(optionsExp, selectElement, scope) {
    const match = optionsExp.match(NG_OPTIONS_REGEXP);

    if (!match) {
      throw ngOptionsMinErr(
        "iexp",
        "Expected expression in form of " +
          "'_select_ (as _label_)? for (_key_,)?_value_ in _collection_'" +
          " but got '{0}'. Element: {1}",
        optionsExp,
        startingTag(selectElement),
      );
    }

    const valueName = match[5] || match[7];
    const keyName = match[6];
    const selectAs = / as /.test(match[0]) && match[1];
    const trackBy = match[9];
    const valueFn = $parse(match[2] ? match[1] : valueName);
    const selectAsFn = selectAs && $parse(selectAs);
    const viewValueFn = selectAsFn || valueFn;
    const trackByFn = trackBy && $parse(trackBy);

    const getTrackByValueFn = trackBy
      ? function (value, locals) {
          return trackByFn(scope, locals);
        }
      : function getHashOfValue(value) {
          return hashKey(value);
        };

    const getTrackByValue = function (value, key) {
      return getTrackByValueFn(value, getLocals(value, key));
    };

    const displayFn = $parse(match[2] || match[1]);
    const groupByFn = $parse(match[3] || "");
    const disableWhenFn = $parse(match[4] || "");
    const valuesFn = $parse(match[8]);

    const locals = {};

    const getLocals = keyName
      ? function (value, key) {
          locals[keyName] = key;
          locals[valueName] = value;

          return locals;
        }
      : function (value) {
          locals[valueName] = value;

          return locals;
        };

    function getOptionValuesKeys(optionValues) {
      let optionValuesKeys;

      if (!keyName && isArrayLike(optionValues)) {
        optionValuesKeys = optionValues;
      } else {
        optionValuesKeys = [];

        for (const itemKey in optionValues) {
          if (hasOwn(optionValues, itemKey) && itemKey.charAt(0) !== "$") {
            optionValuesKeys.push(itemKey);
          }
        }
      }

      return optionValuesKeys;
    }

    return {
      trackBy,
      getTrackByValue,
      getWatchables: valuesFn,
      getOptions() {
        const optionItems = [];
        const selectValueMap = {};
        const optionValues = valuesFn(scope) || [];
        const optionValuesKeys = getOptionValuesKeys(optionValues);
        const optionValuesLength = optionValuesKeys.length;

        for (let index = 0; index < optionValuesLength; index++) {
          const key =
            optionValues === optionValuesKeys ? index : optionValuesKeys[index];

          const value = optionValues[key];
          const updatedLocals = getLocals(value, key);
          const viewValue = viewValueFn(scope, updatedLocals);
          const selectValue = getTrackByValueFn(viewValue, updatedLocals);
          const label = displayFn(scope, updatedLocals);
          const group = groupByFn(scope, updatedLocals);
          const disabled = disableWhenFn(scope, updatedLocals);
          const optionItem = new OptionItem(
            selectValue,
            viewValue,
            label,
            group,
            disabled,
          );

          optionItems.push(optionItem);
          selectValueMap[selectValue] = optionItem;
        }

        return {
          items: optionItems,
          selectValueMap,
          getOptionFromViewValue(value) {
            return selectValueMap[getTrackByValue(value, undefined)];
          },
          getViewValueFromOption(option) {
            return trackBy
              ? structuredClone(option.viewValue)
              : option.viewValue;
          },
        };
      },
    };
  }

  function ngOptionsPostLink(scope, selectElement, attr, ctrls) {
    const selectCtrl = ctrls[0];
    const ngModelCtrl = ctrls[1];
    const { multiple } = attr;

    for (
      let i = 0, children = selectElement.childNodes, ii = children.length;
      i < ii;
      i++
    ) {
      if (children[i].value === "") {
        selectCtrl.hasEmptyOption = true;
        selectCtrl.emptyOption = children[i];
        break;
      }
    }

    emptyElement(selectElement);

    const providedEmptyOption = !!selectCtrl.emptyOption;

    const unknownOption = optionTemplate.cloneNode(false);
    unknownOption.nodeValue = "?";

    let options;

    const ngOptions = parseOptionsExpression(
      attr.ngOptions,
      selectElement,
      scope,
    );

    const listFragment = document.createDocumentFragment();

    selectCtrl._generateUnknownOptionValue = () => "?";

    if (!multiple) {
      selectCtrl._writeValue = function writeNgOptionsValue(value) {
        if (!options) return;

        const selectedOption =
          selectElement.options[selectElement.selectedIndex];

        const option = options.getOptionFromViewValue(value);

        if (selectedOption) selectedOption.removeAttribute("selected");

        if (option) {
          if (selectElement.value !== option.selectValue) {
            selectCtrl._removeUnknownOption();

            selectElement.value = option.selectValue;
            option.element.selected = true;
          }

          option.element.setAttribute("selected", "selected");
        } else {
          selectCtrl._selectUnknownOrEmptyOption(value);
        }
      };

      selectCtrl._readValue = function readNgOptionsValue() {
        const selectedOption = options.selectValueMap[selectElement.value];

        if (selectedOption && !selectedOption.disabled) {
          selectCtrl._un_selectEmptyOption();
          selectCtrl._removeUnknownOption();

          return options.getViewValueFromOption(selectedOption);
        }

        return null;
      };

      if (ngOptions.trackBy) {
        scope.$watch(
          ngOptions.getTrackByValue(ngModelCtrl.$viewValue, undefined),
          () => {
            ngModelCtrl.$render();
          },
        );
      }
    } else {
      selectCtrl._writeValue = function writeNgOptionsMultiple(values) {
        if (!options) return;

        const selectedOptions =
          (values && values.map(getAndUpdateSelectedOption)) || [];

        options.items.forEach((option) => {
          if (option.element?.selected && !includes(selectedOptions, option)) {
            option.element.selected = false;
          }
        });
      };

      selectCtrl._readValue = function readNgOptionsMultiple() {
        const selections = [];
        const optionsEls = selectElement.options;

        for (let i = 0; i < optionsEls.length; i++) {
          const optionEl = optionsEls[i];

          if (optionEl.selected) {
            const option = options.selectValueMap[optionEl.value];

            if (option && !option.disabled) {
              selections.push(options.getViewValueFromOption(option));
            }
          }
        }

        return selections;
      };
    }

    if (providedEmptyOption) {
      const linkFn = $compile(selectCtrl.emptyOption);

      selectElement.prepend(selectCtrl.emptyOption);
      linkFn(scope);

      if (selectCtrl.emptyOption.nodeType === NodeType._COMMENT_NODE) {
        selectCtrl.hasEmptyOption = false;

        selectCtrl.registerOption = function (_optionScope, optionEl) {
          if (optionEl.value === "") {
            selectCtrl.hasEmptyOption = true;
            selectCtrl.emptyOption = optionEl;
            ngModelCtrl.$render();

            optionEl.addEventListener("$destroy", () => {
              const needsRerender = selectCtrl.$isEmptyOptionSelected();

              selectCtrl.hasEmptyOption = false;
              selectCtrl.emptyOption = undefined;

              if (needsRerender) ngModelCtrl.$render();
            });
          }
        };
      }
    }

    const prop =
      ngOptions.getWatchables._decoratedNode.body[0].expression?.name;

    scope.$watch(prop, updateOptions);

    function _addOptionElement(option, parent) {
      const optionElement = optionTemplate.cloneNode(false);

      parent.appendChild(optionElement);
      updateOptionElement(option, optionElement);
    }

    function getAndUpdateSelectedOption(viewValue) {
      const option = options.getOptionFromViewValue(viewValue);
      const element = option && option.element;

      if (element && !element.selected) element.selected = true;

      return option;
    }

    function updateOptionElement(option, element) {
      option.element = element;
      element.disabled = option.disabled;

      if (option.label !== element.label) {
        element.label = option.label;
        element.textContent = option.label;
      }
      element.value = option.selectValue;
    }

    function updateOptions() {
      const previousValue = options && selectCtrl._readValue();

      if (options) {
        for (let i = options.items.length - 1; i >= 0; i--) {
          const option = options.items[i];

          if (isDefined(option.group)) {
            removeElement(option.element.parentNode);
          } else {
            removeElement(option.element);
          }
        }
      }

      options = ngOptions.getOptions();

      const groupElementMap = {};

      options.items.forEach((option) => {
        let groupElement;

        if (isDefined(option.group)) {
          groupElement = groupElementMap[option.group];

          if (!groupElement) {
            groupElement = optGroupTemplate.cloneNode(false);
            listFragment.appendChild(groupElement);
            groupElement.label = option.group === null ? "null" : option.group;
            groupElementMap[option.group] = groupElement;
          }

          _addOptionElement(option, groupElement);
        } else {
          _addOptionElement(option, listFragment);
        }
      });

      selectElement.appendChild(listFragment);

      ngModelCtrl.$render();

      if (!ngModelCtrl.$isEmpty(previousValue)) {
        const nextValue = selectCtrl._readValue();
        const isNotPrimitive = ngOptions.trackBy || multiple;

        if (
          isNotPrimitive
            ? !equals(previousValue, nextValue)
            : previousValue !== nextValue
        ) {
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
      pre: function ngOptionsPreLink(scope, selectElement, attr, ctrls) {
        ctrls[0].registerOption = () => {
          /* empty */
        };
      },
      post: ngOptionsPostLink,
    },
  };
}
