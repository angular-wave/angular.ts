import { $injectTokens } from "../../injection-tokens.js";
import { getCacheData } from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import {
  assertNotHasOwnProperty,
  equals,
  hashKey,
  includes,
  isDefined,
  isNullOrUndefined,
  isUndefined,
  shallowCopy,
} from "../../shared/utils.js";
import type { InterpolationFunction } from "../../core/interpolate/interpolate.ts";
import type { NgModelController } from "../model/model.ts";

/**
 * The controller for the {@link ng.select select} directive.
 * The controller exposes a few utility methods that can be used to augment
 * the behavior of a regular or an {@link ng.ngOptions ngOptions} select element.
 */
class SelectController {
  static $nonscope = [
    "ngModelCtrl",
    "selectValueMap",
    "emptyOption",
    "optionsMap",
  ];

  /* @ignore */ static $inject = [$injectTokens._element, $injectTokens._scope];

  _element: HTMLSelectElement;

  _scope: ng.Scope & {
    _destroyed?: boolean;
    $postUpdate(fn: () => void): void;
  };

  _selectValueMap: Record<string, any>;

  _ngModelCtrl: any;

  _multiple: boolean;

  _unknownOption: HTMLOptionElement;

  _hasEmptyOption: boolean;

  _emptyOption: HTMLOptionElement | undefined;

  _optionsMap: Map<any, number>;

  _renderScheduled: boolean;

  _updateScheduled: boolean;

  /**
   * Creates the select controller for one `<select>` element.
   */
  constructor(
    $element: HTMLSelectElement,
    $scope: ng.Scope & {
      _destroyed?: boolean;
      $postUpdate(fn: () => void): void;
    },
  ) {
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

    $scope.$on("$destroy", () => {
      // disable unknown option so that we don't do work when the whole select is being destroyed
      this._renderUnknownOption = () => {
        /* empty */
      };
    });
  }

  /**
   * Renders the unknown option when the view value doesn't match any option.
   */
  _renderUnknownOption(val: any) {
    const unknownVal = this._generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._element.prepend(this._unknownOption);
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this._element.value = unknownVal;
  }

  /**
   * Updates the already-rendered unknown option.
   */
  _updateUnknownOption(val: any) {
    const unknownVal = this._generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this._element.value = unknownVal;
  }

  /**
   * Generates the sentinel value used for the unknown option.
   */
  _generateUnknownOptionValue(val: any): string {
    if (isUndefined(val)) {
      return `? undefined:undefined ?`;
    }

    return `? ${hashKey(val)} ?`;
  }

  /**
   * Remove the unknown option from the select element if it exists.
   */
  _removeUnknownOption() {
    if (this._unknownOption.parentElement) this._unknownOption.remove();
  }

  /**
   * Select the empty option (value="") if it exists.
   */
  _selectEmptyOption() {
    if (this._emptyOption) {
      this._element.value = "";
      this._emptyOption.selected = true;
      this._emptyOption.setAttribute("selected", "selected");
    }
  }

  /**
   * Unselect the empty option if present.
   */
  _un_selectEmptyOption() {
    if (this._hasEmptyOption) {
      this._emptyOption!.selected = false;
    }
  }

  /**
   * Reads the current value from the select element.
   */
  _readValue() {
    const val = this._element.value;

    const realVal =
      val in this._selectValueMap ? this._selectValueMap[val] : val;

    return this._hasOption(realVal) ? realVal : null;
  }

  /**
   * Writes a value to the select control.
   */
  _writeValue(value: any) {
    const currentlySelectedOption =
      this._element.options[this._element.selectedIndex];

    if (currentlySelectedOption) currentlySelectedOption.selected = false;

    if (this._hasOption(value)) {
      this._removeUnknownOption();

      const hashedVal = hashKey(value);

      this._element.value =
        hashedVal in this._selectValueMap ? hashedVal : value;
      const selectedOption = this._element.options[this._element.selectedIndex];

      if (!selectedOption) {
        this._selectUnknownOrEmptyOption(value);
      } else {
        selectedOption.selected = true;
      }
    } else {
      this._selectUnknownOrEmptyOption(value);
    }
  }

