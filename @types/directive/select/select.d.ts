/**
 * The controller for the {@link ng.select select} directive.
 * The controller exposes a few utility methods that can be used to augment
 * the behavior of a regular or an {@link ng.ngOptions ngOptions} select element.
 */
declare class SelectController {
  static $nonscope: string[];
  /**
   * @type {Array<string>}
   */
  static $inject: ("$scope" | "$element")[];
  /**
   * @param {HTMLSelectElement} $element
   * @param {ng.Scope} $scope
   */
  constructor($element: any, $scope: any);
  /**
   * Render the unknown option when the viewValue doesn't match any options.
   * @param {*} val
   */
  _renderUnknownOption(val: any): void;
  /**
   * Update the unknown option if it's already rendered.
   * @param {*} val
   */
  _updateUnknownOption(val: any): void;
  /**
   * Generate a special value used for unknown options.
   * @param {*} val
   * @returns {string}
   */
  _generateUnknownOptionValue(val: any): string;
  /**
   * Remove the unknown option from the select element if it exists.
   */
  _removeUnknownOption(): void;
  /**
   * Select the empty option (value="") if it exists.
   */
  _selectEmptyOption(): void;
  /**
   * Unselect the empty option if present.
   */
  _un_selectEmptyOption(): void;
  /**
   * Read the current value from the select element.
   * @returns {*|null}
   */
  _readValue(): any;
  /**
   * Write a value to the select control.
   * @param {*} value
   */
  _writeValue(value: any): void;
  /**
   * Register a new option with the controller.
   * @param {*} value
   * @param {HTMLOptionElement} element
   */
  _addOption(value: any, element: any): void;
  /**
   * Remove an option from the controller.
   * @param {*} value
   */
  _removeOption(value: any): void;
  /**
   * Check if an option exists for the given value.
   * @param {*} value
   * @returns {boolean}
   */
  _hasOption(value: any): boolean;
  /**
   * @returns {boolean} Whether the select element currently has an empty option.
   */
  $hasEmptyOption(): any;
  /**
   * @returns {boolean} Whether the unknown option is currently selected.
   */
  $isUnknownOptionSelected(): boolean;
  /**
   * @returns {boolean} Whether the empty option is selected.
   */
  $isEmptyOptionSelected(): boolean;
  /**
   * Select unknown or empty option depending on the value.
   * @param {*} value
   */
  _selectUnknownOrEmptyOption(value: any): void;
  /**
   * Schedule a render at the end of the digest cycle.
   */
  _scheduleRender(): void;
  /**
   * Schedule a view value update at the end of the digest cycle.
   * @param {boolean} [renderAfter=false]
   */
  _scheduleViewValueUpdate(renderAfter?: boolean): void;
  /**
   * Register an option with interpolation or dynamic value/text.
   * @param {any} optionScope
   * @param {HTMLOptionElement} optionElement
   * @param {any} optionAttrs
   * @param {Function} [interpolateValueFn]
   * @param {Function} [interpolateTextFn]
   */
  registerOption(
    optionScope: any,
    optionElement: any,
    optionAttrs: any,
    interpolateValueFn: any,
    interpolateTextFn: any,
  ): void;
}
/**
 * @returns {ng.Directive}
 */
export declare function selectDirective(): {
  restrict: string;
  require: string[];
  controller: typeof SelectController;
  priority: number;
  link: {
    pre: (_scope: any, element: any, attr: any, ctrls: any) => void;
    post: (_scope: any, _element: any, _attrs: any, ctrls: any) => void;
  };
};
/**
 * @param {ng.InterpolateService} $interpolate
 * @returns {ng.Directive}
 */
export declare function optionDirective($interpolate: any): {
  restrict: string;
  priority: number;
  compile(
    element: any,
    attr: any,
  ): (scope: any, elemParam: any, attrParam: any) => void;
};
export declare namespace optionDirective {
  var $inject: "$interpolate"[];
}
export {};
