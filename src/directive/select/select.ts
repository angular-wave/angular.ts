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
  $attributes: ng.AttributesService | undefined,
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
  $attributes: ng.AttributesService | undefined,
  element: Element,
  attr: SelectAttributes,
  normalizedName: keyof SelectAttributes & string,
): boolean {
  return (
    $attributes?.has(element, normalizedName) || isDefined(attr[normalizedName])
  );
}

function setSelectAttr(
  $attributes: ng.AttributesService,
  element: Element,
  normalizedName: keyof SelectAttributes & string,
  value: string | null,
): void {
  $attributes.set(element, normalizedName, value);
}

export function selectDirective(
  $attributes: ng.AttributesService,
): ng.Directive {
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

    if (hasSelectAttr($attributes, element, attr, "multiple")) {
      selectCtrl._multiple = true;

      selectCtrl._readValue = function () {
        const array: any[] = [];

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

        return array as unknown[];
      };

      selectCtrl._writeValue = function (value: any[]) {
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

      let lastView: any;

      let lastViewRef = NaN;

      _scope.$watch(
        readSelectAttr($attributes, element, attr, "ngModel") || "",
        () => {
          if (
            lastViewRef === ngModelCtrl.$viewValue &&
            !equals(lastView, ngModelCtrl.$viewValue)
          ) {
            lastView = shallowCopy(ngModelCtrl.$viewValue);
            ngModelCtrl.$render();
          }
          lastViewRef = ngModelCtrl.$viewValue;
        },
      );

      ngModelCtrl.$isEmpty = function (value: any[] | null | undefined) {
        return !value || value.length === 0;
      };
    }
  }

  function selectPostLink(
    _scope: ng.Scope,
    element: Element,
    _attrs: ng.Attributes,
    ctrls: [SelectController, NgModelController?],
  ) {
    const ngModelCtrl = ctrls[1];

    if (!ngModelCtrl) return;

    const selectCtrl = ctrls[0];
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
  $attributes: ng.AttributesService,
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

      return function (
        scope: SelectScope,
        elemParam: Element,
        attrParam: SelectAttributes,
      ) {
        const optionElementParam = elemParam as HTMLOptionElement;

        const selectCtrlName = "$selectController";

        const parent = optionElementParam.parentElement;

        const futureParent = getInheritedData(
          optionElementParam,
          FUTURE_PARENT_ELEMENT_KEY,
        ) as Element | undefined;

        const selectCtrl = ((parent
          ? getCacheData(parent, selectCtrlName)
          : undefined) ||
          (parent?.parentElement
            ? getCacheData(parent.parentElement, selectCtrlName)
            : undefined) ||
          (futureParent
            ? getInheritedData(futureParent, selectCtrlName)
            : null)) as SelectController | null;

        if (selectCtrl) {
          selectCtrl._registerOption(
            scope,
            optionElementParam,
            attrParam,
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