  /**
   * Registers a new option with the controller.
   */
  _addOption(value: any, element: HTMLOptionElement) {
    if (element.nodeType === NodeType._COMMENT_NODE) return;

    assertNotHasOwnProperty(value, '"option value"');

    if (value === "") {
      this._hasEmptyOption = true;
      this._emptyOption = element;
    }
    const count = this._optionsMap.get(value) || 0;

    this._optionsMap.set(value, count + 1);
    this._scheduleRender();
  }

  /**
   * Removes one option from the controller.
   */
  _removeOption(value: any) {
    const count = this._optionsMap.get(value);

    if (count) {
      if (count === 1) {
        this._optionsMap.delete(value);

        if (value === "") {
          this._hasEmptyOption = false;
          this._emptyOption = undefined;
        }
      } else {
        this._optionsMap.set(value, count - 1);
      }
    }
  }

  /**
   * Returns whether an option exists for the given value.
   */
  _hasOption(value: any): boolean {
    return !!this._optionsMap.get(value);
  }

  /**
   * @returns Whether the select element currently has an empty option.
   */
  $hasEmptyOption() {
    return this._hasEmptyOption;
  }

  /**
   * @returns Whether the unknown option is currently selected.
   */
  $isUnknownOptionSelected() {
    return this._element.options[0] === this._unknownOption;
  }

  /**
   * @returns Whether the empty option is selected.
   */
  $isEmptyOptionSelected() {
    return (
      this._hasEmptyOption &&
      this._element.options[this._element.selectedIndex] === this._emptyOption
    );
  }

  /**
   * Selects either the unknown option or the empty option for a value.
   */
  _selectUnknownOrEmptyOption(value: any) {
    if (isNullOrUndefined(value) && this._emptyOption) {
      this._removeUnknownOption();
      this._selectEmptyOption();
    } else if (this._unknownOption.parentElement) {
      this._updateUnknownOption(value);
    } else {
      this._renderUnknownOption(value);
    }
  }

  /**
   * Schedule a render at the end of the digest cycle.
   */
  _scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    this._scope.$postUpdate(() => {
      this._renderScheduled = false;
      this._ngModelCtrl.$render();
    });
  }

  /**
   * Schedules a view-value update at the end of the digest cycle.
   */
  _scheduleViewValueUpdate(renderAfter = false) {
    if (this._updateScheduled) return;

    this._updateScheduled = true;

    this._scope.$postUpdate(() => {
      if (this._scope._destroyed) return;

      this._updateScheduled = false;
      this._ngModelCtrl.$setViewValue(this._readValue());

      if (renderAfter) this._ngModelCtrl.$render();
    });
  }

  /**
   * Registers an option with interpolation or dynamic value/text handling.
   */
  registerOption(
    optionScope: any,
    optionElement: HTMLOptionElement,
    optionAttrs: any,
    interpolateValueFn?: ((scope: any) => any) | undefined,
    interpolateTextFn?: ((scope: any) => any) | undefined,
  ): void {
    let oldVal: any;
    let hashedVal: string | undefined;

    if (optionAttrs.$attr.ngValue) {
      optionAttrs.$observe("value", (newVal: any) => {
        let removal;

        const previouslySelected = optionElement.selected;

        if (isDefined(hashedVal)) {
          this._removeOption(oldVal);
          delete this._selectValueMap[hashedVal];
          removal = true;
        }

        hashedVal = hashKey(newVal);
        oldVal = newVal;
        this._selectValueMap[hashedVal] = newVal;
        this._addOption(newVal, optionElement);
        optionElement.setAttribute("value", hashedVal);

        if (removal && previouslySelected) {
          this._scheduleViewValueUpdate();
        }
      });
    } else if (interpolateValueFn) {
      optionAttrs.$observe("value", (newVal: any) => {
        this._readValue();
        let removal;

        const previouslySelected = optionElement.selected;

        if (isDefined(oldVal)) {
          this._removeOption(oldVal);
          removal = true;
        }
        oldVal = newVal;
        this._addOption(newVal, optionElement);

        if (removal && previouslySelected) {
          this._scheduleViewValueUpdate();
        }
      });
    } else if (interpolateTextFn) {
      optionScope.value = interpolateTextFn(optionScope);

      if (!optionAttrs.value) {
        optionAttrs.$set("value", optionScope.value);
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
        this._addOption(newVal, optionElement);

        if (oldVal && previouslySelected) {
          this._scheduleViewValueUpdate();
        }
      });
    } else {
      this._addOption(optionAttrs.value, optionElement);
    }

    optionAttrs.$observe("disabled", (newVal: string) => {
      if (newVal === "true" || (newVal && optionElement.selected)) {
        if (this._multiple) {
          this._scheduleViewValueUpdate(true);
        } else {
          this._ngModelCtrl.$setViewValue(null);
          this._ngModelCtrl.$render();
        }
      }
    });

    optionElement.addEventListener("$destroy", () => {
      const currentValue = this._readValue();

      const removeValue = optionAttrs.value;

      this._removeOption(removeValue);
      this._scheduleRender();

      if (
        (this._multiple &&
          currentValue &&
          currentValue.indexOf(removeValue) !== -1) ||
        currentValue === removeValue
      ) {
        this._scheduleViewValueUpdate(true);
      }
    });
  }
}

