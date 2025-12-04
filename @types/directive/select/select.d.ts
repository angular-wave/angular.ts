/**
 * @returns {import('../../interface.ts').Directive}
 */
export function selectDirective(): import("../../interface.ts").Directive;
export function optionDirective($interpolate: any): {
  restrict: string;
  priority: number;
  compile(
    element: any,
    attr: any,
  ): (scope: any, elemParam: any, attrParam: any) => void;
};
export namespace optionDirective {
  let $inject: string[];
}
