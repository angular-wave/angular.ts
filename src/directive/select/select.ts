import type { AttributesService } from "../../services/attributes/attributes.ts";
import { _attributes, _interpolate } from "../../injection-tokens.ts";
import {
  FUTURE_PARENT_ELEMENT_KEY,
  getCacheData,
  getInheritedData,
} from "../../shared/dom.ts";
import {
  arrayFrom,
  equals,
  includes,
  isDefined,
  shallowCopy,
} from "../../shared/utils.ts";
import {
  type InterpolateFn,
  type NgModelController,
  type SelectAttributes,
  SelectController,
  type SelectScope,
} from "./select-ctrl.ts";

selectDirective.$inject = [_attributes];

function readSelectAttr(
  $attributes: AttributesService | undefined,
  element: Element,
  attr: SelectAttributes,
  normalizedName: keyof SelectAttributes & string,
): string | undefined {
  const value = $attributes?.read(element, normalizedName);

  return isDefined(value)
    ? value
    : (attr[normalizedName] as string | undefined);
}

function hasSelectAttr(
  $attributes: AttributesService | undefined,
  element: Element,
  attr: SelectAttributes,
  normalizedName: keyof SelectAttributes & string,
): boolean {
  return (
    $attributes?.has(element, normalizedName) ?? isDefined(attr[normalizedName])
  );
}

function setSelectAttr(
  $attributes: AttributesService,
  element: Element,
  normalizedName: keyof SelectAttributes & string,
  value: string | null,
): void {
  $attributes.set(element, normalizedName, value);
}

export function selectDirective($attributes: AttributesService): ng.Directive {
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
    ctrls: [SelectController, NgModelController?],
  ) {
    const selectElement = element as HTMLSelectElement;

    const [selectCtrl, ngModelCtrl] = ctrls;

    if (!ngModelCtrl) {
      selectCtrl._registerOption = () => {
        /* empty */
      };

      return;
    }
    selectCtrl._ngModelCtrl = ngModelCtrl;

    const syncNativeValidity = () => {
      ngModelCtrl.$setNativeValidity(
        !selectElement.willValidate || selectElement.validity.valid,
      );
    };

    selectElement.addEventListener("change", () => {
      selectCtrl._removeUnknownOption();
      const viewValue = selectCtrl._readValue();

      ngModelCtrl.$setViewValue(viewValue);
      syncNativeValidity();
    });

    if ($attributes.has(element, "multiple")) {
      selectCtrl._multiple = true;

      selectCtrl._readValue = function () {
        const array: unknown[] = [];

        const options = selectElement.getElementsByTagName("option");

        arrayFrom(options).forEach((option: HTMLOptionElement) => {
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

      selectCtrl._writeValue = function (value: unknown[] | undefined) {
        const options = selectElement.getElementsByTagName("option");

        arrayFrom(options).forEach((option: HTMLOptionElement) => {
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

      let lastView: unknown;

      let lastViewRef: unknown = NaN;

      _scope.$watch($attributes.read(element, "ngModel") ?? "", () => {
        if (
          lastViewRef === ngModelCtrl.$viewValue &&
          !equals(lastView, ngModelCtrl.$viewValue)
        ) {
          lastView = shallowCopy(ngModelCtrl.$viewValue);
          ngModelCtrl.$render();
        }
        lastViewRef = ngModelCtrl.$viewValue;
      });

      ngModelCtrl.$isEmpty = function (value: unknown[] | null | undefined) {
        return !value || value.length === 0;
      };
    }
  }

  function selectPostLink(
    _scope: ng.Scope,
    element: Element,
    ctrls: [SelectController, NgModelController?],
  ) {
    const [selectCtrl, ngModelCtrl] = ctrls;

    if (!ngModelCtrl) return;

    const selectElement = element as HTMLSelectElement;

    const syncNativeValidity = () => {
      ngModelCtrl.$setNativeValidity(
        !selectElement.willValidate || selectElement.validity.valid,
      );
    };

    ngModelCtrl.$render = function () {
      selectCtrl._writeValue(ngModelCtrl.$viewValue);
      syncNativeValidity();
    };

    syncNativeValidity();
    selectCtrl._scheduleRender();
  }
}

optionDirective.$inject = [_attributes, _interpolate];

export function optionDirective(
  $attributes: AttributesService,
  $interpolate: ng.InterpolateService,
): ng.Directive {
  return {
    restrict: "E",
    priority: 100,
    compile(element: Element, attr: SelectAttributes) {
      const optionElement = element as HTMLOptionElement;

      const hasNgValue = hasSelectAttr($attributes, element, attr, "ngValue");

      let initialValue = readSelectAttr($attributes, element, attr, "value");

      let interpolateValueFn: InterpolateFn;

      let interpolateTextFn: InterpolateFn;

      if (hasNgValue) {
        // ngValue is handled during linking.
      } else if (isDefined(initialValue)) {
        interpolateValueFn = $interpolate(initialValue, true);
      } else {
        interpolateTextFn = $interpolate(optionElement.textContent, true);

        if (!interpolateTextFn) {
          setSelectAttr(
            $attributes,
            optionElement,
            "value",
            optionElement.textContent,
          );
          initialValue = optionElement.textContent || undefined;
        }
      }

      return function (scope: SelectScope, elemParam: Element) {
        const optionElementParam = elemParam as HTMLOptionElement;
        const linkAttrs = {
          $attr: {},
          disabled: readSelectAttr(
            $attributes,
            optionElementParam,
            attr,
            "disabled",
          ),
          ngValue: readSelectAttr(
            $attributes,
            optionElementParam,
            attr,
            "ngValue",
          ),
          value: readSelectAttr($attributes, optionElementParam, attr, "value"),
        } as unknown as SelectAttributes;

        const selectCtrlName = "$selectController";

        const parent = optionElementParam.parentElement;

        const futureParent = getInheritedData(
          optionElementParam,
          FUTURE_PARENT_ELEMENT_KEY,
        ) as Element | undefined;

        const selectCtrl = ((parent
          ? getCacheData(parent, selectCtrlName)
          : undefined) ??
          (parent?.parentElement
            ? getCacheData(parent.parentElement, selectCtrlName)
            : undefined) ??
          (futureParent
            ? getInheritedData(futureParent, selectCtrlName)
            : null)) as SelectController | null;

        if (selectCtrl) {
          selectCtrl._registerOption(
            scope,
            optionElementParam,
            linkAttrs,
            interpolateValueFn,
            interpolateTextFn,
            $attributes,
            initialValue,
            hasNgValue,
          );
        }
      };
    },
  };
}
