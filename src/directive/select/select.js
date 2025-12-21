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
    this.$element = $element;

    /** @type {ng.Scope} */
    this.$scope = $scope;

    /** @type {Object<string, any>} */
    this.selectValueMap = {};

    /** @type {any} */
    this.ngModelCtrl = {};

    /** @type {boolean} */
    this.multiple = false;

    /** @private @type {HTMLOptionElement} */
    this._unknownOption = document.createElement("option");

    /** @type {boolean} */
    this.hasEmptyOption = false;

    /** @type {HTMLOptionElement|undefined} */
    this.emptyOption = undefined;

    /** @type {Map<any, number>} */
    this.optionsMap = new Map();

    /** @type {boolean} */
    this.renderScheduled = false;

    /** @type {boolean} */
    this.updateScheduled = false;

    $scope.$on("$destroy", () => {
      // disable unknown option so that we don't do work when the whole select is being destroyed
      this.renderUnknownOption = () => {
        /* empty */
      };
    });
  }

  /**
   * Render the unknown option when the viewValue doesn't match any options.
   * @param {*} val
   */
  renderUnknownOption(val) {
    const unknownVal = this.generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this.$element.prepend(this._unknownOption);
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this.$element.value = unknownVal;
  }

  /**
   * Update the unknown option if it's already rendered.
   * @param {*} val
   */
  updateUnknownOption(val) {
    const unknownVal = this.generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this.$element.value = unknownVal;
  }

  /**
   * Generate a special value used for unknown options.
   * @param {*} val
   * @returns {string}
   */
  generateUnknownOptionValue(val) {
    if (isUndefined(val)) {
      return `? undefined:undefined ?`;
    }

    return `? ${hashKey(val)} ?`;
  }

  /**
   * Remove the unknown option from the select element if it exists.
   */
  removeUnknownOption() {
    if (this._unknownOption.parentElement) this._unknownOption.remove();
  }

  /**
   * Select the empty option (value="") if it exists.
   */
  selectEmptyOption() {
    if (this.emptyOption) {
      this.$element.value = "";
      this.emptyOption.selected = true;
      this.emptyOption.setAttribute("selected", "selected");
    }
  }

  /**
   * Unselect the empty option if present.
   */
  unselectEmptyOption() {
    if (this.hasEmptyOption) {
      this.emptyOption.selected = false;
    }
  }

  /**
   * Read the current value from the select element.
   * @returns {*|null}
   */
  readValue() {
    const val = this.$element.value;

    const realVal = val in this.selectValueMap ? this.selectValueMap[val] : val;

    return this.hasOption(realVal) ? realVal : null;
  }

  /**
   * Write a value to the select control.
   * @param {*} value
   */
  writeValue(value) {
    const currentlySelectedOption =
      this.$element.options[this.$element.selectedIndex];

    if (currentlySelectedOption) currentlySelectedOption.selected = false;

    if (this.hasOption(value)) {
      this.removeUnknownOption();

      const hashedVal = hashKey(value);

      this.$element.value =
        hashedVal in this.selectValueMap ? hashedVal : value;
      const selectedOption = this.$element.options[this.$element.selectedIndex];

      if (!selectedOption) {
        this.selectUnknownOrEmptyOption(value);
      } else {
        selectedOption.selected = true;
      }
    } else {
      this.selectUnknownOrEmptyOption(value);
    }
  }

  /**
   * Register a new option with the controller.
   * @param {*} value
   * @param {HTMLOptionElement} element
   */
  addOption(value, element) {
    if (element.nodeType === NodeType._COMMENT_NODE) return;

    assertNotHasOwnProperty(value, '"option value"');

    if (value === "") {
      this.hasEmptyOption = true;
      this.emptyOption = element;
    }
    const count = this.optionsMap.get(value) || 0;

    this.optionsMap.set(value, count + 1);
    this.scheduleRender();
  }

  /**
   * Remove an option from the controller.
   * @param {*} value
   */
  removeOption(value) {
    const count = this.optionsMap.get(value);

    if (count) {
      if (count === 1) {
        this.optionsMap.delete(value);

        if (value === "") {
          this.hasEmptyOption = false;
          this.emptyOption = undefined;
        }
      } else {
        this.optionsMap.set(value, count - 1);
      }
    }
  }

  /**
   * Check if an option exists for the given value.
   * @param {*} value
   * @returns {boolean}
   */
  hasOption(value) {
    return !!this.optionsMap.get(value);
  }

  /**
   * @returns {boolean} Whether the select element currently has an empty option.
   */
  $hasEmptyOption() {
    return this.hasEmptyOption;
  }

  /**
   * @returns {boolean} Whether the unknown option is currently selected.
   */
  $isUnknownOptionSelected() {
    return this.$element.options[0] === this._unknownOption;
  }

  /**
   * @returns {boolean} Whether the empty option is selected.
   */
  $isEmptyOptionSelected() {
    return (
      this.hasEmptyOption &&
      this.$element.options[this.$element.selectedIndex] === this.emptyOption
    );
  }

  /**
   * Select unknown or empty option depending on the value.
   * @param {*} value
   */
  selectUnknownOrEmptyOption(value) {
    if (isNullOrUndefined(value) && this.emptyOption) {
      this.removeUnknownOption();
      this.selectEmptyOption();
    } else if (this._unknownOption.parentElement) {
      this.updateUnknownOption(value);
    } else {
      this.renderUnknownOption(value);
    }
  }

  /**
   * Schedule a render at the end of the digest cycle.
   */
  scheduleRender() {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    this.$scope.$postUpdate(() => {
      this.renderScheduled = false;
      this.ngModelCtrl.$render();
    });
  }

  /**
   * Schedule a view value update at the end of the digest cycle.
   * @param {boolean} [renderAfter=false]
   */
  scheduleViewValueUpdate(renderAfter = false) {
    if (this.updateScheduled) return;

    this.updateScheduled = true;

    this.$scope.$postUpdate(() => {
      if (this.$scope.$$destroyed) return;

      this.updateScheduled = false;
      this.ngModelCtrl.$setViewValue(this.readValue());

      if (renderAfter) this.ngModelCtrl.$render();
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
    let oldVal;

    let hashedVal;

    if (optionAttrs.$attr.ngValue) {
      optionAttrs.$observe("value", (newVal) => {
        let removal;

        const previouslySelected = optionElement.selected;

        if (isDefined(hashedVal)) {
          this.removeOption(oldVal);
          delete this.selectValueMap[hashedVal];
          removal = true;
        }

        hashedVal = hashKey(newVal);
        oldVal = newVal;
        this.selectValueMap[hashedVal] = newVal;
        this.addOption(newVal, optionElement);
        optionElement.setAttribute("value", hashedVal);

        if (removal && previouslySelected) {
          this.scheduleViewValueUpdate();
        }
      });
    } else if (interpolateValueFn) {
      optionAttrs.$observe("value", (newVal) => {
        this.readValue();
        let removal;

        const previouslySelected = optionElement.selected;

        if (isDefined(oldVal)) {
          this.removeOption(oldVal);
          removal = true;
        }
        oldVal = newVal;
        this.addOption(newVal, optionElement);

        if (removal && previouslySelected) {
          this.scheduleViewValueUpdate();
        }
      });
    } else if (interpolateTextFn) {
      optionScope.value = interpolateTextFn(optionScope);

      if (!optionAttrs.value) {
        optionAttrs.$set("value", optionScope.value);
        this.addOption(optionScope.value, optionElement);
      }

      optionScope.$watch("value", () => {
        const newVal = interpolateTextFn(optionScope);

        if (!optionAttrs.value) {
          optionAttrs.$set("value", newVal);
        }
        const previouslySelected = optionElement.selected;

        if (oldVal !== newVal) {
          this.removeOption(oldVal);
          oldVal = newVal;
        }
        this.addOption(newVal, optionElement);

        if (oldVal && previouslySelected) {
          this.scheduleViewValueUpdate();
        }
      });
    } else {
      this.addOption(optionAttrs.value, optionElement);
    }

    optionAttrs.$observe("disabled", (newVal) => {
      if (newVal === "true" || (newVal && optionElement.selected)) {
        if (this.multiple) {
          this.scheduleViewValueUpdate(true);
        } else {
          this.ngModelCtrl.$setViewValue(null);
          this.ngModelCtrl.$render();
        }
      }
    });

    optionElement.addEventListener("$destroy", () => {
      const currentValue = this.readValue();

      const removeValue = optionAttrs.value;

      this.removeOption(removeValue);
      this.scheduleRender();

      if (
        (this.multiple &&
          currentValue &&
          currentValue.indexOf(removeValue) !== -1) ||
        currentValue === removeValue
      ) {
        this.scheduleViewValueUpdate(true);
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

  function selectPreLink(_scope, element, attr, ctrls) {
    /** @type {SelectController} */
    const selectCtrl = ctrls[0];

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
    selectCtrl.ngModelCtrl = ngModelCtrl;

    // When the selected item(s) changes we delegate getting the value of the select control
    // to the `readValue` method, which can be changed if the select can have multiple
    // selected values or if the options are being generated by `ngOptions`
    element.addEventListener("change", () => {
      selectCtrl.removeUnknownOption();
      const viewValue = selectCtrl.readValue();

      ngModelCtrl.$setViewValue(viewValue);
    });

    // If the select allows multiple values then we need to modify how we read and write
    // values from and to the control; also what it means for the value to be empty and
    // we have to add an extra watch since ngModel doesn't work well with arrays - it
    // doesn't trigger rendering if only an item in the array changes.
    if (attr.multiple) {
      selectCtrl.multiple = true;

      // Read value now needs to check each option to see if it is selected
      selectCtrl.readValue = function () {
        const array = [];

        /**
         * @type {HTMLCollection}
         */
        const options = element.getElementsByTagName("option");

        Array.from(options).forEach(
          /**
           * @param {HTMLOptionElement} option
           */
          (option) => {
            if (option.selected && !option.disabled) {
              const val = option.value;

              array.push(
                val in selectCtrl.selectValueMap
                  ? selectCtrl.selectValueMap[val]
                  : val,
              );
            }
          },
        );

        return array;
      };

      // Write value now needs to set the selected property of each matching option
      selectCtrl.writeValue = function (value) {
        /**
         * @type {HTMLCollection}
         */
        const options = element.getElementsByTagName("option");

        Array.from(options).forEach(
          /**
           * @param {HTMLOptionElement} option
           */
          (option) => {
            const shouldBeSelected =
              !!value &&
              (includes(value, option.value) ||
                includes(value, selectCtrl.selectValueMap[option.value]));

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
          },
        );
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

  function selectPostLink(_scope, _element, _attrs, ctrls) {
    // if ngModel is not defined, we don't need to do anything
    const ngModelCtrl = ctrls[1];

    if (!ngModelCtrl) return;

    const selectCtrl = ctrls[0];

    // We delegate rendering to the `writeValue` method, which can be changed
    // if the select can have multiple selected values or if the options are being
    // generated by `ngOptions`.
    // This must be done in the postLink fn to prevent $render to be called before
    // all nodes have been linked correctly.
    ngModelCtrl.$render = function () {
      selectCtrl.writeValue(ngModelCtrl.$viewValue);
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
      let interpolateValueFn;

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
          getCacheData(parent, selectCtrlName) ||
          getCacheData(parent.parentElement, selectCtrlName); // in case we are in optgroup

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
