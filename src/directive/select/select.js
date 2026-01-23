import { $injectTokens } from "../../injection-tokens.js";
import { getCacheData } from "../../shared/dom.js";
import { NodeType } from "../../shared/node.js";
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

  /**
   * @type {Array<string>}
   */
  /* @ignore */ static $inject = [$injectTokens._element, $injectTokens._scope];

  /**
   * @param {HTMLSelectElement} $element
   * @param {ng.Scope} $scope
   */
  constructor($element, $scope) {
    /** @type {HTMLSelectElement} */
    this._element = $element;

    /** @type {ng.Scope} */
    this._scope = $scope;

    /** @type {Object<string, any>} */
    this._selectValueMap = {};

    /** @type {any} */
    this._ngModelCtrl = {};

    /** @type {boolean} */
    this._multiple = false;

    /** @private @type {HTMLOptionElement} */
    this._unknownOption = document.createElement("option");

    /** @type {boolean} */
    this._hasEmptyOption = false;

    /** @type {HTMLOptionElement|undefined} */
    this._emptyOption = undefined;

    /** @type {Map<any, number>} */
    this._optionsMap = new Map();

    /** @type {boolean} */
    this._renderScheduled = false;

    /** @type {boolean} */
    this._updateScheduled = false;

    $scope.$on("$destroy", () => {
      // disable unknown option so that we don't do work when the whole select is being destroyed
      this._renderUnknownOption = () => {
        /* empty */
      };
    });
  }

  /**
   * Render the unknown option when the viewValue doesn't match any options.
   * @param {*} val
   */
  _renderUnknownOption(val) {
    const unknownVal = this._generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._element.prepend(this._unknownOption);
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this._element.value = unknownVal;
  }

  /**
   * Update the unknown option if it's already rendered.
   * @param {*} val
   */
  _updateUnknownOption(val) {
    const unknownVal = this._generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this._element.value = unknownVal;
  }

  /**
   * Generate a special value used for unknown options.
   * @param {*} val
   * @returns {string}
   */
  _generateUnknownOptionValue(val) {
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
      /** @type {HTMLOptionElement} */ (this._emptyOption).selected = false;
    }
  }

  /**
   * Read the current value from the select element.
   * @returns {*|null}
   */
  _readValue() {
    const val = this._element.value;

    const realVal =
      val in this._selectValueMap ? this._selectValueMap[val] : val;

    return this._hasOption(realVal) ? realVal : null;
  }

  /**
   * Write a value to the select control.
   * @param {*} value
   */
  _writeValue(value) {
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
   * Register a new option with the controller.
   * @param {*} value
   * @param {HTMLOptionElement} element
   */
  _addOption(value, element) {
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
   * Remove an option from the controller.
   * @param {*} value
   */
  _removeOption(value) {
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
   * Check if an option exists for the given value.
   * @param {*} value
   * @returns {boolean}
   */
  _hasOption(value) {
    return !!this._optionsMap.get(value);
  }

  /**
   * @returns {boolean} Whether the select element currently has an empty option.
   */
  $hasEmptyOption() {
    return this._hasEmptyOption;
  }

  /**
   * @returns {boolean} Whether the unknown option is currently selected.
   */
  $isUnknownOptionSelected() {
    return this._element.options[0] === this._unknownOption;
  }

  /**
   * @returns {boolean} Whether the empty option is selected.
   */
  $isEmptyOptionSelected() {
    return (
      this._hasEmptyOption &&
      this._element.options[this._element.selectedIndex] === this._emptyOption
    );
  }

  /**
   * Select unknown or empty option depending on the value.
   * @param {*} value
   */
  _selectUnknownOrEmptyOption(value) {
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
   * Schedule a view value update at the end of the digest cycle.
   * @param {boolean} [renderAfter=false]
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
   * Register an option with interpolation or dynamic value/text.
   * @param {any} optionScope
   * @param {HTMLOptionElement} optionElement
   * @param {any} optionAttrs
   * @param {Function} [interpolateValueFn]
   * @param {Function} [interpolateTextFn]
   */
  registerOption(
    optionScope,
    optionElement,
    optionAttrs,
    interpolateValueFn,
    interpolateTextFn,
  ) {
    /**
     * @type {any}
     */
    let oldVal;

    /**
     * @type {string}
     */
    let hashedVal;

    if (optionAttrs.$attr.ngValue) {
      optionAttrs.$observe("value", (/** @type {any} */ newVal) => {
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
      optionAttrs.$observe("value", (/** @type {any} */ newVal) => {
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

    optionAttrs.$observe("disabled", (/** @type {string} */ newVal) => {
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
 * @returns {ng.Directive}
 */
export function selectDirective() {
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

  /**
   * @param {ng.Scope} _scope
   * @param {{ addEventListener: (arg0: string, arg1: () => void) => void; getElementsByTagName: (arg0: string) => HTMLCollection; }} element
   * @param {ng.Attributes} attr
   * @param {any[]} ctrls
   */
  function selectPreLink(_scope, element, attr, ctrls) {
    /** @type {SelectController} */
    const selectCtrl = /** @type {SelectController} */ (ctrls[0]);

    /** @type {import("../model/model.js").NgModelController} */
    const ngModelCtrl = ctrls[1];

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
        /**
         * @type {any[]}
         */
        const array = [];

        /**
         * @type {HTMLCollection}
         */
        const options = element.getElementsByTagName("option");

        Array.from(options).forEach((option) => {
          if (
            /** @type {HTMLOptionElement} */ (option).selected &&
            !(/** @type {HTMLOptionElement} */ (option).disabled)
          ) {
            const val = /** @type {HTMLOptionElement} */ (option).value;

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
      selectCtrl._writeValue = function (value) {
        /**
         * @type {HTMLCollection}
         */
        const options = element.getElementsByTagName("option");

        Array.from(options).forEach((option) => {
          const shouldBeSelected =
            !!value &&
            (includes(value, /** @type {HTMLOptionElement} */ (option).value) ||
              includes(
                value,
                selectCtrl._selectValueMap[
                  /** @type {HTMLOptionElement} */ (option).value
                ],
              ));

          const currentlySelected = /** @type {HTMLOptionElement} */ (option)
            .selected;

          // Support: IE 9-11 only, Edge 12-15+
          // In IE and Edge adding options to the selection via shift+click/UP/DOWN
          // will de-select already selected options if "selected" on those options was set
          // more than once (i.e. when the options were already selected)
          // So we only modify the selected property if necessary.
          // Note: this behavior cannot be replicated via unit tests because it only shows in the
          // actual user interface.
          if (shouldBeSelected !== currentlySelected) {
            /** @type {HTMLOptionElement} */ (option).selected =
              shouldBeSelected;
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
      ngModelCtrl.$isEmpty = function (value) {
        return !value || value.length === 0;
      };
    }
  }

  /**
   * @param {ng.Scope} _scope
   * @param {HTMLElement} _element
   * @param {ng.Attributes} _attrs
   * @param {any[]} ctrls
   */
  function selectPostLink(_scope, _element, _attrs, ctrls) {
    // if ngModel is not defined, we don't need to do anything
    const ngModelCtrl = ctrls[1];

    if (!ngModelCtrl) return;

    const selectCtrl = /** @type {SelectController} */ (ctrls[0]);

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
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export function optionDirective($interpolate) {
  return {
    restrict: "E",
    priority: 100,
    compile(element, attr) {
      /**
       * @type {import("../../core/interpolate/interface.ts").InterpolationFunction | undefined}
       */
      let interpolateValueFn;

      /**
       * @type {import("../../core/interpolate/interface.ts").InterpolationFunction | undefined}
       */
      let interpolateTextFn;

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

      return function (scope, elemParam, attrParam) {
        // This is an optimization over using ^^ since we don't want to have to search
        // all the way to the root of the DOM for every single option element
        const selectCtrlName = "$selectController";

        const parent = elemParam.parentElement;

        const selectCtrl =
          getCacheData(/** @type {HTMLElement} */ (parent), selectCtrlName) ||
          getCacheData(
            /** @type {HTMLElement} */ (
              /** @type {HTMLElement} */ (parent).parentElement
            ),
            selectCtrlName,
          ); // in case we are in optgroup

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
    },
  };
}
