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

const optionTemplate = document.createElement("option") as HTMLOptionElement;

const optGroupTemplate = document.createElement(
  "optgroup",
) as HTMLOptGroupElement;

const NG_OPTIONS_REGEXP =
  /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([$\w][$\w]*)|(?:\(\s*([$\w][$\w]*)\s*,\s*([$\w][$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;

// 1: value expression (valueFn)
// 2: label expression (displayFn)
// 3: group by expression (groupByFn)
// 4: disable when expression (disableWhenFn)
// 5: array item variable name
// 6: object item key variable name
// 7: object item value variable name
// 8: collection expression
// 9: track by expression

class OptionItem {
  selectValue: any;

  viewValue: any;

  label: any;

  group: any;

  disabled: any;

  element: HTMLOptionElement | null = null;

  /** Stores one normalized option entry produced from the `ngOptions` expression. */
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

interface NgOptionsResult {
  items: OptionItem[];
  selectValueMap: Record<string, OptionItem>;
  getOptionFromViewValue(value: any): OptionItem | undefined;
  getViewValueFromOption(option: OptionItem): any;
}

interface ParsedNgOptions {
  trackBy: any;
  getTrackByValue(value: any, key?: any): any;
  getWatchables: any;
  getOptions(): NgOptionsResult;
}

ngOptionsDirective.$inject = [$injectTokens._compile, $injectTokens._parse];
/** Parses `ngOptions` expressions and keeps the `<select>` options in sync with the model. */
export function ngOptionsDirective(
  $compile: ng.CompileService,
  $parse: ng.ParseService,
): ng.Directive {
  /** Parses the `ngOptions` expression into reusable getters and option builders. */
  function parseOptionsExpression(
    optionsExp: string,
    selectElement: HTMLSelectElement,
    scope: ng.Scope,
  ): ParsedNgOptions {
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
    // Extract the parts from the ngOptions expression

    // The variable name for the value of the item in the collection
    const valueName = match[5] || match[7];

    // The variable name for the key of the item in the collection
    const keyName = match[6];

    // An expression that generates the viewValue for an option if there is a label expression
    const selectAs = / as /.test(match[0]) && match[1];

    // An expression that is used to track the id of each object in the options collection
    const trackBy = match[9];

    // An expression that generates the viewValue for an option if there is no label expression
    const valueFn = $parse(match[2] ? match[1] : valueName);

    const selectAsFn = selectAs && $parse(selectAs);

    const viewValueFn = selectAsFn || valueFn;

    const trackByFn = trackBy ? ($parse(trackBy) as any) : undefined;

    // Get the value by which we are going to track the option
    // if we have a trackFn then use that (passing scope and locals)
    // otherwise just hash the given viewValue
    const getTrackByValueFn = trackBy
      ? function (value: any, locals: Record<string, any>) {
          return trackByFn!(scope, locals);
        }
      : function getHashOfValue(value: any) {
          return hashKey(value);
        };

    const getTrackByValue = function (value: any, key?: any) {
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

    /** Returns the iteration keys used to traverse the option source collection. */
    function getOptionValuesKeys(
      optionValues: any[] | Record<string, any>,
    ): any[] {
      let optionValuesKeys: any[];

      if (!keyName && isArrayLike(optionValues)) {
        optionValuesKeys = Array.from(optionValues as ArrayLike<any>);
      } else {
        // if object, extract keys, in enumeration order, unsorted
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
        const optionItems: OptionItem[] = [];

        const selectValueMap: Record<string, OptionItem> = {};

        // The option values were already computed in the `getWatchables` fn,
        // which must have been called to trigger `getOptions`
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
          /** Resolves the option entry that corresponds to a view value. */
          getOptionFromViewValue(value) {
            return selectValueMap[getTrackByValue(value, undefined)];
          },
          /** Returns the model/view value represented by an option entry. */
          getViewValueFromOption(option) {
            // If the viewValue could be an object that may be mutated by the application,
            // we need to make a copy and not return the reference to the value on the option.
            return trackBy
              ? structuredClone(option.viewValue)
              : option.viewValue;
          },
        };
      },
    };
  }

  /** Links `ngOptions` behavior onto a `<select>` and keeps options synchronized with the model. */
  function ngOptionsPostLink(
    scope: ng.Scope,
    selectElement: HTMLSelectElement,
    attr: ng.Attributes,
    ctrls: any[],
  ) {
    const selectCtrl = ctrls[0] as any;

    const ngModelCtrl = ctrls[1] as any;

    const { multiple } = attr;

    // The emptyOption allows the application developer to provide their own custom "empty"
    // option when the viewValue does not match any of the option values.
    for (
      let i = 0, children = selectElement.childNodes, ii = children.length;
      i < ii;
      i++
    ) {
      const child = children[i] as HTMLOptionElement;

      if (child.value === "") {
        selectCtrl.hasEmptyOption = true;
        selectCtrl.emptyOption = child;
        break;
      }
    }

    // The empty option will be compiled and rendered before we first generate the options
    emptyElement(selectElement);

    const providedEmptyOption = !!selectCtrl.emptyOption;

    const unknownOption = optionTemplate.cloneNode(false);

    // TODO double check
    unknownOption.nodeValue = "?";

    let options: NgOptionsResult | undefined;

    const ngOptions: ParsedNgOptions = parseOptionsExpression(
      attr.ngOptions,
      selectElement,
      scope,
    );

    // This stores the newly created options before they are appended to the select.
    // Since the contents are removed from the fragment when it is appended,
    // we only need to create it once.
    const listFragment = document.createDocumentFragment();

    // Overwrite the implementation. ngOptions doesn't use hashes
    selectCtrl._generateUnknownOptionValue = () => "?";

    // Update the controller methods for multiple selectable options
    if (!multiple) {
      selectCtrl._writeValue = function writeNgOptionsValue(value: any) {
        // The options might not be defined yet when ngModel tries to render
        if (!options) return;

        const selectedOption =
          selectElement.options[selectElement.selectedIndex];

        const option = options.getOptionFromViewValue(value);

        // Make sure to remove the selected attribute from the previously selected option
        // Otherwise, screen readers might get confused
        if (selectedOption) selectedOption.removeAttribute("selected");

        if (option) {
          // Don't update the option when it is already selected.
          // For example, the browser will select the first option by default. In that case,
          // most properties are set automatically - except the `selected` attribute, which we
          // set always

          if (selectElement.value !== option.selectValue) {
            selectCtrl._removeUnknownOption();

            selectElement.value = option.selectValue;
            option.element!.selected = true;
          }

          option.element!.setAttribute("selected", "selected");
        } else {
          selectCtrl._selectUnknownOrEmptyOption(value);
        }
      };

      selectCtrl._readValue = function readNgOptionsValue() {
        if (!options) return null;

        const selectedOption = options.selectValueMap[selectElement.value];

        if (selectedOption && !selectedOption.disabled) {
          selectCtrl._un_selectEmptyOption();
          selectCtrl._removeUnknownOption();

          return options.getViewValueFromOption(selectedOption);
        }

        return null;
      };

      // If we are using `track by` then we must watch the tracked value on the model
      // since ngModel only watches for object identity change
      // FIXME: When a user selects an option, this watch will fire needlessly
      if (ngOptions.trackBy) {
        scope.$watch(
          ngOptions.getTrackByValue(ngModelCtrl.$viewValue, undefined),
          () => {
            ngModelCtrl.$render();
          },
        );
      }
    } else {
      selectCtrl._writeValue = function writeNgOptionsMultiple(values: any[]) {
        // The options might not be defined yet when ngModel tries to render
        if (!options) return;

        // Only set `<option>.selected` if necessary, in order to prevent some browsers from
        // scrolling to `<option>` elements that are outside the `<select>` element's viewport.
        const selectedOptions = ((values &&
          values.map(getAndUpdateSelectedOption)) ||
          []) as OptionItem[];

        options.items.forEach(
          /** @param  option */ (option) => {
            if (
              option.element?.selected &&
              !includes(selectedOptions, option)
            ) {
              option.element!.selected = false;
            }
          },
        );
      };

      selectCtrl._readValue = function readNgOptionsMultiple() {
        if (!options) return [];

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

      // If we are using `track by` then we must watch these tracked values on the model
      // since ngModel only watches for object identity change
      // if (ngOptions.trackBy) {
      //   scope.$watchCollection(
      //     () => {
      //       if (isArray(ngModelCtrl.$viewValue)) {
      //         return ngModelCtrl.$viewValue.map((value) =>
      //           ngOptions.getTrackByValue(value),
      //         );
      //       }
      //     },
      //     () => {
      //       ngModelCtrl.$render();
      //     },
      //   );
      // }
    }

    if (providedEmptyOption) {
      // compile the element since there might be bindings in it
      const linkFn = $compile(selectCtrl.emptyOption);

      selectElement.prepend(selectCtrl.emptyOption);
      linkFn(scope);

      if (selectCtrl.emptyOption.nodeType === NodeType._COMMENT_NODE) {
        // This means the empty option has currently no actual DOM node, probably because
        // it has been modified by a transclusion directive.
        selectCtrl.hasEmptyOption = false;

        // Redefine the registerOption function, which will catch
        // options that are added by ngIf etc. (rendering of the node is async because of
        // lazy transclusion)
        selectCtrl.registerOption = function (
          _optionScope: ng.Scope,
          optionEl: HTMLOptionElement,
        ) {
          if (optionEl.value === "") {
            selectCtrl.hasEmptyOption = true;
            selectCtrl.emptyOption = optionEl;
            // This ensures the new empty option is selected if previously no option was selected
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

    // We will re-render the option elements if the option values or labels change

    // let watchables = ngOptions.getWatchables();
    // watchables.forEach((i) => {
    //   scope.$watch(i, updateOptions);
    // });
    const decoratedExpression = ngOptions.getWatchables._decoratedNode.body[0]
      .expression as import("../../core/parse/ast/ast-node.ts").ExpressionNode &
      import("../../core/parse/ast/ast-node.ts").LiteralNode;
    const prop = decoratedExpression.name as string;

    scope.$watch(prop, updateOptions);

    // ------------------------------------------------------------------ //

    /** Creates and inserts one `<option>` element for the normalized option item. */
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

    /** Marks the option corresponding to the provided view value as selected. */
    function getAndUpdateSelectedOption(viewValue: any) {
      if (!options) return undefined;

      const option = options.getOptionFromViewValue(viewValue);

      const element = option?.element;

      if (element && !element.selected) element.selected = true;

      return option;
    }

    /** Updates an `<option>` DOM element from the normalized option item state. */
    function updateOptionElement(
      option: OptionItem,
      element: HTMLOptionElement,
    ) {
      option.element = element;
      element.disabled = option.disabled;

      // Support: IE 11 only, Edge 12-13 only
      // NOTE: The label must be set before the value, otherwise IE 11 & Edge create unresponsive
      // selects in certain circumstances when multiple selects are next to each other and display
      // the option list in listbox style, i.e. the select is [multiple], or specifies a [size].
      // See https://github.com/angular/angular.ts/issues/11314 for more info.
      // This is unfortunately untestable with unit / e2e tests
      if (option.label !== element.label) {
        element.label = option.label;
        element.textContent = option.label;
      }
      element.value = option.selectValue;
    }

    function updateOptions() {
      const previousValue = options && selectCtrl._readValue();

      // We must remove all current options, but cannot simply set innerHTML = null
      // since the providedEmptyOption might have an ngIf on it that inserts comments which we
      // must preserve.
      // Instead, iterate over the current option elements and remove them or their optgroup
      // parents
      if (options) {
        for (let i = options.items.length - 1; i >= 0; i--) {
          const option = options.items[i];

          if (isDefined(option.group)) {
            if (option.element?.parentNode) {
              removeElement(option.element.parentNode as Element);
            }
          } else if (option.element) {
            removeElement(option.element);
          }
        }
      }

      options = ngOptions.getOptions();

      const groupElementMap: Record<string, HTMLOptGroupElement> = {};

      options.items.forEach(
        /** @param  option */ (option) => {
          let groupElement: HTMLOptGroupElement | undefined;

          if (isDefined(option.group)) {
            // This option is to live in a group
            // See if we have already created this group
            groupElement = groupElementMap[option.group];

            if (!groupElement) {
              groupElement = optGroupTemplate.cloneNode(
                false,
              ) as HTMLOptGroupElement;
              listFragment.appendChild(groupElement);

              // Update the label on the group element
              // "null" is special cased because of Safari
              groupElement.label =
                option.group === null ? "null" : option.group;

              // Store it for use later
              groupElementMap[option.group] = groupElement;
            }

            _addOptionElement(option, groupElement);
          } else {
            // This option is not in a group
            _addOptionElement(option, listFragment);
          }
        },
      );

      selectElement.appendChild(listFragment);

      ngModelCtrl.$render();

      // Check to see if the value has changed due to the update to the options
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
        selectElement: HTMLSelectElement,
        attr: ng.Attributes,
        ctrls: any[],
      ) {
        // Deactivate the SelectController.register method to prevent
        // option directives from accidentally registering themselves
        // (and unwanted $destroy handlers etc.)
        ctrls[0].registerOption = () => {
          /* empty */
        };
      } as import("../../interface.ts").DirectiveLinkFn<any>,
      post: ngOptionsPostLink as import("../../interface.ts").DirectiveLinkFn<any>,
    },
  };
}
