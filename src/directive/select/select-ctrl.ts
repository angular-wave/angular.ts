import { $injectTokens } from "../../injection-tokens.ts";
import { NodeType } from "../../shared/node.ts";
import { removeElement } from "../../shared/dom.ts";
import {
  assertNotHasOwnProperty,
  hashKey,
  isDefined,
  isNullOrUndefined,
  isUndefined,
} from "../../shared/utils.ts";

export type SelectScope = ng.Scope &
  Record<string, any> & {
    /** @internal */
    _destroyed?: boolean;
    $postUpdate(fn: () => void): void;
  };

export type NgModelController = ng.NgModelController & Record<string, any>;

export type SelectAttributes = ng.Attributes & Record<string, any>;

export type InterpolateFn = ((scope: ng.Scope) => any) | null | undefined;

/**
 * The controller for the `select` directive.
 *
 * It exposes utility methods that can be used to augment the behavior of a
 * regular or `ngOptions`-backed select element.
 */
export class SelectController {
  /* @ignore */ static $inject = [$injectTokens._element, $injectTokens._scope];

  /** @internal */
  _element: HTMLSelectElement;
  /** @internal */
  _scope: SelectScope;
  /** @internal */
  _selectValueMap: Record<string, any>;
  /** @internal */
  _ngModelCtrl: NgModelController;
  /** @internal */
  _multiple: boolean;
  /** @internal */
  _unknownOption: HTMLOptionElement;
  /** @internal */
  _hasEmptyOption: boolean;
  /** @internal */
  _emptyOption?: HTMLOptionElement;
  /** @internal */
  _optionsMap: Map<any, number>;
  /** @internal */
  _renderScheduled: boolean;
  /** @internal */
  _updateScheduled: boolean;

  /** @ignore */
  constructor($element: HTMLSelectElement, $scope: SelectScope) {
    this._element = $element;
    this._scope = $scope;
    this._selectValueMap = {};
    this._ngModelCtrl = {} as NgModelController;
    this._multiple = false;
    this._unknownOption = document.createElement("option");
    this._hasEmptyOption = false;
    this._emptyOption = undefined;
    this._optionsMap = new Map();
    this._renderScheduled = false;
    this._updateScheduled = false;

    $scope.$on("$destroy", () => {
      this._renderUnknownOption = () => {
        /* empty */
      };
    });
  }

  /**
   * Returns `true` if the select element currently has an empty option
   * element, i.e. an option that signifies that the select is empty or the
   * selection is `null`.
   */
  $hasEmptyOption() {
    return this._hasEmptyOption;
  }

  /**
   * Returns `true` if the select element's unknown option is selected.
   *
   * The unknown option is added and automatically selected whenever the
   * select model does not match any option.
   */
  $isUnknownOptionSelected() {
    return this._element.options[0] === this._unknownOption;
  }

  /**
   * Returns `true` if the select element has an empty option and that option
   * is currently selected.
   */
  $isEmptyOptionSelected() {
    return (
      this._hasEmptyOption &&
      this._element.options[this._element.selectedIndex] === this._emptyOption
    );
  }

  /** @ignore */
  /** @internal */
  _renderUnknownOption(val: any) {
    const unknownVal = this._generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._element.prepend(this._unknownOption);
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this._element.value = unknownVal;
  }

  /** @ignore */
  /** @internal */
  _updateUnknownOption(val: any) {
    const unknownVal = this._generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this._element.value = unknownVal;
  }

  /** @ignore */
  /** @internal */
  _generateUnknownOptionValue(val: any) {
    if (isUndefined(val)) {
      return `? undefined:undefined ?`;
    }

    return `? ${hashKey(val)} ?`;
  }

  /** @ignore */
  /** @internal */
  _removeUnknownOption() {
    if (this._unknownOption.parentElement) removeElement(this._unknownOption);
  }

  /** @ignore */
  /** @internal */
  _selectEmptyOption() {
    if (this._emptyOption) {
      this._element.value = "";
      this._emptyOption.selected = true;
      this._emptyOption.setAttribute("selected", "selected");
    }
  }

  /** @ignore */
  /** @internal */
  _unselectEmptyOption() {
    if (this._hasEmptyOption && this._emptyOption) {
      this._emptyOption.selected = false;
    }
  }

  /** @ignore */
  /** @internal */
  _readValue() {
    const val = this._element.value;

    const realVal =
      val in this._selectValueMap ? this._selectValueMap[val] : val;

    return this._hasOption(realVal) ? realVal : null;
  }

  /** @ignore */
  /** @internal */
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

  /** @ignore */
  /** @internal */
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

  /** @ignore */
  /** @internal */
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

  /** @ignore */
  /** @internal */
  _hasOption(value: any) {
    return !!this._optionsMap.get(value);
  }

  /** @ignore */
  /** @internal */
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

  /** @ignore */
  /** @internal */
  _scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    this._scope.$postUpdate(() => {
      this._renderScheduled = false;
      this._ngModelCtrl.$render();
    });
  }

  /** @ignore */
  /** @internal */
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

  /** @ignore */
  /** @internal */
  _registerOption(
    optionScope: SelectScope,
    optionElement: HTMLOptionElement,
    optionAttrs: SelectAttributes,
    interpolateValueFn: InterpolateFn,
    interpolateTextFn: InterpolateFn,
  ) {
    let oldVal: any;

    let hashedVal: string | undefined;

    let registeredValue = optionAttrs.value;

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
        registeredValue = newVal;
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
        registeredValue = newVal;
        this._addOption(newVal, optionElement);

        if (removal && previouslySelected) {
          this._scheduleViewValueUpdate();
        }
      });
    } else if (interpolateTextFn) {
      optionScope.value = interpolateTextFn(optionScope);

      if (!optionAttrs.value) {
        optionAttrs.$set("value", optionScope.value);
        registeredValue = optionScope.value;
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
        registeredValue = newVal;
        this._addOption(newVal, optionElement);

        if (oldVal && previouslySelected) {
          this._scheduleViewValueUpdate();
        }
      });
    } else {
      this._addOption(optionAttrs.value, optionElement);
    }

    optionAttrs.$observe("disabled", (newVal: any) => {
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

      const removeValue = oldVal ?? registeredValue;

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
