import { $injectTokens } from "../../injection-tokens.ts";
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
} from "../../shared/utils.ts";

type SelectScope = ng.Scope &
  Record<string, any> & {
    _destroyed?: boolean;
    $postUpdate(fn: () => void): void;
  };

type NgModelController = ng.NgModelController & Record<string, any>;

type SelectAttributes = ng.Attributes & Record<string, any>;

type InterpolateFn = ((scope: ng.Scope) => any) | null | undefined;

class SelectController {
  static $nonscope = [
    "ngModelCtrl",
    "selectValueMap",
    "emptyOption",
    "optionsMap",
  ];

  /* @ignore */ static $inject = [$injectTokens._element, $injectTokens._scope];

  _element: HTMLSelectElement;
  _scope: SelectScope;
  _selectValueMap: Record<string, any>;
  _ngModelCtrl: NgModelController;
  _multiple: boolean;
  _unknownOption: HTMLOptionElement;
  _hasEmptyOption: boolean;
  _emptyOption?: HTMLOptionElement;
  _optionsMap: Map<any, number>;
  _renderScheduled: boolean;
  _updateScheduled: boolean;

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

  _renderUnknownOption(val: any) {
    const unknownVal = this._generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._element.prepend(this._unknownOption);
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this._element.value = unknownVal;
  }

  _updateUnknownOption(val: any) {
    const unknownVal = this._generateUnknownOptionValue(val);

    this._unknownOption.value = unknownVal;
    this._unknownOption.selected = true;
    this._unknownOption.setAttribute("selected", "selected");
    this._element.value = unknownVal;
  }

  _generateUnknownOptionValue(val: any) {
    if (isUndefined(val)) {
      return `? undefined:undefined ?`;
    }

    return `? ${hashKey(val)} ?`;
  }

  _removeUnknownOption() {
    if (this._unknownOption.parentElement) this._unknownOption.remove();
  }

  _selectEmptyOption() {
    if (this._emptyOption) {
      this._element.value = "";
      this._emptyOption.selected = true;
      this._emptyOption.setAttribute("selected", "selected");
    }
  }

  _un_selectEmptyOption() {
    if (this._hasEmptyOption && this._emptyOption) {
      this._emptyOption.selected = false;
    }
  }

  _readValue() {
    const val = this._element.value;

    const realVal =
      val in this._selectValueMap ? this._selectValueMap[val] : val;

    return this._hasOption(realVal) ? realVal : null;
  }

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

  _hasOption(value: any) {
    return !!this._optionsMap.get(value);
  }

  $hasEmptyOption() {
    return this._hasEmptyOption;
  }

  $isUnknownOptionSelected() {
    return this._element.options[0] === this._unknownOption;
  }

  $isEmptyOptionSelected() {
    return (
      this._hasEmptyOption &&
      this._element.options[this._element.selectedIndex] === this._emptyOption
    );
  }

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

  _scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    this._scope.$postUpdate(() => {
      this._renderScheduled = false;
      this._ngModelCtrl.$render();
    });
  }

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

  registerOption(
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

export function selectDirective(): ng.Directive {
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

  function selectPreLink(
    _scope: ng.Scope,
    element: Element,
    attr: SelectAttributes,
    ctrls: [SelectController, NgModelController?],
  ) {
    const selectElement = element as HTMLSelectElement;

    const selectCtrl = ctrls[0];

    const ngModelCtrl = ctrls[1];

    if (!ngModelCtrl) {
      selectCtrl.registerOption = () => {
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
        const array: any[] = [];

        const options = selectElement.getElementsByTagName("option");

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

      selectCtrl._writeValue = function (value: any[]) {
        const options = selectElement.getElementsByTagName("option");

        Array.from(options).forEach((option: HTMLOptionElement) => {
          const shouldBeSelected =
            !!value &&
            (includes(value, option.value) ||
              includes(value, selectCtrl._selectValueMap[option.value]));

          const currentlySelected = option.selected;

          if (shouldBeSelected !== currentlySelected) {
            option.selected = shouldBeSelected;
          }
        });
      };

      let lastView: any;

      let lastViewRef = NaN;

      _scope.$watch(attr.ngModel, () => {
        if (
          lastViewRef === ngModelCtrl.$viewValue &&
          !equals(lastView, ngModelCtrl.$viewValue)
        ) {
          lastView = shallowCopy(ngModelCtrl.$viewValue);
          ngModelCtrl.$render();
        }
        lastViewRef = ngModelCtrl.$viewValue;
      });

      ngModelCtrl.$isEmpty = function (value: any[] | null | undefined) {
        return !value || value.length === 0;
      };
    }
  }

  function selectPostLink(
    _scope: ng.Scope,
    _element: Element,
    _attrs: ng.Attributes,
    ctrls: [SelectController, NgModelController?],
  ) {
    const ngModelCtrl = ctrls[1];

    if (!ngModelCtrl) return;

    const selectCtrl = ctrls[0];

    ngModelCtrl.$render = function () {
      selectCtrl._writeValue(ngModelCtrl.$viewValue);
    };
  }
}

optionDirective.$inject = [$injectTokens._interpolate];

export function optionDirective(
  $interpolate: ng.InterpolateService,
): ng.Directive {
  return {
    restrict: "E",
    priority: 100,
    compile(element: Element, attr: SelectAttributes) {
      const optionElement = element as HTMLOptionElement;

      let interpolateValueFn: InterpolateFn;

      let interpolateTextFn: InterpolateFn;

      if (isDefined(attr.ngValue)) {
      } else if (isDefined(attr.value)) {
        interpolateValueFn = $interpolate(attr.value, true);
      } else {
        interpolateTextFn = $interpolate(optionElement.textContent, true);

        if (!interpolateTextFn) {
          attr.$set("value", optionElement.textContent);
        }
      }

      return function (
        scope: SelectScope,
        elemParam: Element,
        attrParam: SelectAttributes,
      ) {
        const optionElementParam = elemParam as HTMLOptionElement;

        const selectCtrlName = "$selectController";

        const parent = optionElementParam.parentElement;

        const selectCtrl =
          (parent ? getCacheData(parent, selectCtrlName) : undefined) ||
          (parent?.parentElement
            ? getCacheData(parent.parentElement, selectCtrlName)
            : undefined);

        if (selectCtrl) {
          selectCtrl.registerOption(
            scope,
            optionElementParam,
            attrParam,
            interpolateValueFn,
            interpolateTextFn,
          );
        }
      };
    },
  };
}
