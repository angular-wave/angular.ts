import { _compile, _parse } from "../../injection-tokens.ts";
import {
  createDocumentFragment,
  emptyElement,
  removeElement,
  startingTag,
} from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import {
  equals,
  hasOwn,
  hashKey,
  includes,
  isArrayLike,
  isDefined,
  isNull,
  createErrorFactory,
} from "../../shared/utils.ts";
import { SelectController } from "../select/select-ctrl.ts";

const ngOptionsError = createErrorFactory("ngOptions");

const optionTemplate = document.createElement("option");

const optGroupTemplate = document.createElement("optgroup");

const NG_OPTIONS_REGEXP =
  /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([$\w][$\w]*)|(?:\(\s*([$\w][$\w]*)\s*,\s*([$\w][$\w]*)\s*\)))\s+in\s+([\s\S]+?)$/;

class OptionItem {
  /** @internal */
  _element: HTMLOptionElement | null = null;
  /** @internal */
  _selectValue: any;
  /** @internal */
  _viewValue: any;
  /** @internal */
  _label: any;
  /** @internal */
  _group: any;
  /** @internal */
  _disabled: any;

  constructor(
    selectValue: any,
    viewValue: any,
    label: any,
    group: any,
    disabled: any,
  ) {
    this._selectValue = selectValue;
    this._viewValue = viewValue;
    this._label = label;
    this._group = group;
    this._disabled = disabled;
  }
}

ngOptionsDirective.$inject = [_compile, _parse];

type NgOptionsCollection = {
  /** @internal */
  _items: OptionItem[];
  /** @internal */
  _selectValueMap: Record<string, OptionItem>;
  /** @internal */
  _getOptionFromViewValue(value: any): OptionItem | undefined;
  /** @internal */
  _getViewValueFromOption(option: OptionItem): any;
};

type NgOptionsDefinition = {
  /** @internal */
  _getWatchables: string;
  /** @internal */
  _getOptions(): NgOptionsCollection;
};

