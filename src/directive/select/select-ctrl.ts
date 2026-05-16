import { _element, _scope } from "../../injection-tokens.ts";
import { NodeType } from "../../shared/node.ts";
import { removeElement } from "../../shared/dom.ts";
import {
  assertNotHasOwnProperty,
  deProxy,
  deleteProperty,
  hashKey,
  isArray,
  isDefined,
  isNullOrUndefined,
  isUndefined,
} from "../../shared/utils.ts";
import type { InternalAttributesService } from "../../services/attributes/attributes.ts";

export type SelectScope = ng.Scope &
  Record<string, any> & {
    /** @internal */
    _destroyed?: boolean;
  };

export type NgModelController = ng.NgModelController & Record<string, any>;

export type SelectAttributes = ng.Attributes & Record<string, any>;

export type InterpolateFn = ((scope: ng.Scope) => any) | null | undefined;

function readOptionElementAttr(
  $attributes: ng.AttributesService | undefined,
  optionElement: HTMLOptionElement,
  optionAttrs: SelectAttributes,
  normalizedName: string,
): unknown {
  const elementValue = $attributes?.read(optionElement, normalizedName);
  const attrValue = optionAttrs[normalizedName];

  if (
    isDefined(attrValue) &&
    (isUndefined(elementValue) || elementValue.includes("{{"))
  ) {
    return attrValue;
  }

  return elementValue ?? attrValue;
}

function hasInterpolatedOptionAttr(
  $attributes: ng.AttributesService,
  optionElement: HTMLOptionElement,
  optionAttrs: SelectAttributes,
  normalizedName: string,
): boolean {
  return Boolean(
    ($attributes as InternalAttributesService)._isInterpolated(
      optionElement,
      normalizedName,
    ) || $attributes.read(optionElement, normalizedName)?.includes("{{"),
  );
}

function observeOptionElementAttr(
  $attributes: ng.AttributesService | undefined,
  optionScope: SelectScope,
  optionElement: HTMLOptionElement,
  optionAttrs: SelectAttributes,
  normalizedName: string,
  readValue: (observedValue?: unknown) => unknown,
  callback: (value: unknown) => void,
  skipInitial = false,
): () => void {
  if (!$attributes) {
    return () => undefined;
  }

  let lastValue: unknown = {};
  let skipNext = skipInitial;

  return $attributes.observe(
    optionScope,
    optionElement,
    normalizedName,
    (observedValue) => {
      if (skipNext) {
        skipNext = false;

        return;
      }

      const newValue = readValue(observedValue);

      if (Object.is(newValue, lastValue)) return;

      lastValue = newValue;
      callback(newValue);
    },
  );
}

function setOptionElementAttr(
  $attributes: ng.AttributesService,
  optionElement: HTMLOptionElement,
  normalizedName: string,
  value: string,
): void {
  $attributes.set(optionElement, normalizedName, value);
}

/**
 * The controller for the `select` directive.
 *
 * It exposes utility methods that can be used to augment the behavior of a
 * regular or `ngOptions`-backed select element.
 */
export class SelectController {
  /* @ignore */ static $inject = [_element, _scope];

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
  /** @internal */
  _renderRescheduleRequested: boolean;
  /** @internal */
  _updateRescheduleRequested: boolean;
  /** @internal */
  _deferredQueue: Array<() => void>;
  /** @internal */
  _deferredDrainScheduled: boolean;
  /** @internal */
  _deferredDraining: boolean;

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
    this._renderRescheduleRequested = false;
    this._updateRescheduleRequested = false;
    this._deferredQueue = [];
    this._deferredDrainScheduled = false;
    this._deferredDraining = false;

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