/**
 * Main `<select>` directive definition.
 */
export function selectDirective() {
  return {
    restrict: "E",
    require: ["select", "?ngModel"],
    controller: SelectController,
    priority: 1,
    link: {
      pre: selectPreLink as import("../../interface.ts").DirectiveLinkFn<any>,
      post: selectPostLink as import("../../interface.ts").DirectiveLinkFn<any>,
    },
  };

  /**
   * Wires the select controller before child options are linked.
   */
  function selectPreLink(
    _scope: ng.Scope,
    element: HTMLSelectElement & {
      addEventListener(type: string, listener: () => void): void;
      getElementsByTagName(name: string): HTMLCollectionOf<HTMLOptionElement>;
    },
    attr: ng.Attributes,
    ctrls: any[],
  ) {
    const selectCtrl = ctrls[0] as SelectController;
    const ngModelCtrl = ctrls[1] as NgModelController | undefined;

    // if ngModel is not defined, we don't need to do anything but set the registerOption
    // function to noop, so options don't get added internally
    if (!ngModelCtrl) {
      selectCtrl.registerOption = () => {
        /* empty */
      };

      return;
    }
    selectCtrl._ngModelCtrl = ngModelCtrl;

    // When the selected item(s) changes we delegate getting the value of the select control
    // to the `_readValue` method, which can be changed if the select can have multiple
    // selected values or if the options are being generated by `ngOptions`
    element.addEventListener("change", () => {
      selectCtrl._removeUnknownOption();
      const viewValue = selectCtrl._readValue();

      ngModelCtrl.$setViewValue(viewValue);
    });

    // If the select allows multiple values then we need to modify how we read and write
    // values from and to the control; also what it means for the value to be empty and
    // we have to add an extra watch since ngModel doesn't work well with arrays - it
    // doesn't trigger rendering if only an item in the array changes.
    if (attr.multiple) {
      selectCtrl._multiple = true;

      // Read value now needs to check each option to see if it is selected
      selectCtrl._readValue = function () {
        const array: any[] = [];
        const options = element.getElementsByTagName("option");

        Array.from(options).forEach((option: HTMLOptionElement) => {
          if (option.selected && !option.disabled) {
            const val = option.value;

            array.push(
              val in selectCtrl._selectValueMap
                ? selectCtrl._selectValueMap[val]
                : val,
            );
          }
        });

        return array;
      };

      // Write value now needs to set the selected property of each matching option
      selectCtrl._writeValue = function (value: any[]) {
        const options = element.getElementsByTagName("option");

        Array.from(options).forEach((option: HTMLOptionElement) => {
          const shouldBeSelected =
            !!value &&
            (includes(value, option.value) ||
              includes(value, selectCtrl._selectValueMap[option.value]));

          const currentlySelected = option.selected;

          // Support: IE 9-11 only, Edge 12-15+
          // In IE and Edge adding options to the selection via shift+click/UP/DOWN
          // will de-select already selected options if "selected" on those options was set
          // more than once (i.e. when the options were already selected)
          // So we only modify the selected property if necessary.
          // Note: this behavior cannot be replicated via unit tests because it only shows in the
          // actual user interface.
          if (shouldBeSelected !== currentlySelected) {
            option.selected = shouldBeSelected;
          }
        });
      };

      // we have to do it on each watch since ngModel watches reference, but
      // we need to work of an array, so we need to see if anything was inserted/removed
      let lastView;

      let lastViewRef = NaN;

      if (
        lastViewRef === ngModelCtrl.$viewValue &&
        !equals(lastView, ngModelCtrl.$viewValue)
      ) {
        lastView = shallowCopy(ngModelCtrl.$viewValue);
        ngModelCtrl.$render();
      }
      lastViewRef = ngModelCtrl.$viewValue;

      // If we are a multiple select then value is now a collection
      // so the meaning of $isEmpty changes
      ngModelCtrl.$isEmpty = function (value: any[] | null | undefined) {
        return !value || value.length === 0;
      };
    }
  }

  /**
   * Installs the final `$render` bridge after child options have linked.
   */
  function selectPostLink(
    _scope: ng.Scope,
    _element: HTMLElement,
    _attrs: ng.Attributes,
    ctrls: any[],
  ) {
    // if ngModel is not defined, we don't need to do anything
    const ngModelCtrl = ctrls[1];

    if (!ngModelCtrl) return;

    const selectCtrl = ctrls[0] as SelectController;

    // We delegate rendering to the `_writeValue` method, which can be changed
    // if the select can have multiple selected values or if the options are being
    // generated by `ngOptions`.
    // This must be done in the postLink fn to prevent $render to be called before
    // all nodes have been linked correctly.
    ngModelCtrl.$render = function () {
      selectCtrl._writeValue(ngModelCtrl.$viewValue);
    };
  }
}