export function ngOptionsDirective(
  $compile: ng.CompileService,
  $parse: ng.ParseService,
): ng.Directive {
  function parseOptionsExpression(
    optionsExp: string,
    selectElement: HTMLSelectElement,
    scope: ng.Scope,
  ): NgOptionsDefinition {
    const match = optionsExp.match(NG_OPTIONS_REGEXP);

    if (!match) {
      throw ngOptionsError(
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

    const valueFn = $parse(match[2] ? match[1] : valueName);

    const selectAsFn = selectAs && $parse(selectAs);

    const viewValueFn = selectAsFn || valueFn;

    const displayFn = $parse(match[2] || match[1]);

    const groupByFn = $parse(match[3] || "");

    const disableWhenFn = $parse(match[4] || "");

    const valuesFn = $parse(match[8]);

    const locals: Record<string, any> = {};

    const getLocals = keyName
      ? (value: any, key: any) => {
          locals[keyName] = key;
          locals[valueName] = value;

          return locals;
        }
      : (value: any) => {
          locals[valueName] = value;

          return locals;
        };

    return {
      _getWatchables: match[8],
      /** @internal */
      _getOptions() {
        const optionItems: OptionItem[] = [];

        const selectValueMap: Record<string, OptionItem> = {};

        const optionValues = valuesFn(scope) || [];

        const addOption = (value: any, key: any) => {
          const updatedLocals = getLocals(value, key);

          const viewValue = viewValueFn(scope, updatedLocals);

          const selectValue = hashKey(viewValue);

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
        };

        if (!keyName && isArrayLike(optionValues)) {
          for (let index = 0, l = optionValues.length; index < l; index++) {
            addOption(optionValues[index], index);
          }
        } else {
          for (const itemKey in optionValues) {
            if (hasOwn(optionValues, itemKey) && itemKey.charAt(0) !== "$") {
              addOption(optionValues[itemKey], itemKey);
            }
          }
        }

        return {
          _items: optionItems,
          _selectValueMap: selectValueMap,
          /** @internal */
          _getOptionFromViewValue(value: any) {
            return selectValueMap[hashKey(value)];
          },
          /** @internal */
          _getViewValueFromOption(option: OptionItem) {
            return option._viewValue;
          },
        };
      },
    };
  }

  function ngOptionsPostLink(
    scope: ng.Scope & Record<string, any>,
    selectElement: Element,
    attr: ng.Attributes & Record<string, any>,
    ctrls: [SelectController, ng.NgModelController & Record<string, any>],
  ) {
    const selectNode = selectElement as HTMLSelectElement;

    const selectCtrl = ctrls[0];

    const ngModelCtrl = ctrls[1];

    const { multiple } = attr;

    for (
      let i = 0, children = selectNode.childNodes, ii = children.length;
      i < ii;
      i++
    ) {
      if ((children[i] as HTMLOptionElement).value === "") {
        selectCtrl._hasEmptyOption = true;
        selectCtrl._emptyOption = children[i] as HTMLOptionElement;
        break;
      }
    }

    emptyElement(selectNode);

    const providedEmptyOption = !!selectCtrl._emptyOption;

    let options: NgOptionsCollection | undefined;

    const ngOptions = parseOptionsExpression(attr.ngOptions, selectNode, scope);

    const listFragment = createDocumentFragment();

    selectCtrl._generateUnknownOptionValue = () => "?";

    if (!multiple) {
      selectCtrl._writeValue = function writeNgOptionsValue(value: any) {
        if (!options) return;

        const selectedOption = selectNode.options[selectNode.selectedIndex];

        const option = options._getOptionFromViewValue(value);

        if (selectedOption) selectedOption.removeAttribute("selected");

        if (option) {
          if (selectNode.value !== option._selectValue) {
            selectCtrl._removeUnknownOption();

            selectNode.value = option._selectValue;
            option._element!.selected = true;
          }

          option._element!.setAttribute("selected", "selected");
        } else {
          selectCtrl._selectUnknownOrEmptyOption(value);
        }
      };

      selectCtrl._readValue = function readNgOptionsValue() {
        if (!options) return null;
        const selectedOption = options._selectValueMap[selectNode.value];

        if (selectedOption && !selectedOption._disabled) {
          selectCtrl._unselectEmptyOption();
          selectCtrl._removeUnknownOption();

          return options._getViewValueFromOption(selectedOption);
        }

        return null;
      };
    } else {
      selectCtrl._writeValue = function writeNgOptionsMultiple(values: any[]) {
        if (!options) return;

        const selectedOptions =
          (values && values.map(getAndUpdateSelectedOption)) || [];

        options._items.forEach((option) => {
          if (option._element?.selected && !includes(selectedOptions, option)) {
            option._element.selected = false;
          }
        });
      };

      selectCtrl._readValue = () => {
        if (!options) return [];

        const selections: any[] = [];

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
      const linkFn = $compile(selectCtrl._emptyOption as HTMLOptionElement);

      selectNode.prepend(selectCtrl._emptyOption as HTMLOptionElement);
      linkFn(scope);

      if (
        (selectCtrl._emptyOption as HTMLOptionElement).nodeType ===
        NodeType._COMMENT_NODE
      ) {
        selectCtrl._hasEmptyOption = false;

        selectCtrl._registerOption = function (
          _optionScope: ng.Scope,
          optionEl: HTMLOptionElement,
        ) {
          if (optionEl.value === "") {
            selectCtrl._hasEmptyOption = true;
            selectCtrl._emptyOption = optionEl;
            ngModelCtrl.$render();

            optionEl.addEventListener("$destroy", () => {
              const needsRerender = selectCtrl.$isEmptyOptionSelected();

              selectCtrl._hasEmptyOption = false;
              selectCtrl._emptyOption = undefined;

              if (needsRerender) ngModelCtrl.$render();
            });
          }
        };
      }
    }

    scope.$watch(ngOptions._getWatchables, updateOptions as any);

    function _addOptionElement(
      option: OptionItem,
      parent: DocumentFragment | HTMLOptGroupElement,
    ) {
      const optionElement = optionTemplate.cloneNode(
        false,
      ) as HTMLOptionElement;

      parent.appendChild(optionElement);
      updateOptionElement(option, optionElement);
    }

    function getAndUpdateSelectedOption(viewValue: any) {
      const option = options?._getOptionFromViewValue(viewValue);

      const element = option && option._element;

      if (element && !element.selected) element.selected = true;

      return option;
    }

    function updateOptionElement(
      option: OptionItem,
      element: HTMLOptionElement,
    ) {
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
          } else {
            if (option._element) {
              removeElement(option._element);
            }
          }
        }
      }

      options = ngOptions._getOptions();

      const groupElementMap: Record<string, HTMLOptGroupElement> = {};

      options._items.forEach((option) => {
        let groupElement;

        if (isDefined(option._group)) {
          groupElement = groupElementMap[String(option._group)];

          if (!groupElement) {
            groupElement = optGroupTemplate.cloneNode(
              false,
            ) as HTMLOptGroupElement;
            listFragment.appendChild(groupElement);
            groupElement.label = isNull(option._group) ? "null" : option._group;
            groupElementMap[String(option._group)] = groupElement;
          }

          _addOptionElement(option, groupElement);
        } else {
          _addOptionElement(option, listFragment);
        }
      });

      selectNode.appendChild(listFragment);

      ngModelCtrl.$render();

      if (!ngModelCtrl.$isEmpty(previousValue)) {
        const nextValue = selectCtrl._readValue();

        const isNotPrimitive = multiple;

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
      pre: function ngOptionsPreLink(
        _scope: ng.Scope,
        _selectElement: Element,
        _attr: ng.Attributes,
        ctrls: [SelectController],
      ) {
        ctrls[0]._registerOption = () => {
          /* empty */
        };
      },
      post: ngOptionsPostLink,
    },
  };
}