    return this._hasOption(realVal) ? (deProxy(realVal) as unknown) : null;
  }

  /** @ignore */
  /** @internal */
  _writeValue(value: any) {
    value = deProxy(value);
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
    value = deProxy(value);

    if (element.nodeType === NodeType._COMMENT_NODE) return;

    assertNotHasOwnProperty(value, '"option value"');

    if (value === "") {
      this._hasEmptyOption = true;
      this._emptyOption = element;
    }
    const count = this._optionsMap.get(value) || 0;

    this._optionsMap.set(value, count + 1);
    this._scheduleRender();

    const currentViewValue = this._ngModelCtrl?.$viewValue;

    const currentModelValue = this._ngModelCtrl?.$modelValue;

    if (
      currentViewValue === value ||
      currentModelValue === value ||
      ((isNullOrUndefined(currentViewValue) || currentViewValue === "") &&
        value === "")
    ) {
      this._scheduleDeferred(() => {
        this._ngModelCtrl?.$render?.();
      });
    }
  }

  /** @ignore */
  /** @internal */
  _scheduleDeferred(fn: () => void, ownerScope: SelectScope = this._scope) {
    this._deferredQueue.push(() => {
      if (ownerScope._destroyed) return;
      fn();
    });

    if (this._deferredDrainScheduled || this._deferredDraining) {
      return;
    }

    this._deferredDrainScheduled = true;

    queueMicrotask(() => {
      queueMicrotask(() => {
        this._deferredDrainScheduled = false;
        this._drainDeferredQueue();
      });
    });
  }

  /** @ignore */
  /** @internal */
  _drainDeferredQueue() {
    if (this._deferredQueue.length === 0) {
      return;
    }

    this._deferredDraining = true;

    let index = 0;

    try {
      while (index < this._deferredQueue.length) {
        this._deferredQueue[index++]();
      }
    } finally {
      this._deferredQueue.length = 0;
      this._deferredDraining = false;
    }
  }

  /** @ignore */
  /** @internal */
  _removeOption(value: any) {
    value = deProxy(value);
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
    value = deProxy(value);

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
    if (this._renderScheduled) {
      this._renderRescheduleRequested = true;

      return;
    }

    this._renderScheduled = true;
    this._scheduleDeferred(() => {
      this._renderScheduled = false;
      this._ngModelCtrl.$render();

      if (this._renderRescheduleRequested) {
        this._renderRescheduleRequested = false;
        this._scheduleRender();
      }
    });
  }

  /** @ignore */
  /** @internal */
  _scheduleViewValueUpdate(renderAfter = false) {
    if (this._updateScheduled) {
      this._updateRescheduleRequested = true;

      return;
    }

    this._updateScheduled = true;

    this._scheduleDeferred(() => {
      this._updateScheduled = false;
      this._ngModelCtrl.$setViewValue(this._readValue());

      if (renderAfter) this._ngModelCtrl.$render();

      if (this._updateRescheduleRequested) {
        this._updateRescheduleRequested = false;
        this._scheduleViewValueUpdate(renderAfter);
      }
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
    $attributes: ng.AttributesService,
    initialValue?: string,
    hasNgValue = false,
  ) {
    let oldVal: any;

    let hashedVal: string | undefined;

    let registeredValue: any = initialValue;

    if (hasNgValue) {
      let ngValueInitialized = false;

      const syncNgValue = (newVal: unknown) => {
        let removal;

        const previouslySelected = optionElement.selected;

        const rawNewVal = deProxy(newVal);

        if (ngValueInitialized && Object.is(rawNewVal, oldVal)) return;

        ngValueInitialized = true;

        if (isDefined(hashedVal)) {
          this._removeOption(oldVal);
          deleteProperty(this._selectValueMap, hashedVal);
          removal = true;
        }

        hashedVal = hashKey(rawNewVal);
        oldVal = rawNewVal;
        registeredValue = rawNewVal;
        this._selectValueMap[hashedVal] = rawNewVal;
        this._addOption(rawNewVal, optionElement);
        optionElement.setAttribute("value", hashedVal);

        if (removal && previouslySelected) {
          this._scheduleViewValueUpdate();
        }
      };

      syncNgValue(undefined);
      optionScope.$watch(optionAttrs.ngValue, syncNgValue);
      observeOptionElementAttr(
        $attributes,
        optionScope,
        optionElement,
        optionAttrs,
        "value",
        (observedValue) => {
          if (observedValue !== optionElement.getAttribute("value")) {
            return oldVal;
          }

          if (isDefined(hashedVal) && observedValue === hashedVal) {
            return oldVal;
          }

          return observedValue;
        },
        syncNgValue,
        true,
      );
    } else if (interpolateValueFn) {
      observeOptionElementAttr(
        $attributes,
        optionScope,
        optionElement,
        optionAttrs,
        "value",
        () =>
          readOptionElementAttr(
            $attributes,
            optionElement,
            optionAttrs,
            "value",
          ),
        (newVal: unknown) => {
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
        },
        $attributes
          ? hasInterpolatedOptionAttr(
              $attributes,
              optionElement,
              optionAttrs,
              "value",
            )
          : false,
      );
    } else if (interpolateTextFn) {
      optionScope.value = interpolateTextFn(optionScope);

      if (!registeredValue) {
        setOptionElementAttr(
          $attributes,
          optionElement,
          "value",
          optionScope.value,
        );
        registeredValue = optionScope.value;
        this._addOption(optionScope.value, optionElement);
      }

      optionScope.$watch("value", () => {
        const newVal = interpolateTextFn(optionScope);

        if (!registeredValue) {
          setOptionElementAttr($attributes, optionElement, "value", newVal);
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
      this._addOption(registeredValue, optionElement);
    }

    observeOptionElementAttr(
      $attributes,
      optionScope,
      optionElement,
      optionAttrs,
      "disabled",
      () =>
        readOptionElementAttr(
          $attributes,
          optionElement,
          optionAttrs,
          "disabled",
        ),
      (newVal: unknown) => {
        if (newVal === "true" || (newVal && optionElement.selected)) {
          if (this._multiple) {
            this._scheduleViewValueUpdate(true);
          } else {
            this._ngModelCtrl.$setViewValue(null);
            this._ngModelCtrl.$render();
          }
        }
      },
    );

    optionElement.addEventListener("$destroy", () => {
      const currentValue = this._readValue();

      const removeValue = oldVal ?? registeredValue;

      const shouldUpdateViewValue =
        (this._multiple &&
          isArray(currentValue) &&
          currentValue.includes(removeValue)) ||
        currentValue === removeValue;

      this._removeOption(removeValue);
      this._scheduleRender();

      if (!shouldUpdateViewValue) return;

      this._scheduleDeferred(() => {
        queueMicrotask(() => {
          if (this._scope._destroyed || this._hasOption(removeValue)) {
            return;
          }

          this._scheduleViewValueUpdate(true);
        });
      }, optionScope);
    });
  }
}
