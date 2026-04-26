import { $injectTokens } from "../../injection-tokens.ts";
import { getCacheData } from "../../shared/dom.ts";
import {
  arrayFrom,
  equals,
  includes,
  isDefined,
  shallowCopy,
} from "../../shared/utils.ts";
import {
  InterpolateFn,
  NgModelController,
  SelectAttributes,
  SelectController,
  SelectScope,
} from "./select-ctrl.ts";

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
      selectCtrl._registerOption = () => {
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

    selectCtrl._scheduleRender();
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
          selectCtrl._registerOption(
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