// The option directive is purely designed to communicate the existence (or lack of)
// of dynamically created (and destroyed) option elements to their containing select
// directive via its controller.

optionDirective.$inject = [$injectTokens._interpolate];
/**
 * `<option>` directive that coordinates dynamic options with the parent select controller.
 */
export function optionDirective(
  $interpolate: ng.InterpolateService,
): ng.Directive {
  return {
    restrict: "E",
    priority: 100,
    compile: function optionCompile(
      element: HTMLOptionElement,
      attr: ng.Attributes,
    ) {
      let interpolateValueFn: InterpolationFunction | undefined;
      let interpolateTextFn: InterpolationFunction | undefined;

      if (isDefined(attr.ngValue)) {
        // Will be handled by registerOption
      } else if (isDefined(attr.value)) {
        // If the value attribute is defined, check if it contains an interpolation
        interpolateValueFn = $interpolate(attr.value, true);
      } else {
        // If the value attribute is not defined then we fall back to the
        // text content of the option element, which may be interpolated
        interpolateTextFn = $interpolate(element.textContent, true);

        if (!interpolateTextFn) {
          attr.$set("value", element.textContent);
        }
      }

      return function (
        scope: ng.Scope,
        elemParam: HTMLOptionElement,
        attrParam: ng.Attributes,
      ) {
        // This is an optimization over using ^^ since we don't want to have to search
        // all the way to the root of the DOM for every single option element
        const selectCtrlName = "$selectController";

        const parent = elemParam.parentElement;

        if (!parent) return;

        const selectCtrl =
          getCacheData(parent, selectCtrlName) ||
          (parent.parentElement
            ? getCacheData(parent.parentElement, selectCtrlName)
            : undefined); // in case we are in optgroup

        if (selectCtrl) {
          selectCtrl.registerOption(
            scope,
            elemParam,
            attrParam,
            interpolateValueFn,
            interpolateTextFn,
          );
        }
      };
    } as unknown as import("../../interface.ts").DirectiveCompileFn,
  };
}
