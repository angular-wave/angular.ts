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
  element: HTMLOptionElement | null = null;
  selectValue: any;
  viewValue: any;
  label: any;
  group: any;
  disabled: any;

  constructor(
    selectValue: any,
    viewValue: any,
    label: any,
    group: any,
    disabled: any,
  ) {
    this.selectValue = selectValue;
    this.viewValue = viewValue;
    this.label = label;
    this.group = group;
    this.disabled = disabled;
  }
}

ngOptionsDirective.$inject = [$injectTokens._compile, $injectTokens._parse];

type NgOptionsCollection = {
  items: OptionItem[];
  selectValueMap: Record<string, OptionItem>;
  getOptionFromViewValue(value: any): OptionItem | undefined;
  getViewValueFromOption(option: OptionItem): any;
};

type SelectControllerLike = Record<string, any>;

export function ngOptionsDirective(
  $compile: ng.CompileService,
  $parse: ng.ParseService,
): ng.Directive {
  function parseOptionsExpression(
    optionsExp: string,
    selectElement: HTMLSelectElement,
    scope: ng.Scope,
  ) {
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

    const trackByFn = trackBy ? $parse(trackBy) : undefined;

    const getTrackByValueFn = trackBy
      ? function (value: any, locals: Record<string, any>) {
          return trackByFn!(scope, locals);
        }
      : function getHashOfValue(value: any) {
          return hashKey(value);
        };

    const getTrackByValue = function (value: any, key: any) {
      return getTrackByValueFn(value, getLocals(value, key));
    };

    const displayFn = $parse(match[2] || match[1]);

    const groupByFn = $parse(match[3] || "");

    const disableWhenFn = $parse(match[4] || "");

    const valuesFn = $parse(match[8]);

    const locals: Record<string, any> = {};

    const getLocals = keyName
      ? function (value: any, key: any) {
          locals[keyName] = key;
          locals[valueName] = value;

          return locals;
        }
      : function (value: any) {
          locals[valueName] = value;

          return locals;
        };

    function getOptionValuesKeys(optionValues: any) {
      let optionValuesKeys: any[];

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
      getWatchables: match[8],
      getOptions() {
        const optionItems = [];

        const selectValueMap: Record<string, OptionItem> = {};

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
          getOptionFromViewValue(value: any) {
            return selectValueMap[getTrackByValue(value, undefined)];
          },
          getViewValueFromOption(option: OptionItem) {
            return trackBy
              ? structuredClone(option.viewValue)
              : option.viewValue;
          },
        };
      },
    };
  }

  function ngOptionsPostLink(
    scope: ng.Scope & Record<string, any>,
    selectElement: Element,
    attr: ng.Attributes & Record<string, any>,
    ctrls: [SelectControllerLike, ng.NgModelController & Record<string, any>],
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
        selectCtrl.hasEmptyOption = true;
        selectCtrl.emptyOption = children[i];
        break;
      }
    }

    emptyElement(selectNode);

    const providedEmptyOption = !!selectCtrl.emptyOption;

    const unknownOption = optionTemplate.cloneNode(false) as HTMLOptionElement;

    unknownOption.nodeValue = "?";

    let options: NgOptionsCollection | undefined;

    const ngOptions = parseOptionsExpression(attr.ngOptions, selectNode, scope);

    const listFragment = document.createDocumentFragment();

    selectCtrl._generateUnknownOptionValue = () => "?";

    if (!multiple) {
      selectCtrl._writeValue = function writeNgOptionsValue(value: any) {
        if (!options) return;

        const selectedOption = selectNode.options[selectNode.selectedIndex];

        const option = options.getOptionFromViewValue(value);

        if (selectedOption) selectedOption.removeAttribute("selected");

        if (option) {
          if (selectNode.value !== option.selectValue) {
            selectCtrl._removeUnknownOption();

            selectNode.value = option.selectValue;
            option.element!.selected = true;
          }

          option.element!.setAttribute("selected", "selected");
        } else {
          selectCtrl._selectUnknownOrEmptyOption(value);
        }
      };

      selectCtrl._readValue = function readNgOptionsValue() {
        if (!options) return null;
        const selectedOption = options.selectValueMap[selectNode.value];

        if (selectedOption && !selectedOption.disabled) {
          selectCtrl._un_selectEmptyOption();
          selectCtrl._removeUnknownOption();

          return options.getViewValueFromOption(selectedOption);
        }

        return null;
      };

      if (ngOptions.trackBy) {
        scope.$watch(attr.ngModel, () => {
          ngModelCtrl.$render();
        });
      }
    } else {
      selectCtrl._writeValue = function writeNgOptionsMultiple(values: any[]) {
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
        if (!options) return [];

        const selections: any[] = [];

        const optionsEls = selectNode.options;

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

      if (ngOptions.trackBy) {
        scope.$watch(attr.ngModel, () => {
          ngModelCtrl.$render();
        });
      }
    }

    if (providedEmptyOption) {
      const linkFn = $compile(selectCtrl.emptyOption);

      selectNode.prepend(selectCtrl.emptyOption);
      linkFn(scope);

      if (selectCtrl.emptyOption.nodeType === NodeType._COMMENT_NODE) {
        selectCtrl.hasEmptyOption = false;

        selectCtrl.registerOption = function (
          _optionScope: ng.Scope,
          optionEl: HTMLOptionElement,
        ) {
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

    scope.$watch(ngOptions.getWatchables, updateOptions as any);

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
      const option = options?.getOptionFromViewValue(viewValue);

      const element = option && option.element;

      if (element && !element.selected) element.selected = true;

      return option;
    }

    function updateOptionElement(
      option: OptionItem,
      element: HTMLOptionElement,
    ) {
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
            if (option.element?.parentElement) {
              removeElement(option.element.parentElement);
            }
          } else {
            if (option.element) {
              removeElement(option.element);
            }
          }
        }
      }

      options = ngOptions.getOptions();

      const groupElementMap: Record<string, HTMLOptGroupElement> = {};

      options.items.forEach((option) => {
        let groupElement;

        if (isDefined(option.group)) {
          groupElement = groupElementMap[String(option.group)];

          if (!groupElement) {
            groupElement = optGroupTemplate.cloneNode(
              false,
            ) as HTMLOptGroupElement;
            listFragment.appendChild(groupElement);
            groupElement.label = option.group === null ? "null" : option.group;
            groupElementMap[String(option.group)] = groupElement;
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
      pre: function ngOptionsPreLink(
        scope: ng.Scope,
        selectElement: Element,
        attr: ng.Attributes,
        ctrls: [SelectControllerLike],
      ) {
        ctrls[0].registerOption = () => {
          /* empty */
        };
      },
      post: ngOptionsPostLink,
    },
  };
}
